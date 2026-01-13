import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import CustomerHome from './pages/customer/Home';
import CustomerActivity from './pages/customer/Activity';
import CustomerSupport from './pages/customer/Support';
import GarageOnboarding from './pages/garage/Onboarding';
import GarageDashboard from './pages/garage/Dashboard';
import GarageSupport from './pages/garage/Support';
import './index.css';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'customer' | 'garage' }) {
  const { user, userData, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/auth" replace />;

  const savedRole = localStorage.getItem('userRole');
  const role = userData?.role || savedRole;

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'garage' ? '/garage' : '/customer'} replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    const savedRole = localStorage.getItem('userRole');
    const role = userData?.role || savedRole;
    if (role === 'garage') {
      const onboarded = localStorage.getItem('garageOnboarded');
      return <Navigate to={onboarded ? '/garage' : '/garage/onboarding'} replace />;
    }
    return <Navigate to="/customer" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />

          {/* Customer Routes */}
          <Route path="/customer" element={<ProtectedRoute requiredRole="customer"><CustomerHome /></ProtectedRoute>} />
          <Route path="/customer/activity" element={<ProtectedRoute requiredRole="customer"><CustomerActivity /></ProtectedRoute>} />
          <Route path="/customer/support" element={<ProtectedRoute requiredRole="customer"><CustomerSupport /></ProtectedRoute>} />

          {/* Garage Routes */}
          <Route path="/garage/onboarding" element={<ProtectedRoute requiredRole="garage"><GarageOnboarding /></ProtectedRoute>} />
          <Route path="/garage" element={<ProtectedRoute requiredRole="garage"><GarageDashboard /></ProtectedRoute>} />
          <Route path="/garage/support" element={<ProtectedRoute requiredRole="garage"><GarageSupport /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
