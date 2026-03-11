import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { getSavedSpaceSession } from '../services/session';
import { getLastMessage } from '../services/api';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const { spaceId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const savedSpace = getSavedSpaceSession();
  const space = state?.space || savedSpace;

  const [lastMsg, setLastMsg] = useState(null);

  useEffect(() => {
    if (!spaceId) return;
    getLastMessage(spaceId)
      .then((msg) => setLastMsg(msg))
      .catch(() => {});
  }, [spaceId]);

  if (!space) {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <div className={styles.emoji}>😔</div>
          <p className={styles.muted}>
            Space not found.{' '}
            <a href="/join" onClick={(e) => { e.preventDefault(); navigate('/join'); }}>
              Join again →
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.heartDecor}>
          <span className={styles.bigHeart}>💕</span>
        </div>

        <h2 className={styles.spaceName}>{space.spaceName}</h2>
        <p className={styles.partners}>
          {space.partnerOneName} 💗 {space.partnerTwoName}
        </p>

        <div className={styles.divider}></div>

        {lastMsg ? (
          <div className={styles.lastMessage}>
            <span className={styles.lastLabel}>Last message</span>
            <p className={styles.lastText}>
              <strong>{lastMsg.sender}:</strong>{' '}
              {lastMsg.text.length > 80
                ? lastMsg.text.slice(0, 80) + '…'
                : lastMsg.text}
            </p>
          </div>
        ) : (
          <p className={styles.loveNote}>
            Your private little world ✨<br />
            Send each other sweet messages anytime 💌
          </p>
        )}

        <div className={styles.actions}>
          <button
            className={styles.primary}
            onClick={() => navigate(`/messages/${spaceId}`, { state: { space } })}
          >
            💬 Open Messages
          </button>
        </div>
      </div>
    </main>
  );
}

export default DashboardPage;
