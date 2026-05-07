import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import StokvelSelector from './pages/StokvelSelector';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Contributions from './pages/Contributions';
import Meetings from './pages/Meetings';
import Reminders from './pages/Reminders';

export interface Stokvel {
  id: number;
  name: string;
  description: string | null;
  contribution_amount: number;
  contribution_frequency: string;
  created_at: string;
}

function App() {
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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <StokvelSelector
              activeStokvel={activeStokvel}
              onSelect={setActiveStokvel}
            />
          }
        />
        {activeStokvel ? (
          <Route element={<Layout stokvel={activeStokvel} onChangeStokvel={() => setActiveStokvel(null)} />}>
            <Route path="/dashboard" element={<Dashboard stokvel={activeStokvel} />} />
            <Route path="/members" element={<Members stokvel={activeStokvel} />} />
            <Route path="/contributions" element={<Contributions stokvel={activeStokvel} />} />
            <Route path="/meetings" element={<Meetings stokvel={activeStokvel} />} />
            <Route path="/reminders" element={<Reminders stokvel={activeStokvel} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
