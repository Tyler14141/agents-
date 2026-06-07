// Faithful re-creation of the TRIO Web "Receipt Input" (Cash Receipting) screen
// from the product screenshots. Static mockup — the live intelligence lives in
// the TRIO Assistant docked over it.

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`tr-total ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

export function ReceiptInputScreen() {
  return (
    <div className="tr-screen">
      <div className="tr-screen-head">
        <h2>Receipt Input</h2>
        <button className="btn btn-sm">Void By Receipt Number</button>
      </div>

      <div className="tr-row-controls">
        <select className="tr-select" defaultValue="">
          <option value="" disabled>Select receipt type…</option>
          <option>99 — Motor Vehicle</option>
          <option>10 — Tax Payment</option>
          <option>20 — Utility Payment</option>
        </select>
        <button className="btn btn-primary">Add Transaction</button>
      </div>

      <table className="tr-trans">
        <thead>
          <tr>
            <th>TYPE</th><th>TYPE DESCRIPTION</th><th>ACCOUNT</th><th>NAME</th><th>INFO</th><th className="num">AMOUNT</th><th className="num">SPLIT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>99</td><td>Motor Vehicle</td><td></td><td>HARRIS LOCAL GOVERNM TRIOWEB</td><td></td><td className="num">159.88</td><td className="num">1</td>
          </tr>
        </tbody>
      </table>

      <div className="tr-paidby">
        <label>PAID BY</label>
        <input defaultValue="HARRIS LOCAL GOVERNMENT" />
        <label>ID#</label>
        <input className="id" defaultValue="235242" />
        <span className="tr-print"><input type="checkbox" defaultChecked /> PRINT RECEIPT</span>
        <span className="tr-copies">COPIES <input className="id" defaultValue="1" /></span>
      </div>

      <div className="tr-bottom">
        <div className="tr-totals card">
          <Row label="TRANSACTIONS" value="159.88" />
          <Row label="CONVENIENCE FEE" value="0.00" />
          <Row label="RECEIPT TOTAL" value="159.88" strong />
          <Row label="TOTAL CASH PAID" value="159.88" />
          <Row label="TOTAL CHECK PAID" value="0.00" />
          <Row label="TOTAL CREDIT PAID" value="0.00" />
          <Row label="CHANGE DUE" value="0.00" />
        </div>

        <div className="tr-payment card">
          <div className="tr-pay-controls">
            <div>
              <label>PAYMENT</label>
              <input className="tr-amount" defaultValue="0.00" />
            </div>
            <select className="tr-select" defaultValue="Cash">
              <option>Cash</option><option>Check</option><option>Credit</option>
            </select>
            <button className="btn">Add Payment</button>
          </div>
          <table className="tr-paylist">
            <thead><tr><th>TYPE</th><th className="num">AMOUNT</th><th>REFERENCE</th></tr></thead>
            <tbody><tr><td>Cash</td><td className="num">159.88</td><td></td></tr></tbody>
          </table>
        </div>
      </div>

      <div className="tr-save">
        <button className="btn btn-green">Save and Continue</button>
      </div>
    </div>
  );
}
