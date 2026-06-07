# TRIO + CAMA Operating Layer — Prototype

A working prototype of the **governed AI operating layer** over Harris **TRIO** (municipal
administration) and **CAMA** (assessment/valuation) for small municipal government, modeled on the
Town of Presque Isle, ME from the TRIO Web screenshots.

It demonstrates two complementary surfaces over one shared, auditable engine:

1. **TRIO interface mockup** — a faithful re-creation of the TRIO Web *Cash Receipting → Receipt
   Input* screen.
2. **TRIO Assistant** — a chatbot docked "over top" of TRIO for ad-hoc help (lookups, summaries,
   drafted replies).
3. **Agents module** — a console where each role agent (Finance, Customer Service, Water Bills,
   Payroll, Manager…) exposes runnable tasks ("Run payroll", "Run water bills", "Run report"),
   with run history and an outputs queue.

> **Governance first.** Agents only *read* the systems of record. Running an agent or asking the
> assistant **drafts** work — nothing is posted to TRIO/CAMA without a human **Approve / Edit /
> Reject**, and every decision is written to the audit log.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
# or
npm run build && npm run preview
```

No API keys or network required — it's a self-contained interactive demo.

## Try this

- Open the app on the **Cash Receipting · Receipt Input** screen. Click the **TRIO Assistant**
  (bottom-right) and try: *"What needs attention today?"*, *"Look up Maria Delgado"*,
  *"Draft a reply about the high water bill"*.
- Click the **✦ Agents** icon in the left module rail. Pick **Water Bills** → **Run** the
  *High-usage exception scan*, or **Payroll** → *Run all tasks*. Review the drafts in **Outputs**
  and Approve/Edit/Reject. Check **Activity** for run history.

## Architecture

```
TRIO Assistant  ─┐
                 ├─►  Task registry (agents/registry.ts)  ─►  AgentProposal[]  ─►  Store (queue + audit)
Agents module   ─┘         each task = role + cadence + run()        (human Approve/Edit/Reject)
```

- **Systems of record (mock):** `src/data/municipal.ts` — residents, utility/tax accounts, parcels,
  receipts, budget lines, exceptions, inquiries, and an approved knowledge base.
- **Agents:** `src/agents/*` — `finance`, `customerService`, `utility`, `payroll`, `manager`. Each
  exposes discrete, cadence-tagged tasks. `registry.ts` is the single catalog both surfaces read.
- **Governance + state:** `src/store.ts` — proposals, runs, and the audit log. `runTask` /
  `runAllForAgent` execute tasks; `approve` / `reject` resolve them and log everything.
- **UI:** `src/App.tsx` (TRIO shell + module rail), `components/ReceiptInputScreen.tsx`,
  `components/AgentsConsole.tsx`, `components/TrioAssistant.tsx`, `components/ProposalCard.tsx`.

### Why two surfaces, one engine

The assistant is the *reactive* entry point (in-context, conversational); the Agents module is the
*operational* one (catalog, scheduled cadence, run history, bulk review). Both trigger the same
registry tasks and write to the same queue + audit log, so there's one source of truth and adding a
new agent (e.g. Tax, Clerk) is just registering its tasks.

## Wiring a real LLM (next step)

Today each task's `run()` is a deterministic generator so the demo runs anywhere. To make drafts
LLM-authored, keep the registry/governance unchanged and swap the body of each generator to call the
Claude API (server-side), passing the same source records as context and returning the same
`AgentProposal` shape. The approval queue, audit log, and UI need no changes.

## Roles mapped vs. built

Built out: **Finance, Customer Service, Utility (Water Bills), Payroll, Manager, Tax / Revenue,
Clerk, Code Enforcement**.
Mapped from the strategy doc and ready to activate: **Assessing**.
