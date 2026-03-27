import { ReactNode, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { NAV_SECTIONS } from '../routes/nav';
import { ShellSubnavContext } from './shellSubnav';

export function Layout() {
  const location = useLocation();
  const [subnav, setSubnav] = useState<ReactNode>(null);
  const hasSubnav = Boolean(subnav);
  const shellClassName = useMemo(() => `shell${hasSubnav ? ' shell-with-subnav' : ''}${location.pathname.startsWith('/chat') ? ' shell-chat-route' : ''}`, [hasSubnav, location.pathname]);

  return (
    <ShellSubnavContext.Provider value={{ setSubnav }}>
      <div className={shellClassName}>
      <aside className="sidebar">
        <div className="brand">
          <h1 className="brand-logo">BRIDGE</h1>
          <p>Where LLMs, tools, and data meet</p>
        </div>
        <nav className="nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className="nav-section">
              <div className="nav-section-label">{section.label}</div>
              <div className="nav-section-items">
                {section.items.map((item) => (
                  <NavLink
                    key={item.route}
                    to={item.path}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    end={item.path === '/'}
                    title={item.description ?? item.label}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {hasSubnav ? <aside className="contextual-sidebar">{subnav}</aside> : null}
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">
            <strong>BRIDGE</strong>
            <span className="muted">Grounded chat first; datasets, prompts, workflows, and automation behind it.</span>
          </div>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
      </div>
    </ShellSubnavContext.Provider>
  );
}
