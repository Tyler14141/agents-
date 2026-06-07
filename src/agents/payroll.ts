import type { AgentProposal } from '../types';
import { EMPLOYEES, PAY_RUN, otCostFor } from '../data/municipal';
import { makeProposal } from './util';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const OT_THRESHOLD = 10; // OT hours in a biweekly period worth confirming

// ---------------------------------------------------------------------------
// Payroll / HR agent
//
// Operating-layer opportunities (per strategy doc):
//   • Payroll checklisting
//   • Exception detection and routing
//   • Year-end filing preparation support
//
// Read-only over TRIO Payroll. Outputs are drafts for the payroll admin.
// ---------------------------------------------------------------------------

/** Pre-run validation checklist before committing a pay run. */
export function payrollPreRun(): AgentProposal[] {
  const items = [
    'Confirm new hires, terminations, and status changes are entered for this period.',
    'Validate timesheets imported and approved for all departments.',
    'Review overtime, leave, and benefit deductions against the prior period.',
    'Reconcile gross-to-net and confirm direct-deposit prenotes.',
    'Confirm tax tables and remittance schedules are current.',
  ];
  return [
    makeProposal({
      role: 'payroll',
      kind: 'payroll-checklist',
      title: 'Pre-run validation checklist',
      rationale: 'Pre-flight checks before committing the pay run.',
      confidence: 0.87,
      sources: [{ system: 'TRIO', module: 'Payroll', recordId: 'pay-run', label: 'Current pay run' }],
      suggestedAction: 'Create these as tracked pre-run tasks and assign to payroll; do not commit the run until cleared.',
      draft: items.map((it, i) => `${i + 1}. [ ] ${it}`).join('\n'),
    }),
  ];
}

/** Scan for payroll exceptions (e.g. anomalous overtime) needing confirmation. */
export function payrollExceptionScan(): AgentProposal[] {
  const flagged = PAY_RUN.lines
    .map((line) => ({ line, emp: EMPLOYEES.find((e) => e.id === line.employeeId)! }))
    .filter(({ line }) => line.otHours >= OT_THRESHOLD);

  if (flagged.length === 0) return [];

  const totalOtCost = flagged.reduce((s, { emp, line }) => s + otCostFor(emp, line), 0);

  return [
    makeProposal({
      role: 'payroll',
      kind: 'payroll-exception',
      title: `Overtime exceptions on ${PAY_RUN.id} (${flagged.length})`,
      rationale: `${flagged.length} employee(s) over ${OT_THRESHOLD} OT hours this period; ~${usd(totalOtCost)} in OT to confirm.`,
      confidence: 0.8,
      sources: flagged.map(({ emp }) => ({ system: 'TRIO' as const, module: 'Payroll', recordId: emp.id, label: `${emp.name} (${emp.department})` })),
      suggestedAction: 'Route to the department managers to confirm coding (storm-response vs. regular OT) before the run is committed.',
      draft: [
        `Pay run ${PAY_RUN.id} (${PAY_RUN.periodStart} – ${PAY_RUN.periodEnd}), check date ${PAY_RUN.checkDate}.`,
        '',
        `Overtime above ${OT_THRESHOLD} hours:`,
        ...flagged.map(({ emp, line }) => `• ${emp.name} — ${emp.position}, ${emp.department}: ${line.otHours} OT hrs (~${usd(otCostFor(emp, line))})`),
        '',
        `Recommended checks for review:`,
        `1. Confirm the hours are correct and coded to the right account (e.g., Winter Roads 01-4312-380 storm response vs. regular OT).`,
        `2. Document the justification; correct any timesheet errors before committing the run.`,
      ].join('\n'),
    }),
  ];
}

/** Year-end filing preparation checklist. */
export function payrollYearEnd(): AgentProposal[] {
  const items = [
    'Reconcile quarterly filings to year-to-date payroll registers.',
    'Verify employee SSNs, names, and addresses for W-2 accuracy.',
    'Confirm taxable fringe benefits and pension contributions are posted.',
    'Generate and review draft W-2 / W-3 figures before filing.',
    'Schedule benefit resets and new-year accrual configuration.',
  ];
  return [
    makeProposal({
      role: 'payroll',
      kind: 'payroll-checklist',
      title: 'Year-end payroll filing checklist',
      rationale: 'Orchestrating year-end filing and close tasks.',
      confidence: 0.84,
      sources: [{ system: 'TRIO', module: 'Payroll', recordId: 'year-end', label: 'Payroll year-end' }],
      suggestedAction: 'Create as tracked year-end tasks with owners and due dates.',
      draft: items.map((it, i) => `${i + 1}. [ ] ${it}`).join('\n'),
    }),
  ];
}
