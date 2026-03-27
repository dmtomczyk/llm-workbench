export type AppRoute =
  | 'home'
  | 'chat'
  | 'workbench'
  | 'imports'
  | 'datasets'
  | 'providers'
  | 'connectors'
  | 'workflows'
  | 'automations'
  | 'audit'
  | 'plugins'
  | 'settings';

export type NavItem = { route: AppRoute; label: string; path: string; description?: string };
export type NavSection = { id: string; label: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { route: 'home', label: 'Home', path: '/', description: 'Start here with recent work and quick actions.' },
      { route: 'chat', label: 'Chat', path: '/chat', description: 'Primary surface for grounded exploration.' },
      { route: 'datasets', label: 'Datasets', path: '/datasets', description: 'Inspect data and launch into other flows.' },
    ],
  },
  {
    id: 'build-run',
    label: 'Build & Run',
    items: [
      { route: 'workbench', label: 'Workbench', path: '/workbench', description: 'Test prompts and inspect one-off runs.' },
      { route: 'workflows', label: 'Workflows', path: '/workflows', description: 'Create reusable multi-step runs.' },
      { route: 'imports', label: 'Imports', path: '/recipes', description: 'Bring data in and make ingest repeatable.' },
      { route: 'automations', label: 'Automations', path: '/automations', description: 'Schedule repeatable work.' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    items: [
      { route: 'providers', label: 'Providers', path: '/providers' },
      { route: 'connectors', label: 'Connectors', path: '/connectors' },
      { route: 'plugins', label: 'Plugins', path: '/plugins' },
      { route: 'settings', label: 'Settings', path: '/settings' },
      { route: 'audit', label: 'Audit', path: '/audit' },
    ],
  },
];
