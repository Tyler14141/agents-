import type { AgentProposal, Parcel, SourceRef } from '../types';
import { PARCELS, RESIDENTS, TAX_ACCOUNTS, MUNICIPALITY } from '../data/municipal';
import { makeProposal, usd } from './util';

// ---------------------------------------------------------------------------
// Assessor / Assessing agent
//
// Operating-layer opportunities (per strategy doc):
//   • Parcel brief generation
//   • Exemption and appeal checklists
//   • Permit-to-parcel review triggers
//   • Assessment-to-tax handoff tracking
//
// Read-only over Harris CAMA (parcels/sales/permits) with links to TRIO Tax.
// Outputs are drafts for the assessor to approve.
// ---------------------------------------------------------------------------

function ownerName(id: string): string {
  return RESIDENTS.find((r) => r.id === id)?.name ?? 'owner';
}

function camaSrc(p: Parcel): SourceRef {
  return { system: 'CAMA', module: 'Parcel', recordId: p.id, label: `Parcel ${p.id} (${p.situsAddress})` };
}

/** Parcel briefs — a consolidated snapshot for each parcel. */
export function assessingParcelBrief(): AgentProposal[] {
  return PARCELS.map((parcel) => {
    const total = parcel.landValue + parcel.buildingValue;
    const tax = TAX_ACCOUNTS.find((t) => t.parcelId === parcel.id);
    const sources: SourceRef[] = [camaSrc(parcel)];
    if (tax) sources.push({ system: 'TRIO', module: 'Tax', recordId: tax.id, label: `Tax ${tax.id}` });
    return makeProposal({
      role: 'assessing',
      kind: 'parcel-brief',
      title: `Parcel brief: ${parcel.id} (${parcel.situsAddress})`,
      rationale: `Consolidated CAMA snapshot${parcel.permitOpen ? ' — open permit on file' : parcel.lastSale ? ' — recent recorded sale' : ''}.`,
      confidence: 0.88,
      sources,
      suggestedAction: `Attach this brief to parcel ${parcel.id} for staff reference / appeal prep.`,
      draft: [
        `${parcel.id} — ${parcel.situsAddress}`,
        `Owner of record: ${ownerName(parcel.residentId)}`,
        `Assessed value: ${usd(total)} (land ${usd(parcel.landValue)} + building ${usd(parcel.buildingValue)})`,
        tax ? `Tax account ${tax.id}: annual ${usd(tax.annualTax)}, balance ${usd(tax.balance)}, ${tax.status}.` : `No linked tax account.`,
        parcel.lastSale ? `Last sale: ${parcel.lastSale.date} for ${usd(parcel.lastSale.price)} (sale/assessment ratio ${(total / parcel.lastSale.price).toFixed(2)}).` : `No recent sale on file.`,
        parcel.permitOpen ? `Open permit: ${parcel.permitOpen}.` : `No open permits.`,
      ].join('\n'),
    });
  });
}

/** Permit-to-parcel review triggers for parcels with open building permits. */
export function assessingPermitReview(): AgentProposal[] {
  return PARCELS.filter((p) => p.permitOpen).map((parcel) =>
    makeProposal({
      role: 'assessing',
      kind: 'permit-review',
      title: `Permit-to-parcel review: ${parcel.id}`,
      rationale: `Open permit ${parcel.permitOpen} may change assessable value.`,
      confidence: 0.8,
      sources: [camaSrc(parcel), { system: 'TRIO', module: 'Code Enforcement', recordId: parcel.permitOpen!.split(' ')[0], label: parcel.permitOpen! }],
      suggestedAction: `Open a review task for ${parcel.id}; inspect on completion and update CAMA value.`,
      draft: [
        `${parcel.id} — ${parcel.situsAddress}`,
        `Open permit: ${parcel.permitOpen}`,
        '',
        `Steps for review:`,
        `1. Confirm permit scope and whether it adds assessable improvements.`,
        `2. Schedule a measure-up/inspection at completion.`,
        `3. Update building value in CAMA and flag for the next commitment.`,
      ].join('\n'),
    }),
  );
}

/** Assessment-to-tax handoff for parcels with a recorded sale. */
export function assessingHandoff(): AgentProposal[] {
  return PARCELS.filter((p) => p.lastSale).map((parcel) => {
    const tax = TAX_ACCOUNTS.find((t) => t.parcelId === parcel.id);
    return makeProposal({
      role: 'assessing',
      kind: 'assessment-handoff',
      title: `Assessment-to-tax handoff: ${parcel.id}`,
      rationale: `Recorded sale ${parcel.lastSale!.date}; coordinate ownership/value with Tax.`,
      confidence: 0.82,
      sources: [camaSrc(parcel), ...(tax ? [{ system: 'TRIO' as const, module: 'Tax', recordId: tax.id, label: `Tax ${tax.id}` }] : [])],
      suggestedAction: `Notify Tax of the ownership/value change on ${parcel.id} and confirm the next bill is correct.`,
      draft: [
        `Parcel ${parcel.id} — ${parcel.situsAddress}`,
        `Recorded sale: ${parcel.lastSale!.date}, ${usd(parcel.lastSale!.price)}.`,
        '',
        `Handoff to Tax:`,
        `1. Confirm new owner of record and bill-to address.`,
        `2. Verify assessed value vs. sale price for equity review.`,
        `3. Ensure the assessment-to-tax commitment reflects the change for the next cycle.`,
      ].join('\n'),
    });
  });
}

/** Annual exemption / appeal-season checklist. */
export function assessingExemptionAppeal(): AgentProposal[] {
  const items = [
    'Confirm homestead, veteran, and blind exemption applications are recorded before the commitment date.',
    'Review parcels with sale/assessment ratios outside the acceptable range for equity.',
    'Prepare evidence packets for parcels with pending abatement/appeal requests.',
    'Reconcile permit-driven value changes into the working assessment roll.',
    'Verify exempt-property classifications (municipal, religious, nonprofit) are current.',
  ];
  return [
    makeProposal({
      role: 'assessing',
      kind: 'exemption-appeal',
      title: `Exemption & appeal-season checklist — ${MUNICIPALITY.fiscalYear}`,
      rationale: 'Orchestrating roll preparation, exemptions, and appeal readiness.',
      confidence: 0.85,
      sources: [{ system: 'CAMA', module: 'Roll', recordId: 'commitment', label: 'Assessment roll / commitment' }],
      suggestedAction: 'Create as tracked roll-prep tasks with owners and the commitment deadline.',
      draft: items.map((it, i) => `${i + 1}. [ ] ${it}`).join('\n'),
    }),
  ];
}
