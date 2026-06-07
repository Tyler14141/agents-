import type { AgentProposal } from '../types';
import {
  EXCEPTIONS,
  INQUIRIES,
  TAX_ACCOUNTS,
  UTILITY_ACCOUNTS,
  BUDGET_LINES,
  MUNICIPALITY,
} from '../data/municipal';
import { makeProposal, usd, pct } from './util';

// ---------------------------------------------------------------------------
// Town Manager / CAO agent
//
// Operating-layer opportunities (per strategy doc):
//   • Cross-office briefing books
//   • Escalation summaries
//   • Consolidated role-based dashboards
//
// Aggregates read-only signals from across TRIO into a single report draft.
// ---------------------------------------------------------------------------

/** "Run report" — a cross-office daily operations briefing. */
export function managerDailyReport(): AgentProposal[] {
  const highX = EXCEPTIONS.filter((x) => x.severity === 'high');
  const openInq = INQUIRIES.filter((i) => i.status === 'new');
  const arTax = TAX_ACCOUNTS.filter((t) => t.status !== 'current').reduce((s, t) => s + t.balance, 0);
  const arUtil = UTILITY_ACCOUNTS.filter((u) => u.status === 'delinquent').reduce((s, u) => s + u.balance, 0);
  const totalBudget = BUDGET_LINES.reduce((s, b) => s + b.budget, 0);
  const committed = BUDGET_LINES.reduce((s, b) => s + b.actual + b.encumbered, 0);
  const overs = BUDGET_LINES.filter((b) => (b.actual + b.encumbered) / b.budget >= 1.1);

  return [
    makeProposal({
      role: 'manager',
      kind: 'report',
      title: `Cross-office daily report — ${MUNICIPALITY.asOf}`,
      rationale: `Consolidates exceptions, resident inquiries, receivables, and budget position across offices.`,
      confidence: 0.82,
      sources: [
        { system: 'TRIO', module: 'Budgetary', recordId: 'gf-summary', label: 'General Fund summary' },
        { system: 'TRIO', module: 'Tax / Utility', recordId: 'aging', label: 'Receivable aging' },
        { system: 'TRIO', module: 'Customer Service', recordId: 'inquiries', label: 'Inquiry queue' },
      ],
      suggestedAction: `Approve to circulate as the manager's morning briefing to department heads.`,
      draft: [
        `DAILY OPERATIONS BRIEFING — ${MUNICIPALITY.name} — ${MUNICIPALITY.asOf}`,
        '',
        `NEEDS ATTENTION`,
        `• ${highX.length} high-severity exception(s): ${highX.map((x) => x.module + ' ' + (x.relatedRecordId ?? '')).join('; ') || 'none'}`,
        `• ${openInq.length} resident inquiries open across walk-in / phone / email.`,
        '',
        `RECEIVABLES`,
        `• Delinquent/lien property tax: ${usd(arTax)}.`,
        `• Delinquent utility balances: ${usd(arUtil)}.`,
        '',
        `BUDGET POSITION (selected GF lines)`,
        `• ${usd(committed)} committed of ${usd(totalBudget)} (${pct(committed / totalBudget)}); ${overs.length} line(s) over appropriation.`,
        '',
        `RECOMMENDED FOCUS: clear high-severity exceptions, continue collection/lien actions per policy, and review over-budget lines for year-end transfers.`,
      ].join('\n'),
    }),
  ];
}
