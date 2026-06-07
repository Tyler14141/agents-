import type {
  AgentProposal,
  Inquiry,
  KnowledgeArticle,
  Resident,
  SourceRef,
} from '../types';
import {
  INQUIRIES,
  KNOWLEDGE,
  RESIDENTS,
  TAX_ACCOUNTS,
  UTILITY_ACCOUNTS,
  RECEIPTS,
} from '../data/municipal';
import { makeProposal, usd } from './util';

// ---------------------------------------------------------------------------
// Customer Service / Front Counter agent
//
// Operating-layer opportunities (per strategy doc):
//   • Inquiry triage
//   • Scripted answer assistance from approved knowledge
//   • Issue summarization for department handoffs
//   • Multilingual response drafting
//   • Resident-history context for faster service
//
// The agent only reads TRIO/CAMA records and the approved knowledge base. Every
// output is a proposal requiring human review before anything is sent or posted.
// ---------------------------------------------------------------------------

interface Routing {
  dept: string;
  urgency: 'high' | 'normal' | 'low';
  reason: string;
}

const ROUTES: { dept: string; keywords: string[] }[] = [
  { dept: 'Utility Billing', keywords: ['water', 'sewer', 'meter', 'utility', 'leak', 'shutoff', 'final bill', 'move'] },
  { dept: 'Tax Collections', keywords: ['tax', 'lien', 'property tax', 'tax sale', 'assessment', 'mill'] },
  { dept: 'Clerk / Motor Vehicle', keywords: ['register', 'registration', 'vehicle', 'truck', 'car', 'plate', 'license', 'dog'] },
  { dept: 'Finance', keywords: ['refund', 'overpayment', 'deposit'] },
];

const HIGH = ['shutoff', 'disconnect', 'lien', 'tax sale', 'leak', 'deadline'];
const LANG_LABEL: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French' };

function classify(inq: Inquiry): Routing {
  const text = `${inq.subject} ${inq.body}`.toLowerCase();
  let best = { dept: 'General / Front Counter', hits: 0, kw: '' };
  for (const r of ROUTES) {
    const matched = r.keywords.filter((k) => text.includes(k));
    if (matched.length > best.hits) best = { dept: r.dept, hits: matched.length, kw: matched.join(', ') };
  }
  const urgency: Routing['urgency'] = HIGH.some((k) => text.includes(k)) ? 'high' : best.hits > 0 ? 'normal' : 'low';
  return {
    dept: best.dept,
    urgency,
    reason: best.hits > 0 ? `matched on “${best.kw}”` : 'no specialized keywords; default front-counter handling',
  };
}

function matchKB(inq: Inquiry): KnowledgeArticle | undefined {
  const text = `${inq.subject} ${inq.body}`.toLowerCase();
  let best: { a?: KnowledgeArticle; hits: number } = { hits: 0 };
  for (const a of KNOWLEDGE) {
    const hits = a.keywords.filter((k) => text.includes(k)).length;
    if (hits > best.hits) best = { a, hits };
  }
  return best.hits > 0 ? best.a : undefined;
}

function residentContextLines(r: Resident): { lines: string[]; sources: SourceRef[]; exposure: number } {
  const lines: string[] = [];
  const sources: SourceRef[] = [];
  let exposure = 0;

  const util = UTILITY_ACCOUNTS.find((u) => u.id === r.utilityAccountId);
  if (util) {
    lines.push(`• Utility ${util.id} (${util.serviceAddress}): balance ${usd(util.balance)}, status ${util.status}${util.pastDueDays ? `, ${util.pastDueDays} days past due` : ''}.`);
    sources.push({ system: 'TRIO', module: 'Utility Billing', recordId: util.id, label: `Utility account ${util.id}` });
    exposure += util.balance;
  }
  const tax = TAX_ACCOUNTS.find((t) => t.id === r.taxAccountId);
  if (tax) {
    lines.push(`• Tax ${tax.id} (parcel ${tax.parcelId}): balance ${usd(tax.balance)}, status ${tax.status}.`);
    sources.push({ system: 'TRIO', module: 'Tax Collections', recordId: tax.id, label: `Tax account ${tax.id}` });
    exposure += tax.balance;
  }
  const recent = RECEIPTS.filter((rc) => rc.residentId === r.id).slice(0, 2);
  for (const rc of recent) {
    lines.push(`• Recent receipt ${rc.id} (${rc.date}): ${rc.description} — ${usd(rc.amount)} ${rc.tender}.`);
    sources.push({ system: 'TRIO', module: 'Cash Receipts', recordId: rc.id, label: `Receipt ${rc.id}` });
  }
  return { lines, sources, exposure };
}

function wantsTotals(inq: Inquiry): boolean {
  const text = inq.body.toLowerCase();
  return ['total', 'including', 'owe', 'balance', 'both', 'how much'].some((k) => text.includes(k));
}

export function runCustomerServiceAgent(): AgentProposal[] {
  const out: AgentProposal[] = [];
  const open = INQUIRIES.filter((i) => i.status === 'new');

  for (const inq of open) {
    const resident = inq.residentId ? RESIDENTS.find((r) => r.id === inq.residentId) : undefined;
    const route = classify(inq);
    const kb = matchKB(inq);
    const inqSource: SourceRef = { system: 'TRIO', module: 'Customer Service', recordId: inq.id, label: `Inquiry ${inq.id}` };

    // 1) Triage — always.
    out.push(
      makeProposal({
        role: 'customer-service',
        kind: 'inquiry-triage',
        title: `Triage ${inq.id}: ${inq.subject}`,
        rationale: `New ${inq.channel} inquiry from ${inq.contactName} (${inq.receivedAt}).`,
        confidence: route.dept === 'General / Front Counter' ? 0.62 : 0.88,
        sources: [inqSource],
        suggestedAction: `Tag inquiry ${inq.id} as “${route.dept}” / ${route.urgency} priority and route to that queue.`,
        draft: [
          `Suggested routing: ${route.dept}`,
          `Priority: ${route.urgency.toUpperCase()}  (${route.reason})`,
          resident ? `Resident on file: ${resident.name} — ${resident.mailingAddress}` : 'No resident matched — request account # or name at counter.',
          '',
          `Why: ${inq.body}`,
        ].join('\n'),
      }),
    );

    // 2) Knowledge-grounded response OR handoff summary.
    if (kb) {
      const isHandoff = kb.category === 'Tax Collections';
      const langNote = resident && resident.language !== 'en'
        ? `\n\n[Resident's preferred language is ${LANG_LABEL[resident.language]} — a ${LANG_LABEL[resident.language]} translation should accompany the reply.]`
        : '';

      if (isHandoff) {
        const ctx = resident ? residentContextLines(resident) : { lines: [], sources: [], exposure: 0 };
        out.push(
          makeProposal({
            role: 'customer-service',
            kind: 'issue-summary',
            title: `Handoff summary for ${inq.id} → Tax Collections`,
            rationale: `Inquiry requires specialized review (${kb.title}); preparing a clean handoff.`,
            confidence: 0.8,
            sources: [inqSource, ...ctx.sources],
            suggestedAction: `Create a Tax Collections work item from ${inq.id} with the summary below; notify resident of handoff.`,
            draft: [
              `Resident: ${inq.contactName}`,
              `Request: ${inq.subject}`,
              ctx.lines.length ? `\nAccount context:\n${ctx.lines.join('\n')}` : '',
              `\nApplicable policy (${kb.id} — ${kb.title}):`,
              kb.content,
              `\nNext step for Tax staff: confirm exact payoff (principal + interest + costs) in Tax Collections before quoting the resident. Do not waive interest without authorization.`,
            ].filter(Boolean).join('\n'),
          }),
        );
      } else {
        out.push(
          makeProposal({
            role: 'customer-service',
            kind: 'scripted-answer',
            title: `Reply draft for ${inq.id}: ${inq.subject}`,
            rationale: `Approved knowledge ${kb.id} (“${kb.title}”) matches this inquiry.`,
            confidence: 0.84,
            sources: [inqSource, { system: 'TRIO', module: `Knowledge Base — ${kb.category}`, recordId: kb.id, label: `${kb.id}: ${kb.title}` }],
            suggestedAction: `Send the reply to ${inq.contactName} via ${inq.channel === 'walk-in' ? 'counter handout' : inq.channel} after review.`,
            draft: [
              `Hi ${inq.contactName.split(' ')[0]},`,
              '',
              draftAnswer(inq, kb, resident),
              '',
              `If you have any other questions, just reply or call the Town Office.`,
              `— ${'{your name}'}, ${'Presque Isle Town Office'}`,
              langNote,
              '',
              `(Source: approved knowledge ${kb.id}, reviewed ${kb.lastReviewed}, approved by ${kb.approvedBy}.)`,
            ].join('\n'),
          }),
        );
      }
    }

    // 3) Resident-history context when the resident asks about totals/balances.
    if (resident && wantsTotals(inq)) {
      const ctx = residentContextLines(resident);
      out.push(
        makeProposal({
          role: 'customer-service',
          kind: 'resident-context',
          title: `Resident snapshot: ${resident.name}`,
          rationale: `Inquiry ${inq.id} asks about amounts owed across offices — assembling cross-module context.`,
          confidence: 0.9,
          sources: ctx.sources,
          suggestedAction: `Attach this snapshot to ${inq.id} so the rep can answer without re-keying lookups.`,
          draft: [
            `${resident.name} — ${resident.mailingAddress}`,
            resident.phone ? `Phone: ${resident.phone}` : '',
            '',
            ...ctx.lines,
            '',
            `Total amount currently owed across TRIO modules: ${usd(ctx.exposure)}.`,
          ].filter(Boolean).join('\n'),
        }),
      );
    }
  }

  return out;
}

// Task-level entry points for the Agents module.
export const csTriage = (): AgentProposal[] =>
  runCustomerServiceAgent().filter((p) => p.kind === 'inquiry-triage');
export const csReplies = (): AgentProposal[] =>
  runCustomerServiceAgent().filter((p) => p.kind === 'scripted-answer' || p.kind === 'issue-summary');
export const csContext = (): AgentProposal[] =>
  runCustomerServiceAgent().filter((p) => p.kind === 'resident-context');

function draftAnswer(_inq: Inquiry, kb: KnowledgeArticle, resident?: Resident): string {
  switch (kb.id) {
    case 'KB-01': {
      const util = resident ? UTILITY_ACCOUNTS.find((u) => u.id === resident.utilityAccountId) : undefined;
      const spike = util?.usage[util.usage.length - 1];
      const base = util ? Math.round(util.usage.slice(0, -1).reduce((s, u) => s + u.ccf, 0) / Math.max(1, util.usage.length - 1)) : undefined;
      return [
        `Thanks for flagging the higher-than-usual water bill.`,
        util && spike && base !== undefined
          ? `Our records show this month's read on account ${util.id} was ${spike.ccf} CCF versus your usual ~${base} CCF, which is what drove the ${usd(util.balance)} balance.`
          : `We'll review the meter read behind this bill.`,
        `A jump like this is most often a meter mis-read or a leak (a running toilet is the usual culprit). We can re-read your meter at no charge to confirm.`,
        `If a leak is confirmed and repaired, you may qualify for a one-time leak adjustment — we'll send the form and just need a copy of the repair receipt.`,
      ].join(' ');
    }
    case 'KB-02':
      return [
        `We can absolutely set up a payment arrangement to avoid a shutoff.`,
        `Standard arrangements spread the past-due balance over up to 3 months on top of your current charges, with the first installment due when we set it up.`,
        `Because your balance is over $300, it needs a quick supervisor sign-off, which we can do at the counter. Once the arrangement is signed and you're current on it, the shutoff process is on hold.`,
      ].join(' ');
    case 'KB-03':
      return [
        `To register your truck, please bring the title or previous registration, proof of insurance, and the bill of sale.`,
        `The cost is excise tax (based on the truck's MSRP and model year) plus state registration fees. We'll calculate the exact excise when we generate the registration, and we can give you an estimate first.`,
        `We take cash, check, or credit at the front counter.`,
      ].join(' ');
    case 'KB-04': {
      const util = resident ? UTILITY_ACCOUNTS.find((u) => u.id === resident.utilityAccountId) : undefined;
      return [
        `We can close your water account for the move-out.`,
        `We'll record your move-out date and take a final meter read, then generate a final bill for usage through that date plus any remaining balance${util ? ` (currently ${usd(util.balance)})` : ''}.`,
        `Please give us a forwarding address for the final bill and any deposit refund. Final balances are due within 30 days of the final bill date.`,
      ].join(' ');
    }
    default:
      return kb.content;
  }
}
