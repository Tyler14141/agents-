import type { AgentProposal, CodeCase, SourceRef } from '../types';
import { CODE_CASES, MUNICIPALITY } from '../data/municipal';
import { makeProposal } from './util';

// ---------------------------------------------------------------------------
// Code Enforcement agent
//
// Operating-layer opportunities (per strategy doc):
//   • Complaint-to-case triage
//   • Inspection prep packets
//   • Notice drafting
//   • Case aging and escalation summaries
//
// Read-only over TRIO Code Enforcement (+ parcel links). Drafts only.
// ---------------------------------------------------------------------------

function src(c: CodeCase): SourceRef {
  return { system: 'TRIO', module: 'Code Enforcement', recordId: c.id, label: `${c.id} (${c.address})` };
}

/** Daily: turn new complaints into routed cases. */
export function codeTriage(): AgentProposal[] {
  return CODE_CASES.filter((c) => c.status === 'complaint').map((c) =>
    makeProposal({
      role: 'code',
      kind: 'case-triage',
      title: `New complaint triage: ${c.id} (${c.address})`,
      rationale: `${c.type} complaint received ${c.openedAt}.`,
      confidence: 0.8,
      sources: [src(c)],
      suggestedAction: `Open a formal case for ${c.id}, classify the violation, and schedule an initial site visit.`,
      draft: [
        `${c.id} — ${c.address}`,
        `Type: ${c.type}`,
        `Complaint: ${c.description}`,
        '',
        `Recommended steps:`,
        `1. Open case and confirm ownership/parcel from CAMA.`,
        `2. Classify under the applicable ordinance section.`,
        `3. Schedule an initial inspection and log a courtesy contact to the owner.`,
      ].join('\n'),
    }),
  );
}

/** Weekly: inspection prep packets for open cases. */
export function codeInspections(): AgentProposal[] {
  return CODE_CASES.filter((c) => c.status === 'open').map((c) =>
    makeProposal({
      role: 'code',
      kind: 'inspection-prep',
      title: `Inspection prep: ${c.id} (${c.address})`,
      rationale: `Open ${c.type} case, last activity ${c.lastActivity} (${c.ageDays} days old).`,
      confidence: 0.79,
      sources: [src(c), ...(c.parcelId ? [{ system: 'CAMA' as const, module: 'Parcel', recordId: c.parcelId, label: `Parcel ${c.parcelId}` }] : [])],
      suggestedAction: `Generate the field packet for ${c.id} and add it to this week's inspection schedule.`,
      draft: [
        `INSPECTION PACKET — ${c.id}`,
        `Address: ${c.address}${c.parcelId ? ` (parcel ${c.parcelId})` : ''}`,
        `Issue: ${c.type} — ${c.description}`,
        '',
        `Bring/verify:`,
        `• Prior case notes and any earlier notices.`,
        `• Ordinance section and applicable standards.`,
        `• Camera/measurements for evidence; date-stamp photos.`,
        `• Determine compliance status and next required action on site.`,
      ].join('\n'),
    }),
  );
}

/** Draft violation notices for cases past their compliance deadline. */
export function codeNotices(): AgentProposal[] {
  return CODE_CASES.filter((c) => c.status === 'notice-sent' || (c.status === 'open' && c.ageDays >= 30)).map((c) =>
    makeProposal({
      role: 'code',
      kind: 'notice-draft',
      title: `Violation notice: ${c.id} (${c.address})`,
      rationale: c.status === 'notice-sent' ? `Compliance deadline passed on prior notice.` : `Open ${c.ageDays} days without resolution.`,
      confidence: 0.77,
      sources: [src(c)],
      suggestedAction: `Issue the formal notice of violation for ${c.id} with a compliance deadline; CEO to sign.`,
      draft: [
        `NOTICE OF VIOLATION`,
        `Re: ${c.address} — case ${c.id}`,
        '',
        `An inspection found a violation: ${c.type} — ${c.description}`,
        `You are directed to correct this condition within 14 days of the date of this notice. Failure to comply may result in fines and further legal action under the Town's ordinances.`,
        `To discuss compliance or request an extension, contact the Code Enforcement Office.`,
        '',
        `(CEO to confirm ordinance citation and signature before issuance.)`,
      ].join('\n'),
    }),
  );
}

/** Monthly: case aging / escalation summary. */
export function codeAging(): AgentProposal[] {
  const active = CODE_CASES.filter((c) => c.status !== 'resolved').sort((a, b) => b.ageDays - a.ageDays);
  const stale = active.filter((c) => c.ageDays >= 30);
  return [
    makeProposal({
      role: 'code',
      kind: 'case-aging',
      title: `Case aging & escalation (${active.length} active)`,
      rationale: `${stale.length} case(s) aged 30+ days needing escalation review.`,
      confidence: 0.84,
      sources: active.map(src),
      suggestedAction: `Review with the CEO; escalate aged cases to notices or legal referral as appropriate.`,
      draft: [
        `CODE ENFORCEMENT — CASE AGING as of ${MUNICIPALITY.asOf}`,
        '',
        ...active.map((c) => `• ${c.id} — ${c.address} — ${c.type} — ${c.status} — ${c.ageDays} days`),
        '',
        stale.length
          ? `ESCALATE: ${stale.map((c) => c.id).join(', ')} (30+ days). Recommend formal notice or legal referral.`
          : `No cases beyond the 30-day threshold.`,
      ].join('\n'),
    }),
  ];
}
