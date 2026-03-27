export type AppRoute =
  | 'dashboard'
  | 'chat'
  | 'workbench'
  | 'imports'
  | 'providers'
  | 'connectors'
  | 'workflows'
  | 'automations'
  | 'audit'
  | 'plugins'
  | 'settings';

export const NAV_ITEMS: { route: AppRoute; label: string; path: string }[] = [
  { route: 'dashboard', label: 'Dashboard', path: '/' },
  { route: 'chat', label: 'Chat', path: '/chat' },
  { route: 'workbench', label: 'Workbench', path: '/workbench' },
  { route: 'imports', label: 'Imports', path: '/imports' },
  { route: 'providers', label: 'Providers', path: '/providers' },
  { route: 'connectors', label: 'Connectors', path: '/connectors' },
  { route: 'workflows', label: 'Workflows', path: '/workflows' },
  { route: 'automations', label: 'Automations', path: '/automations' },
  { route: 'audit', label: 'Audit', path: '/audit' },
  { route: 'plugins', label: 'Plugins', path: '/plugins' },
  { route: 'settings', label: 'Settings', path: '/settings' },
];
