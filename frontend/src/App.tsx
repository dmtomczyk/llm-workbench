import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { AuditPage } from './features/audit/AuditPage';
import { AutomationsPage } from './features/automations/AutomationsPage';
import { ChatPage } from './features/chat/ChatPage';
import { ConnectorsPage } from './features/connectors/ConnectorsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PlaceholderPage } from './features/PlaceholderPage';
import { ImportsPage } from './features/imports/ImportsPage';
import { PluginsPage } from './features/plugins/PluginsPage';
import { ProvidersPage } from './features/providers/ProvidersPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { WorkbenchPage } from './features/workbench/WorkbenchPage';
import { WorkflowsPage } from './features/workflows/WorkflowsPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/imports" element={<ImportsPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/connectors" element={<ConnectorsPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/automations" element={<AutomationsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
