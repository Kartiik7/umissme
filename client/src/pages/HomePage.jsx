import { useNavigate } from 'react-router-dom';
import { getSavedSpaceId, getSavedSpaceSession, hasActiveSession, getSavedSenderName } from '../services/session';
import styles from './HomePage.module.css';

const hearts = ['💕', '💖', '💗', '💘', '💝', '♥️', '✨', '🌸'];

function HomePage() {
  const navigate = useNavigate();
  const savedSpaceId = getSavedSpaceId();
  const savedSpace = getSavedSpaceSession();
  const activeSession = hasActiveSession();
  const senderName = getSavedSenderName();

  return (
    <main className={styles.hero}>
      {/* Floating hearts background */}
      <div className={styles.heartsContainer} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className={styles.floatingHeart}
            style={{
              left: `${8 + Math.random() * 84}%`,
              animationDuration: `${6 + Math.random() * 8}s`,
              animationDelay: `${Math.random() * 5}s`,
              fontSize: `${1 + Math.random() * 1.5}rem`,
            }}
          >
            {hearts[i % hearts.length]}
          </span>
        ))}
      </div>

      <div className={styles.content}>
        <div className={styles.heartPulse}>💗</div>
        <h1 className={styles.title}>umissme</h1>
        <p className={styles.tagline}>
          A tiny, private corner of the internet <br />
          made just for <strong>two hearts</strong> 💕
        </p>

        {activeSession ? (
          <div className={styles.sessionResume}>
            <p className={styles.welcomeBack}>
              Welcome back, <strong>{senderName}</strong> 💕
            </p>
            <button
              className={styles.primary}
              onClick={() => navigate(`/messages/${savedSpaceId}`, { state: { space: savedSpace } })}
            >
              💬 Open Messages
            </button>
            <button
              className={styles.secondary}
              onClick={() => navigate(`/dashboard/${savedSpaceId}`, { state: { space: savedSpace } })}
            >
              📋 Go to Dashboard
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => navigate('/create')}>
              ✨ Create Space
            </button>
            <button className={styles.secondary} onClick={() => navigate('/join')}>
              💌 Join Space
            </button>
          </div>
        )}

        {!activeSession && savedSpaceId && (
          <button
            className={styles.continueBtn}
            onClick={() => navigate(`/dashboard/${savedSpaceId}`, { state: { space: savedSpace } })}
          >
            Continue where you left off →
          </button>
        )}

        <p className={styles.subtext}>
          No sign-ups. No passwords. Just love. 🤍
        </p>
      </div>
    </main>
  );
}

export default HomePage;
