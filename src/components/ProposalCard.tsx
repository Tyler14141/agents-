import { useState } from 'react';
import { useStore } from '../store';
import { PROPOSAL_KIND_LABEL } from '../agents';

const PREVIEW_LINES = 6;

export function ProposalCard({ id, compact = false }: { id: string; compact?: boolean }) {
  const p = useStore((s) => s.proposals.find((x) => x.id === id));
  const approve = useStore((s) => s.approve);
  const reject = useStore((s) => s.reject);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p?.draft ?? '');
  const [expanded, setExpanded] = useState(!compact);
  const [copied, setCopied] = useState(false);

  if (!p) return null;
  const isPending = p.status === 'pending';
  const shownDraft = p.editedDraft ?? p.draft;
  const lines = shownDraft.split('\n');
  const isLong = lines.length > PREVIEW_LINES;
  const preview = expanded || !isLong ? shownDraft : lines.slice(0, PREVIEW_LINES).join('\n');

  const copy = () => {
    navigator.clipboard?.writeText(shownDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div className={`card proposal ${p.status} ${compact ? 'compact' : ''}`}>
      <div className="proposal-head">
        <span className="kind-tag">{PROPOSAL_KIND_LABEL[p.kind] ?? p.kind}</span>
        <div style={{ flex: 1 }}>
          <p className="title">{p.title}</p>
          <p className="rationale">{p.rationale}</p>
        </div>
        <span className={`status-tag ${p.status}`}>
          {p.status === 'pending' ? 'Draft · needs approval' : p.status}
        </span>
      </div>

      <div className="confidence">
        <span>Confidence</span>
        <span className="bar"><i style={{ width: `${Math.round(p.confidence * 100)}%` }} /></span>
        <span>{Math.round(p.confidence * 100)}%</span>
      </div>

      {editing ? (
        <textarea className="draft-edit" value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <>
          <div className="draft-box">{preview}</div>
          {isLong && (
            <button className="link-btn" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show less ▴' : `Show full draft ▾ (${lines.length} lines)`}
            </button>
          )}
        </>
      )}

      {p.sources.length > 0 && (
        <div className="sources">
          <span className="sources-label">Sources</span>
          {p.sources.map((s, i) => (
            <span className="source-chip" key={i} title={`${s.system} · ${s.module} · ${s.recordId}`}>
              <span className="src-num">{i + 1}</span>
              <b>{s.system}</b> {s.module} · {s.recordId}
            </span>
          ))}
        </div>
      )}

      <div className="action-note">
        <b>On approval:</b> {p.suggestedAction}
      </div>

      <div className="proposal-actions">
        {isPending && !editing && (
          <>
            <button className="btn btn-green btn-sm" onClick={() => approve(p.id)}>✓ Approve</button>
            <button className="btn btn-sm" onClick={() => { setEditing(true); setText(p.draft); }}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => reject(p.id)}>Reject</button>
            <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </>
        )}
        {isPending && editing && (
          <>
            <button className="btn btn-green btn-sm" onClick={() => { approve(p.id, text); setEditing(false); }}>✓ Approve edited</button>
            <button className="btn btn-sm" onClick={() => { setEditing(false); setText(p.draft); }}>Cancel</button>
          </>
        )}
        {!isPending && (
          <span className="resolved-by">
            <span className="resolved-icon">{p.status === 'rejected' ? '✕' : '✓'}</span>
            {p.status === 'rejected' ? 'Rejected' : p.status === 'edited' ? 'Edited & approved · written back' : 'Approved · written back'} by {p.resolvedBy}
          </span>
        )}
      </div>
    </div>
  );
}
