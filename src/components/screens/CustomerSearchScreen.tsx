import { useEffect, useMemo, useState } from 'react';
import { RESIDENTS, UTILITY_ACCOUNTS, TAX_ACCOUNTS, RECEIPTS } from '../../data/municipal';
import { useStore, paidFor, type PostedPayment } from '../../store';

const blankEdit = { mailingAddress: '', phone: '', email: '' };

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

type PayTarget = { type: 'utility' | 'tax'; accountId: string; balance: number } | null;

export function CustomerSearchScreen() {
  const posts = useStore((s) => s.posts);
  const postPayment = useStore((s) => s.postPayment);
  const customerEdits = useStore((s) => s.customerEdits);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const nav = useStore((s) => s.nav);
  const clearNav = useStore((s) => s.clearNav);

  const [q, setQ] = useState('');
  const [owingOnly, setOwingOnly] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [pay, setPay] = useState<PayTarget>(null);
  const [amount, setAmount] = useState('');
  const [tender, setTender] = useState<'Cash' | 'Check' | 'Credit'>('Cash');
  const [justPosted, setJustPosted] = useState<PostedPayment | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(blankEdit);
  const [savedInfo, setSavedInfo] = useState(false);

  const addrOf = (id: string, base?: string) => customerEdits[id]?.mailingAddress ?? base ?? '';

  function openEdit(id: string) {
    const r = RESIDENTS.find((x) => x.id === id);
    const e = customerEdits[id] ?? {};
    setForm({ mailingAddress: e.mailingAddress ?? r?.mailingAddress ?? '', phone: e.phone ?? r?.phone ?? '', email: e.email ?? r?.email ?? '' });
    setEditing(true);
    setSavedInfo(false);
  }

  // Deep-link: when the assistant routes here with a customer, preselect (and optionally edit).
  useEffect(() => {
    if (nav?.module === 'cs' && nav.customerId) {
      setSel(nav.customerId);
      setQ('');
      setPay(null);
      if (nav.intent === 'edit') openEdit(nav.customerId);
      else setEditing(false);
      clearNav();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav]);

  const rows = useMemo(() => {
    const baseRows = RESIDENTS.map((r) => {
      const u = UTILITY_ACCOUNTS.find((x) => x.id === r.utilityAccountId);
      const t = TAX_ACCOUNTS.find((x) => x.id === r.taxAccountId);
      const water = Math.max(0, (u?.balance ?? 0) - (u ? paidFor(posts, 'utility', u.id) : 0));
      const tax = Math.max(0, (t?.balance ?? 0) - (t ? paidFor(posts, 'tax', t.id) : 0));
      return { id: r.id, name: r.name, address: addrOf(r.id, r.mailingAddress), utilityId: u?.id, taxId: t?.id, uStatus: u?.status, tStatus: t?.status, water, tax, total: water + tax };
    });
    const s = q.trim().toLowerCase();
    return baseRows
      .filter((r) => (owingOnly ? r.total > 0 : true))
      .filter((r) => (!s ? true : `${r.name} ${r.address} ${r.utilityId ?? ''} ${r.taxId ?? ''} ${r.id}`.toLowerCase().includes(s)))
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, owingOnly, posts, customerEdits]);

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
  const selRes = selected ? RESIDENTS.find((x) => x.id === selected.id) : null;
  const selEdit = selected ? customerEdits[selected.id] : undefined;
  const selPhone = selEdit?.phone ?? selRes?.phone ?? '';
  const selEmail = selEdit?.email ?? selRes?.email ?? '';
  const selReceipts = selected ? RECEIPTS.filter((rc) => rc.residentId === selected.id).slice(0, 2) : [];
  const selPosts = selected ? posts.filter((p) => p.residentId === selected.id) : [];

  function startPay(type: 'utility' | 'tax', accountId: string, balance: number) {
    setPay({ type, accountId, balance });
    setAmount(balance.toFixed(2));
    setJustPosted(null);
    setEditing(false);
  }
  function submitPay() {
    if (!selected || !pay) return;
    const amt = Math.min(parseFloat(amount) || 0, pay.balance);
    if (amt <= 0) return;
    const p = postPayment({ accountType: pay.type, accountId: pay.accountId, residentId: selected.id, residentName: selected.name, amount: amt, tender });
    setJustPosted(p);
    setPay(null);
  }
  function saveEdit() {
    if (!selected) return;
    const r = RESIDENTS.find((x) => x.id === selected.id);
    const patch: { mailingAddress?: string; phone?: string; email?: string } = {};
    if (form.mailingAddress && form.mailingAddress !== r?.mailingAddress) patch.mailingAddress = form.mailingAddress;
    if (form.phone !== (r?.phone ?? '')) patch.phone = form.phone;
    if (form.email !== (r?.email ?? '')) patch.email = form.email;
    updateCustomer(selected.id, selected.name, patch);
    setEditing(false);
    setSavedInfo(true);
    setTimeout(() => setSavedInfo(false), 2600);
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
              <tr key={r.id} className={r.id === sel ? 'row-sel' : ''} onClick={() => { setSel(r.id); setPay(null); setJustPosted(null); setEditing(false); setSavedInfo(false); }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, flex: 1 }}>{selected.name}</h3>
              {!editing && <button className="btn btn-sm" onClick={() => openEdit(selected.id)}>✎ Edit info</button>}
            </div>

            {editing ? (
              <div className="pay-form" style={{ marginTop: 10 }}>
                <div className="pay-form-title">Change information — {selected.name}</div>
                <label className="edit-label">Mailing address</label>
                <input className="edit-input" value={form.mailingAddress} onChange={(e) => setForm({ ...form, mailingAddress: e.target.value })} />
                <label className="edit-label">Phone</label>
                <input className="edit-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <label className="edit-label">Email</label>
                <input className="edit-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <div className="pay-form-actions">
                  <button className="btn btn-green btn-sm" onClick={saveEdit}>Save changes</button>
                  <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="kv"><span>Address</span><b style={{ textAlign: 'right' }}>{selected.address}</b></div>
                {selPhone && <div className="kv"><span>Phone</span><b>{selPhone}</b></div>}
                {selEmail && <div className="kv"><span>Email</span><b>{selEmail}</b></div>}
              </>
            )}

            {savedInfo && <div className="pay-posted">✓ Contact information updated and logged to the Audit Trail.</div>}

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
