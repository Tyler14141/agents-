import { useState } from 'react';
import { AGENTS, AGENT_MAP } from '../agents/registry';
import { useStore } from '../store';
import { ProposalCard } from './ProposalCard';
import type { AgentRole } from '../types';

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return new Date(iso).toLocaleTimeString();
}

export function AgentsConsole() {
  const [selected, setSelected] = useState<AgentRole>('finance');
  const [tab, setTab] = useState<'tasks' | 'outputs' | 'activity'>('tasks');

  const proposals = useStore((s) => s.proposals);
  const runs = useStore((s) => s.runs);
  const runningKey = useStore((s) => s.runningKey);
  const runTask = useStore((s) => s.runTask);
  const runAll = useStore((s) => s.runAllForAgent);

  const agent = AGENT_MAP[selected];
  const rolePending = proposals.filter((p) => p.role === selected && p.status === 'pending');
  const roleProposals = proposals.filter((p) => p.role === selected);
  const roleRuns = runs.filter((r) => r.role === selected);

  const pendingFor = (role: AgentRole) => proposals.filter((p) => p.role === role && p.status === 'pending').length;
  const lastRunFor = (role: AgentRole) => runs.find((r) => r.role === role);

  const latestRunForTask = (taskId: string) => roleRuns.find((r) => r.taskId === taskId);

  return (
    <div className="agents-console">
      {/* Roster */}
      <div className="agents-roster">
        <div className="roster-head">Agents</div>
        {AGENTS.map((a) => {
          const pending = pendingFor(a.role);
          const last = lastRunFor(a.role);
          const disabled = a.status !== 'active';
          return (
            <div
              key={a.role}
              className={`roster-item ${selected === a.role ? 'active' : ''} ${disabled ? 'planned' : ''}`}
              onClick={() => !disabled && setSelected(a.role)}
            >
              <span className="ri-icon">{a.icon}</span>
              <div className="ri-main">
                <div className="ri-name">{a.shortName}</div>
                <div className="ri-meta">
                  {disabled ? 'Mapped — not built' : last ? `Last run ${timeAgo(last.startedAt)}` : 'Not run yet'}
                </div>
              </div>
              {pending > 0 && <span className="ri-badge">{pending}</span>}
              {disabled && <span className="ri-soon">soon</span>}
            </div>
          );
        })}
      </div>

      {/* Detail */}
      <div className="agent-detail">
        <div className="ad-head">
          <div className="ad-icon">{agent.icon}</div>
          <div style={{ flex: 1 }}>
            <h2>{agent.name}</h2>
            <p className="muted" style={{ margin: '2px 0 8px' }}>{agent.blurb}</p>
            <div className="ad-systems">
              {agent.systems.map((s) => <span key={s}>{s}</span>)}
            </div>
          </div>
          <button
            className="btn btn-primary"
            disabled={!!runningKey || agent.tasks.length === 0}
            onClick={() => { runAll(selected); setTab('outputs'); }}
          >
            {runningKey === `${selected}:all` ? 'Running…' : '▶ Run all tasks'}
          </button>
        </div>

        <div className="ad-tabs">
          <div className={`ad-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Tasks</div>
          <div className={`ad-tab ${tab === 'outputs' ? 'active' : ''}`} onClick={() => setTab('outputs')}>
            Outputs {rolePending.length > 0 && <span className="count">{rolePending.length}</span>}
          </div>
          <div className={`ad-tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>
            Activity {roleRuns.length > 0 && <span className="count">{roleRuns.length}</span>}
          </div>
        </div>

        <div className="ad-body">
          {tab === 'tasks' && (
            <div className="stack">
              <div className="governance-banner">
                <span style={{ fontSize: 16 }}>🛡️</span>
                <span>Running a task <b>drafts</b> work — it never posts to TRIO. Review outputs and Approve / Edit / Reject.</span>
              </div>
              {agent.tasks.length === 0 && <div className="empty"><div className="big">🧭</div>This agent is mapped from the strategy doc but not yet built.</div>}
              {agent.tasks.map((t) => {
                const key = `${selected}:${t.id}`;
                const running = runningKey === key;
                const last = latestRunForTask(t.id);
                return (
                  <div key={t.id} className="card task-card">
                    <div className="task-main">
                      <div className="task-title">{t.label} <span className="cadence">{t.cadence}</span></div>
                      <div className="task-desc">{t.description}</div>
                      {last && !running && (
                        <div className="task-result">✓ {last.proposalIds.length} draft{last.proposalIds.length === 1 ? '' : 's'} from last run ({timeAgo(last.startedAt)}) → see Outputs</div>
                      )}
                    </div>
                    <button className="btn btn-green btn-sm" disabled={!!runningKey} onClick={() => { runTask(selected, t.id); setTab('outputs'); }}>
                      {running ? 'Running…' : '▶ Run'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'outputs' && (
            <div className="stack">
              {runningKey?.startsWith(`${selected}:`) && (
                <div className="card task-card"><div className="task-main"><div className="task-title">Agent is working…</div><div className="task-desc">Reading systems of record and drafting proposals.</div></div></div>
              )}
              {roleProposals.length === 0 && !runningKey && (
                <div className="empty"><div className="big">📥</div>No outputs yet. Run a task to generate drafts for review.</div>
              )}
              {rolePending.map((p) => <ProposalCard key={p.id} id={p.id} />)}
              {roleProposals.filter((p) => p.status !== 'pending').length > 0 && (
                <>
                  <div className="muted" style={{ fontSize: 12, margin: '8px 0 2px' }}>Resolved</div>
                  {roleProposals.filter((p) => p.status !== 'pending').map((p) => <ProposalCard key={p.id} id={p.id} />)}
                </>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="card card-pad">
              <h3>Run history</h3>
              {roleRuns.length === 0 ? (
                <p className="muted">No runs yet.</p>
              ) : (
                <table className="data">
                  <thead><tr><th>Task</th><th>Triggered by</th><th>When</th><th className="num">Outputs</th></tr></thead>
                  <tbody>
                    {roleRuns.map((r) => (
                      <tr key={r.id}>
                        <td>{r.taskLabel}</td>
                        <td>{r.triggeredBy}</td>
                        <td>{new Date(r.startedAt).toLocaleTimeString()}</td>
                        <td className="num">{r.proposalIds.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
