import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { AuditPage } from './features/audit/AuditPage';
import { ConnectorsPage } from './features/connectors/ConnectorsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PlaceholderPage } from './features/PlaceholderPage';
import { PluginsPage } from './features/plugins/PluginsPage';
import { ProvidersPage } from './features/providers/ProvidersPage';
import { WorkbenchPage } from './features/workbench/WorkbenchPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/connectors" element={<ConnectorsPage />} />
        <Route path="/workflows" element={<PlaceholderPage title="Workflows" body="Workflow editor and runner are scaffolded conceptually but not built yet." />} />
        <Route path="/automations" element={<PlaceholderPage title="Automations" body="APScheduler-backed job orchestration comes after the workbench slice." />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" body="Runtime settings are available via the API now; UI comes later." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
