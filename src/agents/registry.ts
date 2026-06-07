import type { AgentProposal, AgentRole } from '../types';
import { financeVariance, financeExceptions, financeClose, financeCouncil } from './finance';
import { csTriage, csReplies, csContext } from './customerService';
import { utilityHighUsage, utilityDelinquency, utilityFinalBills } from './utility';
import { payrollPreRun, payrollExceptionScan, payrollYearEnd } from './payroll';
import { managerDailyReport } from './manager';

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
  // Mapped from the strategy doc, not yet built out:
  { role: 'clerk', name: 'Clerk Agent', shortName: 'Clerk', icon: '🗂️', blurb: 'Agenda/packet assembly, notice drafting, records-request triage.', systems: ['TRIO Clerk', 'Cash Receipts'], status: 'planned', tasks: [] },
  { role: 'tax', name: 'Tax / Revenue Agent', shortName: 'Tax', icon: '🧾', blurb: 'Delinquency notices, tax certificates, ownership-change checklists.', systems: ['TRIO Tax Billing & Collections', 'CAMA'], status: 'planned', tasks: [] },
  { role: 'code', name: 'Code Enforcement Agent', shortName: 'Code', icon: '🏗️', blurb: 'Complaint-to-case triage, inspection prep, notice drafting.', systems: ['TRIO Code Enforcement', 'CAMA'], status: 'planned', tasks: [] },
  { role: 'assessing', name: 'Assessing Agent', shortName: 'Assessing', icon: '📐', blurb: 'Parcel briefs, exemption/appeal checklists, assessment-to-tax handoff.', systems: ['Harris CAMA', 'TRIO Tax'], status: 'planned', tasks: [] },
];

export const AGENT_MAP: Record<string, AgentDef> = Object.fromEntries(AGENTS.map((a) => [a.role, a]));

export function findTask(role: AgentRole, taskId: string): TaskDef | undefined {
  return AGENT_MAP[role]?.tasks.find((t) => t.id === taskId);
}
