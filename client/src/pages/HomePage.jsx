import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSavedSpaceId,
  getSavedSpaceSession,
  hasActiveSession,
  getSavedDisplayName,
} from '../services/session';
import styles from './HomePage.module.css';

function HomePage() {
  const navigate = useNavigate();
  const savedSpaceId = getSavedSpaceId();
  const savedSpace = getSavedSpaceSession();
  const activeSession = hasActiveSession();
  const displayName = getSavedDisplayName();

  useEffect(() => {
    document.title = 'Pinglet - Private Space for Friends';
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <section className={styles.heroSection}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Chat-First Experience</p>
            <h1 className={styles.title}>Pinglet</h1>
            <p className={styles.tagline}>Your private space to chat, ping, and share memories</p>
            <p className={styles.description}>
              A clean, personal space for two people to stay connected through messages, quick pings,
              and shared moments.
            </p>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={() => navigate('/create')}>
                Create Space
              </button>
              <button className={styles.secondaryBtn} onClick={() => navigate('/join')}>
                Join Space
              </button>
            </div>

            {activeSession && (
              <p className={styles.resumeText}>
                Welcome back, <strong>{displayName}</strong>.{' '}
                <button
                  className={styles.inlineLink}
                  onClick={() => navigate(`/messages/${savedSpaceId}`, { state: { space: savedSpace } })}
                >
                  Open your latest conversation
                </button>
              </p>
            )}
          </div>

          <aside className={styles.heroPreview} aria-label="Pinglet preview">
            <p className={styles.previewTitle}>Inside Your Space</p>
            <div className={styles.previewList}>
              <div className={styles.previewItem}>
                <span>Messages</span>
                <strong>Real-time chat flow</strong>
              </div>
              <div className={styles.previewItem}>
                <span>Pings</span>
                <strong>Instant check-ins</strong>
              </div>
              <div className={styles.previewItem}>
                <span>Memories</span>
                <strong>Shared moments board</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Features</h2>
        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <span className={styles.featureIcon} aria-hidden="true">💬</span>
            <h3>Messages</h3>
            <p>Leave messages for your friend anytime.</p>
          </article>

          <article className={styles.featureCard}>
            <span className={styles.featureIcon} aria-hidden="true">👋</span>
            <h3>Ping</h3>
            <p>Send a quick ping to get your friend's attention.</p>
          </article>

          <article className={styles.featureCard}>
            <span className={styles.featureIcon} aria-hidden="true">📸</span>
            <h3>Memories</h3>
            <p>Save shared moments and memories in your private space.</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsGrid}>
          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepBadge}>1</span>
              <span className={styles.stepIcon} aria-hidden="true">✨</span>
            </div>
            <h3 className={styles.stepTitle}>Create Your Space</h3>
            <p className={styles.stepText}>Start a private room and set the vibe in under a minute.</p>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepBadge}>2</span>
              <span className={styles.stepIcon} aria-hidden="true">🤝</span>
            </div>
            <h3 className={styles.stepTitle}>Invite Your Friend</h3>
            <p className={styles.stepText}>Share your space name and code so both can join instantly.</p>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepBadge}>3</span>
              <span className={styles.stepIcon} aria-hidden="true">🚀</span>
            </div>
            <h3 className={styles.stepTitle}>Start Chatting</h3>
            <p className={styles.stepText}>Message, ping, and save memories together in one clean place.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
