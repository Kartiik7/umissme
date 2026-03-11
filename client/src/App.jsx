import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import CreateSpacePage from './pages/CreateSpacePage';
import JoinSpacePage from './pages/JoinSpacePage';
import PartnerSelectPage from './pages/PartnerSelectPage';
import DashboardPage from './pages/DashboardPage';
import MessagesPage from './pages/MessagesPage';
import { getSavedSpaceId, hasActiveSession } from './services/session';

function App() {
  const savedSpaceId = getSavedSpaceId();
  const activeSession = hasActiveSession();

  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateSpacePage />} />
        <Route path="/join" element={<JoinSpacePage />} />
        <Route path="/select-partner" element={<PartnerSelectPage />} />
        <Route
          path="/dashboard"
          element={
            savedSpaceId ? (
              <Navigate to={`/dashboard/${savedSpaceId}`} replace />
            ) : (
              <Navigate to="/join" replace />
            )
          }
        />
        <Route path="/dashboard/:spaceId" element={<DashboardPage />} />
        <Route
          path="/messages"
          element={
            activeSession ? (
              <Navigate to={`/messages/${savedSpaceId}`} replace />
            ) : (
              <Navigate to="/join" replace />
            )
          }
        />
        <Route path="/messages/:spaceId" element={<MessagesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
