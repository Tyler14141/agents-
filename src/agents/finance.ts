import type { AgentProposal, BudgetLine, SourceRef } from '../types';
import { BUDGET_LINES, EXCEPTIONS, TAX_ACCOUNTS, UTILITY_ACCOUNTS } from '../data/municipal';
import { MUNICIPALITY } from '../data/municipal';
import { makeProposal, usd, pct } from './util';

// ---------------------------------------------------------------------------
// Finance Director / Treasurer agent
//
// Operating-layer opportunities (per strategy doc):
//   • Variance explanation drafts
//   • Close checklists and task orchestration
//   • Exception summaries across tax, utility, payroll, and cash receipts
//   • Council memo and briefing support
//
// Read-only over TRIO Budgetary / Tax / Utility / Payroll / Cash Receipts.
// Every output is a draft for the Finance Director to approve, edit, or reject.
// ---------------------------------------------------------------------------

const OVER_THRESHOLD = 1.1; // committed >= 110% of budget
const UNDER_THRESHOLD = 0.6; // committed < 60% of budget late in the year
// FY runs Jul 1 -> Jun 30; "as of" 2026-06-07 is ~92% elapsed.
const YEAR_ELAPSED = 0.92;

function committed(b: BudgetLine): number {
  return b.actual + b.encumbered;
}

function mostFavorableLine(): BudgetLine {
  return [...BUDGET_LINES].sort((a, b) => committed(a) / a.budget - committed(b) / b.budget)[0];
}

function variancePropsals(): AgentProposal[] {
  const out: AgentProposal[] = [];
  const favorable = mostFavorableLine();

  for (const b of BUDGET_LINES) {
    const c = committed(b);
    const ratio = c / b.budget;
    const variance = c - b.budget;
    const src: SourceRef = { system: 'TRIO', module: 'Budgetary', recordId: b.account, label: `${b.account} ${b.description}` };

    if (ratio >= OVER_THRESHOLD) {
      const transferNote =
        favorable.id !== b.id
          ? ` A transfer from a favorable line such as ${favorable.account} (${favorable.description}, ${pct(committed(favorable) / favorable.budget)} committed, ${usd(favorable.budget - committed(favorable))} available) may be appropriate before year-end close.`
          : '';
      out.push(
        makeProposal({
          role: 'finance',
          kind: 'variance-explanation',
          title: `Over budget: ${b.account} ${b.description}`,
          rationale: `${b.department} line committed at ${pct(ratio)} of appropriation with ~${pct(1 - YEAR_ELAPSED)} of the year left.`,
          confidence: 0.86,
          sources: [src],
          suggestedAction: `Attach this explanation to ${b.account} as the FY budget note and flag for transfer review / FY2027 budget.`,
          draft: [
            `${b.account} — ${b.description} (${b.department})`,
            `Budget ${usd(b.budget)} | Actual ${usd(b.actual)} | Encumbered ${usd(b.encumbered)} | Committed ${usd(c)} (${pct(ratio)})`,
            `Variance: ${usd(variance)} over budget.`,
            '',
            `Draft explanation for review:`,
            `“${b.description} is ${usd(variance)} (${pct(ratio - 1)}) over budget. The overage reflects committed spend exceeding the annual appropriation.${transferNote} If this represents a recurring increase, recommend building it into the FY2027 request.”`,
          ].join('\n'),
        }),
      );
    } else if (ratio < UNDER_THRESHOLD) {
      out.push(
        makeProposal({
          role: 'finance',
          kind: 'variance-explanation',
          title: `Under budget: ${b.account} ${b.description}`,
          rationale: `${b.department} line only ${pct(ratio)} committed at ~${pct(YEAR_ELAPSED)} of the year — possible re-allocation candidate.`,
          confidence: 0.74,
          sources: [src],
          suggestedAction: `Note favorable balance on ${b.account}; consider as a transfer source to cover overages.`,
          draft: [
            `${b.account} — ${b.description} (${b.department})`,
            `Budget ${usd(b.budget)} | Committed ${usd(c)} (${pct(ratio)}) | Available ${usd(b.budget - c)}`,
            '',
            `Draft note for review:`,
            `“${b.description} is tracking well under budget (${pct(ratio)} committed with ~${pct(1 - YEAR_ELAPSED)} of the year remaining). Confirm no large encumbrances are outstanding; ${usd(b.budget - c)} may be available to offset overages at year-end close.”`,
          ].join('\n'),
        }),
      );
    }
  }
  return out;
}

function exceptionSummary(): AgentProposal {
  const byModule = new Map<string, typeof EXCEPTIONS>();
  for (const x of EXCEPTIONS) {
    byModule.set(x.module, [...(byModule.get(x.module) ?? []), x]);
  }
  const high = EXCEPTIONS.filter((x) => x.severity === 'high');
  const exposure = EXCEPTIONS.reduce((s, x) => s + (x.amount ?? 0), 0);

  const lines: string[] = [];
  for (const [mod, items] of byModule) {
    lines.push(`${mod} (${items.length}):`);
    for (const x of items) {
      lines.push(`  • [${x.severity.toUpperCase()}] ${x.description}`);
    }
  }

  return makeProposal({
    role: 'finance',
    kind: 'exception-summary',
    title: `Open exceptions across modules (${EXCEPTIONS.length})`,
    rationale: `${high.length} high-severity item(s); quantified exposure ${usd(exposure)}.`,
    confidence: 0.91,
    sources: EXCEPTIONS.filter((x) => x.relatedRecordId).map((x) => ({
      system: 'TRIO' as const,
      module: x.module,
      recordId: x.relatedRecordId!,
      label: `${x.module} ${x.relatedRecordId}`,
    })),
    suggestedAction: `Distribute this summary to module owners (Utility, Tax, Payroll) and track resolution to close.`,
    draft: [
      `Exception summary as of ${MUNICIPALITY.asOf}`,
      `${EXCEPTIONS.length} open items — ${high.length} high severity — quantified exposure ${usd(exposure)}.`,
      '',
      ...lines,
      '',
      `Recommended priority order: ${high.map((h) => h.module + ' ' + (h.relatedRecordId ?? '')).join('; ')}.`,
    ].join('\n'),
  });
}

function closeChecklist(): AgentProposal {
  const drawer = EXCEPTIONS.find((x) => x.module === 'Cash Receipts');
  const items = [
    'Reconcile all bank accounts to the general ledger.',
    drawer ? `Resolve cash drawer variance: ${drawer.description}` : 'Confirm all cash drawers balanced for the period.',
    'Post utility billing receipts and reconcile receivable movement with finance.',
    'Calculate and post tax penalties; balance tax receivables to the GL.',
    'Review payroll run for the period and reconcile to the GL (confirm any overtime coding flags).',
    'Review budget-to-actual; attach variance notes for lines over 110% committed.',
    'Record month-end journal entries and transfers.',
    'Prepare budget-to-actual and management summary for distribution.',
  ];
  return makeProposal({
    role: 'finance',
    kind: 'close-checklist',
    title: `Month-end close checklist — ${MUNICIPALITY.fiscalYear} period ending ${MUNICIPALITY.asOf}`,
    rationale: `Orchestrating close tasks; pre-populated with ${EXCEPTIONS.length} open exceptions to resolve first.`,
    confidence: 0.88,
    sources: [{ system: 'TRIO', module: 'Budgetary', recordId: 'period-close', label: 'Period close — Budgetary' }],
    suggestedAction: `Create these as tracked close tasks and assign owners; mark the period closed when complete.`,
    draft: items.map((it, i) => `${i + 1}. [ ] ${it}`).join('\n'),
  });
}

function councilMemo(): AgentProposal {
  const totalBudget = BUDGET_LINES.reduce((s, b) => s + b.budget, 0);
  const totalCommitted = BUDGET_LINES.reduce((s, b) => s + committed(b), 0);
  const overs = BUDGET_LINES.filter((b) => committed(b) / b.budget >= OVER_THRESHOLD)
    .sort((a, b) => committed(b) - b.budget - (committed(a) - a.budget));
  const delinquentTax = TAX_ACCOUNTS.filter((t) => t.status !== 'current').reduce((s, t) => s + t.balance, 0);
  const delinquentUtil = UTILITY_ACCOUNTS.filter((u) => u.status === 'delinquent').reduce((s, u) => s + u.balance, 0);

  return makeProposal({
    role: 'finance',
    kind: 'council-memo',
    title: `Draft briefing: FY2026 financial position`,
    rationale: `Synthesizing budget-to-actual and receivables into a council-ready briefing.`,
    confidence: 0.79,
    sources: [
      { system: 'TRIO', module: 'Budgetary', recordId: 'gf-summary', label: 'General Fund budget summary' },
      { system: 'TRIO', module: 'Tax Collections', recordId: 'aging', label: 'Tax receivable aging' },
      { system: 'TRIO', module: 'Utility Billing', recordId: 'aging', label: 'Utility receivable aging' },
    ],
    suggestedAction: `Use as the basis for the manager's council packet memo; Finance Director to finalize before distribution.`,
    draft: [
      `TO: Town Council / Manager`,
      `FROM: Finance Director / Treasurer`,
      `RE: FY2026 financial position (as of ${MUNICIPALITY.asOf}, ~${pct(YEAR_ELAPSED)} of year elapsed)`,
      '',
      `General Fund (selected lines): ${usd(totalCommitted)} committed of ${usd(totalBudget)} appropriated (${pct(totalCommitted / totalBudget)}).`,
      overs.length
        ? `Lines requiring attention (over budget): ${overs.map((o) => `${o.description} (${usd(committed(o) - o.budget)} over)`).join('; ')}. Variance notes and proposed transfers are attached.`
        : `No selected lines are over budget.`,
      '',
      `Receivables: outstanding/delinquent property tax of ${usd(delinquentTax)} (including lien accounts) and delinquent utility balances of ${usd(delinquentUtil)}. Collection and lien actions are proceeding per policy.`,
      '',
      `Recommendation: approve the noted year-end transfers and continue scheduled collection/lien actions. Detail available on request.`,
    ].join('\n'),
  });
}

// Task-level entry points (used by both the Agents module and the assistant).
export const financeVariance = (): AgentProposal[] => variancePropsals();
export const financeExceptions = (): AgentProposal[] => [exceptionSummary()];
export const financeClose = (): AgentProposal[] => [closeChecklist()];
export const financeCouncil = (): AgentProposal[] => [councilMemo()];

export function runFinanceAgent(): AgentProposal[] {
  return [...variancePropsals(), exceptionSummary(), closeChecklist(), councilMemo()];
}
