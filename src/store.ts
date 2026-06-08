import { create } from 'zustand';
import type { AgentProposal, AgentRole, AgentRun, AuditEntry, ProposalEffect } from './types';
import { AGENT_MAP, findTask } from './agents/registry';
import { MUNICIPALITY } from './data/municipal';

/** A record change applied to the system of record when a proposal was approved. */
export interface AppliedEffect extends ProposalEffect {
  id: string;
  at: string;
  by: string;
  proposalId: string;
  proposalTitle: string;
}

export function effectsFor(effects: AppliedEffect[], targetType: ProposalEffect['targetType'], targetId: string): AppliedEffect[] {
  return effects.filter((e) => e.targetType === targetType && e.targetId === targetId);
}

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

/** A little prior activity so the audit log isn't empty on first load. */
function seedAudit(): AuditEntry[] {
  const a = MUNICIPALITY.user.name;
  return [
    { id: 'A-seed-1', at: minsAgo(8), actor: a, action: 'written-back', role: 'customer-service', proposalId: 'RC-PSEED1', proposalTitle: 'Payment RC-PSEED1', detail: 'Posted $80.00 Check to utility account U-5013 (Maria Delgado); receipt created.' },
    { id: 'A-seed-2', at: minsAgo(35), actor: a, action: 'approved', role: 'finance', proposalId: 'P-seed-2', proposalTitle: 'Over budget: 01-4155-220 IT & Software Licensing', detail: `Approved by ${a}.` },
    { id: 'A-seed-3', at: minsAgo(36), actor: a, action: 'written-back', role: 'finance', proposalId: 'P-seed-2', proposalTitle: 'Over budget: 01-4155-220 IT & Software Licensing', detail: 'Attached variance note to 01-4155-220 and flagged for transfer review.' },
    { id: 'A-seed-4', at: minsAgo(90), actor: a, action: 'generated', role: 'utility', proposalId: 'P-seed-4', proposalTitle: 'High-usage exception: U-5013 (14 Spruce Lane)', detail: 'Utility Billing Agent drafted from 1 source record.' },
    { id: 'A-seed-5', at: minsAgo(92), actor: a, action: 'rejected', role: 'utility', proposalId: 'P-seed-5', proposalTitle: 'Low/zero-usage exception: U-5021', detail: 'Rejected: meter confirmed working; seasonal vacancy.' },
    { id: 'A-seed-6', at: minsAgo(140), actor: a, action: 'written-back', role: 'tax', proposalId: 'P-seed-6', proposalTitle: 'Delinquency notice: T-3090', detail: 'Delinquency notice sent · recorded on T-3090.' },
  ];
}

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
  intent?: 'view' | 'edit' | 'pay';
}

export interface CustomerEdit {
  mailingAddress?: string;
  phone?: string;
  email?: string;
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
  effects: AppliedEffect[];
  customerEdits: Record<string, CustomerEdit>;
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
  /** Update a resident's contact info (logged); overrides the static record. */
  updateCustomer: (id: string, name: string, patch: CustomerEdit) => void;
  goTo: (module: string, customerId?: string, intent?: NavTarget['intent']) => void;
  clearNav: () => void;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentRole: 'finance',
  proposals: [],
  auditLog: seedAudit(),
  runs: [],
  posts: [],
  effects: [],
  customerEdits: {},
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

    // Apply the concrete record change, if the proposal carries one.
    const applied: AppliedEffect[] = [];
    if (resolved.effect) {
      applied.push({
        ...resolved.effect,
        id: `E-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        at: resolved.resolvedAt!,
        by: MUNICIPALITY.user.name,
        proposalId: resolved.id,
        proposalTitle: resolved.title,
      });
      entries.push(audit(resolved, 'written-back', `Applied to ${resolved.effect.targetType} ${resolved.effect.targetId}: ${resolved.effect.label}.`));
    }

    set((s) => ({
      proposals: s.proposals.map((x) => (x.id === id ? resolved : x)),
      auditLog: [...entries, ...s.auditLog],
      effects: [...applied, ...s.effects],
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

  updateCustomer: (id, name, patch) => {
    const changed = Object.entries(patch).filter(([, v]) => v !== undefined && v !== '').map(([k]) => k);
    if (changed.length === 0) return;
    const at = new Date().toISOString();
    const entry: AuditEntry = {
      id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      at,
      actor: MUNICIPALITY.user.name,
      action: 'written-back',
      role: 'customer-service',
      proposalId: id,
      proposalTitle: `Customer update — ${name}`,
      detail: `Updated ${changed.join(', ')} for ${name}.`,
    };
    set((s) => ({
      customerEdits: { ...s.customerEdits, [id]: { ...s.customerEdits[id], ...patch } },
      auditLog: [entry, ...s.auditLog],
    }));
  },

  goTo: (module, customerId, intent) => set({ nav: { module, customerId, intent } }),
  clearNav: () => set({ nav: null }),

  reset: () => set({ proposals: [], auditLog: [], runs: [], posts: [], effects: [], customerEdits: {} }),
}));
