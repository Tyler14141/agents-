import { useState } from 'react';
import { UTILITY_ACCOUNTS, RESIDENTS } from '../../data/municipal';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
const cust = (id: string) => RESIDENTS.find((r) => r.id === id)?.name ?? '—';

export function UtilityScreen() {
  const [sel, setSel] = useState(UTILITY_ACCOUNTS[0].id);
  const acct = UTILITY_ACCOUNTS.find((u) => u.id === sel)!;
  const maxCcf = Math.max(...acct.usage.map((u) => u.ccf));

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Utility Billing — Account Inquiry</h2></div>
      <div className="mod-split">
        <table className="data mod-list">
          <thead><tr><th>Account</th><th>Service address</th><th className="num">Balance</th><th>Status</th></tr></thead>
          <tbody>
            {UTILITY_ACCOUNTS.map((u) => (
              <tr key={u.id} className={u.id === sel ? 'row-sel' : ''} onClick={() => setSel(u.id)}>
                <td>{u.id}</td>
                <td>{u.serviceAddress}</td>
                <td className="num">{usd(u.balance)}</td>
                <td><span className={`tag ${u.status}`}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mod-detail card card-pad">
          <h3>{acct.id} · {acct.serviceAddress}</h3>
          <div className="kv"><span>Customer</span><b>{cust(acct.residentId)}</b></div>
          <div className="kv"><span>Balance</span><b className={acct.balance > 0 ? 'neg' : ''}>{usd(acct.balance)}</b></div>
          <div className="kv"><span>Status</span><b><span className={`tag ${acct.status}`}>{acct.status}</span></b></div>
          <div className="kv"><span>Past due</span><b>{acct.pastDueDays} days</b></div>
          <div className="kv"><span>Last read</span><b>{acct.lastReadDate}</b></div>

          <div className="usage-chart">
            <div className="usage-title">Consumption (CCF)</div>
            <div className="usage-bars">
              {acct.usage.map((u) => (
                <div key={u.period} className="usage-bar-wrap" title={`${u.period}: ${u.ccf} CCF`}>
                  <div className="usage-bar" style={{ height: `${Math.max(6, (u.ccf / maxCcf) * 90)}px` }} />
                  <span className="usage-ccf">{u.ccf}</span>
                  <span className="usage-period">{u.period.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mod-detail-actions">
            <button className="btn btn-sm btn-primary">Take Payment</button>
            <button className="btn btn-sm">Enter Read</button>
            <button className="btn btn-sm">Generate Bill</button>
          </div>
        </div>
      </div>
    </div>
  );
}
