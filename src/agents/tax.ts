import type { AgentProposal, SourceRef, TaxAccount } from '../types';
import { TAX_ACCOUNTS, PARCELS, RESIDENTS, MUNICIPALITY } from '../data/municipal';
import { makeProposal, usd } from './util';

// ---------------------------------------------------------------------------
// Tax / Revenue agent
//
// Operating-layer opportunities (per strategy doc):
//   • Delinquency and notice workflows
//   • Tax certificate preparation support
//   • Mortgage and ownership change checklists
//
// Read-only over TRIO Tax Billing & Collections (+ CAMA parcels). Drafts only.
// ---------------------------------------------------------------------------

function ownerName(id: string): string {
  return RESIDENTS.find((r) => r.id === id)?.name ?? 'owner';
}

function src(t: TaxAccount): SourceRef {
  return { system: 'TRIO', module: 'Tax Collections', recordId: t.id, label: `Tax ${t.id} (parcel ${t.parcelId})` };
}

/** Weekly: draft delinquency notices for overdue accounts. */
export function taxDelinquency(): AgentProposal[] {
  return TAX_ACCOUNTS.filter((t) => t.status === 'delinquent').map((t) => {
    const owner = ownerName(t.residentId);
    return makeProposal({
      role: 'tax',
      kind: 'delinquency-notice',
      title: `Delinquency notice: ${t.id} (parcel ${t.parcelId})`,
      rationale: `${usd(t.balance)} outstanding; last payment ${t.lastPayment?.date ?? 'n/a'}. Lien notice window approaching.`,
      confidence: 0.82,
      sources: [src(t)],
      suggestedAction: `Queue the delinquency notice for ${t.id} and record the notice date in Tax Collections.`,
      draft: [
        `NOTICE OF DELINQUENT PROPERTY TAXES`,
        `${owner} — parcel ${t.parcelId}`,
        '',
        `Our records show an unpaid balance of ${usd(t.balance)} on your ${MUNICIPALITY.fiscalYear} property taxes. To avoid further interest and the recording of a tax lien, payment is due upon receipt.`,
        `If you have already paid or wish to arrange payment, please contact the Tax Collector's office.`,
        '',
        `(Confirm exact interest accrued in Tax Collections before mailing; do not waive interest without authorization.)`,
      ].join('\n'),
    });
  });
}

/** Tax certificate / payoff prep for lien accounts. */
export function taxCertificates(): AgentProposal[] {
  return TAX_ACCOUNTS.filter((t) => t.status === 'lien').map((t) =>
    makeProposal({
      role: 'tax',
      kind: 'tax-certificate',
      title: `Tax certificate prep: ${t.id} (parcel ${t.parcelId})`,
      rationale: `Account in lien status with ${usd(t.balance)} outstanding; approaching foreclosure window.`,
      confidence: 0.78,
      sources: [src(t)],
      suggestedAction: `Prepare the payoff/certificate worksheet for ${t.id} for staff confirmation before quoting the owner.`,
      draft: [
        `${ownerName(t.residentId)} — parcel ${t.parcelId} (account ${t.id})`,
        `Status: matured tax lien. Principal balance ${usd(t.balance)}.`,
        '',
        `Certificate prep checklist for review:`,
        `1. Confirm recorded lien certificate date and the 18-month foreclosure deadline.`,
        `2. Compute full payoff: principal + statutory interest + recording/notice costs (verify in Tax Collections).`,
        `3. Prepare redemption figures and notify the owner of the exact amount and deadline.`,
        `4. Coordinate with the Treasurer/legal before any tax-sale action.`,
      ].join('\n'),
    }),
  );
}

/** Ownership/mortgage-change checklist triggered by recent parcel sales. */
export function taxOwnership(): AgentProposal[] {
  return PARCELS.filter((p) => p.lastSale).map((parcel) => {
    const tax = TAX_ACCOUNTS.find((t) => t.parcelId === parcel.id);
    return makeProposal({
      role: 'tax',
      kind: 'ownership-change',
      title: `Ownership-change review: parcel ${parcel.id}`,
      rationale: `Recorded sale ${parcel.lastSale!.date} for ${usd(parcel.lastSale!.price)} — billing/ownership update needed.`,
      confidence: 0.81,
      sources: [
        { system: 'CAMA', module: 'Sales', recordId: parcel.id, label: `Parcel ${parcel.id} sale` },
        ...(tax ? [src(tax)] : []),
      ],
      suggestedAction: `Open an ownership-update task for parcel ${parcel.id} and confirm the bill-to / mortgage holder.`,
      draft: [
        `Parcel ${parcel.id} — ${parcel.situsAddress}`,
        `Recorded sale: ${parcel.lastSale!.date}, ${usd(parcel.lastSale!.price)}.`,
        '',
        `Checklist for review:`,
        `1. Update owner of record and mailing/bill-to address from the recorded deed.`,
        `2. Verify any mortgage-holder / escrow billing flag for the next tax bill.`,
        `3. Confirm with Assessing whether the sale triggers a valuation or exemption review.`,
        `4. Pro-rate or transfer any outstanding balance per closing statement.`,
      ].join('\n'),
    });
  });
}
