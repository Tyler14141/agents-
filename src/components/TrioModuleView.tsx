import { useState, type ReactNode } from 'react';
import { MUNICIPALITY } from '../data/municipal';

export interface TrioMenuItem {
  label: string;
  active?: boolean;
  section?: boolean;
  indent?: boolean;
}

export interface TrioTab {
  id: string;
  label: string;
  color?: string;
  Screen: () => JSX.Element;
}

export interface TrioModuleDef {
  brand: string;
  menu: TrioMenuItem[];
  tabs: TrioTab[];
}

export function TrioModuleView({ def, toggle }: { def: TrioModuleDef; toggle: ReactNode }) {
  const [tab, setTab] = useState(def.tabs[0].id);
  const active = def.tabs.find((t) => t.id === tab) ?? def.tabs[0];
  const Screen = active.Screen;

  return (
    <>
      <aside className="cr-sidebar">
        <div className="cr-brand">{def.brand}</div>
        <nav>
          {def.menu.map((m) => (
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

      <main className="trio-main">
        <div className="trio-tabs">
          {def.tabs.map((t) => (
            <div key={t.id} className={`trio-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <span className="ti" style={t.color ? { color: t.color } : undefined}>▦</span> {t.label} <span className="tx">✕</span>
            </div>
          ))}
          <div className="trio-tabs-spacer" />
          {toggle}
          <div className="trio-grid-btn">▦</div>
        </div>
        <div className="trio-content">
          <Screen />
        </div>
      </main>
    </>
  );
}
