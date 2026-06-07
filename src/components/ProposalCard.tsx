import { useState } from 'react';
import { useStore } from '../store';
import { PROPOSAL_KIND_LABEL } from '../agents';

export function ProposalCard({ id }: { id: string }) {
  const p = useStore((s) => s.proposals.find((x) => x.id === id));
  const approve = useStore((s) => s.approve);
  const reject = useStore((s) => s.reject);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p?.draft ?? '');

  if (!p) return null;
  const isPending = p.status === 'pending';
  const shownDraft = p.editedDraft ?? p.draft;

  return (
    <div className={`card proposal ${p.status}`}>
      <div className="proposal-head">
        <span className="kind-tag">{PROPOSAL_KIND_LABEL[p.kind] ?? p.kind}</span>
        <div style={{ flex: 1 }}>
          <p className="title">{p.title}</p>
          <p className="rationale">{p.rationale}</p>
        </div>
        <span className={`status-tag ${p.status}`}>{p.status}</span>
      </div>

      <div className="confidence">
        <span>Confidence</span>
        <span className="bar"><i style={{ width: `${Math.round(p.confidence * 100)}%` }} /></span>
        <span>{Math.round(p.confidence * 100)}%</span>
      </div>

      {editing ? (
        <textarea className="draft-edit" value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <div className="draft-box">{shownDraft}</div>
      )}

      <div className="sources">
        {p.sources.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No source records cited.</span>}
        {p.sources.map((s, i) => (
          <span className="source-chip" key={i} title={`${s.system} · ${s.module}`}>
            <b>{s.system}</b> · {s.module} · {s.recordId}
          </span>
        ))}
      </div>

      <div className="action-note">
        <b>On approval:</b> {p.suggestedAction}
      </div>

      <div className="proposal-actions">
        {isPending && !editing && (
          <>
            <button className="btn btn-green btn-sm" onClick={() => approve(p.id)}>Approve</button>
            <button className="btn btn-sm" onClick={() => { setEditing(true); setText(p.draft); }}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => reject(p.id)}>Reject</button>
          </>
        )}
        {isPending && editing && (
          <>
            <button className="btn btn-green btn-sm" onClick={() => { approve(p.id, text); setEditing(false); }}>Approve edited</button>
            <button className="btn btn-sm" onClick={() => { setEditing(false); setText(p.draft); }}>Cancel</button>
          </>
        )}
        {!isPending && (
          <span className="resolved-by">
            {p.status === 'rejected' ? 'Rejected' : p.status === 'edited' ? 'Edited & approved' : 'Approved'} by {p.resolvedBy}
          </span>
        )}
      </div>
    </div>
  );
}
