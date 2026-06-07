// ---------------------------------------------------------------------------
// Live Claude API client (via the local /api proxy that injects the key).
//
// Builds a system prompt grounded in the mock TRIO + CAMA systems of record so
// the assistant can answer free-form questions accurately. Falls back to the
// deterministic engine when the proxy/key is not configured.
// ---------------------------------------------------------------------------

import {
  MUNICIPALITY,
  RESIDENTS,
  UTILITY_ACCOUNTS,
  TAX_ACCOUNTS,
  PARCELS,
  RECEIPTS,
  BUDGET_LINES,
  EXCEPTIONS,
  INQUIRIES,
  KNOWLEDGE,
} from '../data/municipal';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function dataContext(): string {
  const j = (label: string, rows: unknown[]) => `${label}:\n${JSON.stringify(rows)}`;
  return [
    j('RESIDENTS', RESIDENTS),
    j('UTILITY_ACCOUNTS', UTILITY_ACCOUNTS),
    j('TAX_ACCOUNTS', TAX_ACCOUNTS),
    j('PARCELS (CAMA)', PARCELS),
    j('RECEIPTS (Cash Receipts)', RECEIPTS),
    j('BUDGET_LINES (Budgetary, FY ~92% elapsed)', BUDGET_LINES),
    j('OPEN_EXCEPTIONS', EXCEPTIONS),
    j('RESIDENT_INQUIRIES', INQUIRIES),
    j('APPROVED_KNOWLEDGE_BASE', KNOWLEDGE),
  ].join('\n\n');
}

export function buildSystemPrompt(): string {
  return [
    `You are the TRIO Assistant, a governed AI operating layer over Harris TRIO (municipal ERP) and CAMA (assessment & valuation) for the ${MUNICIPALITY.name}, ${MUNICIPALITY.state}. Today is ${MUNICIPALITY.asOf}; fiscal year ${MUNICIPALITY.fiscalYear}. The operator is ${MUNICIPALITY.user.name} (${MUNICIPALITY.user.title}).`,
    ``,
    `ROLE: You help municipal staff (clerk, finance, utility billing, tax, payroll, code enforcement, assessing, customer service, manager) complete recurring work faster across the systems of record below.`,
    ``,
    `GOVERNANCE (critical):`,
    `- You may READ the systems of record provided below, but you CANNOT write to, post to, or modify any system. You only answer questions and draft text that a human must review and approve.`,
    `- Never claim to have made a change, sent anything, or posted a payment. Frame actions as drafts/recommendations for human approval.`,
    `- Do not invent records. If something is not in the data, say so plainly.`,
    ``,
    `STYLE: Be concise and practical. Use plain text (no markdown headers). Cite record IDs when relevant (e.g., U-5013, T-3091, parcel 09-D-31, account 01-4150-220). Amounts are USD. When useful, end with one short suggested next step.`,
    ``,
    `SYSTEMS OF RECORD (JSON):`,
    dataContext(),
  ].join('\n');
}

export interface HealthInfo {
  ok: boolean;
  configured: boolean;
  model?: string;
}

export async function checkHealth(): Promise<HealthInfo | null> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) return null;
    return (await res.json()) as HealthInfo;
  } catch {
    return null;
  }
}

/** Ask the live model. Throws if the proxy is unavailable or not configured. */
export async function askLLM(messages: ChatMessage[]): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ system: buildSystemPrompt(), messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Assistant API error (${res.status})`);
  }
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error('Empty response from assistant API');
  return data.text;
}
