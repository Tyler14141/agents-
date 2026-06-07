import type { AgentProposal, SourceRef, UtilityAccount } from '../types';
import { UTILITY_ACCOUNTS, RESIDENTS } from '../data/municipal';
import { makeProposal, usd } from './util';

// ---------------------------------------------------------------------------
// Utility Billing ("water bills") agent
//
// Operating-layer opportunities (per strategy doc):
//   • High-usage and bill-exception detection
//   • Payment-plan and collections workflow support
//   • Final-bill and move-in/move-out workflow coordination
//
// Read-only over TRIO Utility Billing. Outputs are drafts for staff approval.
// ---------------------------------------------------------------------------

function residentName(id: string): string {
  return RESIDENTS.find((r) => r.id === id)?.name ?? 'resident';
}

function baseline(u: UtilityAccount): number {
  const prior = u.usage.slice(0, -1);
  if (prior.length === 0) return u.usage[0]?.ccf ?? 0;
  return Math.round(prior.reduce((s, r) => s + r.ccf, 0) / prior.length);
}

function src(u: UtilityAccount): SourceRef {
  return { system: 'TRIO', module: 'Utility Billing', recordId: u.id, label: `Utility ${u.id} (${u.serviceAddress})` };
}

/** Daily: detect usage spikes vs. the account's own baseline. */
export function utilityHighUsage(): AgentProposal[] {
  const out: AgentProposal[] = [];
  for (const u of UTILITY_ACCOUNTS) {
    const last = u.usage[u.usage.length - 1];
    const base = baseline(u);
    if (last && base > 0 && last.ccf >= base * 3 && u.status !== 'final') {
      out.push(
        makeProposal({
          role: 'utility',
          kind: 'utility-exception',
          title: `High-usage exception: ${u.id} (${u.serviceAddress})`,
          rationale: `${last.period} read of ${last.ccf} CCF is ${Math.round(last.ccf / base)}× the ~${base} CCF baseline.`,
          confidence: 0.83,
          sources: [src(u)],
          suggestedAction: `Hold the bill for ${u.id}, schedule a re-read, and send the resident the high-usage notice + leak-adjustment form.`,
          draft: [
            `${residentName(u.residentId)} — ${u.serviceAddress} (account ${u.id})`,
            `Latest read (${last.period}): ${last.ccf} CCF vs. baseline ~${base} CCF. Current balance ${usd(u.balance)}.`,
            '',
            `Recommended steps for review:`,
            `1. Place a billing hold on ${u.id} pending verification.`,
            `2. Schedule a no-charge re-read to rule out a misread.`,
            `3. Notify the resident (likely a leak — commonly a running toilet) and provide the leak-adjustment form per the Utility Ordinance.`,
          ].join('\n'),
        }),
      );
    }
  }
  return out;
}

/** Weekly: delinquency / shutoff candidates needing outreach. */
export function utilityDelinquency(): AgentProposal[] {
  const out: AgentProposal[] = [];
  for (const u of UTILITY_ACCOUNTS) {
    if (u.status === 'delinquent' || u.pastDueDays >= 30) {
      out.push(
        makeProposal({
          role: 'utility',
          kind: 'utility-collections',
          title: `Shutoff candidate: ${u.id} (${u.serviceAddress})`,
          rationale: `${usd(u.balance)} past due, ${u.pastDueDays} days delinquent.`,
          confidence: 0.8,
          sources: [src(u)],
          suggestedAction: `Queue ${u.id} for the shutoff list and send the payment-arrangement outreach below.`,
          draft: [
            `${residentName(u.residentId)} — ${u.serviceAddress} (account ${u.id})`,
            `Past-due balance: ${usd(u.balance)} (${u.pastDueDays} days).`,
            '',
            `Draft outreach:`,
            `"Your water account is ${u.pastDueDays} days past due (${usd(u.balance)}). To avoid disconnection you can set up a payment arrangement: the past-due balance over up to 3 months plus current charges, first installment due at signing.${u.balance > 300 ? ' Because the balance is over $300, a supervisor sign-off is required — we can do that at the counter.' : ''} A signed arrangement halts the shutoff process while payments are current."`,
          ].join('\n'),
        }),
      );
    }
  }
  return out;
}

/** Final-bill prep for move-outs. */
export function utilityFinalBills(): AgentProposal[] {
  const out: AgentProposal[] = [];
  for (const u of UTILITY_ACCOUNTS) {
    if (u.status === 'final') {
      out.push(
        makeProposal({
          role: 'utility',
          kind: 'utility-final-bill',
          title: `Final bill prep: ${u.id} (${u.serviceAddress})`,
          rationale: `Account marked final (move-out) with ${usd(u.balance)} outstanding and no final bill sent.`,
          confidence: 0.86,
          sources: [src(u)],
          suggestedAction: `Generate the final bill for ${u.id} and request a forwarding address + deposit refund.`,
          draft: [
            `${residentName(u.residentId)} — ${u.serviceAddress} (account ${u.id})`,
            `Last read ${u.lastReadDate}. Outstanding balance ${usd(u.balance)}.`,
            '',
            `Checklist for review:`,
            `1. Confirm move-out date and obtain final meter read.`,
            `2. Generate final bill (usage through move-out + outstanding ${usd(u.balance)}).`,
            `3. Capture forwarding address for the final bill and any deposit refund (due within 30 days).`,
          ].join('\n'),
        }),
      );
    }
  }
  return out;
}
