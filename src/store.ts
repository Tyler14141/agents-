import { create } from 'zustand';
import type { AgentProposal, AgentRole, AgentRun, AuditEntry } from './types';
import { AGENT_MAP, findTask } from './agents/registry';
import { MUNICIPALITY } from './data/municipal';

function audit(p: AgentProposal, action: AuditEntry['action'], detail: string): AuditEntry {
  return {
    id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor: MUNICIPALITY.user.name,
    action,
    role: p.role,
    proposalId: p.id,
    proposalTitle: p.title,
    detail,
  };
}

const rid = () => `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

interface AppState {
  currentRole: AgentRole;
  proposals: AgentProposal[];
  auditLog: AuditEntry[];
  runs: AgentRun[];
  /** Key of the task currently executing, e.g. "finance:variance" or "finance:all". */
  runningKey: string | null;

  setRole: (role: AgentRole) => void;
  runTask: (role: AgentRole, taskId: string) => void;
  runAllForAgent: (role: AgentRole) => void;
  /** Used by the TRIO Assistant to push individual drafts into the same queue. */
  addProposals: (fresh: AgentProposal[]) => void;
  approve: (id: string, editedDraft?: string) => void;
  reject: (id: string, note?: string) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentRole: 'finance',
  proposals: [],
  auditLog: [],
  runs: [],
  runningKey: null,

  setRole: (role) => set({ currentRole: role }),

  runTask: (role, taskId) => {
    const task = findTask(role, taskId);
    if (!task) return;
    const key = `${role}:${taskId}`;
    set({ runningKey: key });
    const startedAt = new Date().toISOString();

    setTimeout(() => {
      const fresh = task.run();
      const source = `${AGENT_MAP[role]?.name ?? role} · ${task.label}`;
      const generated = fresh.map((p) =>
        audit(p, 'generated', `${source} drafted “${p.title}” (${Math.round(p.confidence * 100)}% confidence) from ${p.sources.length} source record(s). Awaiting review.`),
      );
      const run: AgentRun = {
        id: rid(),
        role,
        taskId,
        taskLabel: task.label,
        triggeredBy: MUNICIPALITY.user.name,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'completed',
        proposalIds: fresh.map((p) => p.id),
      };
      set((s) => ({
        proposals: [...s.proposals, ...fresh],
        auditLog: [...generated, ...s.auditLog],
        runs: [run, ...s.runs],
        runningKey: null,
      }));
    }, 700);
  },

  runAllForAgent: (role) => {
    const agent = AGENT_MAP[role];
    if (!agent || agent.tasks.length === 0) return;
    const key = `${role}:all`;
    set({ runningKey: key });
    const startedAt = new Date().toISOString();

    setTimeout(() => {
      const fresh = agent.tasks.flatMap((t) => t.run());
      const generated = fresh.map((p) =>
        audit(p, 'generated', `${agent.name} · Run all drafted “${p.title}”. Awaiting review.`),
      );
      const run: AgentRun = {
        id: rid(),
        role,
        taskId: 'all',
        taskLabel: 'Run all tasks',
        triggeredBy: MUNICIPALITY.user.name,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'completed',
        proposalIds: fresh.map((p) => p.id),
      };
      set((s) => ({
        proposals: [...s.proposals, ...fresh],
        auditLog: [...generated, ...s.auditLog],
        runs: [run, ...s.runs],
        runningKey: null,
      }));
    }, 900);
  },

  addProposals: (fresh) => {
    if (fresh.length === 0) return;
    const generated = fresh.map((p) =>
      audit(p, 'generated', `TRIO Assistant drafted “${p.title}” (${Math.round(p.confidence * 100)}% confidence). Awaiting review.`),
    );
    set((s) => ({ proposals: [...s.proposals, ...fresh], auditLog: [...generated, ...s.auditLog] }));
  },

  approve: (id, editedDraft) => {
    const p = get().proposals.find((x) => x.id === id);
    if (!p) return;
    const edited = editedDraft !== undefined && editedDraft !== p.draft;
    const resolved: AgentProposal = {
      ...p,
      status: edited ? 'edited' : 'approved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: MUNICIPALITY.user.name,
      editedDraft: edited ? editedDraft : undefined,
    };
    const entries: AuditEntry[] = [];
    if (edited) entries.push(audit(resolved, 'edited', 'Reviewer edited the draft before approving.'));
    entries.push(audit(resolved, 'approved', `Approved by ${MUNICIPALITY.user.name}.`));
    entries.push(audit(resolved, 'written-back', resolved.suggestedAction));
    set((s) => ({
      proposals: s.proposals.map((x) => (x.id === id ? resolved : x)),
      auditLog: [...entries, ...s.auditLog],
    }));
  },

  reject: (id, note) => {
    const p = get().proposals.find((x) => x.id === id);
    if (!p) return;
    const resolved: AgentProposal = {
      ...p,
      status: 'rejected',
      resolvedAt: new Date().toISOString(),
      resolvedBy: MUNICIPALITY.user.name,
    };
    set((s) => ({
      proposals: s.proposals.map((x) => (x.id === id ? resolved : x)),
      auditLog: [audit(resolved, 'rejected', note ? `Rejected: ${note}` : 'Rejected by reviewer; nothing written to the system of record.'), ...s.auditLog],
    }));
  },

  reset: () => set({ proposals: [], auditLog: [], runs: [] }),
}));
