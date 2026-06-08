import { useMemo, useState } from 'react';
import { AUDIT, AUDIT_PLAN, type AuditStatus } from '../../data/audit';
import { AUDIT_ARTIFACTS } from '../../agents/audit';
import { useStore } from '../../store';
import { ProposalCard } from '../ProposalCard';

const STATUS_LABEL: Record<AuditStatus, string> = {
  done: 'Done', 'in-progress': 'In progress', blocked: 'Blocked', pending: 'Not started',
};
const NEXT: Record<AuditStatus, AuditStatus> = {
  pending: 'in-progress', 'in-progress': 'done', done: 'pending', blocked: 'in-progress',
};

export function YearEndAuditScreen() {
  const planSteps = useMemo(() => AUDIT_PLAN.flatMap((p) => p.steps), []);
  const [statuses, setStatuses] = useState<Record<string, AuditStatus>>(
    () => Object.fromEntries(planSteps.map((s) => [s.id, s.status])),
  );
  const [artifacts, setArtifacts] = useState<Record<string, string>>({});
  const addProposals = useStore((s) => s.addProposals);
  const proposals = useStore((s) => s.proposals);

  const approvedSet = useMemo(
    () => new Set(proposals.filter((p) => p.status === 'approved' || p.status === 'edited').map((p) => p.id)),
    [proposals],
  );

  const effective = (id: string): AuditStatus => {
    const pid = artifacts[id];
    if (pid && approvedSet.has(pid) && statuses[id] !== 'blocked') return 'done';
    return statuses[id];
  };

  const doneCount = planSteps.filter((s) => effective(s.id) === 'done').length;
  const readiness = Math.round((doneCount / planSteps.length) * 100);
  const blocked = planSteps.filter((s) => effective(s.id) === 'blocked').length;

  function draft(stepId: string, key: string) {
    const props = AUDIT_ARTIFACTS[key]?.();
    if (!props || props.length === 0) return;
    addProposals(props);
    setArtifacts((a) => ({ ...a, [stepId]: props[0].id }));
    setStatuses((s) => (s[stepId] === 'pending' ? { ...s, [stepId]: 'in-progress' } : s));
  }

  function generatePackage() {
    // Draft every step that has an artifact and isn't drafted yet.
    for (const step of planSteps) {
      if (step.artifact && !artifacts[step.id]) draft(step.id, step.artifact);
    }
  }

  return (
    <div className="tr-screen eoy-screen">
      <div className="eoy-header">
        <div>
          <h2>Year-End Close &amp; Audit — {AUDIT.fiscalYear}</h2>
          <p className="muted" style={{ margin: '2px 0 0' }}>
            FYE {AUDIT.fiscalYearEnd} · Auditor {AUDIT.auditor} · Fieldwork {AUDIT.fieldworkStart}
            {AUDIT.singleAudit ? ' · Single audit required' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={generatePackage}>✦ Draft full audit package</button>
      </div>

      <div className="readiness">
        <div className="readiness-top">
          <span><b>Audit readiness</b> — {doneCount}/{planSteps.length} steps</span>
          <span className="readiness-pct">{readiness}%</span>
        </div>
        <div className="readiness-bar"><i style={{ width: `${readiness}%` }} /></div>
        {blocked > 0 && <div className="readiness-note">⚠ {blocked} blocked item(s) must be cleared before fieldwork.</div>}
      </div>

      <div className="governance-banner">
        <span style={{ fontSize: 16 }}>🛡️</span>
        <span>The agent <b>drafts</b> each schedule and letter from the systems of record — staff review and <b>approve</b> before anything goes to the auditor. Approving an artifact marks its step done.</span>
      </div>

      {AUDIT_PLAN.map((phase) => (
        <div key={phase.id} className="audit-phase">
          <h3 className="audit-phase-title">{phase.title}</h3>
          {phase.steps.map((step) => {
            const st = effective(step.id);
            const pid = artifacts[step.id];
            return (
              <div key={step.id} className="audit-step">
                <div className="audit-step-main">
                  <button className={`audit-status ${st}`} onClick={() => setStatuses((s) => ({ ...s, [step.id]: NEXT[effective(step.id)] }))} title="Advance status">
                    {st === 'done' ? '✓' : st === 'blocked' ? '✕' : st === 'in-progress' ? '◑' : '○'} {STATUS_LABEL[st]}
                  </button>
                  <div className="audit-step-body">
                    <div className="audit-step-title">{step.title}</div>
                    <div className="audit-step-meta">
                      <span className="audit-mod">{step.module}</span> · {step.owner}
                      {step.note && <span className="audit-step-note"> · {step.note}</span>}
                    </div>
                  </div>
                  {step.artifact && (
                    <button className="btn btn-sm" onClick={() => draft(step.id, step.artifact!)}>
                      {pid ? 'Re-draft' : '✦ Draft'}
                    </button>
                  )}
                </div>
                {pid && (
                  <div className="audit-artifact">
                    <ProposalCard id={pid} compact />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
