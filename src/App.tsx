import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ListManagerPage from './pages/ListManagerPage';
import PracticeSetupPage from './pages/PracticeSetupPage';
import PracticeSessionPage from './pages/PracticeSessionPage';
import HistoryPage from './pages/HistoryPage';
import OverviewPage from './pages/OverviewPage';
import SharedListPage from './pages/SharedListPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import MainLayout from './layouts/MainLayout';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { session, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="container text-center mt-4">Đang tải...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />

      {/* Các route sử dụng MainLayout (Có Sidebar/BottomNav) */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<OverviewPage />} />
        <Route path="/lists-manager" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/list/:listId" element={<ListManagerPage />} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboardPage /></ProtectedRoute>} />
      </Route>

      {/* Các route toàn màn hình, không dùng MainLayout */}
      <Route path="/practice/setup/:listId" element={<ProtectedRoute><PracticeSetupPage /></ProtectedRoute>} />
      <Route path="/practice/session/:listId" element={<ProtectedRoute><PracticeSessionPage /></ProtectedRoute>} />

      <Route path="/share/:listId" element={<SharedListPage />} />

      <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
