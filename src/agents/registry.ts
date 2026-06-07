import type { AgentProposal, AgentRole } from '../types';
import { financeVariance, financeExceptions, financeClose, financeCouncil } from './finance';
import { csTriage, csReplies, csContext } from './customerService';
import { utilityHighUsage, utilityDelinquency, utilityFinalBills } from './utility';
import { payrollPreRun, payrollExceptionScan, payrollYearEnd } from './payroll';
import { managerDailyReport } from './manager';
import { taxDelinquency, taxCertificates, taxOwnership } from './tax';
import { clerkAgenda, clerkNotice, clerkRecords } from './clerk';
import { codeTriage, codeInspections, codeNotices, codeAging } from './code';

export type Cadence = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'On demand';

export interface TaskDef {
  id: string;
  label: string;
  description: string;
  cadence: Cadence;
  run: () => AgentProposal[];
}

export interface AgentDef {
  role: AgentRole;
  name: string;
  shortName: string;
  icon: string;
  blurb: string;
  systems: string[];
  status: 'active' | 'planned';
  tasks: TaskDef[];
}

export const AGENTS: AgentDef[] = [
  {
    role: 'finance',
    name: 'Finance / Treasurer Agent',
    shortName: 'Finance',
    icon: '💼',
    blurb: 'Variance analysis, month-end close, cross-module exceptions, and council briefings.',
    systems: ['TRIO Budgetary', 'Cash Receipts', 'Tax', 'Utility', 'Payroll'],
    status: 'active',
    tasks: [
      { id: 'variance', label: 'Budget variance scan', description: 'Flag lines over/under appropriation and draft explanations.', cadence: 'Monthly', run: financeVariance },
      { id: 'exceptions', label: 'Cross-module exception summary', description: 'Summarize open exceptions across tax, utility, payroll, and cash.', cadence: 'Weekly', run: financeExceptions },
      { id: 'close', label: 'Month-end close checklist', description: 'Generate the close checklist seeded with open items.', cadence: 'Monthly', run: financeClose },
      { id: 'council', label: 'Council briefing', description: 'Draft a financial-position memo for the council packet.', cadence: 'Monthly', run: financeCouncil },
    ],
  },
  {
    role: 'customer-service',
    name: 'Customer Service Agent',
    shortName: 'Customer Service',
    icon: '🎧',
    blurb: 'Inquiry triage, knowledge-grounded replies, handoffs, and resident context.',
    systems: ['TRIO Cash Receipts', 'Cross-module lookup', 'Knowledge base'],
    status: 'active',
    tasks: [
      { id: 'triage', label: 'Triage inbox', description: 'Classify and route every open inquiry with a priority.', cadence: 'Daily', run: csTriage },
      { id: 'replies', label: 'Draft replies', description: 'Draft knowledge-grounded replies and department handoffs.', cadence: 'Daily', run: csReplies },
      { id: 'context', label: 'Resident snapshots', description: 'Assemble cross-module context for residents asking about balances.', cadence: 'On demand', run: csContext },
    ],
  },
  {
    role: 'utility',
    name: 'Utility Billing Agent',
    shortName: 'Water Bills',
    icon: '💧',
    blurb: 'High-usage detection, delinquency/shutoff outreach, and final-bill prep.',
    systems: ['TRIO Utility Billing', 'Cash Receipts'],
    status: 'active',
    tasks: [
      { id: 'high-usage', label: 'High-usage exception scan', description: 'Detect usage spikes vs. each account baseline.', cadence: 'Daily', run: utilityHighUsage },
      { id: 'delinquency', label: 'Delinquency / shutoff candidates', description: 'Identify past-due accounts and draft arrangement outreach.', cadence: 'Weekly', run: utilityDelinquency },
      { id: 'final-bills', label: 'Final-bill prep', description: 'Prepare final bills for move-out accounts.', cadence: 'On demand', run: utilityFinalBills },
    ],
  },
  {
    role: 'payroll',
    name: 'Payroll / HR Agent',
    shortName: 'Payroll',
    icon: '👥',
    blurb: 'Pre-run validation, exception detection, and year-end filing prep.',
    systems: ['TRIO Payroll', 'Budgetary'],
    status: 'active',
    tasks: [
      { id: 'pre-run', label: 'Pre-run validation', description: 'Pre-flight checklist before committing the pay run.', cadence: 'Weekly', run: payrollPreRun },
      { id: 'exceptions', label: 'Exception scan', description: 'Flag anomalous overtime/leave/deductions for confirmation.', cadence: 'Weekly', run: payrollExceptionScan },
      { id: 'year-end', label: 'Year-end filing checklist', description: 'Prepare W-2/W-3 and year-end close tasks.', cadence: 'Yearly', run: payrollYearEnd },
    ],
  },
  {
    role: 'manager',
    name: 'Manager / CAO Agent',
    shortName: 'Manager',
    icon: '🏛️',
    blurb: 'Cross-office consolidated reporting and escalation summaries.',
    systems: ['Cross-TRIO visibility', 'CAMA visibility'],
    status: 'active',
    tasks: [
      { id: 'daily-report', label: 'Cross-office daily report', description: 'Consolidate exceptions, inquiries, receivables, and budget into one briefing.', cadence: 'Daily', run: managerDailyReport },
    ],
  },
  {
    role: 'tax',
    name: 'Tax / Revenue Agent',
    shortName: 'Tax',
    icon: '🧾',
    blurb: 'Delinquency notices, tax certificate prep, and ownership-change checklists.',
    systems: ['TRIO Tax Billing & Collections', 'CAMA'],
    status: 'active',
    tasks: [
      { id: 'delinquency', label: 'Delinquency notices', description: 'Draft notices for overdue tax accounts.', cadence: 'Weekly', run: taxDelinquency },
      { id: 'certificates', label: 'Tax certificate prep', description: 'Prepare payoff/redemption worksheets for lien accounts.', cadence: 'On demand', run: taxCertificates },
      { id: 'ownership', label: 'Ownership-change review', description: 'Checklist billing/ownership updates from recent recorded sales.', cadence: 'Daily', run: taxOwnership },
    ],
  },
  {
    role: 'clerk',
    name: 'Clerk Agent',
    shortName: 'Clerk',
    icon: '🗂️',
    blurb: 'Agenda/packet assembly, public-notice drafting, and records-request triage.',
    systems: ['TRIO Clerk', 'Cash Receipts'],
    status: 'active',
    tasks: [
      { id: 'agenda', label: 'Assemble agenda & packet', description: 'Build a draft agenda/packet from department submissions.', cadence: 'Weekly', run: clerkAgenda },
      { id: 'notice', label: 'Draft public notice', description: 'Draft the statutory meeting notice for posting.', cadence: 'Weekly', run: clerkNotice },
      { id: 'records', label: 'Records-request triage', description: 'Triage and deadline-sort open public-records requests.', cadence: 'Daily', run: clerkRecords },
    ],
  },
  {
    role: 'code',
    name: 'Code Enforcement Agent',
    shortName: 'Code',
    icon: '🏗️',
    blurb: 'Complaint-to-case triage, inspection prep, notice drafting, and case aging.',
    systems: ['TRIO Code Enforcement', 'CAMA'],
    status: 'active',
    tasks: [
      { id: 'triage', label: 'Complaint-to-case triage', description: 'Convert new complaints into classified, routed cases.', cadence: 'Daily', run: codeTriage },
      { id: 'inspections', label: 'Inspection prep packets', description: 'Generate field packets for open cases.', cadence: 'Weekly', run: codeInspections },
      { id: 'notices', label: 'Violation notices', description: 'Draft notices for cases past their deadline.', cadence: 'On demand', run: codeNotices },
      { id: 'aging', label: 'Case aging & escalation', description: 'Summarize aged cases needing escalation.', cadence: 'Monthly', run: codeAging },
    ],
  },
  // Mapped from the strategy doc, not yet built out:
  { role: 'assessing', name: 'Assessing Agent', shortName: 'Assessing', icon: '📐', blurb: 'Parcel briefs, exemption/appeal checklists, assessment-to-tax handoff.', systems: ['Harris CAMA', 'TRIO Tax'], status: 'planned', tasks: [] },
];

export const AGENT_MAP: Record<string, AgentDef> = Object.fromEntries(AGENTS.map((a) => [a.role, a]));

export function findTask(role: AgentRole, taskId: string): TaskDef | undefined {
  return AGENT_MAP[role]?.tasks.find((t) => t.id === taskId);
}
