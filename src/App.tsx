import { useState } from 'react';
import { TrioAssistant } from './components/TrioAssistant';
import { AgentsConsole } from './components/AgentsConsole';
import { TrioModuleView, type TrioModuleDef } from './components/TrioModuleView';
import { ReceiptInputScreen } from './components/ReceiptInputScreen';
import { ReceiptSearchScreen } from './components/screens/ReceiptSearchScreen';
import { MotorVehicleScreen } from './components/screens/MotorVehicleScreen';
import { TaxScreen } from './components/screens/TaxScreen';
import { UtilityScreen } from './components/screens/UtilityScreen';
import { BudgetaryScreen } from './components/screens/BudgetaryScreen';
import { PayrollScreen } from './components/screens/PayrollScreen';
import { YearEndAuditScreen } from './components/screens/YearEndAuditScreen';
import { useStore } from './store';
import { MUNICIPALITY } from './data/municipal';

type ModuleId = string;
type Theme = 'modern' | 'classic';

// Left module rail (the thin colored strip of TRIO modules in the screenshots).
const MODULES = [
  { id: 'cr', label: 'Cash Receipting', icon: 'T', color: '#0f9b8e', active: true },
  { id: 'agents', label: 'Agents', icon: '✦', color: '#6c5ce7', active: true },
  { id: 'mv', label: 'Motor Vehicle', icon: '🚗', color: '#2e75b6', active: true },
  { id: 'tax', label: 'Tax', icon: '🧾', color: '#c0392b', active: true },
  { id: 'ub', label: 'Utility Billing', icon: '💧', color: '#2980b9', active: true },
  { id: 'bud', label: 'Budgetary', icon: '💼', color: '#d68910', active: true },
  { id: 'pr', label: 'Payroll', icon: '👥', color: '#8e44ad', active: true },
  { id: 'eoy', label: 'Year-End / Audit', icon: '📋', color: '#0e7490', active: true },
  { id: 'clk', label: 'Clerk', icon: '🗂️', color: '#16a085', active: false },
  { id: 'cama', label: 'CAMA', icon: '📐', color: '#7f8c8d', active: false },
];

const MODULE_DEFS: Record<string, TrioModuleDef> = {
  cr: {
    brand: 'CASH RECEIPTING',
    menu: [
      { label: 'Receipt Input', active: true }, { label: 'Daily Receipt Audit' },
      { label: 'Printing', section: true },
      { label: 'Receipt Search', indent: true }, { label: 'Receipt Type Listing', indent: true },
      { label: 'MVR3 Listing', indent: true }, { label: 'Redisplay Daily Audit Report', indent: true },
      { label: 'Redisplay Any Receipt', indent: true }, { label: 'Redisplay Last Receipt', indent: true },
      { label: 'Cross Check Payment Report', indent: true },
      { label: 'Open Cash Drawer' }, { label: 'Type Setup' }, { label: 'End Of Year' }, { label: 'File Maintenance' },
    ],
    tabs: [
      { id: 'input', label: 'Receipt Input', color: '#0f9b8e', Screen: ReceiptInputScreen },
      { id: 'search', label: 'Receipt Search', color: '#c0392b', Screen: ReceiptSearchScreen },
    ],
  },
  mv: {
    brand: 'MOTOR VEHICLE',
    menu: [
      { label: 'Registration Menu' }, { label: 'Process End of Period' }, { label: 'Process BMV Update File' },
      { label: 'Inventory Maintenance' }, { label: 'Exception Report Items' },
      { label: 'Printing', section: true },
      { label: 'MVR3 Preview', indent: true, active: true }, { label: 'Vehicle History', indent: true },
      { label: 'Table / Option Processing' }, { label: 'Fleet Master Add / Update' }, { label: 'Blue Book' },
      { label: 'Inventory Status' }, { label: 'Rapid Renewal' }, { label: 'Teller Closeout' }, { label: 'Gift Certificates' },
    ],
    tabs: [{ id: 'mvr3', label: 'MVR3 Preview', color: '#2e75b6', Screen: MotorVehicleScreen }],
  },
  tax: {
    brand: 'TAX COLLECTIONS',
    menu: [
      { label: 'Account Inquiry', active: true }, { label: 'Payment Entry' }, { label: 'Adjustments' },
      { label: 'Delinquency' }, { label: 'Tax Liens' },
      { label: 'Reports', section: true },
      { label: 'Aging Report', indent: true }, { label: 'Commitment Book', indent: true }, { label: 'Lien Report', indent: true },
      { label: 'File Maintenance' },
    ],
    tabs: [{ id: 'inq', label: 'Account Inquiry', color: '#c0392b', Screen: TaxScreen }],
  },
  ub: {
    brand: 'UTILITY BILLING',
    menu: [
      { label: 'Account Inquiry', active: true }, { label: 'Meter Reads' }, { label: 'Billing' },
      { label: 'Payments' }, { label: 'Delinquency' },
      { label: 'Reports', section: true },
      { label: 'Aging Report', indent: true }, { label: 'Consumption Report', indent: true },
      { label: 'File Maintenance' },
    ],
    tabs: [{ id: 'inq', label: 'Account Inquiry', color: '#2980b9', Screen: UtilityScreen }],
  },
  bud: {
    brand: 'BUDGETARY',
    menu: [
      { label: 'Account Inquiry' }, { label: 'Budget vs. Actual', active: true }, { label: 'Journal Entries' },
      { label: 'Requisitions' },
      { label: 'Reports', section: true },
      { label: 'Budget Report', indent: true }, { label: 'Trial Balance', indent: true },
      { label: 'File Maintenance' },
    ],
    tabs: [{ id: 'bva', label: 'Budget vs. Actual', color: '#d68910', Screen: BudgetaryScreen }],
  },
  pr: {
    brand: 'PAYROLL',
    menu: [
      { label: 'Pay Run', active: true }, { label: 'Employees' }, { label: 'Timesheets' },
      { label: 'Deductions & Benefits' }, { label: 'Remittances' },
      { label: 'Reports', section: true },
      { label: 'Payroll Register', indent: true }, { label: 'W-2 / Year-End', indent: true },
      { label: 'File Maintenance' },
    ],
    tabs: [{ id: 'run', label: 'Pay Run', color: '#8e44ad', Screen: PayrollScreen }],
  },
  eoy: {
    brand: 'YEAR-END / AUDIT',
    menu: [
      { label: 'Audit Workspace', active: true }, { label: 'Close Checklist' }, { label: 'Reconciliations' },
      { label: 'PBC Package' }, { label: 'Schedules' }, { label: 'Sign-off' },
      { label: 'Reports', section: true },
      { label: 'Trial Balance', indent: true }, { label: 'Audit Trail', indent: true },
      { label: 'File Maintenance' },
    ],
    tabs: [{ id: 'audit', label: 'Year-End Audit', color: '#0e7490', Screen: YearEndAuditScreen }],
  },
};

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="theme-toggle" title="Switch interface style">
      <span className="theme-toggle-label">Interface</span>
      <button className={theme === 'classic' ? 'active' : ''} onClick={() => setTheme('classic')}>Classic</button>
      <button className={theme === 'modern' ? 'active' : ''} onClick={() => setTheme('modern')}>Modern</button>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('cr');
  const [theme, setTheme] = useState<Theme>('modern');
  const pending = useStore((s) => s.proposals.filter((p) => p.status === 'pending').length);
  const toggle = <ThemeToggle theme={theme} setTheme={setTheme} />;
  const moduleDef = MODULE_DEFS[activeModule];

  return (
    <div className={`trio theme-${theme}`}>
      {/* Module rail */}
      <div className="module-rail">
        {MODULES.map((m) => {
          const isActive = activeModule === m.id;
          return (
            <div
              key={m.id}
              className={`rail-icon ${isActive ? 'active' : ''} ${!m.active ? 'mock' : ''}`}
              style={{ background: isActive ? m.color : undefined, color: isActive ? '#fff' : undefined }}
              title={m.label + (m.active ? '' : ' (mockup)')}
              onClick={() => m.active && setActiveModule(m.id)}
            >
              {m.icon}
              {m.id === 'agents' && pending > 0 && <span className="rail-badge">{pending}</span>}
            </div>
          );
        })}
      </div>

      {activeModule === 'agents' ? (
        <main className="trio-main">
          <div className="agents-topbar">
            <span className="agents-topbar-icon">✦</span>
            <div>
              <div className="agents-topbar-title">TRIO Agents</div>
              <div className="agents-topbar-sub">Governed operating layer over TRIO · {MUNICIPALITY.name}</div>
            </div>
            <div style={{ flex: 1 }} />
            {toggle}
          </div>
          <div className="agents-wrap">
            <AgentsConsole />
          </div>
        </main>
      ) : (
        <TrioModuleView key={activeModule} def={moduleDef} toggle={toggle} />
      )}

      <TrioAssistant screen={activeModule === 'agents' ? 'Agents module' : moduleDef.brand} />
    </div>
  );
}
