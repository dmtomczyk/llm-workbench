import { NavLink, Outlet } from 'react-router-dom';

import { NAV_ITEMS } from '../routes/nav';

export function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <h1 className="brand-logo">BRIDGE</h1>
          <p>Where LLMs, tools, and data meet</p>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.route}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={item.path === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">
            <strong>BRIDGE</strong>
            <span className="muted">Bridge for Reasoning, Interaction, Data, Guidance, and Execution</span>
          </div>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
