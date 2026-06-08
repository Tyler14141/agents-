import { useEffect, useMemo, useState } from 'react';
import { RESIDENTS, UTILITY_ACCOUNTS, TAX_ACCOUNTS, RECEIPTS } from '../../data/municipal';
import { useStore, paidFor, type PostedPayment } from '../../store';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

type PayTarget = { type: 'utility' | 'tax'; accountId: string; balance: number } | null;

export function CustomerSearchScreen() {
  const posts = useStore((s) => s.posts);
  const postPayment = useStore((s) => s.postPayment);
  const nav = useStore((s) => s.nav);
  const clearNav = useStore((s) => s.clearNav);

  const [q, setQ] = useState('');
  const [owingOnly, setOwingOnly] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [pay, setPay] = useState<PayTarget>(null);
  const [amount, setAmount] = useState('');
  const [tender, setTender] = useState<'Cash' | 'Check' | 'Credit'>('Cash');
  const [justPosted, setJustPosted] = useState<PostedPayment | null>(null);

  // Deep-link: when the assistant routes here with a customer, preselect them.
  useEffect(() => {
    if (nav?.module === 'cs' && nav.customerId) {
      setSel(nav.customerId);
      setQ('');
      clearNav();
    }
  }, [nav, clearNav]);

  const rows = useMemo(() => {
    const baseRows = RESIDENTS.map((r) => {
      const u = UTILITY_ACCOUNTS.find((x) => x.id === r.utilityAccountId);
      const t = TAX_ACCOUNTS.find((x) => x.id === r.taxAccountId);
      const water = Math.max(0, (u?.balance ?? 0) - (u ? paidFor(posts, 'utility', u.id) : 0));
      const tax = Math.max(0, (t?.balance ?? 0) - (t ? paidFor(posts, 'tax', t.id) : 0));
      return { id: r.id, name: r.name, address: r.mailingAddress, utilityId: u?.id, taxId: t?.id, uStatus: u?.status, tStatus: t?.status, water, tax, total: water + tax };
    });
    const s = q.trim().toLowerCase();
    return baseRows
      .filter((r) => (owingOnly ? r.total > 0 : true))
      .filter((r) => (!s ? true : `${r.name} ${r.address} ${r.utilityId ?? ''} ${r.taxId ?? ''} ${r.id}`.toLowerCase().includes(s)))
      .sort((a, b) => b.total - a.total);
  }, [q, owingOnly, posts]);

  // System-wide totals (independent of the current filter), net of posted payments.
  const allEff = RESIDENTS.map((r) => {
    const u = UTILITY_ACCOUNTS.find((x) => x.id === r.utilityAccountId);
    const t = TAX_ACCOUNTS.find((x) => x.id === r.taxAccountId);
    const water = u ? Math.max(0, u.balance - paidFor(posts, 'utility', u.id)) : 0;
    const tax = t ? Math.max(0, t.balance - paidFor(posts, 'tax', t.id)) : 0;
    return { water, tax, total: water + tax };
  });
  const totWater = allEff.reduce((s, r) => s + r.water, 0);
  const totTax = allEff.reduce((s, r) => s + r.tax, 0);
  const owingCount = allEff.filter((r) => r.total > 0).length;
  const filteredOwing = rows.reduce((s, r) => s + r.total, 0);

  const selected = rows.find((r) => r.id === sel) ?? null;
  const selReceipts = selected ? RECEIPTS.filter((rc) => rc.residentId === selected.id).slice(0, 2) : [];
  const selPosts = selected ? posts.filter((p) => p.residentId === selected.id) : [];

  function startPay(type: 'utility' | 'tax', accountId: string, balance: number) {
    setPay({ type, accountId, balance });
    setAmount(balance.toFixed(2));
    setJustPosted(null);
  }
  function submitPay() {
    if (!selected || !pay) return;
    const amt = Math.min(parseFloat(amount) || 0, pay.balance);
    if (amt <= 0) return;
    const p = postPayment({ accountType: pay.type, accountId: pay.accountId, residentId: selected.id, residentName: selected.name, amount: amt, tender });
    setJustPosted(p);
    setPay(null);
  }

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Customer Search — Balances Owed</h2></div>

      <div className="pr-stats">
        <div className="pr-stat"><div className="k">Customers with a balance</div><div className="v">{owingCount}</div></div>
        <div className="pr-stat"><div className="k">Water owed (all)</div><div className="v">{usd(totWater)}</div></div>
        <div className="pr-stat"><div className="k">Tax owed (all)</div><div className="v">{usd(totTax)}</div></div>
        <div className="pr-stat"><div className="k">Total owing (all)</div><div className="v">{usd(totWater + totTax)}</div></div>
      </div>

      <div className="rs-filters">
        <div className="rs-field rs-grow">
          <label>Search customer</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, address, or account # (U-…, T-…)" />
        </div>
        <label className="cs-check"><input type="checkbox" checked={owingOnly} onChange={(e) => setOwingOnly(e.target.checked)} /> Owes a balance only</label>
      </div>

      <div className="rs-summary">
        <span><b>{rows.length}</b> customer{rows.length === 1 ? '' : 's'} shown</span>
        <span>Sum owing (shown): <b>{usd(filteredOwing)}</b></span>
      </div>

      <div className="mod-split">
        <table className="data mod-list">
          <thead>
            <tr><th>Customer</th><th className="num">Water</th><th className="num">Tax</th><th className="num">Total owed</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.id === sel ? 'row-sel' : ''} onClick={() => { setSel(r.id); setPay(null); setJustPosted(null); }}>
                <td>{r.name}</td>
                <td className={`num ${r.water > 0 ? 'neg' : ''}`}>{usd(r.water)}</td>
                <td className={`num ${r.tax > 0 ? 'neg' : ''}`}>{usd(r.tax)}</td>
                <td className="num"><b>{usd(r.total)}</b></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="muted" style={{ padding: 18, textAlign: 'center' }}>No customers match.</td></tr>}
          </tbody>
          <tfoot>
            <tr><td><b>Sum owing (shown)</b></td><td className="num"><b>{usd(rows.reduce((s, r) => s + r.water, 0))}</b></td><td className="num"><b>{usd(rows.reduce((s, r) => s + r.tax, 0))}</b></td><td className="num"><b>{usd(filteredOwing)}</b></td></tr>
          </tfoot>
        </table>

        {selected ? (
          <div className="mod-detail card card-pad">
            <h3>{selected.name}</h3>
            <div className="kv"><span>Address</span><b style={{ textAlign: 'right' }}>{selected.address}</b></div>
            <div className="kv">
              <span>💧 Water {selected.utilityId ? `(${selected.utilityId})` : ''}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <b className={selected.water > 0 ? 'neg' : ''}>{selected.utilityId ? usd(selected.water) : 'no account'}</b>
                {selected.water > 0 && <button className="btn btn-sm btn-primary" onClick={() => startPay('utility', selected.utilityId!, selected.water)}>Pay</button>}
              </span>
            </div>
            <div className="kv">
              <span>🧾 Tax {selected.taxId ? `(${selected.taxId})` : ''}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <b className={selected.tax > 0 ? 'neg' : ''}>{selected.taxId ? usd(selected.tax) : 'no account'}</b>
                {selected.tax > 0 && <button className="btn btn-sm btn-primary" onClick={() => startPay('tax', selected.taxId!, selected.tax)}>Pay</button>}
              </span>
            </div>
            <div className="kv" style={{ borderTop: '2px solid var(--line)', marginTop: 4, paddingTop: 8 }}><span><b>Total owed</b></span><b className={selected.total > 0 ? 'neg' : ''} style={{ fontSize: 16 }}>{usd(selected.total)}</b></div>

            {pay && (
              <div className="pay-form">
                <div className="pay-form-title">Take payment — {pay.type === 'utility' ? 'Water' : 'Tax'} {pay.accountId}</div>
                <div className="pay-form-row">
                  <span className="pay-dollar">$</span>
                  <input className="pay-amt" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <select value={tender} onChange={(e) => setTender(e.target.value as 'Cash' | 'Check' | 'Credit')}>
                    <option>Cash</option><option>Check</option><option>Credit</option>
                  </select>
                </div>
                <div className="pay-form-actions">
                  <button className="btn btn-green btn-sm" onClick={submitPay}>Post payment</button>
                  <button className="btn btn-sm" onClick={() => setPay(null)}>Cancel</button>
                  <span className="muted" style={{ fontSize: 11.5 }}>Max {usd(pay.balance)}</span>
                </div>
              </div>
            )}

            {justPosted && (
              <div className="pay-posted">✓ Posted {usd(justPosted.amount)} {justPosted.tender} · receipt <b>{justPosted.receiptId}</b>. Balance updated and logged; receipt is now in Receipt Search.</div>
            )}

            {(selReceipts.length > 0 || selPosts.length > 0) && (
              <>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', margin: '12px 0 4px' }}>Recent payments</div>
                {selPosts.map((p) => (
                  <div key={p.id} className="kv" style={{ fontSize: 12 }}><span>{p.at.slice(0, 10)} · {p.accountType === 'utility' ? 'Water' : 'Tax'} {p.accountId} ({p.tender})</span><b>{usd(p.amount)}</b></div>
                ))}
                {selReceipts.map((rc) => (
                  <div key={rc.id} className="kv" style={{ fontSize: 12 }}><span>{rc.date} · {rc.description}</span><b>{usd(rc.amount)}</b></div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="mod-detail card card-pad"><p className="muted" style={{ margin: 0 }}>Select a customer to see the water + tax breakdown, total owed, and take a payment.</p></div>
        )}
      </div>
    </div>
  );
}
