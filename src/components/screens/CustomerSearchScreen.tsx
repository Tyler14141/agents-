import { useMemo, useState } from 'react';
import { RESIDENTS, UTILITY_ACCOUNTS, TAX_ACCOUNTS, RECEIPTS } from '../../data/municipal';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

interface Row {
  id: string;
  name: string;
  address: string;
  utilityId?: string;
  taxId?: string;
  water: number;
  tax: number;
  total: number;
}

function buildRows(): Row[] {
  return RESIDENTS.map((r) => {
    const u = UTILITY_ACCOUNTS.find((x) => x.id === r.utilityAccountId);
    const t = TAX_ACCOUNTS.find((x) => x.id === r.taxAccountId);
    const water = u?.balance ?? 0;
    const tax = t?.balance ?? 0;
    return { id: r.id, name: r.name, address: r.mailingAddress, utilityId: u?.id, taxId: t?.id, water, tax, total: water + tax };
  });
}

export function CustomerSearchScreen() {
  const allRows = useMemo(buildRows, []);
  const [q, setQ] = useState('');
  const [owingOnly, setOwingOnly] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return allRows
      .filter((r) => (owingOnly ? r.total > 0 : true))
      .filter((r) => {
        if (!s) return true;
        return `${r.name} ${r.address} ${r.utilityId ?? ''} ${r.taxId ?? ''} ${r.id}`.toLowerCase().includes(s);
      })
      .sort((a, b) => b.total - a.total);
  }, [allRows, q, owingOnly]);

  // Sums owing across ALL customers (system totals).
  const totWater = allRows.reduce((s, r) => s + r.water, 0);
  const totTax = allRows.reduce((s, r) => s + r.tax, 0);
  const owingCount = allRows.filter((r) => r.total > 0).length;
  // Sum across the current filtered result set.
  const filteredOwing = rows.reduce((s, r) => s + r.total, 0);

  const selected = rows.find((r) => r.id === sel) ?? null;
  const selUtil = selected ? UTILITY_ACCOUNTS.find((u) => u.id === selected.utilityId) : null;
  const selTax = selected ? TAX_ACCOUNTS.find((t) => t.id === selected.taxId) : null;
  const selReceipts = selected ? RECEIPTS.filter((rc) => rc.residentId === selected.id).slice(0, 3) : [];

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
              <tr key={r.id} className={r.id === sel ? 'row-sel' : ''} onClick={() => setSel(r.id)}>
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
            <div className="kv"><span>💧 Water {selUtil ? `(${selUtil.id})` : ''}</span><b className={selected.water > 0 ? 'neg' : ''}>{selUtil ? `${usd(selected.water)} · ${selUtil.status}` : 'no account'}</b></div>
            <div className="kv"><span>🧾 Tax {selTax ? `(${selTax.id})` : ''}</span><b className={selected.tax > 0 ? 'neg' : ''}>{selTax ? `${usd(selected.tax)} · ${selTax.status}` : 'no account'}</b></div>
            <div className="kv" style={{ borderTop: '2px solid var(--line)', marginTop: 4, paddingTop: 8 }}><span><b>Total owed</b></span><b className={selected.total > 0 ? 'neg' : ''} style={{ fontSize: 16 }}>{usd(selected.total)}</b></div>
            {selReceipts.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', margin: '12px 0 4px' }}>Recent payments</div>
                {selReceipts.map((rc) => (
                  <div key={rc.id} className="kv" style={{ fontSize: 12 }}><span>{rc.date} · {rc.description}</span><b>{usd(rc.amount)}</b></div>
                ))}
              </>
            )}
            <div className="mod-detail-actions">
              <button className="btn btn-sm btn-primary">Take Payment</button>
              <button className="btn btn-sm">Print Statement</button>
            </div>
          </div>
        ) : (
          <div className="mod-detail card card-pad"><p className="muted" style={{ margin: 0 }}>Select a customer to see the water + tax breakdown and total owed.</p></div>
        )}
      </div>
    </div>
  );
}
