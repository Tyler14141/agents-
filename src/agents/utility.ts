import type { AgentProposal, SourceRef, UtilityAccount } from '../types';
import { UTILITY_ACCOUNTS, RESIDENTS, estimateBill, utilityBaseline, utilityFlag } from '../data/municipal';
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

function src(u: UtilityAccount): SourceRef {
  return { system: 'TRIO', module: 'Utility Billing', recordId: u.id, label: `Utility ${u.id} (${u.serviceAddress})` };
}

/** Daily: flag accounts with extremely HIGH or LOW consumption vs. their own baseline. */
export function utilityUsageScan(): AgentProposal[] {
  const out: AgentProposal[] = [];
  for (const u of UTILITY_ACCOUNTS) {
    const flag = utilityFlag(u);
    if (!flag) continue;
    const last = u.usage[u.usage.length - 1];
    const base = Math.round(utilityBaseline(u));

    if (flag === 'high') {
      out.push(
        makeProposal({
          role: 'utility',
          kind: 'utility-exception',
          title: `High-usage exception: ${u.id} (${u.serviceAddress})`,
          rationale: `${last.period} read of ${last.ccf} CCF is ${(last.ccf / Math.max(1, base)).toFixed(1)}× the ~${base} CCF baseline.`,
          confidence: 0.83,
          sources: [src(u)],
          suggestedAction: `Hold the bill for ${u.id}, schedule a re-read, and send the resident the high-usage notice + leak-adjustment form.`,
          draft: [
            `${residentName(u.residentId)} — ${u.serviceAddress} (account ${u.id})`,
            `Latest read (${last.period}): ${last.ccf} CCF vs. baseline ~${base} CCF. Estimated bill ${usd(estimateBill(last.ccf))} (typical ${usd(estimateBill(base))}).`,
            '',
            `Recommended steps for review:`,
            `1. Place a billing hold on ${u.id} pending verification.`,
            `2. Schedule a no-charge re-read to rule out a misread.`,
            `3. Notify the resident (likely a leak — commonly a running toilet) and provide the leak-adjustment form per the Utility Ordinance.`,
          ].join('\n'),
        }),
      );
    } else {
      out.push(
        makeProposal({
          role: 'utility',
          kind: 'utility-exception',
          title: `Low/zero-usage exception: ${u.id} (${u.serviceAddress})`,
          rationale: `${last.period} read of ${last.ccf} CCF is far below the ~${base} CCF baseline — possible stopped meter, vacancy, or misread.`,
          confidence: 0.78,
          sources: [src(u)],
          suggestedAction: `Hold the bill for ${u.id} and dispatch a re-read / meter check before billing.`,
          draft: [
            `${residentName(u.residentId)} — ${u.serviceAddress} (account ${u.id})`,
            `Latest read (${last.period}): ${last.ccf} CCF vs. baseline ~${base} CCF. An abnormally low or zero read often means a stuck/stopped meter, a vacated property, or a transposed read.`,
            '',
            `Recommended steps for review:`,
            `1. Place a billing hold on ${u.id} so an estimated/zero bill is not sent in error.`,
            `2. Dispatch a meter check / re-read; confirm occupancy status.`,
            `3. If the meter is failed, schedule replacement and bill on estimated consumption per policy.`,
          ].join('\n'),
        }),
      );
    }
  }
  return out;
}

/** Bill-run summary: counts, estimated billed total, flagged accounts, amount overdue. */
export function utilityBillRunSummary(): AgentProposal[] {
  const inRun = UTILITY_ACCOUNTS.filter((u) => u.status === 'active' || u.status === 'delinquent');
  const finals = UTILITY_ACCOUNTS.filter((u) => u.status === 'final');
  const billed = inRun.reduce((s, u) => s + estimateBill(u.usage[u.usage.length - 1]?.ccf ?? 0), 0);
  const high = UTILITY_ACCOUNTS.filter((u) => utilityFlag(u) === 'high');
  const low = UTILITY_ACCOUNTS.filter((u) => utilityFlag(u) === 'low');
  const pastDue = UTILITY_ACCOUNTS.filter((u) => u.pastDueDays > 0 || u.balance > 0);
  const overdue = pastDue.reduce((s, u) => s + u.balance, 0);
  const delinquent = UTILITY_ACCOUNTS.filter((u) => u.status === 'delinquent');

  const flaggedSources: SourceRef[] = [...high, ...low].map(src);

  return [
    makeProposal({
      role: 'utility',
      kind: 'utility-billrun',
      title: `Bill-run summary — cycle ending ${UTILITY_ACCOUNTS[0]?.lastReadDate ?? ''}`,
      rationale: `${inRun.length} accounts in the run; ${high.length + low.length} usage exception(s); ${usd(overdue)} overdue.`,
      confidence: 0.9,
      sources: flaggedSources,
      suggestedAction: `Resolve the ${high.length + low.length} flagged read(s), then release the bill run for ${inRun.length} accounts.`,
      draft: [
        `UTILITY BILL-RUN SUMMARY`,
        `Accounts in this cycle: ${inRun.length} (active + delinquent)${finals.length ? ` · ${finals.length} final bill(s) pending` : ''}.`,
        `Estimated billed this cycle: ${usd(billed)}.`,
        '',
        `Usage exceptions to clear before release: ${high.length + low.length}`,
        `  • High usage (${high.length}): ${high.map((u) => `${u.id} ${u.serviceAddress}`).join('; ') || 'none'}`,
        `  • Low / zero usage (${low.length}): ${low.map((u) => `${u.id} ${u.serviceAddress}`).join('; ') || 'none'}`,
        '',
        `Receivables: ${pastDue.length} account(s) past due totaling ${usd(overdue)}; ${delinquent.length} in delinquent status.`,
        `  ${pastDue.map((u) => `${u.id} ${usd(u.balance)} (${u.pastDueDays}d)`).join(' · ')}`,
      ].join('\n'),
    }),
  ];
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
