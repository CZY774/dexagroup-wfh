import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { AdminEmployeesPage } from './pages/AdminEmployeesPage';
import { AdminMonitoringPage } from './pages/AdminMonitoringPage';
import { EmployeeAttendancePage } from './pages/EmployeeAttendancePage';
import { EmployeeHistoryPage } from './pages/EmployeeHistoryPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader" aria-busy="true" aria-label="Loading application">
        <span className="brand-mark" aria-hidden="true">dx</span>
        <span className="skeleton-line loader-line" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'HRD_ADMIN' ? '/admin/employees' : '/employee/attendance'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute roles={['EMPLOYEE']} />}>
        <Route element={<AppLayout />}>
          <Route path="/employee/attendance" element={<EmployeeAttendancePage />} />
          <Route path="/employee/history" element={<EmployeeHistoryPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['HRD_ADMIN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/employees" element={<AdminEmployeesPage />} />
          <Route path="/admin/attendance" element={<AdminMonitoringPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
