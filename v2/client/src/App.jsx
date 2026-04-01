import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CreateSpacePage from './pages/CreateSpacePage'
import JoinSpacePage from './pages/JoinSpacePage'
import IdentitySelectionPage from './pages/IdentitySelectionPage'
import MainChatAppPage from './pages/MainChatAppPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/create" element={<CreateSpacePage />} />
      <Route path="/join" element={<JoinSpacePage />} />
      <Route path="/identity" element={<IdentitySelectionPage />} />
      <Route path="/app" element={<MainChatAppPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
