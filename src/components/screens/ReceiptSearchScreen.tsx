import { useMemo, useState } from 'react';
import { RECEIPTS, RESIDENTS } from '../../data/municipal';
import { useStore } from '../../store';
import type { Receipt } from '../../types';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
const payer = (rc: Receipt) =>
  rc.residentId ? RESIDENTS.find((r) => r.id === rc.residentId)?.name ?? 'Unknown' : 'Walk-in / counter';

const MODULES = ['All', 'Cash Receipts', 'Tax', 'Utility'] as const;
const TENDERS = ['All', 'Cash', 'Check', 'Credit'] as const;

export function ReceiptSearchScreen() {
  const [text, setText] = useState('');
  const [module, setModule] = useState<(typeof MODULES)[number]>('All');
  const [tender, setTender] = useState<(typeof TENDERS)[number]>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const posts = useStore((s) => s.posts);

  // Counter payments posted at the front desk appear here as receipts.
  const postedReceipts: Receipt[] = posts.map((p) => ({
    id: p.receiptId,
    residentId: p.residentId,
    date: p.at.slice(0, 10),
    module: p.accountType === 'utility' ? 'Utility' : 'Tax',
    description: `${p.accountType === 'utility' ? 'Water' : 'Tax'} payment on ${p.accountId}`,
    amount: p.amount,
    tender: p.tender,
  }));

  const results = useMemo(() => {
    const q = text.trim().toLowerCase();
    return [...postedReceipts, ...RECEIPTS].filter((rc) => {
      if (module !== 'All' && rc.module !== module) return false;
      if (tender !== 'All' && rc.tender !== tender) return false;
      if (from && rc.date < from) return false;
      if (to && rc.date > to) return false;
      if (q) {
        const hay = `${rc.id} ${rc.description} ${payer(rc)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, module, tender, from, to, posts]);

  const total = results.reduce((s, r) => s + r.amount, 0);
  const selected = results.find((r) => r.id === sel) ?? null;

  function reset() {
    setText(''); setModule('All'); setTender('All'); setFrom(''); setTo(''); setSel(null);
  }

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Receipt Search</h2></div>

      <div className="rs-filters">
        <div className="rs-field rs-grow">
          <label>Search</label>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Receipt #, payer, or description…" />
        </div>
        <div className="rs-field">
          <label>Module</label>
          <select value={module} onChange={(e) => setModule(e.target.value as (typeof MODULES)[number])}>
            {MODULES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="rs-field">
          <label>Tender</label>
          <select value={tender} onChange={(e) => setTender(e.target.value as (typeof TENDERS)[number])}>
            {TENDERS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="rs-field">
          <label>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="rs-field">
          <label>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn btn-sm" onClick={reset}>Clear</button>
      </div>

      <div className="rs-summary">
        <span><b>{results.length}</b> receipt{results.length === 1 ? '' : 's'}</span>
        <span>Total <b>{usd(total)}</b></span>
      </div>

      <div className="mod-split">
        <table className="data mod-list">
          <thead>
            <tr><th>Receipt #</th><th>Date</th><th>Payer</th><th>Module</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {results.map((rc) => (
              <tr key={rc.id} className={rc.id === sel ? 'row-sel' : ''} onClick={() => setSel(rc.id)}>
                <td>{rc.id}</td>
                <td>{rc.date}</td>
                <td>{payer(rc)}</td>
                <td>{rc.module}</td>
                <td className="num">{usd(rc.amount)}</td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ padding: 20, textAlign: 'center' }}>No receipts match these filters.</td></tr>
            )}
          </tbody>
        </table>

        {selected ? (
          <div className="mod-detail card card-pad">
            <h3>{selected.id}</h3>
            <div className="kv"><span>Date</span><b>{selected.date}</b></div>
            <div className="kv"><span>Payer</span><b>{payer(selected)}</b></div>
            <div className="kv"><span>Module</span><b>{selected.module}</b></div>
            <div className="kv"><span>Description</span><b>{selected.description}</b></div>
            <div className="kv"><span>Tender</span><b>{selected.tender}</b></div>
            <div className="kv"><span>Amount</span><b>{usd(selected.amount)}</b></div>
            <div className="mod-detail-actions">
              <button className="btn btn-sm btn-primary">Reprint Receipt</button>
              <button className="btn btn-sm btn-danger">Void</button>
            </div>
          </div>
        ) : (
          <div className="mod-detail card card-pad">
            <p className="muted" style={{ margin: 0 }}>Select a receipt to view details, reprint, or void.</p>
          </div>
        )}
      </div>
    </div>
  );
}
