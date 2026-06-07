import type { AgentProposal } from '../types';
import { AGENDA_SUBMISSIONS, RECORDS_REQUESTS, NEXT_MEETING, MUNICIPALITY } from '../data/municipal';
import { makeProposal } from './util';

// ---------------------------------------------------------------------------
// Clerk agent
//
// Operating-layer opportunities (per strategy doc):
//   • Agenda and packet assembly
//   • Notice drafting and workflow checklists
//   • Records-request triage and status tracking
//
// Read-only over TRIO Clerk / Cash Receipts. Drafts only.
// ---------------------------------------------------------------------------

/** Weekly: assemble a draft agenda + packet from department submissions. */
export function clerkAgenda(): AgentProposal[] {
  const votes = AGENDA_SUBMISSIONS.filter((a) => a.needsVote);
  const info = AGENDA_SUBMISSIONS.filter((a) => !a.needsVote);
  const lines = [
    `DRAFT AGENDA — ${NEXT_MEETING.body} — ${NEXT_MEETING.date}`,
    NEXT_MEETING.location,
    '',
    `1. Call to order / roll call`,
    `2. Approval of prior minutes`,
    `3. Public comment`,
    `4. Action items:`,
    ...votes.map((a, i) => `   4.${i + 1} ${a.title} — ${a.department} (${a.type}) [submitted by ${a.submittedBy}]`),
    `5. Informational / reports:`,
    ...info.map((a, i) => `   5.${i + 1} ${a.title} — ${a.department}`),
    `6. Other business / adjournment`,
  ];
  return [
    makeProposal({
      role: 'clerk',
      kind: 'agenda-packet',
      title: `Draft agenda & packet — ${NEXT_MEETING.body} ${NEXT_MEETING.date}`,
      rationale: `${AGENDA_SUBMISSIONS.length} department submissions (${votes.length} requiring a vote).`,
      confidence: 0.85,
      sources: AGENDA_SUBMISSIONS.map((a) => ({ system: 'TRIO' as const, module: 'Clerk', recordId: a.id, label: `${a.id}: ${a.title}` })),
      suggestedAction: `Build the packet from these submissions and route to the Manager for review before posting.`,
      draft: lines.join('\n'),
    }),
  ];
}

/** Weekly: draft the public meeting notice. */
export function clerkNotice(): AgentProposal[] {
  return [
    makeProposal({
      role: 'clerk',
      kind: 'public-notice',
      title: `Public notice — ${NEXT_MEETING.body} meeting`,
      rationale: `Notice must be posted by ${NEXT_MEETING.noticeDueBy} for the ${NEXT_MEETING.date} meeting.`,
      confidence: 0.88,
      sources: [{ system: 'TRIO', module: 'Clerk', recordId: 'meeting', label: `${NEXT_MEETING.body} ${NEXT_MEETING.date}` }],
      suggestedAction: `Post to the Town website, office bulletin board, and submit to the newspaper of record by ${NEXT_MEETING.noticeDueBy}.`,
      draft: [
        `PUBLIC NOTICE`,
        `The ${NEXT_MEETING.body} of the ${MUNICIPALITY.name} will hold a regular meeting on ${NEXT_MEETING.date} at ${NEXT_MEETING.location}.`,
        `The agenda includes the FY2027 budget first reading, a public works contract award, a board appointment, and a proposed nuisance-ordinance amendment.`,
        `The public is invited to attend. Reasonable accommodations available upon request to the Town Clerk.`,
      ].join('\n'),
    }),
  ];
}

/** Daily: triage open records requests by deadline. */
export function clerkRecords(): AgentProposal[] {
  const sorted = [...RECORDS_REQUESTS].sort((a, b) => a.dueBy.localeCompare(b.dueBy));
  const overdue = sorted.filter((r) => r.status === 'overdue');
  return [
    makeProposal({
      role: 'clerk',
      kind: 'records-triage',
      title: `Records-request triage (${RECORDS_REQUESTS.length} open)`,
      rationale: `${overdue.length} overdue; sorted by statutory deadline for action.`,
      confidence: 0.86,
      sources: RECORDS_REQUESTS.map((r) => ({ system: 'TRIO' as const, module: 'Clerk', recordId: r.id, label: `${r.id}: ${r.requester}` })),
      suggestedAction: `Assign owners and acknowledge each request; escalate overdue items to the Manager today.`,
      draft: [
        `RECORDS REQUESTS — as of ${MUNICIPALITY.asOf}`,
        '',
        ...sorted.map((r) => `• ${r.id} [${r.status.toUpperCase()}] due ${r.dueBy} — ${r.requester}: ${r.subject}${r.assignedTo ? ` (assigned: ${r.assignedTo})` : ' (unassigned)'}`),
        '',
        overdue.length
          ? `PRIORITY: ${overdue.map((r) => r.id).join(', ')} past due — send acknowledgment and a date-certain for production today.`
          : `No overdue requests.`,
        `Note: route the deed/tax-history request to Tax/Assessing and the code file to Code Enforcement for the responsive records.`,
      ].join('\n'),
    }),
  ];
}
