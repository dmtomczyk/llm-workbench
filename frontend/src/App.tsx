import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { AuditPage } from './features/audit/AuditPage';
import { LoginPage } from './features/auth/LoginPage';
import { AutomationsPage } from './features/automations/AutomationsPage';
import { ChatPage } from './features/chat/ChatPage';
import { ConnectorsPage } from './features/connectors/ConnectorsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DatasetsPage } from './features/datasets/DatasetsPage';
import { PluginsPage } from './features/plugins/PluginsPage';
import { RecipesPage } from './features/recipes/RecipesPage';
import { ProvidersPage } from './features/providers/ProvidersPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { WorkbenchPage } from './features/workbench/WorkbenchPage';
import { WorkflowsPage } from './features/workflows/WorkflowsPage';

function ProtectedLayout() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <div className="app-shell"><main className="content"><div className="card stack"><h2>Checking sign-in…</h2></div></main></div>;
  }
  if (auth.config?.enabled && !auth.user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}` || '/');
    return <Navigate to={`/login?next=${next}&error=required`} replace />;
  }
  return <Layout />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/workbench" element={<WorkbenchPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
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
    </AuthProvider>
  );
}
