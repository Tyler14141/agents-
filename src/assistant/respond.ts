import type { AgentProposal } from '../types';
import {
  RESIDENTS,
  UTILITY_ACCOUNTS,
  TAX_ACCOUNTS,
  RECEIPTS,
  INQUIRIES,
  EXCEPTIONS,
  LIENS,
  PARCELS,
  BUDGET_LINES,
  REVENUE_LINES,
  EMPLOYEES,
  PAY_RUN,
  payFor,
  KNOWLEDGE,
  CODE_CASES,
  AGENDA_SUBMISSIONS,
  RECORDS_REQUESTS,
  CONTROL_EVENTS,
} from '../data/municipal';
import { runCustomerServiceAgent } from '../agents/customerService';
import { runFinanceAgent } from '../agents/finance';

// ---------------------------------------------------------------------------
// TRIO Assistant — the governed agent that works "over top" of the TRIO UI as
// a chatbot. It interprets the operator's request, reads the systems of record,
// and either answers directly (read-only) or drafts a reviewable proposal that
// must be approved before anything is written back.
//
// Returns reasoning STEPS (what the agent did), conversational TURNS (text +
// generative-UI proposal cards), and FOLLOW-UP suggestions — mirroring modern
// copilot UX (M365 Copilot, Intercom Fin, Agentforce).
// ---------------------------------------------------------------------------

export type Turn =
  | { kind: 'text'; text: string }
  | { kind: 'proposal'; proposal: AgentProposal };

export interface Reply {
  steps: string[];
  turns: Turn[];
  followups: string[];
  /** True when a specific TRIO intent matched. When false (free-form), the
   *  UI routes the question to the live Claude API if it is configured. */
  matched: boolean;
}

export interface AssistantContext {
  screen: string;
}

export interface StarterPrompt {
  icon: string;
  title: string;
  subtitle: string;
  prompt: string;
}

export const STARTERS: StarterPrompt[] = [
  { icon: '⚠️', title: 'What needs attention?', subtitle: 'Cross-module exception summary', prompt: 'What needs attention today?' },
  { icon: '🔎', title: 'Look up a resident', subtitle: 'Balances across TRIO modules', prompt: 'Look up Maria Delgado' },
  { icon: '✍️', title: 'Draft a reply', subtitle: 'Knowledge-grounded response', prompt: 'Draft a reply about the high water bill' },
  { icon: '📊', title: 'Run a report', subtitle: 'Council-ready briefing', prompt: 'Draft a council briefing' },
];

export const WELCOME =
  "I'm the TRIO Assistant — a governed agent over your TRIO systems. I read your systems of record and draft work for you to approve; I never post on my own. Where should we start?";

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const t = (text: string): Turn => ({ kind: 'text', text });
const p = (proposal: AgentProposal): Turn => ({ kind: 'proposal', proposal });
const reply = (steps: string[], turns: Turn[], followups: string[] = [], matched = true): Reply => ({ steps, turns, followups, matched });

// ---- lookups -------------------------------------------------------------

function findResident(q: string) {
  const s = q.toLowerCase();
  return RESIDENTS.find(
    (r) =>
      r.name.toLowerCase().includes(s) ||
      r.id.toLowerCase() === s ||
      (r.utilityAccountId ?? '').toLowerCase() === s ||
      (r.taxAccountId ?? '').toLowerCase() === s,
  );
}

function residentSnapshot(residentId: string): string {
  const r = RESIDENTS.find((x) => x.id === residentId)!;
  const util = UTILITY_ACCOUNTS.find((u) => u.id === r.utilityAccountId);
  const tax = TAX_ACCOUNTS.find((x) => x.id === r.taxAccountId);
  const recent = RECEIPTS.filter((rc) => rc.residentId === r.id).slice(0, 2);
  const lines = [`${r.name} — ${r.mailingAddress}`];
  if (r.phone) lines.push(`Phone ${r.phone} · Preferred language ${r.language.toUpperCase()}`);
  if (util) lines.push(`💧 Utility ${util.id} (${util.serviceAddress}): ${usd(util.balance)}, ${util.status}${util.pastDueDays ? `, ${util.pastDueDays}d past due` : ''}`);
  if (tax) lines.push(`🧾 Tax ${tax.id} (parcel ${tax.parcelId}): ${usd(tax.balance)}, ${tax.status}`);
  for (const rc of recent) lines.push(`🧮 ${rc.date} ${rc.description}: ${usd(rc.amount)} ${rc.tender}`);
  const owed = (util?.balance ?? 0) + (tax?.balance ?? 0);
  lines.push(`Total currently owed across TRIO: ${usd(owed)}.`);
  return lines.join('\n');
}

// ---- proposal pickers (reuse the same agent generators) ------------------

function financeProposals(kinds: string[]): AgentProposal[] {
  return runFinanceAgent().filter((x) => kinds.includes(x.kind));
}

function csProposalsForInquiry(inquiryId: string): AgentProposal[] {
  return runCustomerServiceAgent().filter(
    (x) => x.title.includes(inquiryId) && (x.kind === 'scripted-answer' || x.kind === 'issue-summary'),
  );
}

const TOPIC_TO_INQUIRY: { keywords: string[]; id: string }[] = [
  { keywords: ['water', 'leak', 'high bill', 'usage'], id: 'IN-201' },
  { keywords: ['payment plan', 'arrangement', 'shutoff', 'disconnect'], id: 'IN-202' },
  { keywords: ['register', 'registration', 'vehicle', 'truck', 'excise'], id: 'IN-203' },
  { keywords: ['move', 'final bill', 'closing', 'close account', 'move-out'], id: 'IN-204' },
  { keywords: ['lien', 'tax sale'], id: 'IN-205' },
];

// ---- universal search + receivables --------------------------------------

function resName(id?: string): string {
  return id ? RESIDENTS.find((r) => r.id === id)?.name ?? id : 'walk-in';
}

/** Searches every dataset in the demo and returns formatted match lines. */
function searchAll(q: string): string[] {
  const groups: { label: string; rows: { key: string; out: string }[] }[] = [
    { label: 'Residents', rows: RESIDENTS.map((r) => ({ key: `${r.id} ${r.name} ${r.mailingAddress} ${r.phone ?? ''} ${r.email ?? ''}`, out: `${r.name} — ${r.mailingAddress}${r.phone ? ` · ${r.phone}` : ''}` })) },
    { label: 'Utility accounts', rows: UTILITY_ACCOUNTS.map((u) => ({ key: `${u.id} ${u.serviceAddress} ${u.status} ${resName(u.residentId)}`, out: `${u.id} ${u.serviceAddress} (${resName(u.residentId)}) — ${usd(u.balance)}, ${u.status}${u.pastDueDays ? `, ${u.pastDueDays}d past due` : ''}` })) },
    { label: 'Tax accounts', rows: TAX_ACCOUNTS.map((t) => ({ key: `${t.id} ${t.parcelId} ${t.status} ${resName(t.residentId)}`, out: `${t.id} parcel ${t.parcelId} (${resName(t.residentId)}) — ${usd(t.balance)}, ${t.status}` })) },
    { label: 'Tax liens', rows: LIENS.map((l) => ({ key: `${l.id} ${l.parcelId} ${l.owner}`, out: `${l.id} ${l.parcelId} ${l.owner} — forecloses ${l.foreclosureDate}, redemption ${usd(l.principal + l.interestAndCosts)}` })) },
    { label: 'Parcels (CAMA)', rows: PARCELS.map((p) => ({ key: `${p.id} ${p.situsAddress} ${resName(p.residentId)} ${p.permitOpen ?? ''}`, out: `${p.id} ${p.situsAddress} — value ${usd(p.landValue + p.buildingValue)}${p.permitOpen ? `, permit ${p.permitOpen}` : ''}` })) },
    { label: 'Receipts', rows: RECEIPTS.map((rc) => ({ key: `${rc.id} ${rc.description} ${rc.module} ${rc.tender} ${resName(rc.residentId)}`, out: `${rc.id} ${rc.date} ${rc.description} — ${usd(rc.amount)} ${rc.tender}` })) },
    { label: 'Budget lines', rows: BUDGET_LINES.map((b) => ({ key: `${b.account} ${b.department} ${b.description}`, out: `${b.account} ${b.description} (${b.department}) — budget ${usd(b.budget)}, committed ${usd(b.actual + b.encumbered)}` })) },
    { label: 'Revenues', rows: REVENUE_LINES.map((r) => ({ key: `${r.account} ${r.source}`, out: `${r.account} ${r.source} — budget ${usd(r.budget)}, collected ${usd(r.actual)}` })) },
    { label: 'Employees & pay', rows: PAY_RUN.lines.map((l) => { const e = EMPLOYEES.find((x) => x.id === l.employeeId)!; const pay = payFor(e, l); return { key: `${e.id} ${e.name} ${e.department} ${e.position}`, out: `${e.name} — ${e.position}, ${e.department} (${e.type === 'salary' ? `${usd(e.rate)}/yr` : `${usd(e.rate)}/hr`}); this run gross ${usd(pay.gross)}, OT ${l.otHours}h` }; }) },
    { label: 'Exceptions', rows: EXCEPTIONS.map((x) => ({ key: `${x.id} ${x.module} ${x.severity} ${x.description}`, out: `[${x.severity}] ${x.module}: ${x.description}` })) },
    { label: 'Inquiries', rows: INQUIRIES.map((i) => ({ key: `${i.id} ${i.contactName} ${i.subject} ${i.body} ${i.channel}`, out: `${i.id} (${i.channel}) ${i.contactName}: ${i.subject}` })) },
    { label: 'Code cases', rows: CODE_CASES.map((c) => ({ key: `${c.id} ${c.address} ${c.type} ${c.description} ${c.status}`, out: `${c.id} ${c.address} — ${c.type}, ${c.status} (${c.ageDays}d)` })) },
    { label: 'Agenda items', rows: AGENDA_SUBMISSIONS.map((a) => ({ key: `${a.id} ${a.title} ${a.department} ${a.type}`, out: `${a.id} ${a.title} (${a.department})` })) },
    { label: 'Records requests', rows: RECORDS_REQUESTS.map((r) => ({ key: `${r.id} ${r.requester} ${r.subject} ${r.status}`, out: `${r.id} ${r.requester}: ${r.subject} — due ${r.dueBy} (${r.status})` })) },
    { label: 'Control signals', rows: CONTROL_EVENTS.map((c) => ({ key: `${c.id} ${c.module} ${c.actor} ${c.detail} ${c.type}`, out: `[${c.risk}] ${c.module}: ${c.detail}` })) },
    { label: 'Knowledge base', rows: KNOWLEDGE.map((k) => ({ key: `${k.id} ${k.title} ${k.category} ${k.keywords.join(' ')} ${k.content}`, out: `${k.id} ${k.title} (${k.category})` })) },
  ];
  const terms = q.split(/\s+/).filter((t) => t.length >= 2);
  const match = (key: string) => { const k = key.toLowerCase(); return k.includes(q) || (terms.length > 0 && terms.every((t) => k.includes(t))); };
  const out: string[] = [];
  let total = 0;
  for (const g of groups) {
    const hits = g.rows.filter((r) => match(r.key)).slice(0, 5);
    if (hits.length) { out.push(`${g.label}:`); for (const h of hits) out.push(`  • ${h.out}`); total += hits.length; }
    if (total >= 18) break;
  }
  return out;
}

function owingSummary(): string {
  const rows = RESIDENTS.map((r) => {
    const u = UTILITY_ACCOUNTS.find((x) => x.id === r.utilityAccountId);
    const tx = TAX_ACCOUNTS.find((x) => x.id === r.taxAccountId);
    return { name: r.name, water: u?.balance ?? 0, tax: tx?.balance ?? 0 };
  }).map((x) => ({ ...x, total: x.water + x.tax })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const water = rows.reduce((s, r) => s + r.water, 0);
  const tax = rows.reduce((s, r) => s + r.tax, 0);
  return [
    `Balances owed across TRIO (${rows.length} customers with a balance):`,
    `• Water (utility) receivable: ${usd(water)}`,
    `• Property tax receivable: ${usd(tax)}`,
    `• Total owing: ${usd(water + tax)}`,
    '',
    `Top balances:`,
    ...rows.slice(0, 6).map((r) => `  • ${r.name}: ${usd(r.total)} (water ${usd(r.water)}, tax ${usd(r.tax)})`),
  ].join('\n');
}

// ---- main router ---------------------------------------------------------

export function respond(input: string, _ctx: AssistantContext): Reply {
  const q = input.trim().toLowerCase();
  if (!q) return reply([], [t("I didn't catch that — try “help” to see what I can do.")], [], false);

  // help
  if (q.includes('help') || q === '?' || q.includes('what can you')) {
    return reply(
      ['Listing capabilities'],
      [
        t(
          [
            "I work across TRIO (and CAMA) and draft work for you to approve — I never post to a system of record on my own. Try:",
            '• “Look up Maria Delgado” — cross-module resident snapshot',
            '• “What needs attention today?” — exception summary',
            '• “Any budget lines over?” — variance explanations',
            '• “Draft the month-end close checklist”',
            '• “Draft a council briefing”',
            '• “Show inquiries” / “Triage the inquiries”',
            '• “Draft a reply about the high water bill” (or payment plan, registration, move-out)',
          ].join('\n'),
        ),
      ],
      ['What needs attention today?', 'Triage the inquiries'],
    );
  }

  // explain the receipt currently on screen
  if ((q.includes('receipt') || q.includes('transaction')) && (q.includes('explain') || q.includes('this') || q.includes('what'))) {
    const rc = RECEIPTS[0];
    return reply(
      ['Reading the open transaction', 'Pulling payer record from Cash Receipts'],
      [
        t(
          [
            `The open transaction is a Motor Vehicle receipt (TRIO Cash Receipts ${rc.id}):`,
            `• Type 99 — Motor Vehicle, MVR3 20993897`,
            `• Paid by ${RESIDENTS[0].name} (ID# 235242)`,
            `• Amount ${usd(rc.amount)}, tendered ${rc.tender} — receipt balances, change due $0.00`,
            `Nothing here needs correction.`,
          ].join('\n'),
        ),
      ],
      ['Look up the payer', 'What needs attention today?'],
    );
  }

  // lookup
  if (q.includes('look up') || q.includes('lookup') || q.includes('find ') || q.startsWith('who is') || /\b(u-|t-|r-)\d/.test(q)) {
    const query = q.replace(/.*(look up|lookup|find|who is)/, '').trim() || q;
    const r = findResident(query);
    if (r) {
      return reply(
        ['Searching residents & accounts', 'Joining Utility + Tax + Cash Receipts', 'Assembling snapshot'],
        [t(residentSnapshot(r.id))],
        ['Draft a reply to this resident', 'What needs attention today?'],
      );
    }
    return reply([], [t(`I couldn't find an account matching “${query}”. Try a name (e.g. “Maria Delgado”) or an account # (U-5013, T-3090, R-1002).`)], [], false);
  }

  // exceptions / attention
  if (q.includes('exception') || q.includes('attention') || q.includes('today') || q.includes('flag') || q.includes('problem')) {
    const high = EXCEPTIONS.filter((x) => x.severity === 'high').length;
    return reply(
      ['Reading Utility, Tax, Payroll & Cash Receipts', `Scanning ${EXCEPTIONS.length} open exceptions`, 'Ranking by severity & exposure', 'Drafting summary'],
      [
        t(`There are ${EXCEPTIONS.length} open exceptions (${high} high severity) across Utility, Tax, Payroll, and Cash Receipts. Here's a summary you can review and route:`),
        ...financeProposals(['exception-summary']).map(p),
      ],
      ['Any budget lines over?', 'Draft a council briefing'],
    );
  }

  // variance / budget
  if (q.includes('variance') || q.includes('budget') || q.includes('overspend')) {
    const props = financeProposals(['variance-explanation']).filter((x) => x.title.startsWith('Over budget'));
    if (props.length) {
      return reply(
        ['Reading TRIO Budgetary', 'Comparing committed vs. appropriation', 'Drafting variance explanations'],
        [
          t(`${props.length} budget line(s) are over their appropriation with the year ~92% elapsed. I drafted variance explanations — approve to attach them as budget notes:`),
          ...props.map(p),
        ],
        ['Draft the month-end close checklist', 'Draft a council briefing'],
      );
    }
  }

  // close checklist
  if (q.includes('close') && (q.includes('checklist') || q.includes('month') || q.includes('period'))) {
    return reply(
      ['Reviewing open items for the period', 'Assembling close checklist'],
      [t('Here is a month-end close checklist, pre-populated with the open exceptions to clear first:'), ...financeProposals(['close-checklist']).map(p)],
      ['What needs attention today?'],
    );
  }

  // council memo / briefing
  if (q.includes('council') || q.includes('memo') || q.includes('briefing') || q.includes('board')) {
    return reply(
      ['Reading budget, tax & utility receivables', 'Synthesizing financial position', 'Drafting briefing'],
      [t('I drafted a council briefing on the FY2026 financial position. Finance Director to finalize before distribution:'), ...financeProposals(['council-memo']).map(p)],
      ['Any budget lines over?', 'What needs attention today?'],
    );
  }

  // triage inquiries
  if (q.includes('triage')) {
    const props = runCustomerServiceAgent().filter((x) => x.kind === 'inquiry-triage').slice(0, 5);
    return reply(
      ['Reading the inquiry inbox', `Classifying ${props.length} inquiries`, 'Assigning routing & priority'],
      [t(`I triaged the ${props.length} open inquiries — suggested routing and priority for each. Approve to tag and route:`), ...props.map(p)],
      ['Draft a reply about the high water bill', 'Draft a reply about a payment plan'],
    );
  }

  // show inquiries
  if (q.includes('inquir') || q.includes('messages') || q.includes('queue') || q.includes('walk-in')) {
    const open = INQUIRIES.filter((i) => i.status === 'new');
    return reply(
      ['Reading the inquiry inbox'],
      [
        t([`${open.length} open inquiries:`, ...open.map((i) => `• ${i.id} (${i.channel}) — ${i.contactName}: ${i.subject}`)].join('\n')),
      ],
      ['Triage the inquiries', 'Draft a reply about the high water bill'],
    );
  }

  // draft a reply on a topic
  if (q.includes('draft') || q.includes('reply') || q.includes('respond') || q.includes('answer')) {
    const topic = TOPIC_TO_INQUIRY.find((x) => x.keywords.some((k) => q.includes(k)));
    if (topic) {
      const props = csProposalsForInquiry(topic.id);
      if (props.length) {
        return reply(
          [`Matching ${topic.id} to approved knowledge`, 'Pulling resident context', 'Drafting reply'],
          [t(`Here's a knowledge-grounded draft for ${topic.id}. Review, edit if needed, then approve to send:`), ...props.map(p)],
          ['Draft a reply about a payment plan', 'Triage the inquiries'],
        );
      }
    }
    return reply([], [t('Which topic? I can draft a reply about: the high water bill, a payment plan / shutoff, vehicle registration, a move-out / final bill, or a tax lien.')], ['Draft a reply about the high water bill', 'Draft a reply about a payment plan'], false);
  }

  // balances owed / receivables summary
  if (q.includes('owing') || q.includes('owe') || q.includes('outstanding') || q.includes('arrears') || q.includes('receivable') || (q.includes('total') && (q.includes('owed') || q.includes('balance')))) {
    return reply(
      ['Joining Utility + Tax receivables', 'Summing balances owed'],
      [t(owingSummary())],
      ['Look up Maria Delgado', 'What needs attention today?'],
    );
  }

  // greeting
  if (q === 'hi' || q === 'hello' || q === 'hey' || q.includes('thank')) {
    return reply([], [t('Happy to help. Ask me to look something up, summarize what needs attention, or draft a reply or memo.')], ['What needs attention today?', 'Look up Maria Delgado'], false);
  }

  // universal search across every dataset (and, when live, the Claude API).
  const results = searchAll(q);
  if (results.length) {
    return reply(
      ['Searching all TRIO + CAMA records', 'Collecting matches'],
      [t([`Here's what I found for “${input.trim()}”:`, '', ...results].join('\n'))],
      ['How much is owed in total?', 'What needs attention today?'],
      false,
    );
  }
  return reply(
    [],
    [t(`I couldn't find “${input.trim()}” in the records. Try a name, address, account # (U-/T-), parcel, department, or employee — or ask “how much is owed in total?”`)],
    ['How much is owed in total?', 'Look up Maria Delgado'],
    false,
  );
}

export function greetingStats(): { exceptions: number; high: number; inquiries: number } {
  return {
    exceptions: EXCEPTIONS.length,
    high: EXCEPTIONS.filter((x) => x.severity === 'high').length,
    inquiries: INQUIRIES.filter((i) => i.status === 'new').length,
  };
}
