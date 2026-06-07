import { useEffect, useRef, useState } from 'react';
import { respond, STARTERS, WELCOME, greetingStats, type Turn } from '../assistant/respond';
import { useStore } from '../store';
import { ProposalCard } from './ProposalCard';

type ChatItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'steps'; steps: string[] }
  | { id: string; role: 'text'; text: string }
  | { id: string; role: 'proposal'; proposalId: string };

let cid = 0;
const nid = () => `c-${cid++}`;

// ---- streaming + steps animation helpers ---------------------------------

function StreamingText({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const step = Math.max(1, Math.round(text.length / 55));
    const id = setTimeout(() => setN((x) => Math.min(text.length, x + step)), 16);
    return () => clearTimeout(id);
  }, [n, text]);
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="caret" />}
    </>
  );
}

function StepsBlock({ steps }: { steps: string[] }) {
  const [revealed, setRevealed] = useState(0);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (revealed >= steps.length) {
      const id = setTimeout(() => setOpen(false), 600);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setRevealed((x) => x + 1), 300);
    return () => clearTimeout(id);
  }, [revealed, steps.length]);
  const done = revealed >= steps.length;
  return (
    <div className="steps-block">
      <button className="steps-head" onClick={() => setOpen((o) => !o)}>
        <span className={`steps-spark ${done ? 'done' : 'spin'}`}>{done ? '✓' : '✦'}</span>
        <span className="steps-title">{done ? `Worked across ${steps.length} step${steps.length > 1 ? 's' : ''}` : 'Working…'}</span>
        <span className="steps-chev">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="steps-list">
          {steps.map((s, i) => (
            <div key={i} className={`step ${i < revealed ? 'done' : i === revealed ? 'active' : 'pending'}`}>
              <span className="step-ic">{i < revealed ? '✓' : i === revealed ? '◌' : '·'}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- main panel ----------------------------------------------------------

export function TrioAssistant({ screen }: { screen: string }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [followups, setFollowups] = useState<string[]>([]);
  const addProposals = useStore((s) => s.addProposals);
  const pendingCount = useStore((s) => s.proposals.filter((p) => p.status === 'pending').length);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [items, thinking, open, expanded]);

  function send(raw: string) {
    const text = raw.trim();
    if (!text || thinking) return;
    setItems((prev) => [...prev, { id: nid(), role: 'user', text }]);
    setInput('');
    setFollowups([]);
    setThinking(true);

    const r = respond(text, { screen });
    const stepsMs = r.steps.length ? 500 + r.steps.length * 300 + 400 : 480;

    if (r.steps.length) {
      setItems((prev) => [...prev, { id: nid(), role: 'steps', steps: r.steps }]);
    }

    window.setTimeout(() => {
      const next: ChatItem[] = [];
      for (const turn of r.turns as Turn[]) {
        if (turn.kind === 'proposal') {
          addProposals([turn.proposal]);
          next.push({ id: nid(), role: 'proposal', proposalId: turn.proposal.id });
        } else {
          next.push({ id: nid(), role: 'text', text: turn.text });
        }
      }
      setItems((prev) => [...prev, ...next]);
      setFollowups(r.followups);
      setThinking(false);
      taRef.current?.focus();
    }, stepsMs);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const stats = greetingStats();
  const isEmpty = items.length === 0;

  if (!open) {
    return (
      <button className="assistant-fab" onClick={() => setOpen(true)}>
        <span className="fab-spark">✦</span>
        TRIO Assistant
        {pendingCount > 0 && <span className="fab-badge">{pendingCount}</span>}
      </button>
    );
  }

  return (
    <>
      {expanded && <div className="assistant-backdrop" onClick={() => setExpanded(false)} />}
      <div className={`assistant ${expanded ? 'expanded' : ''}`}>
        <div className="assistant-head">
          <div className="assistant-avatar"><span className="spark">✦</span></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="assistant-title">TRIO Assistant <span className="ai-pill">AI</span></div>
            <div className="assistant-sub"><span className="online-dot" /> Governed · {pendingCount} awaiting approval</div>
          </div>
          <button className="assistant-iconbtn" title="New chat" onClick={() => { setItems([]); setFollowups([]); }}>↺</button>
          <button className="assistant-iconbtn" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded((v) => !v)}>{expanded ? '⤡' : '⤢'}</button>
          <button className="assistant-iconbtn" title="Minimize" onClick={() => setOpen(false)}>—</button>
        </div>

        <div className="assistant-body" ref={bodyRef}>
          {isEmpty ? (
            <div className="welcome">
              <div className="welcome-avatar">✦</div>
              <div className="welcome-title">How can I help?</div>
              <p className="welcome-text">{WELCOME}</p>
              <div className="welcome-stat">
                ⚠️ {stats.exceptions} open exceptions ({stats.high} high) · ✉️ {stats.inquiries} resident inquiries
              </div>
              <div className="starters">
                {STARTERS.map((s) => (
                  <button key={s.title} className="starter" onClick={() => send(s.prompt)}>
                    <span className="starter-ic">{s.icon}</span>
                    <span className="starter-title">{s.title}</span>
                    <span className="starter-sub">{s.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            items.map((it) => {
              if (it.role === 'user') {
                return (
                  <div key={it.id} className="bubble-row user">
                    <div className="bubble user">{it.text}</div>
                  </div>
                );
              }
              if (it.role === 'steps') return <StepsBlock key={it.id} steps={it.steps} />;
              if (it.role === 'text') {
                return (
                  <div key={it.id} className="bubble-row">
                    <div className="assistant-msg">
                      <div className="msg-avatar">✦</div>
                      <div className="bubble assistant"><StreamingText text={it.text} /></div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={it.id} className="bubble-row proposal-row">
                  <ProposalCard id={it.proposalId} compact />
                </div>
              );
            })
          )}
          {thinking && (
            <div className="bubble-row">
              <div className="assistant-msg">
                <div className="msg-avatar">✦</div>
                <div className="bubble assistant typing"><span /><span /><span /></div>
              </div>
            </div>
          )}
        </div>

        {followups.length > 0 && !thinking && (
          <div className="followups">
            {followups.map((f) => (
              <button key={f} className="chip" onClick={() => send(f)}>{f}</button>
            ))}
          </div>
        )}

        <div className="composer">
          <textarea
            ref={taRef}
            className="composer-input"
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask the TRIO Assistant…"
          />
          <button className="composer-send" disabled={thinking || !input.trim()} onClick={() => send(input)} title="Send">
            ➤
          </button>
        </div>
        <div className="composer-hint">Governed · drafts require your approval · Enter to send</div>
      </div>
    </>
  );
}
