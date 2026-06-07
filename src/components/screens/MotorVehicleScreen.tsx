// Faithful re-creation of the TRIO Web "MVR3 Preview" (Motor Vehicle) screen
// from the product screenshots. Static mockup driven by the demo receipt.

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mv-field">
      <span className="mv-field-label">{label}</span>
      <span className="mv-field-value">{value}</span>
    </div>
  );
}

export function MotorVehicleScreen() {
  return (
    <div className="tr-screen mv-screen">
      <div className="tr-screen-head"><h2>MVR3 Preview</h2></div>

      <div className="mv-controls">
        <label>INPUT MVR2 NUMBER</label>
        <input className="mv-highlight" defaultValue="20993897" />
        <label>CODES</label>
        <input className="mv-code" defaultValue="09" />
        <label>MESSAGE</label>
        <input className="mv-msg" defaultValue="" />
      </div>

      <div className="mv-form card">
        <div className="mv-form-title">State of Maine Vehicle Registration</div>
        <div className="mv-grid">
          <div className="mv-col">
            <Field label="Plate" value="PC TRIOWEB" />
            <Field label="VIN" value="4S3BMHC6 5D3 010620" />
            <Field label="Year / Make / Model" value="2013 SUBARU LEGACY" />
            <Field label="Owner" value="HARRIS LOCAL GOVERNMENT" />
            <Field label="Address" value="36 PARK STREET, PRESQUE ISLE, ME 04769" />
            <Field label="Mileage" value="6,546" />
          </div>
          <div className="mv-col mv-fees">
            <div className="mv-fees-title">Fees</div>
            <Field label="Excise Tax" value="$124.88" />
            <Field label="State Registration" value="$30.00" />
            <Field label="Agent Fee" value="$5.00" />
            <div className="mv-total"><span>Total Due</span><span>$159.88</span></div>
            <Field label="Registration Period" value="03/01/2020 – 03/31/2021" />
          </div>
        </div>
      </div>

      <div className="mv-actions">
        <button className="btn btn-sm">Print CTA</button>
        <button className="btn btn-sm">Print Use Tax</button>
        <button className="btn btn-sm btn-primary">Print MVR3 ✓</button>
        <button className="btn btn-sm">Hold</button>
      </div>

      <div className="tr-save"><button className="btn btn-green">Save</button></div>
    </div>
  );
}
