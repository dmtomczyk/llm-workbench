import { ReactNode, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth';
import { NavMenu } from '../design-system/components/NavMenu';
import { StatusChip } from '../design-system/components/StatusChip';
import { NAV_SECTIONS } from '../routes/nav';
import { NavIcon } from './NavIcon';
import { ShellSubnavContext } from './shellSubnav';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const [subnav, setSubnav] = useState<ReactNode>(null);
  const hasSubnav = Boolean(subnav);
  const shellClassName = useMemo(() => `shell${hasSubnav ? ' shell-with-subnav' : ''}${location.pathname.startsWith('/chat') ? ' shell-chat-route' : ''}`, [hasSubnav, location.pathname]);
  const navItems = useMemo(() => NAV_SECTIONS.flatMap((section) => section.items.map((item) => ({
    id: item.route,
    label: item.label,
    icon: <NavIcon route={item.route} />,
    trailing: undefined,
  }))), []);
  const routeToPath = useMemo(() => Object.fromEntries(NAV_SECTIONS.flatMap((section) => section.items.map((item) => [item.route, item.path]))), []);
  const activeRoute = useMemo(() => {
    const match = NAV_SECTIONS.flatMap((section) => section.items).find((item) => item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path));
    return match?.route ?? 'home';
  }, [location.pathname]);

  return (
    <ShellSubnavContext.Provider value={{ setSubnav }}>
      <div className={shellClassName}>
      <aside className="sidebar">
        <div className="brand">
          <h1 className="brand-logo">BRIDGE</h1>
          <p>Where LLMs, tools, and data meet</p>
        </div>
        <NavMenu
          title="Sidebar Navigation"
          subtitle="Primary Routes"
          defaultActiveId={activeRoute}
          key={activeRoute}
          minHeight={520}
          items={navItems}
          onChange={(id) => {
            const path = routeToPath[id];
            if (path) navigate(path);
          }}
        />
      </aside>
      {hasSubnav ? <aside className="contextual-sidebar">{subnav}</aside> : null}
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">
            <strong>BRIDGE</strong>
            <span className="muted">Grounded chat first; datasets, prompts, workflows, and automation behind it.</span>
          </div>
          {auth.config?.enabled && auth.user ? (
            <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
              <span className="muted">{auth.user.name || auth.user.email || auth.user.sub}</span>
              <StatusChip text="Logout" tone="warning" chipStyle="box" backgroundEffect="glow" haloBoost={1.15} clickable onClick={() => auth.beginLogout()} />
            </div>
          ) : null}
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
      </div>
    </ShellSubnavContext.Provider>
  );
}
