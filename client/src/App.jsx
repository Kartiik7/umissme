import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import CreateSpacePage from './pages/CreateSpacePage';
import JoinSpacePage from './pages/JoinSpacePage';
import PartnerSelectPage from './pages/PartnerSelectPage';
import MessagesPage from './pages/MessagesPage';
import { getSavedSpaceId, hasActiveSession } from './services/session';

function App() {
  const location = useLocation();
  const savedSpaceId = getSavedSpaceId();
  const activeSession = hasActiveSession();
  const isChatLayout = location.pathname.startsWith('/messages/');

  return (
    <div className={`app-shell ${isChatLayout ? 'app-shell-chat' : ''}`}>
      {!isChatLayout && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateSpacePage />} />
        <Route path="/join" element={<JoinSpacePage />} />
        <Route path="/select-identity" element={<PartnerSelectPage />} />
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
        <Route
          path="/dashboard/:spaceId"
          element={activeSession ? <Navigate to="/messages" replace /> : <Navigate to="/join" replace />}
        />
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
