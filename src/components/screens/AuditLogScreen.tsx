import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { ROLE_LABEL } from '../../agents/registry';
import type { AuditAction } from '../../types';

const ACTION_META: Record<AuditAction, { label: string; icon: string; cls: string }> = {
  generated: { label: 'Drafted', icon: '✎', cls: 'gen' },
  approved: { label: 'Approved', icon: '✓', cls: 'app' },
  edited: { label: 'Edited', icon: '✱', cls: 'edt' },
  rejected: { label: 'Rejected', icon: '✕', cls: 'rej' },
  'written-back': { label: 'Written back', icon: '➜', cls: 'wb' },
};

const FILTERS: { id: 'all' | AuditAction; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'generated', label: 'Drafted' },
  { id: 'approved', label: 'Approved' },
  { id: 'edited', label: 'Edited' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'written-back', label: 'Written back' },
];

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function AuditLogScreen() {
  const log = useStore((s) => s.auditLog);
  const [filter, setFilter] = useState<'all' | AuditAction>('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return log.filter((e) => {
      if (filter !== 'all' && e.action !== filter) return false;
      if (s && !`${e.proposalTitle} ${e.detail} ${e.actor} ${e.role}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [log, filter, q]);

  const count = (a: AuditAction) => log.filter((e) => e.action === a).length;
  const writeBacks = count('written-back');
  const decisions = count('approved') + count('edited') + count('rejected');

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Audit Trail — Activity Log</h2></div>
      <p className="muted" style={{ marginTop: 0 }}>
        Every agent draft, human decision, and write-back to a system of record — the governance record.
      </p>

      <div className="pr-stats">
        <div className="pr-stat"><div className="k">Total events</div><div className="v">{log.length}</div></div>
        <div className="pr-stat"><div className="k">Drafted</div><div className="v">{count('generated')}</div></div>
        <div className="pr-stat"><div className="k">Human decisions</div><div className="v">{decisions}</div></div>
        <div className="pr-stat"><div className="k">Written back</div><div className="v">{writeBacks}</div></div>
      </div>

      <div className="rs-filters" style={{ alignItems: 'center' }}>
        <div className="log-filters">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <div className="rs-field rs-grow">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity…" />
        </div>
      </div>

      <div className="card card-pad">
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No matching activity. Run an agent, approve a draft, or take a payment to see events here.</p>
        ) : (
          <div className="audit-timeline">
            {rows.map((e) => {
              const m = ACTION_META[e.action];
              return (
                <div key={e.id} className="audit-event">
                  <span className={`ae-icon ${m.cls}`}>{m.icon}</span>
                  <div className="ae-body">
                    <div className="ae-top">
                      <span className={`ae-action ${m.cls}`}>{m.label}</span>
                      <span className="ae-title">{e.proposalTitle}</span>
                      <span className="ae-time">{timeAgo(e.at)}</span>
                    </div>
                    <div className="ae-detail">{e.detail}</div>
                    <div className="ae-meta">{e.actor} · {ROLE_LABEL[e.role] ?? e.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
