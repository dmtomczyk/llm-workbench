import type { AppRoute } from '../routes/nav';

type NavIconProps = {
  route: AppRoute;
};

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function NavIcon({ route }: NavIconProps) {
  switch (route) {
    case 'home':
      return <IconFrame><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-5h5v5" /></IconFrame>;
    case 'chat':
      return <IconFrame><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" /></IconFrame>;
    case 'datasets':
      return <IconFrame><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></IconFrame>;
    case 'workbench':
      return <IconFrame><path d="M4 19h16" /><path d="M6 19V8l6-3 6 3v11" /><path d="M9 10h6" /><path d="M9 13h6" /></IconFrame>;
    case 'workflows':
      return <IconFrame><rect x="3" y="5" width="7" height="5" rx="1.2" /><rect x="14" y="5" width="7" height="5" rx="1.2" /><rect x="8.5" y="14" width="7" height="5" rx="1.2" /><path d="M10 7.5h4" /><path d="M12 10v4" /></IconFrame>;
    case 'imports':
      return <IconFrame><path d="M12 3v12" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4 20h16" /></IconFrame>;
    case 'automations':
      return <IconFrame><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3" /><path d="M12 18.5v3" /><path d="m4.9 4.9 2.1 2.1" /><path d="m17 17 2.1 2.1" /><path d="M2.5 12h3" /><path d="M18.5 12h3" /><path d="m4.9 19.1 2.1-2.1" /><path d="m17 7 2.1-2.1" /></IconFrame>;
    case 'providers':
      return <IconFrame><path d="M6 7h12" /><path d="M6 12h12" /><path d="M6 17h12" /><circle cx="8" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="11" cy="17" r="1" fill="currentColor" stroke="none" /></IconFrame>;
    case 'connectors':
      return <IconFrame><path d="M8.5 8.5 5.5 11.5a3 3 0 1 0 4.2 4.2l3-3" /><path d="m15.5 15.5 3-3a3 3 0 1 0-4.2-4.2l-3 3" /><path d="M9 15 15 9" /></IconFrame>;
    case 'plugins':
      return <IconFrame><path d="M9 3v6" /><path d="M15 3v6" /><path d="M9 21v-6" /><path d="M15 21v-6" /><rect x="5" y="9" width="14" height="6" rx="2" /></IconFrame>;
    case 'settings':
      return <IconFrame><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" /></IconFrame>;
    case 'ui-kit':
      return <IconFrame><rect x="4" y="4" width="7" height="7" rx="1.2" /><rect x="13" y="4" width="7" height="7" rx="1.2" /><rect x="4" y="13" width="7" height="7" rx="1.2" /><rect x="13" y="13" width="7" height="7" rx="1.2" /></IconFrame>;
    case 'audit':
      return <IconFrame><path d="M6 4h9l3 3v13H6z" /><path d="M15 4v4h4" /><path d="M9 12h6" /><path d="M9 16h6" /></IconFrame>;
    default:
      return <IconFrame><circle cx="12" cy="12" r="8" /></IconFrame>;
  }
}
