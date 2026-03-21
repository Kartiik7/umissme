import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { addMemory, getMessages, getSpaceOverview, sendMessage, sendPing, updateRetention } from '../services/api';
import {
  clearSession,
  getSavedDisplayName,
  getSavedSpaceSession,
  saveSpaceSession,
} from '../services/session';
import styles from './DashboardPage.module.css';

function formatDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const MAX_MESSAGE_CHARS = 500;

function getLastSeenStorageKey(spaceId, displayName) {
  return `lastSeenAt:${spaceId}:${String(displayName || '').trim().toLowerCase()}`;
}

function parseTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getActivityKind(type) {
  if (type === 'message') return 'message';
  if (type === 'memory') return 'memory';
  if (type === 'ping') return 'ping';
  return 'system';
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function DashboardPage() {
  const { spaceId } = useParams();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pinging, setPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [memoryForm, setMemoryForm] = useState({ title: '', note: '', imageUrl: '' });
  const [savingMemory, setSavingMemory] = useState(false);
  const [memoryError, setMemoryError] = useState('');

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const initialLastSeenRef = useRef(null);
  const socketRef = useRef(null);

  const [savingRetention, setSavingRetention] = useState(false);
  const [retentionError, setRetentionError] = useState('');

  const displayName = getSavedDisplayName();

  useEffect(() => {
    const currentSpaceName = overview?.space?.spaceName;
    document.title = currentSpaceName
      ? `${currentSpaceName} - Dashboard - Pinglet`
      : 'Dashboard - Pinglet';
  }, [overview?.space?.spaceName]);

  useEffect(() => {
    if (!spaceId || !displayName) return;
    const key = getLastSeenStorageKey(spaceId, displayName);
    const saved = parseTimestamp(localStorage.getItem(key));
    initialLastSeenRef.current = saved;
    setLastSeenAt(saved);
  }, [spaceId, displayName]);

  const loadOverview = useCallback(async ({ silent = false } = {}) => {
    if (!spaceId) return;

    if (!silent) setLoading(true);

    try {
      const data = await getSpaceOverview(spaceId);
      setOverview(data);
      saveSpaceSession(data.space);
      setError('');
    } catch (err) {
      if (/space not found|invalid space id/i.test(err.message || '')) {
        clearSession();
        navigate('/join', {
          replace: true,
          state: { error: 'That space could not be found. Join again using the latest code.' },
        });
        return;
      }
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [spaceId, navigate]);

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    if (!spaceId) return;

    if (!silent) setMessagesLoading(true);

    try {
      const data = await getMessages(spaceId);
      setMessages(data);
      setChatError('');
    } catch (err) {
      setChatError(err.message);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadOverview();
    loadMessages();
  }, [loadOverview, loadMessages]);

  useEffect(() => {
    if (!spaceId || !displayName) return;

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join-space', { spaceId, userName: displayName });

    socket.on('messages-updated', () => {
      loadMessages({ silent: true });
      loadOverview({ silent: true });
    });

    socket.on('messages-read', () => {
      loadMessages({ silent: true });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [spaceId, displayName, loadOverview, loadMessages]);

  const memberNames = useMemo(() => {
    const s = overview?.space;
    if (!s) return '';
    return [s.friendOneName, s.friendTwoName].filter(Boolean).join(' - ');
  }, [overview]);

  const handlePing = async () => {
    if (!spaceId || !displayName || pinging) return;

    setPinging(true);
    setError('');

    try {
      await sendPing(spaceId, displayName);
      await loadOverview({ silent: true });
      setPingSuccess(true);
      setTimeout(() => setPingSuccess(false), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setPinging(false);
    }
  };

  const handleMemoryChange = (event) => {
    const { name, value } = event.target;
    setMemoryForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemorySubmit = async (event) => {
    event.preventDefault();

    if (!spaceId || !displayName || savingMemory) return;

    setSavingMemory(true);
    setMemoryError('');

    try {
      await addMemory(spaceId, { ...memoryForm, displayName });
      setMemoryForm({ title: '', note: '', imageUrl: '' });
      await loadOverview({ silent: true });
    } catch (err) {
      setMemoryError(err.message);
    } finally {
      setSavingMemory(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = chatInput.trim();
    if (!spaceId || !displayName || !text || sendingMessage || text.length > MAX_MESSAGE_CHARS) return;

    setSendingMessage(true);
    setChatError('');

    try {
      await sendMessage({
        spaceId,
        sender: displayName,
        text,
      });

      setChatInput('');
      await Promise.all([loadMessages({ silent: true }), loadOverview({ silent: true })]);
    } catch (err) {
      setChatError(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLeave = () => {
    clearSession();
    navigate('/');
  };

  const handleRetentionChange = async (hours) => {
    if (!spaceId || savingRetention) return;
    setSavingRetention(true);
    setRetentionError('');
    try {
      await updateRetention(spaceId, hours);
      await loadOverview({ silent: true });
    } catch (err) {
      setRetentionError(err.message);
    } finally {
      setSavingRetention(false);
    }
  };

  const markSpaceAsSeen = () => {
    if (!spaceId || !displayName) return;
    const nowIso = new Date().toISOString();
    localStorage.setItem(getLastSeenStorageKey(spaceId, displayName), nowIso);
    setLastSeenAt(new Date(nowIso));
  };

  useEffect(() => {
    if (!overview || loading || messagesLoading) return;
    markSpaceAsSeen();
  }, [overview, loading, messagesLoading]);

  const handleOpenChat = () => {
    navigate(`/messages/${spaceId}`, { state: { space } });
  };

  if (!displayName) {
    return (
      <main className={styles.container}>
        <section className={styles.card}>
          <h2>Session Missing</h2>
          <p className={styles.helper}>Select your display name again to continue.</p>
          <button className={styles.secondaryBtn} onClick={() => navigate('/join')} type="button">
            Go to Join Space
          </button>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={styles.container}>
        <section className={styles.card}>
          <h2>Loading space...</h2>
          <p className={styles.helper}>Fetching the latest Pinglet updates.</p>
        </section>
      </main>
    );
  }

  if (error && !overview) {
    return (
      <main className={styles.container}>
        <section className={styles.card}>
          <h2>Unable to load space</h2>
          <p className={styles.error}>{error}</p>
          <button className={styles.secondaryBtn} onClick={() => navigate('/join')} type="button">
            Join Again
          </button>
        </section>
      </main>
    );
  }

  const fallbackSpace = getSavedSpaceSession();
  const space = overview?.space || fallbackSpace;
  const memories = overview?.memories || [];
  const activityTimeline = overview?.activityTimeline || [];
  const stats = overview?.stats || { totalMessages: 0, totalPings: 0, memoriesShared: 0, daysActive: 1 };

  const isNewItem = (createdAt) => {
    if (!initialLastSeenRef.current) return false;
    return new Date(createdAt) > initialLastSeenRef.current;
  };

  const newMessagesCount = messages.filter((item) => isNewItem(item.createdAt)).length;
  const newMemoriesCount = memories.filter((item) => isNewItem(item.createdAt)).length;
  const newActivityCount = activityTimeline.filter((item) => isNewItem(item.createdAt)).length;
  const newPingsCount = activityTimeline.filter((item) => item.type === 'ping' && isNewItem(item.createdAt)).length;
  const newSystemCount = activityTimeline.filter(
    (item) => !['message', 'memory', 'ping'].includes(item.type) && isNewItem(item.createdAt)
  ).length;
  const hasNewActivity = newMessagesCount + newMemoriesCount + newPingsCount + newSystemCount > 0;

  return (
    <main className={styles.container}>
      <section className={styles.headerCard}>
        <div>
          <h1 className={styles.spaceTitle}>{space.spaceName}</h1>
          <p className={styles.helper}>Friends: {memberNames || 'Unavailable'}</p>
          <p className={styles.joinCode}>Shared space details</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.pingBtn}${pingSuccess ? ` ${styles.pingBtnSuccess}` : ''}`}
            onClick={handlePing}
            type="button"
            disabled={pinging}
          >
            {pinging ? 'Sending…' : pingSuccess ? '✓ Sent!' : '👋 Ping'}
          </button>
          <button className={styles.secondaryBtn} onClick={handleLeave} type="button">
            Leave Space
          </button>
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      {hasNewActivity && (
        <section className={styles.newActivityBanner}>
          <strong>You have new activity in Pinglet since your last visit</strong>
          <div className={styles.newActivitySummary}>
            {newMessagesCount > 0 && (
              <button
                type="button"
                className={`${styles.summaryMessages} ${styles.summaryClickable}`}
                onClick={handleOpenChat}
              >
                💬 {newMessagesCount} new message{newMessagesCount !== 1 ? 's' : ''} →
              </button>
            )}
            {newMemoriesCount > 0 && <span className={styles.summaryMemories}>📸 {newMemoriesCount} new memories</span>}
            {newPingsCount > 0 && <span className={styles.summaryPings}>👋 {newPingsCount} new pings</span>}
            {newSystemCount > 0 && <span className={styles.summarySystem}>🎲 {newSystemCount} system updates</span>}
          </div>
        </section>
      )}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>💬 Messages</span>
          <strong className={styles.statValue}>{stats.totalMessages}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>👋 Pings</span>
          <strong className={styles.statValue}>{stats.totalPings}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>📸 Memories</span>
          <strong className={styles.statValue}>{stats.memoriesShared}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>📊 Active Days</span>
          <strong className={styles.statValue}>{stats.daysActive}</strong>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.messagesHeader}>
          <div className={styles.sectionTitleWrap}>
            <h2>💬 Messages</h2>
            {newMessagesCount > 0 && (
              <button
                type="button"
                className={`${styles.newBadge} ${styles.newBadgeMessage} ${styles.newBadgeClickable}`}
                onClick={handleOpenChat}
              >
                {newMessagesCount} NEW →
              </button>
            )}
          </div>
          <button className={styles.openChatBtn} type="button" onClick={handleOpenChat}>
            Open Chat
          </button>
        </div>

        {chatError && <p className={styles.error}>{chatError}</p>}

        <div className={styles.chatList} onScroll={markSpaceAsSeen}>
          {messagesLoading ? (
            <p className={styles.helper}>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className={styles.helper}>No messages yet. Start your Pinglet chat.</p>
          ) : (
            [...messages].sort((a, b) => isNewItem(a.createdAt) === isNewItem(b.createdAt) ? 0 : isNewItem(a.createdAt) ? -1 : 1).map((message) => {
              const isMine = normalizeName(message.sender) === normalizeName(displayName);
              return (
              <article
                key={message._id}
                className={`${styles.chatItem} ${isMine ? styles.chatItemMine : styles.chatItemFriend} ${isNewItem(message.createdAt) ? styles.chatItemNew : ''}`}
              >
                <div className={styles.chatTop}>
                  <div className={styles.chatSenderWrap}>
                    <strong>{message.sender}</strong>
                    {isNewItem(message.createdAt) && <span className={styles.itemNewBadge}>NEW</span>}
                  </div>
                  <span>{formatDateTime(message.createdAt)}</span>
                </div>
                <p>{message.text}</p>
              </article>
              );
            })
          )}
        </div>

        <form className={styles.chatForm} onSubmit={handleSendMessage}>
          <input
            type="text"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Write a message"
            maxLength={MAX_MESSAGE_CHARS}
          />
          <button
            className={styles.primaryBtn}
            type="submit"
            disabled={sendingMessage || !chatInput.trim()}
          >
            {sendingMessage ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>

      <section className={styles.layoutGrid}>
        <article className={styles.card}>
          <div className={styles.sectionTitleWrap}>
            <h2>📸 Memories</h2>
            {newMemoriesCount > 0 && <span className={`${styles.newBadge} ${styles.newBadgeMemory}`}>NEW</span>}
          </div>
          <form className={styles.memoryForm} onSubmit={handleMemorySubmit}>
            <input
              name="title"
              placeholder="Memory title"
              value={memoryForm.title}
              onChange={handleMemoryChange}
              maxLength={80}
              required
            />
            <textarea
              name="note"
              placeholder="Add a short note"
              value={memoryForm.note}
              onChange={handleMemoryChange}
              maxLength={300}
              rows={3}
              required
            />
            <input
              name="imageUrl"
              placeholder="Optional image URL"
              value={memoryForm.imageUrl}
              onChange={handleMemoryChange}
              maxLength={500}
            />
            {memoryError && <p className={styles.error}>{memoryError}</p>}
            <button className={styles.primaryBtn} type="submit" disabled={savingMemory}>
              {savingMemory ? 'Saving...' : 'Add Memory'}
            </button>
          </form>

          <div className={styles.feedList}>
            {memories.length === 0 ? (
              <p className={styles.helper}>No memories yet. Add your first shared memory.</p>
            ) : (
              memories.map((memory) => (
                <article
                  key={memory._id}
                  className={`${styles.feedItem} ${isNewItem(memory.createdAt) ? styles.feedItemNew : ''}`}
                >
                  <div className={styles.feedTop}>
                    <div className={styles.feedTitleWrap}>
                      <h3>{memory.title}</h3>
                      {isNewItem(memory.createdAt) && <span className={styles.itemNewBadge}>NEW</span>}
                    </div>
                    <span>{formatDateTime(memory.createdAt)}</span>
                  </div>
                  <p>{memory.note}</p>
                  {memory.imageUrl && (
                    <img
                      className={styles.feedImage}
                      src={memory.imageUrl}
                      alt={memory.title}
                      loading="lazy"
                    />
                  )}
                  <small>Added by {memory.createdBy}</small>
                </article>
              ))
            )}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.sectionTitleWrap}>
            <h2>📊 Activity</h2>
            {newActivityCount > 0 && <span className={`${styles.newBadge} ${styles.newBadgeSystem}`}>NEW</span>}
            {newPingsCount > 0 && <span className={`${styles.newBadge} ${styles.newBadgePing}`}>{newPingsCount} PING</span>}
          </div>
          <p className={styles.helper}>
            Last interaction:{' '}
            {overview?.lastInteractionAt ? formatDateTime(overview.lastInteractionAt) : 'No activity yet'}
          </p>
          <ul className={styles.timeline}>
            {activityTimeline.length === 0 ? (
              <li className={styles.timelineItem}>No activity yet in this space.</li>
            ) : (
              activityTimeline.map((event) => {
                const kind = getActivityKind(event.type);
                const kindClass =
                  kind === 'message'
                    ? styles.timelineItemMessage
                    : kind === 'memory'
                    ? styles.timelineItemMemory
                    : kind === 'ping'
                    ? styles.timelineItemPing
                    : styles.timelineItemSystem;
                const icon = kind === 'message' ? '💬' : kind === 'memory' ? '📸' : kind === 'ping' ? '👋' : '🎲';

                return (
                  <li
                    key={event._id}
                    className={`${styles.timelineItem} ${kindClass} ${isNewItem(event.createdAt) ? styles.timelineItemNew : ''}`}
                  >
                    {kind === 'system' ? (
                      <>
                        <div className={styles.systemLabel}>📊 Activity Update</div>
                        <strong className={styles.systemText}>{event.description}</strong>
                      </>
                    ) : (
                      <div className={styles.timelineTop}>
                        <strong className={styles.timelineText}>
                          <span className={styles.timelineIcon}>{icon}</span> {event.description}
                        </strong>
                        {isNewItem(event.createdAt) && <span className={styles.itemNewBadge}>NEW</span>}
                      </div>
                    )}
                    <span>{formatDateTime(event.createdAt)}</span>
                  </li>
                );
              })
            )}
          </ul>
        </article>
      </section>

      {/* Retention settings footer */}
      {space?._id && (
        <section className={styles.retentionFooter}>
          <div className={styles.retentionHeader}>
            <span className={styles.retentionTitle}>🗑️ Message Retention</span>
            <span className={styles.retentionPolicy}>
              Messages auto-delete after{' '}
              <strong>
                {space.retentionHours === 42 ? '42 hours'
                  : space.retentionHours === 72 ? '3 days'
                  : space.retentionHours === 240 ? '10 days'
                  : '7 days'}
              </strong>.
            </span>
          </div>
          <div className={styles.retentionOptions}>
            {[{ hours: 42, label: '42 hours' }, { hours: 72, label: '3 days' }, { hours: 168, label: '7 days' }, { hours: 240, label: '10 days' }].map(({ hours, label }) => (
              <button
                key={hours}
                type="button"
                className={`${styles.retentionBtn} ${(space.retentionHours ?? 168) === hours ? styles.retentionBtnActive : ''}`}
                onClick={() => handleRetentionChange(hours)}
                disabled={savingRetention || (space.retentionHours ?? 168) === hours}
              >
                {label}
              </button>
            ))}
          </div>
          {retentionError && <p className={styles.error}>{retentionError}</p>}
        </section>
      )}
    </main>
  );
}

export default DashboardPage;
