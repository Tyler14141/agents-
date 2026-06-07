import { BUDGET_LINES } from '../../data/municipal';

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function BudgetaryScreen() {
  const totalBudget = BUDGET_LINES.reduce((s, b) => s + b.budget, 0);
  const totalCommitted = BUDGET_LINES.reduce((s, b) => s + b.actual + b.encumbered, 0);

  return (
    <div className="tr-screen mod-screen">
      <div className="tr-screen-head"><h2>Budgetary — Budget vs. Actual</h2></div>
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
                <td className="num">{usd(b.encumbered)}</td>
                <td className="num">{usd(c)}</td>
                <td className={`num ${ratio >= 1.1 ? 'neg' : ratio < 0.6 ? 'pos' : ''}`}>{Math.round(ratio * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}><b>General Fund (selected lines)</b></td>
            <td className="num"><b>{usd(totalBudget)}</b></td>
            <td className="num" colSpan={2}></td>
            <td className="num"><b>{usd(totalCommitted)}</b></td>
            <td className="num"><b>{Math.round((totalCommitted / totalBudget) * 100)}%</b></td>
          </tr>
        </tfoot>
      </table>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Year ~92% elapsed · lines ≥110% committed are flagged red, &lt;60% in green. Ask the TRIO Assistant to
        “draft variance explanations” for the flagged lines.
      </p>
    </div>
  );
}
