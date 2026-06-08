import { useState } from 'react';
import { TAX_ACCOUNTS, RESIDENTS } from '../../data/municipal';
import { useStore, paidFor } from '../../store';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
const owner = (id: string) => RESIDENTS.find((r) => r.id === id)?.name ?? '—';

export function TaxScreen() {
  const [sel, setSel] = useState(TAX_ACCOUNTS[0].id);
  const acct = TAX_ACCOUNTS.find((t) => t.id === sel)!;
  const posts = useStore((s) => s.posts);
  const bal = (id: string, base: number) => Math.max(0, base - paidFor(posts, 'tax', id));

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Tax Collections — Account Inquiry</h2></div>
      <div className="mod-split">
        <table className="data mod-list">
          <thead><tr><th>Account</th><th>Owner</th><th className="num">Balance</th><th>Status</th></tr></thead>
          <tbody>
            {TAX_ACCOUNTS.map((t) => (
              <tr key={t.id} className={t.id === sel ? 'row-sel' : ''} onClick={() => setSel(t.id)}>
                <td>{t.id}</td>
                <td>{owner(t.residentId)}</td>
                <td className="num">{usd(bal(t.id, t.balance))}</td>
                <td><span className={`tag ${t.status}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mod-detail card card-pad">
          <h3>{acct.id} · Parcel {acct.parcelId}</h3>
          <div className="kv"><span>Owner</span><b>{owner(acct.residentId)}</b></div>
          <div className="kv"><span>Assessed value</span><b>{usd(acct.assessedValue)}</b></div>
          <div className="kv"><span>Annual tax</span><b>{usd(acct.annualTax)}</b></div>
          <div className="kv"><span>Balance due</span><b className={bal(acct.id, acct.balance) > 0 ? 'neg' : ''}>{usd(bal(acct.id, acct.balance))}</b></div>
          <div className="kv"><span>Status</span><b><span className={`tag ${acct.status}`}>{acct.status}</span></b></div>
          {acct.lastPayment && <div className="kv"><span>Last payment</span><b>{acct.lastPayment.date} · {usd(acct.lastPayment.amount)}</b></div>}
          <div className="mod-detail-actions">
            <button className="btn btn-sm btn-primary">Post Payment</button>
            <button className="btn btn-sm">Adjust</button>
            <button className="btn btn-sm">Print Notice</button>
          </div>
        </div>
      </div>
    </div>
  );
}
