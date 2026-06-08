import type { AgentProposal, AgentRole, SourceRef } from '../types';
import {
  MUNICIPALITY, BUDGET_LINES, TAX_ACCOUNTS, LIENS, UTILITY_ACCOUNTS,
  EMPLOYEES, PAY_RUN, CASH_DRAWERS, payFor,
} from '../data/municipal';
import { AUDIT, AUDIT_PLAN } from '../data/audit';
import { makeProposal, usd } from './util';

const fin = { module: 'Budgetary', system: 'TRIO' as const };
function s(module: string, recordId: string, label: string, system: 'TRIO' | 'CAMA' = 'TRIO'): SourceRef {
  return { system, module, recordId, label };
}
function artifact(role: AgentRole, title: string, rationale: string, suggestedAction: string, draft: string, sources: SourceRef[], confidence = 0.85): AgentProposal {
  return makeProposal({ role, kind: 'audit-artifact', title, rationale, suggestedAction, confidence, sources, draft });
}

// ---- individual artifacts -------------------------------------------------

function cashClose(): AgentProposal[] {
  const d = CASH_DRAWERS[0];
  return [artifact('finance', 'Year-end cash close — drawer status', 'Confirms all drawers reconciled & deposited through year-end before close.',
    'Resolve the open drawer variance, then mark cash close complete.',
    [
      `CASH CLOSE — through ${AUDIT.fiscalYearEnd}`,
      `• ${d.drawer} (${d.date}): counted ${usd(d.countedCash + d.countedCheck + d.countedCredit)} — OPEN: $5.00 cash short, under investigation.`,
      `• All other drawers reconciled and deposited.`,
      `Cannot certify cash for audit until the ${d.date} variance is cleared or written off with approval.`,
    ].join('\n'), [s('Cash Receipts', d.date, `Drawer ${d.drawer}`)], 0.9)];
}

function taxSchedule(): AgentProposal[] {
  const commitment = TAX_ACCOUNTS.reduce((a, t) => a + t.annualTax, 0);
  const outstanding = TAX_ACCOUNTS.reduce((a, t) => a + t.balance, 0);
  const collected = commitment - outstanding;
  const lienTotal = LIENS.reduce((a, l) => a + l.principal + l.interestAndCosts, 0);
  return [artifact('tax', 'Tax schedule — commitment, collections, liens', 'Reconciles the tax receivable for the audit.',
    'Tie these figures to the GL tax-receivable control account and provide to the auditor.',
    [
      `PROPERTY TAX SCHEDULE — ${AUDIT.fiscalYear}`,
      `Commitment (selected accounts): ${usd(commitment)}`,
      `Collected to date: ${usd(collected)} (${Math.round((collected / commitment) * 100)}%)`,
      `Outstanding receivable: ${usd(outstanding)}`,
      `Matured liens (${LIENS.length}): ${usd(lienTotal)} — incl. ${LIENS[0].parcelId} foreclosing ${LIENS[0].foreclosureDate}.`,
      `Abatements: $0 recorded this period (confirm with Assessing). Tax-acquired property: none.`,
      `Recommend an allowance for uncollectible taxes against the aged balance (see AJE log).`,
    ].join('\n'), [s('Tax Collections', 'commitment', 'Tax commitment'), s('Tax Collections', LIENS[0].id, `Lien ${LIENS[0].id}`)], 0.86)];
}

function aging(): AgentProposal[] {
  const bucket = (days: number) => (days <= 0 ? 'current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : '61-90' /* simplified */);
  void bucket;
  const taxOut = TAX_ACCOUNTS.filter((t) => t.balance > 0);
  const utilOut = UTILITY_ACCOUNTS.filter((u) => u.balance > 0);
  const taxTotal = taxOut.reduce((a, t) => a + t.balance, 0);
  const utilTotal = utilOut.reduce((a, u) => a + u.balance, 0);
  const utilOver60 = utilOut.filter((u) => u.pastDueDays > 60).reduce((a, u) => a + u.balance, 0);
  return [artifact('utility', 'Receivable agings — tax & utility', 'Aged receivable detail supporting the allowance for doubtful accounts.',
    'Provide agings to the auditor and base the allowance on the 90+ buckets.',
    [
      `RECEIVABLE AGING — as of ${MUNICIPALITY.asOf}`,
      `Tax receivable: ${usd(taxTotal)} across ${taxOut.length} account(s); lien/over-90 portion ${usd(TAX_ACCOUNTS.filter((t) => t.status !== 'current').reduce((a, t) => a + t.balance, 0))}.`,
      `Utility receivable: ${usd(utilTotal)} across ${utilOut.length} account(s); 60+ days ${usd(utilOver60)}.`,
      `Recommended allowance: 100% of liened tax + 50% of utility 60+ days.`,
    ].join('\n'), [s('Tax Collections', 'aging', 'Tax aging'), s('Utility Billing', 'aging', 'Utility aging')], 0.85)];
}

function payrollW3(): AgentProposal[] {
  const runGross = PAY_RUN.lines.reduce((a, l) => a + payFor(EMPLOYEES.find((e) => e.id === l.employeeId)!, l).gross, 0);
  const ytd = EMPLOYEES.reduce((a, e) => a + e.ytdGross, 0) + runGross;
  return [artifact('payroll', 'Payroll reconciliation to W-3 / 941', 'Reconciles YTD gross wages to quarterly filings and W-3 control totals.',
    'Confirm the variance is zero before issuing W-2s and providing the reconciliation to the auditor.',
    [
      `PAYROLL WAGE RECONCILIATION — ${AUDIT.fiscalYear}`,
      `Employees: ${EMPLOYEES.length}. YTD gross wages (incl. current run): ${usd(ytd)}.`,
      `Tie YTD gross to the sum of quarterly 941s and to the W-3 total.`,
      `Confirm taxable fringe (vehicle, stipends) and MainePERS employer share are posted.`,
      `Open item: off-cycle pay-rate change for E-112 — confirm authorization (see controls).`,
    ].join('\n'), [s('Payroll', PAY_RUN.id, `Pay run ${PAY_RUN.id}`)], 0.83)];
}

function bankRec(): AgentProposal[] {
  return [artifact('finance', 'Bank & investment reconciliations', 'Confirms book-to-bank for all funds at year-end.',
    'Attach the reconciliations and outstanding-item lists; obtain bank confirmations.',
    [
      `BANK / INVESTMENT RECONCILIATION — ${AUDIT.fiscalYearEnd}`,
      `• General Fund operating — book $1,284,610 / bank $1,301,940; outstanding checks $17,330 → reconciled.`,
      `• Water-Sewer enterprise — reconciled, no exceptions.`,
      `• Capital reserve / investments — reconciled to statements; record interest accrual (AJE).`,
      `Request year-end bank confirmations for all accounts.`,
    ].join('\n'), [s('Finance', 'bank-rec', 'Bank reconciliations')], 0.84)];
}

function capitalAssets(): AgentProposal[] {
  return [artifact('finance', 'Capital assets & depreciation rollforward (GASB 34)', 'Beginning + additions − disposals − depreciation = ending.',
    'Tie additions to capital outlay; post the depreciation AJE.',
    [
      `CAPITAL ASSET ROLLFORWARD — ${AUDIT.fiscalYear}`,
      `Beginning net capital assets: $18,420,000`,
      `+ Additions (CIP, equipment, paving): $742,500`,
      `− Disposals (net): $46,000`,
      `− Depreciation expense: $1,118,000`,
      `= Ending net capital assets: $17,998,500`,
      `Confirm additions agree to capital outlay (01-4900-800) and the fixed-asset listing.`,
    ].join('\n'), [s(fin.module, '01-4900-800', 'Capital Reserve Transfers')], 0.82)];
}

function debtSchedule(): AgentProposal[] {
  const ds = BUDGET_LINES.find((b) => b.account === '01-4710-900');
  return [artifact('finance', 'Long-term debt & debt-service schedule', 'Outstanding principal, current vs. long-term, and FY debt service.',
    'Tie debt service to the budget line and disclose the maturities schedule.',
    [
      `LONG-TERM DEBT — ${AUDIT.fiscalYearEnd}`,
      `Outstanding principal (GO bonds, USDA notes): $4,310,000`,
      `Current portion due within one year: $498,000`,
      `FY debt service (P&I): ${usd(ds?.budget ?? 372000)} (line ${ds?.account ?? '01-4710-900'}).`,
      `Provide the amortization/maturities schedule and confirm no covenant violations.`,
    ].join('\n'), [s(fin.module, ds?.account ?? '01-4710-900', 'Debt Service')], 0.83)];
}

function pbc(): AgentProposal[] {
  const items = [
    'Year-end trial balance and general ledger detail (all funds).',
    'Bank statements & reconciliations; year-end bank confirmations.',
    'Tax commitment, collections, abatements, lien, and tax-acquired schedules.',
    'Tax & utility receivable agings with allowance support.',
    'Capital asset rollforward and depreciation schedule.',
    'Long-term debt amortization schedule and new-debt documents.',
    'Payroll registers, 941s, W-3, and MainePERS reports.',
    'Schedule of Expenditures of Federal Awards (SEFA) + grant agreements.',
    'Adjusting journal entries and management representation letter.',
    'Council minutes, budget & amendments, and key contracts.',
  ];
  return [artifact('finance', 'Auditor PBC (prepared-by-client) request list', `Assembles the package ${AUDIT.auditor} will request for ${AUDIT.fieldworkStart} fieldwork.`,
    'Assign each item an owner and due date; track to 100% before fieldwork.',
    [`PBC LIST — ${AUDIT.auditor} — fieldwork ${AUDIT.fieldworkStart}`, '', ...items.map((it, i) => `${i + 1}. [ ] ${it}`)].join('\n'),
    [s('Finance', 'pbc', 'PBC package')], 0.88)];
}

function b2a(): AgentProposal[] {
  const over = BUDGET_LINES.filter((b) => (b.actual + b.encumbered) / b.budget >= 1.1);
  const totalB = BUDGET_LINES.reduce((a, b) => a + b.budget, 0);
  const totalC = BUDGET_LINES.reduce((a, b) => a + b.actual + b.encumbered, 0);
  return [artifact('finance', 'Final budget-to-actual with variance notes', 'Final GF budget-to-actual for the audited statements.',
    'Attach variance explanations for over-budget lines and any year-end transfers approved by Council.',
    [
      `BUDGET-TO-ACTUAL (General Fund) — ${AUDIT.fiscalYear}`,
      `Appropriations ${usd(totalB)} · committed ${usd(totalC)} (${Math.round((totalC / totalB) * 100)}%).`,
      `Over-budget lines requiring notes/transfers: ${over.map((o) => `${o.account} ${o.description}`).join('; ') || 'none'}.`,
      `Confirm no line exceeds appropriation at the legal level of control without a Council-approved transfer.`,
    ].join('\n'), over.map((o) => s(fin.module, o.account, o.description)), 0.85)];
}

function sefa(): AgentProposal[] {
  return [artifact('finance', 'Schedule of Expenditures of Federal Awards (SEFA)', 'Federal expenditures drive single-audit determination (Uniform Guidance).',
    'Confirm total federal expenditures vs. the single-audit threshold; reconcile to the GL.',
    [
      `SEFA — ${AUDIT.fiscalYear}`,
      `• CDBG (HUD, via State) — Assistance Listing 14.228: $312,000`,
      `• ARPA / SLFRF (Treasury) 21.027: $268,500`,
      `• Highway/URIP (state) — not federal; exclude.`,
      `Total federal expenditures: $580,500 → ${AUDIT.singleAudit ? 'EXCEEDS single-audit threshold — single audit required.' : 'below threshold.'}`,
      `Reconcile SEFA to grant revenue/expenditure in the GL and retain grant agreements.`,
    ].join('\n'), [s('Finance', 'sefa', 'Federal awards')], 0.8)];
}

function aje(): AgentProposal[] {
  return [artifact('finance', 'Adjusting journal entries (AJE) log', 'Proposed year-end adjustments for review and posting.',
    'Review each AJE with the Finance Director; post approved entries and give the log to the auditor.',
    [
      `PROPOSED ADJUSTING ENTRIES — ${AUDIT.fiscalYear}`,
      `AJE-01 Accrue payroll & benefits through ${AUDIT.fiscalYearEnd}.`,
      `AJE-02 Record annual depreciation expense ($1,118,000).`,
      `AJE-03 Establish allowance for uncollectible taxes (liened + aged).`,
      `AJE-04 Accrue interest on investments and on long-term debt.`,
      `AJE-05 Reclass interfund due to/from once school detail is received (currently blocked).`,
    ].join('\n'), [s('Finance', 'aje', 'Adjusting entries')], 0.82)];
}

function repLetter(): AgentProposal[] {
  return [artifact('finance', 'Management representation letter (draft)', 'Standard representations to the auditor at the close of fieldwork.',
    'Finance Director and Manager to review and sign on auditor letterhead at the end of fieldwork.',
    [
      `[DRAFT] MANAGEMENT REPRESENTATION LETTER`,
      `To: ${AUDIT.auditor}`,
      `We confirm, to the best of our knowledge, regarding the financial statements for the year ended ${AUDIT.fiscalYearEnd}:`,
      `• The financial statements are fairly presented in conformity with GAAP (GASB).`,
      `• We have made available all financial records, minutes, and related information.`,
      `• There are no material unrecorded transactions, unasserted claims, or known fraud.`,
      `• All federal awards and compliance requirements have been disclosed (SEFA).`,
      `Signed: Finance Director ____  ·  City Manager ____  ·  Date ____`,
    ].join('\n'), [s('Finance', 'rep-letter', 'Mgmt rep letter')], 0.8)];
}

function readiness(): AgentProposal[] {
  const steps = AUDIT_PLAN.flatMap((p) => p.steps);
  const done = steps.filter((x) => x.status === 'done').length;
  const blocked = steps.filter((x) => x.status === 'blocked');
  const inprog = steps.filter((x) => x.status === 'in-progress');
  return [artifact('finance', `Audit readiness review — ${Math.round((done / steps.length) * 100)}% complete`,
    `${done}/${steps.length} steps complete; ${blocked.length} blocked, ${inprog.length} in progress.`,
    'Walk the open items with the Finance Director and Manager; clear blockers before fieldwork.',
    [
      `AUDIT READINESS — ${AUDIT.fiscalYear} (fieldwork ${AUDIT.fieldworkStart})`,
      `Complete: ${done} of ${steps.length} steps (${Math.round((done / steps.length) * 100)}%).`,
      `Blocked (${blocked.length}): ${blocked.map((b) => `${b.id} ${b.title}`).join('; ') || 'none'}.`,
      `In progress (${inprog.length}): ${inprog.map((b) => b.id).join(', ') || 'none'}.`,
      `Top risks: unresolved drawer variance; interfund detail from school dept; allowance for uncollectible taxes.`,
      `Recommend a readiness checkpoint two weeks before fieldwork.`,
    ].join('\n'), [s('Finance', 'readiness', 'Audit readiness')], 0.87)];
}

// ---- registry of artifact generators by key -------------------------------

export const AUDIT_ARTIFACTS: Record<string, () => AgentProposal[]> = {
  'cash-close': cashClose,
  'tax-schedule': taxSchedule,
  aging,
  'payroll-w3': payrollW3,
  'bank-rec': bankRec,
  'capital-assets': capitalAssets,
  'debt-schedule': debtSchedule,
  pbc,
  b2a,
  sefa,
  aje,
  'rep-letter': repLetter,
  readiness,
};

/** Finance agent task: assemble the auditor package (PBC + readiness). */
export function financeAuditPrep(): AgentProposal[] {
  return [...readiness(), ...pbc()];
}
