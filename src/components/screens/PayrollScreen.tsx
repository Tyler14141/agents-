import { useState } from 'react';
import { EMPLOYEES, PAY_RUN, payFor, grossFor } from '../../data/municipal';
import type { PayRunLine } from '../../types';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
const lineFor = (empId: string): PayRunLine =>
  PAY_RUN.lines.find((l) => l.employeeId === empId) ?? { employeeId: empId, regularHours: 0, otHours: 0 };

export function PayrollScreen() {
  const [sel, setSel] = useState(EMPLOYEES[0].id);
  const emp = EMPLOYEES.find((e) => e.id === sel)!;
  const line = lineFor(sel);
  const pay = payFor(emp, line);

  const totals = PAY_RUN.lines.reduce(
    (acc, l) => {
      const e = EMPLOYEES.find((x) => x.id === l.employeeId)!;
      const p = payFor(e, l);
      acc.gross += p.gross; acc.ded += p.deductions; acc.net += p.net; acc.ot += l.otHours;
      return acc;
    },
    { gross: 0, ded: 0, net: 0, ot: 0 },
  );

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head">
        <h2>Payroll — Pay Run {PAY_RUN.id}</h2>
        <span className={`tag ${PAY_RUN.status === 'open' ? 'medium' : 'current'}`} style={{ marginLeft: 'auto' }}>{PAY_RUN.status}</span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {PAY_RUN.frequency} · {PAY_RUN.periodStart} – {PAY_RUN.periodEnd} · check date {PAY_RUN.checkDate}
      </p>

      <div className="pr-stats">
        <div className="pr-stat"><div className="k">Employees</div><div className="v">{EMPLOYEES.length}</div></div>
        <div className="pr-stat"><div className="k">Gross</div><div className="v">{usd(totals.gross)}</div></div>
        <div className="pr-stat"><div className="k">Deductions</div><div className="v">{usd(totals.ded)}</div></div>
        <div className="pr-stat"><div className="k">Net</div><div className="v">{usd(totals.net)}</div></div>
        <div className="pr-stat"><div className="k">OT hours</div><div className="v">{totals.ot}</div></div>
      </div>

      <div className="mod-split">
        <table className="data mod-list">
          <thead>
            <tr><th>Employee</th><th>Department</th><th className="num">Reg</th><th className="num">OT</th><th className="num">Gross</th><th className="num">Net</th></tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((e) => {
              const l = lineFor(e.id);
              const p = payFor(e, l);
              return (
                <tr key={e.id} className={e.id === sel ? 'row-sel' : ''} onClick={() => setSel(e.id)}>
                  <td>{e.name}</td>
                  <td>{e.department}</td>
                  <td className="num">{l.regularHours}</td>
                  <td className={`num ${l.otHours >= 10 ? 'neg' : ''}`}>{l.otHours || '—'}</td>
                  <td className="num">{usd(p.gross)}</td>
                  <td className="num">{usd(p.net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mod-detail card card-pad">
          <h3>{emp.name}</h3>
          <div className="kv"><span>Position</span><b>{emp.position}</b></div>
          <div className="kv"><span>Department</span><b>{emp.department}</b></div>
          <div className="kv"><span>Type</span><b>{emp.type === 'salary' ? `Salary ${usd(emp.rate)}/yr` : `Hourly ${usd(emp.rate)}/hr`}</b></div>
          <div className="kv"><span>Regular / OT hours</span><b>{line.regularHours} / {line.otHours}</b></div>
          <div className="kv"><span>Gross (this run)</span><b>{usd(pay.gross)}</b></div>
          <div className="kv"><span>Est. deductions (30%)</span><b className="neg">−{usd(pay.deductions)}</b></div>
          <div className="kv"><span>Net pay</span><b>{usd(pay.net)}</b></div>
          <div className="kv"><span>YTD gross</span><b>{usd(emp.ytdGross + grossFor(emp, line))}</b></div>
          <div className="mod-detail-actions">
            <button className="btn btn-sm btn-primary">Edit Timesheet</button>
            <button className="btn btn-sm">Pay History</button>
          </div>
        </div>
      </div>
    </div>
  );
}
