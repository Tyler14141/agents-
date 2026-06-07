import { BUDGET_LINES, REVENUE_LINES, MUNICIPALITY } from '../../data/municipal';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function usd0(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function BudgetaryScreen() {
  const totalBudget = BUDGET_LINES.reduce((s, b) => s + b.budget, 0);
  const totalCommitted = BUDGET_LINES.reduce((s, b) => s + b.actual + b.encumbered, 0);
  const totalRev = REVENUE_LINES.reduce((s, r) => s + r.budget, 0);
  const revActual = REVENUE_LINES.reduce((s, r) => s + r.actual, 0);

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Budgetary — Budget vs. Actual</h2></div>
      <p className="muted" style={{ marginTop: 0 }}>
        {MUNICIPALITY.fiscalYear} General Fund · {MUNICIPALITY.name} · year ~92% elapsed · mill rate {MUNICIPALITY.millRate}
      </p>

      <div className="pr-stats">
        <div className="pr-stat"><div className="k">Appropriations</div><div className="v">{usd0(totalBudget)}</div></div>
        <div className="pr-stat"><div className="k">Committed</div><div className="v">{usd0(totalCommitted)}</div></div>
        <div className="pr-stat"><div className="k">Revenues (budget)</div><div className="v">{usd0(totalRev)}</div></div>
        <div className="pr-stat"><div className="k">Revenue collected</div><div className="v">{Math.round((revActual / totalRev) * 100)}%</div></div>
      </div>

      <h3 style={{ margin: '6px 0 8px', fontSize: 14 }}>Revenues</h3>
      <table className="data" style={{ marginBottom: 22 }}>
        <thead><tr><th>Account</th><th>Source</th><th className="num">Budget</th><th className="num">Collected</th><th className="num">%</th></tr></thead>
        <tbody>
          {REVENUE_LINES.map((r) => (
            <tr key={r.id}>
              <td>{r.account}</td><td>{r.source}</td>
              <td className="num">{usd(r.budget)}</td>
              <td className="num">{usd(r.actual)}</td>
              <td className="num">{Math.round((r.actual / r.budget) * 100)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={2}><b>Total revenues</b></td><td className="num"><b>{usd(totalRev)}</b></td><td className="num"><b>{usd(revActual)}</b></td><td className="num"><b>{Math.round((revActual / totalRev) * 100)}%</b></td></tr>
        </tfoot>
      </table>

      <h3 style={{ margin: '6px 0 8px', fontSize: 14 }}>Appropriations by department</h3>
      <table className="data">
        <thead>
          <tr>
            <th>Account</th><th>Department</th><th>Description</th>
            <th className="num">Budget</th><th className="num">Actual</th><th className="num">Enc.</th>
            <th className="num">Committed</th><th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {BUDGET_LINES.map((b) => {
            const c = b.actual + b.encumbered;
            const ratio = c / b.budget;
            return (
              <tr key={b.id}>
                <td>{b.account}</td>
                <td>{b.department}</td>
                <td>{b.description}</td>
                <td className="num">{usd(b.budget)}</td>
                <td className="num">{usd(b.actual)}</td>
                <td className="num">{b.encumbered ? usd(b.encumbered) : '—'}</td>
                <td className="num">{usd(c)}</td>
                <td className={`num ${ratio >= 1.1 ? 'neg' : ratio < 0.6 ? 'pos' : ''}`}>{Math.round(ratio * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}><b>Total appropriations</b></td>
            <td className="num"><b>{usd(totalBudget)}</b></td>
            <td className="num" colSpan={2}></td>
            <td className="num"><b>{usd(totalCommitted)}</b></td>
            <td className="num"><b>{Math.round((totalCommitted / totalBudget) * 100)}%</b></td>
          </tr>
        </tfoot>
      </table>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Lines ≥110% committed are flagged red, &lt;60% in green. Ask the TRIO Assistant to “draft variance
        explanations” for the flagged lines.
      </p>
    </div>
  );
}
