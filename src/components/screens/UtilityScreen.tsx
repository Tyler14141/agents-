import { useState } from 'react';
import { UTILITY_ACCOUNTS, RESIDENTS, estimateBill, utilityBaseline, utilityFlag } from '../../data/municipal';
import { useStore, paidFor } from '../../store';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
const cust = (id: string) => RESIDENTS.find((r) => r.id === id)?.name ?? '—';

export function UtilityScreen() {
  const [sel, setSel] = useState(UTILITY_ACCOUNTS[0].id);
  const acct = UTILITY_ACCOUNTS.find((u) => u.id === sel)!;
  const posts = useStore((s) => s.posts);
  const bal = (id: string, base: number) => Math.max(0, base - paidFor(posts, 'utility', id));
  const maxCcf = Math.max(...acct.usage.map((u) => u.ccf), 1);
  const acctFlag = utilityFlag(acct);
  const acctLast = acct.usage[acct.usage.length - 1]?.ccf ?? 0;

  // Bill-run aggregates
  const inRun = UTILITY_ACCOUNTS.filter((u) => u.status === 'active' || u.status === 'delinquent');
  const billed = inRun.reduce((s, u) => s + estimateBill(u.usage[u.usage.length - 1]?.ccf ?? 0), 0);
  const flagged = UTILITY_ACCOUNTS.filter((u) => utilityFlag(u));
  const highCount = UTILITY_ACCOUNTS.filter((u) => utilityFlag(u) === 'high').length;
  const lowCount = UTILITY_ACCOUNTS.filter((u) => utilityFlag(u) === 'low').length;
  const pastDue = UTILITY_ACCOUNTS.filter((u) => (u.pastDueDays > 0 || u.balance > 0) && bal(u.id, u.balance) > 0);
  const overdue = pastDue.reduce((s, u) => s + bal(u.id, u.balance), 0);

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Utility Billing — Account Inquiry</h2></div>

      <div className="pr-stats">
        <div className="pr-stat"><div className="k">Accounts in cycle</div><div className="v">{inRun.length}</div></div>
        <div className="pr-stat"><div className="k">Est. billed</div><div className="v">{usd(billed)}</div></div>
        <div className="pr-stat"><div className="k">Usage flags</div><div className="v">{flagged.length}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}> · {highCount}↑ {lowCount}↓</span></div></div>
        <div className="pr-stat"><div className="k">Overdue ({pastDue.length})</div><div className="v">{usd(overdue)}</div></div>
      </div>

      <div className="mod-split">
        <table className="data mod-list">
          <thead><tr><th>Account</th><th>Service address</th><th className="num">Balance</th><th>Usage</th><th>Status</th></tr></thead>
          <tbody>
            {UTILITY_ACCOUNTS.map((u) => {
              const f = utilityFlag(u);
              return (
                <tr key={u.id} className={u.id === sel ? 'row-sel' : ''} onClick={() => setSel(u.id)}>
                  <td>{u.id}</td>
                  <td>{u.serviceAddress}</td>
                  <td className="num">{usd(bal(u.id, u.balance))}</td>
                  <td>{f === 'high' ? <span className="tag high">⚠ High</span> : f === 'low' ? <span className="tag medium">⚠ Low</span> : <span className="muted">ok</span>}</td>
                  <td><span className={`tag ${u.status}`}>{u.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mod-detail card card-pad">
          <h3>{acct.id} · {acct.serviceAddress}</h3>
          <div className="kv"><span>Customer</span><b>{cust(acct.residentId)}</b></div>
          <div className="kv"><span>Balance</span><b className={bal(acct.id, acct.balance) > 0 ? 'neg' : ''}>{usd(bal(acct.id, acct.balance))}</b></div>
          <div className="kv"><span>Status</span><b><span className={`tag ${acct.status}`}>{acct.status}</span></b></div>
          <div className="kv"><span>Past due</span><b>{acct.pastDueDays} days</b></div>
          <div className="kv"><span>Last read</span><b>{acct.lastReadDate}</b></div>
          <div className="kv"><span>Est. current bill</span><b>{usd(estimateBill(acctLast))}</b></div>

          {acctFlag && (
            <div className={`usage-alert ${acctFlag}`}>
              {acctFlag === 'high' ? '⚠ High-usage flag' : '⚠ Low/zero-usage flag'}: latest {acctLast} CCF vs. ~{Math.round(utilityBaseline(acct))} CCF baseline. Hold &amp; re-read before billing.
            </div>
          )}

          <div className="usage-chart">
            <div className="usage-title">Consumption (CCF)</div>
            <div className="usage-bars">
              {acct.usage.map((u, i) => {
                const isLast = i === acct.usage.length - 1;
                return (
                  <div key={u.period} className="usage-bar-wrap" title={`${u.period}: ${u.ccf} CCF`}>
                    <div className="usage-bar" style={{ height: `${Math.max(4, (u.ccf / maxCcf) * 90)}px`, background: isLast && acctFlag ? (acctFlag === 'high' ? 'var(--red)' : 'var(--amber)') : undefined }} />
                    <span className="usage-ccf">{u.ccf}</span>
                    <span className="usage-period">{u.period.slice(5)}</span>
                  </div>
                );
              })}
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
