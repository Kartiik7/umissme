import { useState, useEffect } from 'react';
import LandingPage from './screens/LandingPage';
import SanctuarySpace from './screens/SanctuarySpace';
import ActivityTimeline from './screens/ActivityTimeline';
import Settings from './screens/Settings';
import ChatScreen from './screens/ChatScreen';
import BottomNav from './components/BottomNav';
import { getAuth, clearAuth } from './services/api';
import { socketService } from './services/socket';

type Screen = 'landing' | 'app';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [activeTab, setActiveTab] = useState('messages');

  useEffect(() => {
    // Check if user is already logged in
    const { spaceId, userName } = getAuth();
    if (spaceId && userName) {
      setScreen('app');
    }
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleLogout = () => {
      clearAuth();
      socketService.disconnect();
      setScreen('landing');
      setActiveTab('messages'); // reset
    };

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleLogout, 15 * 60 * 1000);
    };

    const kickListener = () => {
      alert("You were logged out because your account was accessed from another device.");
      handleLogout();
    };

    const unbindKick = socketService.on('session-kicked', kickListener);

    if (screen === 'app') {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('touchstart', resetTimer);
      resetTimer();
    }

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      unbindKick();
    };
  }, [screen]);

  if (screen === 'landing') {
    return <LandingPage onStart={() => setScreen('app')} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'messages':
        return <ChatScreen />;
      case 'memories':
        return <SanctuarySpace onBack={() => setScreen('landing')} />;
      case 'activity':
        return <ActivityTimeline />;
      case 'settings':
        return <Settings onLogout={() => setScreen('landing')} />;
      default:
        return <ChatScreen />;
    }
  };

  return (
    <div>
      {renderTab()}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
