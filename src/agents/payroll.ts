import type { AgentProposal } from '../types';
import { EXCEPTIONS } from '../data/municipal';
import { makeProposal } from './util';

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
  const out: AgentProposal[] = [];
  for (const x of EXCEPTIONS.filter((e) => e.module === 'Payroll')) {
    out.push(
      makeProposal({
        role: 'payroll',
        kind: 'payroll-exception',
        title: `Payroll exception (${x.severity})`,
        rationale: x.description,
        confidence: 0.78,
        sources: [{ system: 'TRIO', module: 'Payroll', recordId: x.id, label: `Payroll exception ${x.id}` }],
        suggestedAction: 'Route to the department manager to confirm coding before the run is committed.',
        draft: [
          `Exception: ${x.description}`,
          '',
          `Recommended check for review:`,
          `• Confirm the hours are correct and coded to the right project/account (e.g. storm-response vs. regular OT).`,
          `• If correct, document the justification; if not, correct the timesheet before committing the run.`,
        ].join('\n'),
      }),
    );
  }
  return out;
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
