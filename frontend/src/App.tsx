import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './auth/RequireAuth';
import { HomePage } from './pages/HomePage';
import { ValuePropositionPage } from './pages/ValuePropositionPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HRDashboard } from './pages/HRDashboard';
import { OperationsDashboard } from './pages/OperationsDashboard';
import { ITAdminPage } from './pages/ITAdminPage';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { RolesPage } from './pages/RolesPage';
import { AuditPage } from './pages/AuditPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { MilestonesPage } from './pages/MilestonesPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/value-proposition" element={<ValuePropositionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/hr-dashboard"
          element={
            <RequireAuth>
              <HRDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/operations-dashboard"
          element={
            <RequireAuth>
              <OperationsDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/it-admin"
          element={
            <RequireAuth>
              <ITAdminPage />
            </RequireAuth>
          }
        />
        <Route
          path="/executive-dashboard"
          element={
            <RequireAuth>
              <ExecutiveDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/roles"
          element={
            <RequireAuth permission="role.read">
              <RolesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/audit"
          element={
            <RequireAuth permission="audit.read">
              <AuditPage />
            </RequireAuth>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/webhooks"
          element={
            <RequireAuth permission="webhook.read">
              <WebhooksPage />
            </RequireAuth>
          }
        />
        <Route
          path="/milestones"
          element={
            <RequireAuth permission="milestone.read">
              <MilestonesPage />
            </RequireAuth>
          }
        />

        <Route path="/dashboard" element={<Navigate to="/hr-dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
