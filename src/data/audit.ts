// ---------------------------------------------------------------------------
// Year-end close & external audit plan for the City of Presque Isle (FY2026).
// A realistic municipal close: subledger cutoff, reconciliations, the auditor's
// PBC ("prepared by client") package, and management sign-off. Statuses below
// represent a mid-close snapshot so the readiness meter is partly complete.
// ---------------------------------------------------------------------------

export type AuditStatus = 'done' | 'in-progress' | 'blocked' | 'pending';

export interface AuditStep {
  id: string;
  title: string;
  module: string;
  owner: string;
  status: AuditStatus;
  note?: string;
  /** Key into AUDIT_ARTIFACTS if the agent can draft this step's deliverable. */
  artifact?: string;
}

export interface AuditPhase {
  id: string;
  title: string;
  steps: AuditStep[];
}

export const AUDIT = {
  fiscalYear: 'FY2026',
  fiscalYearEnd: '2026-06-30',
  auditor: 'RHR Smith & Company, CPAs',
  fieldworkStart: '2026-09-14',
  singleAudit: true, // federal expenditures > threshold (CDBG/ARPA) -> Uniform Guidance
  priorYearFindings: 1,
};

export const AUDIT_PLAN: AuditPhase[] = [
  {
    id: 'P1',
    title: '1 · Pre-close & subledger cutoff',
    steps: [
      { id: 'S1', title: 'All cash drawers reconciled & deposited through year-end', module: 'Cash Receipts', owner: 'K. Michaud', status: 'in-progress', note: '06-05 drawer $5.00 short — open', artifact: 'cash-close' },
      { id: 'S2', title: 'Final AP/AR posted; establish cutoff', module: 'Budgetary', owner: 'B. Caron', status: 'in-progress' },
      { id: 'S3', title: 'Tax: commitment, collections, abatements & penalties reconciled to GL', module: 'Tax', owner: 'K. Michaud', status: 'pending', artifact: 'tax-schedule' },
      { id: 'S4', title: 'Utility receivable reconciled to GL; final bills posted', module: 'Utility', owner: 'R. Cyr', status: 'pending', artifact: 'aging' },
      { id: 'S5', title: 'Payroll accruals posted; reconciled to GL', module: 'Payroll', owner: 'B. Caron', status: 'pending', artifact: 'payroll-w3' },
    ],
  },
  {
    id: 'P2',
    title: '2 · Balance-sheet reconciliations',
    steps: [
      { id: 'S6', title: 'Bank & investment reconciliations (all funds) to GL', module: 'Finance', owner: 'B. Caron', status: 'pending', artifact: 'bank-rec' },
      { id: 'S7', title: 'Capital assets & depreciation rollforward (GASB 34)', module: 'Finance', owner: 'B. Caron', status: 'pending', artifact: 'capital-assets' },
      { id: 'S8', title: 'Long-term debt & debt-service schedule', module: 'Finance', owner: 'B. Caron', status: 'pending', artifact: 'debt-schedule' },
      { id: 'S9', title: 'Interfund transfers eliminate & balance', module: 'Budgetary', owner: 'B. Caron', status: 'blocked', note: 'Awaiting school dept interfund detail' },
    ],
  },
  {
    id: 'P3',
    title: "3 · Auditor PBC package & schedules",
    steps: [
      { id: 'S10', title: 'Assemble PBC (prepared-by-client) request list', module: 'Finance', owner: 'B. Caron', status: 'pending', artifact: 'pbc' },
      { id: 'S11', title: 'Final budget-to-actual with variance explanations', module: 'Budgetary', owner: 'B. Caron', status: 'pending', artifact: 'b2a' },
      { id: 'S12', title: 'Receivable agings (tax & utility)', module: 'Tax / Utility', owner: 'K. Michaud', status: 'pending', artifact: 'aging' },
      { id: 'S13', title: 'Schedule of Expenditures of Federal Awards (SEFA) for single audit', module: 'Finance', owner: 'B. Caron', status: 'pending', artifact: 'sefa' },
    ],
  },
  {
    id: 'P4',
    title: '4 · Review & management sign-off',
    steps: [
      { id: 'S14', title: 'Adjusting journal entries (AJE) log', module: 'Finance', owner: 'B. Caron', status: 'pending', artifact: 'aje' },
      { id: 'S15', title: 'Management representation letter', module: 'Finance', owner: 'D. Levesque (Manager)', status: 'pending', artifact: 'rep-letter' },
      { id: 'S16', title: 'Audit readiness review with Finance Director & Manager', module: 'Finance', owner: 'D. Levesque', status: 'pending', artifact: 'readiness' },
      { id: 'S17', title: 'Confirm fieldwork dates with auditor', module: 'Finance', owner: 'B. Caron', status: 'done', note: `Fieldwork ${AUDIT.fieldworkStart}` },
    ],
  },
];
