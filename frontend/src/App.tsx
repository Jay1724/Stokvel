import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import StokvelSelector from './pages/StokvelSelector';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Contributions from './pages/Contributions';
import Payouts from './pages/Payouts';
import Fines from './pages/Fines';
import Meetings from './pages/Meetings';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export interface Stokvel {
  id: number;
  name: string;
  description: string | null;
  contribution_amount: number;
  contribution_frequency: string;
  created_at: string;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [activeStokvel, setActiveStokvel] = useState<Stokvel | null>(() => {
    const saved = localStorage.getItem('activeStokvel');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (activeStokvel) {
      localStorage.setItem('activeStokvel', JSON.stringify(activeStokvel));
    } else {
      localStorage.removeItem('activeStokvel');
    }
  }, [activeStokvel]);

  // Clear stokvel when user logs out
  useEffect(() => {
    if (!user) setActiveStokvel(null);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-800 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!activeStokvel) {
    return (
      <Routes>
        <Route
          path="/"
          element={<StokvelSelector activeStokvel={activeStokvel} onSelect={setActiveStokvel} />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout stokvel={activeStokvel} onChangeStokvel={() => setActiveStokvel(null)} />}>
        <Route path="/dashboard" element={<Dashboard stokvel={activeStokvel} />} />
        <Route path="/members" element={<Members stokvel={activeStokvel} />} />
        <Route path="/contributions" element={<Contributions stokvel={activeStokvel} />} />
        <Route path="/payouts" element={<Payouts stokvel={activeStokvel} />} />
        <Route path="/fines" element={<Fines stokvel={activeStokvel} />} />
        <Route path="/meetings" element={<Meetings stokvel={activeStokvel} />} />
        <Route path="/reminders" element={<Reminders stokvel={activeStokvel} />} />
        <Route path="/reports" element={<Reports stokvel={activeStokvel} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
