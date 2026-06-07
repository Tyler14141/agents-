import { useState } from 'react';
import { ReceiptInputScreen } from './components/ReceiptInputScreen';
import { TrioAssistant } from './components/TrioAssistant';
import { AgentsConsole } from './components/AgentsConsole';
import { useStore } from './store';
import { MUNICIPALITY } from './data/municipal';

type ModuleId = 'cr' | 'agents' | string;

// Left module rail (the thin colored strip of TRIO modules in the screenshots).
const MODULES = [
  { id: 'cr', label: 'Cash Receipting', icon: 'T', color: '#0f9b8e', active: true },
  { id: 'agents', label: 'Agents', icon: '✦', color: '#6c5ce7', active: true },
  { id: 'mv', label: 'Motor Vehicle', icon: '🚗', color: '#2e75b6', active: false },
  { id: 'tax', label: 'Tax', icon: '🧾', color: '#c0392b', active: false },
  { id: 'ub', label: 'Utility Billing', icon: '💧', color: '#2980b9', active: false },
  { id: 'pr', label: 'Payroll', icon: '👥', color: '#8e44ad', active: false },
  { id: 'clk', label: 'Clerk', icon: '🗂️', color: '#16a085', active: false },
  { id: 'bud', label: 'Budgetary', icon: '💼', color: '#d68910', active: false },
  { id: 'cama', label: 'CAMA', icon: '📐', color: '#7f8c8d', active: false },
];

const CR_MENU = [
  { label: 'Receipt Input', active: true },
  { label: 'Daily Receipt Audit' },
  { label: 'Printing', section: true },
  { label: 'Receipt Search', indent: true },
  { label: 'Receipt Type Listing', indent: true },
  { label: 'MVR3 Listing', indent: true },
  { label: 'Redisplay Daily Audit Report', indent: true },
  { label: 'Redisplay Any Receipt', indent: true },
  { label: 'Redisplay Last Receipt', indent: true },
  { label: 'Cross Check Payment Report', indent: true },
  { label: 'Open Cash Drawer' },
  { label: 'Type Setup' },
  { label: 'End Of Year' },
  { label: 'File Maintenance' },
];

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('cr');
  const [tab, setTab] = useState<'input' | 'search'>('input');
  const pending = useStore((s) => s.proposals.filter((p) => p.status === 'pending').length);

  return (
    <div className="trio">
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

      {activeModule === 'cr' ? (
        <>
          {/* Module menu */}
          <aside className="cr-sidebar">
            <div className="cr-brand">CASH RECEIPTING</div>
            <nav>
              {CR_MENU.map((m) => (
                <div
                  key={m.label}
                  className={`cr-item ${m.active ? 'active' : ''} ${m.section ? 'section' : ''} ${m.indent ? 'indent' : ''}`}
                >
                  {m.label}
                </div>
              ))}
            </nav>
            <div className="cr-user">
              <div className="who">Logged in as {MUNICIPALITY.user.name.split(' ')[0]}</div>
              <div className="where">{MUNICIPALITY.user.office}</div>
            </div>
          </aside>

          {/* Workspace */}
          <main className="trio-main">
            <div className="trio-tabs">
              <div className={`trio-tab ${tab === 'input' ? 'active' : ''}`} onClick={() => setTab('input')}>
                <span className="ti">▦</span> Receipt Input <span className="tx">✕</span>
              </div>
              <div className={`trio-tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
                <span className="ti red">▦</span> Receipt Search <span className="tx">✕</span>
              </div>
              <div className="trio-tabs-spacer" />
              <div className="trio-grid-btn">▦</div>
            </div>
            <div className="trio-content">
              {tab === 'input' ? (
                <ReceiptInputScreen />
              ) : (
                <div className="tr-screen">
                  <div className="tr-screen-head"><h2>Receipt Search</h2></div>
                  <p className="muted" style={{ padding: 12 }}>
                    Search receipts by number, date, payer, or type. (Mockup tab — open <b>Receipt Input</b> or ask the
                    TRIO Assistant to look up an account.)
                  </p>
                </div>
              )}
            </div>
          </main>
        </>
      ) : (
        <main className="trio-main">
          <div className="agents-topbar">
            <span className="agents-topbar-icon">✦</span>
            <div>
              <div className="agents-topbar-title">TRIO Agents</div>
              <div className="agents-topbar-sub">Governed operating layer over TRIO + CAMA · {MUNICIPALITY.name}</div>
            </div>
          </div>
          <div className="agents-wrap">
            <AgentsConsole />
          </div>
        </main>
      )}

      <TrioAssistant screen={activeModule === 'agents' ? 'Agents module' : tab === 'input' ? 'Cash Receipting · Receipt Input' : 'Cash Receipting · Receipt Search'} />
    </div>
  );
}
