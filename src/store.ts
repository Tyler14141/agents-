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
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** A counter payment posted directly by a human operator (not an agent draft). */
export interface PostedPayment {
  id: string;
  receiptId: string;
  at: string;
  by: string;
  accountType: 'utility' | 'tax';
  accountId: string;
  residentId?: string;
  residentName: string;
  amount: number;
  tender: 'Cash' | 'Check' | 'Credit';
}

export interface NavTarget {
  module: string;
  customerId?: string;
}

/** Total posted against an account (used to show live balances). */
export function paidFor(posts: PostedPayment[], accountType: 'utility' | 'tax', accountId?: string): number {
  return posts
    .filter((p) => p.accountType === accountType && (!accountId || p.accountId === accountId))
    .reduce((s, p) => s + p.amount, 0);
}

interface AppState {
  currentRole: AgentRole;
  proposals: AgentProposal[];
  auditLog: AuditEntry[];
  runs: AgentRun[];
  posts: PostedPayment[];
  nav: NavTarget | null;
  /** Key of the task currently executing, e.g. "finance:variance" or "finance:all". */
  runningKey: string | null;

  setRole: (role: AgentRole) => void;
  runTask: (role: AgentRole, taskId: string) => void;
  runAllForAgent: (role: AgentRole) => void;
  /** Used by the TRIO Assistant to push individual drafts into the same queue. */
  addProposals: (fresh: AgentProposal[]) => void;
  approve: (id: string, editedDraft?: string) => void;
  reject: (id: string, note?: string) => void;
  /** Post a counter payment: creates a receipt + audit entry and reduces the balance. */
  postPayment: (input: { accountType: 'utility' | 'tax'; accountId: string; residentId?: string; residentName: string; amount: number; tender: 'Cash' | 'Check' | 'Credit' }) => PostedPayment;
  goTo: (module: string, customerId?: string) => void;
  clearNav: () => void;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentRole: 'finance',
  proposals: [],
  auditLog: [],
  runs: [],
  posts: [],
  nav: null,
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

  postPayment: (input) => {
    const at = new Date().toISOString();
    const receiptId = `RC-P${Date.now().toString(36).slice(-5).toUpperCase()}`;
    const payment: PostedPayment = {
      id: `PMT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      receiptId,
      at,
      by: MUNICIPALITY.user.name,
      ...input,
    };
    const entry: AuditEntry = {
      id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      at,
      actor: MUNICIPALITY.user.name,
      action: 'written-back',
      role: 'customer-service',
      proposalId: receiptId,
      proposalTitle: `Payment ${receiptId}`,
      detail: `Posted ${usd(input.amount)} ${input.tender} to ${input.accountType} account ${input.accountId} (${input.residentName}); receipt ${receiptId} created.`,
    };
    set((s) => ({ posts: [payment, ...s.posts], auditLog: [entry, ...s.auditLog] }));
    return payment;
  },

  goTo: (module, customerId) => set({ nav: { module, customerId } }),
  clearNav: () => set({ nav: null }),

  reset: () => set({ proposals: [], auditLog: [], runs: [], posts: [] }),
}));
