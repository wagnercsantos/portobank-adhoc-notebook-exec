import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import Layout from './components/Layout';
import SubmitRequest from './pages/SubmitRequest';
import MyRequests from './pages/MyRequests';
import PendingApprovals from './pages/PendingApprovals';
import AuditDashboard from './pages/AuditDashboard';
import Admin from './pages/Admin';

function App() {
  const { fetchUser, fetchConfig, user } = useAppStore();

  useEffect(() => {
    fetchUser();
    fetchConfig();
  }, [fetchUser, fetchConfig]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/submit" replace />} />
        <Route path="/submit" element={<SubmitRequest />} />
        <Route path="/my-requests" element={<MyRequests />} />
        {user?.is_approver && (
          <>
            <Route path="/pending" element={<PendingApprovals />} />
            <Route path="/audit" element={<AuditDashboard />} />
          </>
        )}
        {user?.is_admin && (
          <Route path="/admin" element={<Admin />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
