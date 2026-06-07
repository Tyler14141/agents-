// ---------------------------------------------------------------------------
// Domain model for the TRIO + CAMA operating-layer prototype.
//
// Two layers are represented here:
//   1. Systems of record  — mock TRIO modules (Cash Receipts, Tax, Utility,
//      Payroll, Budgetary) and CAMA (parcels/valuation). These are read-only
//      from the agents' perspective.
//   2. Operating layer     — role-based agents that read the systems of record
//      and produce *proposals* for human review. Nothing is written back to a
//      system of record without explicit human approval, and every action is
//      recorded in the audit log.
// ---------------------------------------------------------------------------

// ---- Roles ---------------------------------------------------------------

export type AgentRole =
  | 'customer-service'
  | 'finance'
  | 'clerk'
  | 'utility'
  | 'tax'
  | 'payroll'
  | 'code'
  | 'assessing'
  | 'manager';

export interface RoleDef {
  id: AgentRole;
  title: string;
  shortTitle: string;
  blurb: string;
  /** TRIO / CAMA modules this role primarily works in. */
  modules: string[];
  /** Whether the agent for this role is implemented in the prototype. */
  active: boolean;
  icon: string;
}

// ---- Systems of record (TRIO + CAMA mock data) ---------------------------

export type Language = 'en' | 'es' | 'fr';

export interface Resident {
  id: string;
  name: string;
  mailingAddress: string;
  phone?: string;
  email?: string;
  language: Language;
  utilityAccountId?: string;
  taxAccountId?: string;
}

export interface UsageReading {
  period: string; // e.g. "2026-04"
  ccf: number; // hundred cubic feet
}

export interface UtilityAccount {
  id: string;
  residentId: string;
  serviceAddress: string;
  status: 'active' | 'final' | 'delinquent';
  balance: number;
  pastDueDays: number;
  lastReadDate: string;
  usage: UsageReading[];
}

export interface TaxAccount {
  id: string;
  residentId: string;
  parcelId: string;
  assessedValue: number;
  annualTax: number;
  balance: number;
  status: 'current' | 'delinquent' | 'lien';
  lastPayment?: { date: string; amount: number };
}

export interface Parcel {
  id: string; // CAMA parcel id / map-lot
  residentId: string;
  situsAddress: string;
  landValue: number;
  buildingValue: number;
  lastSale?: { date: string; price: number };
  permitOpen?: string;
}

export interface Receipt {
  id: string;
  residentId?: string;
  date: string;
  module: 'Cash Receipts' | 'Tax' | 'Utility';
  description: string;
  amount: number;
  tender: 'Cash' | 'Check' | 'Credit';
}

export interface BudgetLine {
  id: string;
  account: string; // e.g. "01-4150-220"
  department: string;
  description: string;
  budget: number;
  actual: number;
  encumbered: number;
}

export interface RevenueLine {
  id: string;
  account: string;
  source: string;
  budget: number;
  actual: number;
}

// ---- Payroll ----

export interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  type: 'salary' | 'hourly';
  /** Annual salary (salary) or hourly rate (hourly), USD. */
  rate: number;
  fte: number;
  status: 'active' | 'leave';
  ytdGross: number;
}

export interface PayRunLine {
  employeeId: string;
  regularHours: number;
  otHours: number;
}

export interface PayRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  checkDate: string;
  frequency: 'Biweekly';
  status: 'open' | 'committed';
  lines: PayRunLine[];
}

// ---- Utility rate schedule ----

export interface RateTier {
  upToCcf: number | null; // null = and above
  perCcf: number;
}

export interface RateSchedule {
  waterBase: number; // per billing period
  sewerBase: number;
  waterTiers: RateTier[];
  sewerPerCcf: number;
  effective: string;
}

export type ExceptionModule = 'Utility' | 'Tax' | 'Payroll' | 'Cash Receipts';

export interface Exception {
  id: string;
  module: ExceptionModule;
  severity: 'high' | 'medium' | 'low';
  description: string;
  amount?: number;
  relatedRecordId?: string;
  detectedAt: string;
}

export interface Inquiry {
  id: string;
  channel: 'walk-in' | 'phone' | 'email';
  residentId?: string;
  contactName: string;
  receivedAt: string;
  subject: string;
  body: string;
  status: 'new' | 'triaged' | 'resolved';
}

// ---- Clerk records ----

export interface AgendaSubmission {
  id: string;
  department: string;
  title: string;
  type: 'ordinance' | 'contract' | 'appointment' | 'budget' | 'other';
  submittedBy: string;
  receivedAt: string;
  needsVote: boolean;
}

export interface RecordsRequest {
  id: string;
  requester: string;
  receivedAt: string;
  dueBy: string;
  subject: string;
  status: 'new' | 'in-progress' | 'overdue';
  assignedTo?: string;
}

// ---- Code enforcement ----

export interface CodeCase {
  id: string;
  status: 'complaint' | 'open' | 'notice-sent' | 'resolved';
  address: string;
  parcelId?: string;
  type: string;
  description: string;
  openedAt: string;
  lastActivity: string;
  ageDays: number;
}

/** Approved, human-governed knowledge the agents may draw answers from. */
export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  approvedBy: string;
  lastReviewed: string;
}

// ---- Operating layer (agent proposals + governance) ----------------------

export type ProposalKind =
  // Customer Service
  | 'inquiry-triage'
  | 'scripted-answer'
  | 'issue-summary'
  | 'resident-context'
  // Finance / Treasurer
  | 'variance-explanation'
  | 'exception-summary'
  | 'close-checklist'
  | 'council-memo'
  // Utility Billing
  | 'utility-exception'
  | 'utility-collections'
  | 'utility-final-bill'
  // Payroll
  | 'payroll-exception'
  | 'payroll-checklist'
  // Manager / cross-office
  | 'report'
  // Clerk
  | 'agenda-packet'
  | 'public-notice'
  | 'records-triage'
  // Tax / Revenue
  | 'delinquency-notice'
  | 'tax-certificate'
  | 'ownership-change'
  // Code Enforcement
  | 'case-triage'
  | 'inspection-prep'
  | 'notice-draft'
  | 'case-aging'
  // Assessing
  | 'parcel-brief'
  | 'exemption-appeal'
  | 'permit-review'
  | 'assessment-handoff';

export interface SourceRef {
  system: 'TRIO' | 'CAMA';
  module: string;
  recordId: string;
  label: string;
}

export type ProposalStatus = 'pending' | 'approved' | 'edited' | 'rejected';

export interface AgentProposal {
  id: string;
  role: AgentRole;
  kind: ProposalKind;
  title: string;
  /** One-line reason the agent surfaced this work item. */
  rationale: string;
  /** Human-reviewable draft content (plain text, may contain newlines). */
  draft: string;
  /** What will happen to the system of record when a human approves. */
  suggestedAction: string;
  confidence: number; // 0..1
  sources: SourceRef[];
  status: ProposalStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  /** Populated when a reviewer edits before approving. */
  editedDraft?: string;
}

export type AuditAction =
  | 'generated'
  | 'approved'
  | 'edited'
  | 'rejected'
  | 'written-back';

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  role: AgentRole;
  proposalId: string;
  proposalTitle: string;
  detail: string;
}

/** One execution of an agent task from the Agents module (or "run all"). */
export interface AgentRun {
  id: string;
  role: AgentRole;
  taskId: string;
  taskLabel: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'completed';
  proposalIds: string[];
}
