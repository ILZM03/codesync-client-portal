import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Spinner } from './components/ui';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectLayout from './pages/ProjectLayout';
import Overview from './pages/Overview';
import Board from './pages/Board';
import Timeline from './pages/Timeline';
import Meetings from './pages/Meetings';
import ProjectSettings from './pages/ProjectSettings';
import Admin from './pages/Admin';

function RequireAuth({ children }) {
  const { session, loading, profileError, signOut } = useAuth();
  const location = useLocation();
  if (session === null) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (profileError)
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h2>We couldn’t load your account</h2>
          <p className="muted">{profileError}</p>
          <button className="btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  if (loading) return <div className="center-screen"><Spinner /></div>;
  return children;
}

function RequireStaff({ children }) {
  const { isStaff } = useAuth();
  return isStaff ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<Projects />} />
              <Route path="p/:projectId" element={<ProjectLayout />}>
                <Route index element={<Overview />} />
                <Route path="board" element={<Board />} />
                <Route path="timeline" element={<Timeline />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="settings" element={<RequireStaff><ProjectSettings /></RequireStaff>} />
              </Route>
              <Route path="admin" element={<RequireStaff><Admin /></RequireStaff>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
