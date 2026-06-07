import { useEffect, useRef, useState } from 'react';
import { respond, greeting, type Turn } from '../assistant/respond';
import { useStore } from '../store';
import { ProposalCard } from './ProposalCard';

type ChatItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; turn: Turn };

let cid = 0;
const nid = () => `c-${cid++}`;

const SUGGESTIONS = [
  'What needs attention today?',
  'Look up Maria Delgado',
  'Triage the inquiries',
  'Any budget lines over?',
  'Draft a reply about the high water bill',
  'Draft a council briefing',
];

export function TrioAssistant({ screen }: { screen: string }) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const addProposals = useStore((s) => s.addProposals);
  const pendingCount = useStore((s) => s.proposals.filter((p) => p.status === 'pending').length);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Seed the conversation once.
  useEffect(() => {
    if (items.length === 0) {
      setItems(greeting().map((turn) => ({ id: nid(), role: 'assistant', turn })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [items, thinking, open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setItems((prev) => [...prev, { id: nid(), role: 'user', text: trimmed }]);
    setInput('');
    setThinking(true);

    window.setTimeout(() => {
      const turns = respond(trimmed, { screen });
      const newItems: ChatItem[] = [];
      for (const turn of turns) {
        if (turn.kind === 'proposal') addProposals([turn.proposal]);
        newItems.push({ id: nid(), role: 'assistant', turn });
      }
      setItems((prev) => [...prev, ...newItems]);
      setThinking(false);
    }, 550);
  }

  if (!open) {
    return (
      <button className="assistant-fab" onClick={() => setOpen(true)}>
        <span className="dot" />
        TRIO Assistant
        {pendingCount > 0 && <span className="fab-badge">{pendingCount}</span>}
      </button>
    );
  }

  return (
    <div className="assistant">
      <div className="assistant-head">
        <div className="assistant-avatar">✦</div>
        <div style={{ flex: 1 }}>
          <div className="assistant-title">TRIO Assistant</div>
          <div className="assistant-sub">Governed AI over TRIO + CAMA · {pendingCount} awaiting approval</div>
        </div>
        <button className="assistant-x" onClick={() => setOpen(false)} title="Minimize">▾</button>
      </div>

      <div className="assistant-body" ref={bodyRef}>
        {items.map((it) =>
          it.role === 'user' ? (
            <div key={it.id} className="bubble-row user">
              <div className="bubble user">{it.text}</div>
            </div>
          ) : it.turn.kind === 'text' ? (
            <div key={it.id} className="bubble-row">
              <div className="bubble assistant">{it.turn.text}</div>
            </div>
          ) : (
            <div key={it.id} className="bubble-row proposal-row">
              <ProposalCard id={it.turn.proposal.id} />
            </div>
          ),
        )}
        {thinking && (
          <div className="bubble-row">
            <div className="bubble assistant typing"><span /><span /><span /></div>
          </div>
        )}
      </div>

      <div className="assistant-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => send(s)} disabled={thinking}>{s}</button>
        ))}
      </div>

      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the TRIO Assistant…"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={thinking || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
