import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { addMemory, getMessages, getSpaceOverview, sendMessage, sendPing, markMessagesSeen } from '../services/api';
import {
  clearSession,
  getSavedSenderName,
  saveSenderName,
  getSavedSpaceSession,
} from '../services/session';
import styles from './MessagesPage.module.css';

const MAX_CHARS = 500;

function formatLastSeen(date) {
  if (!date) return null;
  const now = new Date();
  const diffMins = Math.floor((now - date) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `today at ${timeStr}`;
  return `yesterday at ${timeStr}`;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
}

function normalizeSender(name) {
  return String(name || '').trim().toLowerCase();
}

function formatMemoryDate(value) {
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getActivityKind(type) {
  if (type === 'message') return 'message';
  if (type === 'memory') return 'memory';
  if (type === 'ping') return 'ping';
  return 'system';
}

function MessagesPage() {
  const { spaceId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const space = state?.space || getSavedSpaceSession();
  const listEndRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const stopTypingTimerRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const partnerTypingTimerRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [panelError, setPanelError] = useState('');
  const [activeTab, setActiveTab] = useState('messages');

  const [sender] = useState(() => getSavedSenderName());
  const [text, setText] = useState('');
  const [memoryForm, setMemoryForm] = useState({ title: '', note: '', imageUrl: '' });
  const [savingMemory, setSavingMemory] = useState(false);
  const [memoryError, setMemoryError] = useState('');
  const [pinging, setPinging] = useState(false);
  const [pingFeedback, setPingFeedback] = useState('');

  // Presence state
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState(null);

  const spaceData = overview?.space || space;

  const partnerName = spaceData
    ? normalizeSender(spaceData.friendOneName) === normalizeSender(sender)
      ? spaceData.friendTwoName
      : spaceData.friendOneName
    : null;

  // Stable ref so socket handlers always see the current partner name
  const partnerNameRef = useRef(partnerName);
  useEffect(() => { partnerNameRef.current = partnerName; }, [partnerName]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [firstUnreadIncomingId, setFirstUnreadIncomingId] = useState(null);

  const memories = overview?.memories || [];
  const activityTimeline = overview?.activityTimeline || [];

  const statusText = partnerTyping
    ? 'Typing...'
    : partnerOnline
      ? 'Online'
      : partnerLastSeen
        ? `Last seen ${formatLastSeen(partnerLastSeen)}`
        : 'Away';

  const scrollToBottom = useCallback(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    listEl.scrollTop = listEl.scrollHeight;
  }, []);

  const fetchMessages = useCallback(async ({ preserveUnreadMarker = false } = {}) => {
    if (!spaceId) return;
    try {
      const data = await getMessages(spaceId);
      setMessages(data);
      if (!preserveUnreadMarker) {
        const firstUnreadIncoming = data.find(
          (msg) => normalizeSender(msg.sender) !== normalizeSender(sender) && !msg.seen
        );
        setFirstUnreadIncomingId(firstUnreadIncoming?._id || null);
      }
      setError('');
    } catch (err) {
      const message = err.message || 'Unable to load messages';
      if (/space not found|invalid space id/i.test(message)) {
        clearSession();
        navigate('/join', {
          replace: true,
          state: { error: 'That space could not be found. Join again using the latest details.' },
        });
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [spaceId, navigate, sender]);

  const fetchOverview = useCallback(async ({ silent = false } = {}) => {
    if (!spaceId) return;
    if (!silent) setOverviewLoading(true);

    try {
      const data = await getSpaceOverview(spaceId);
      setOverview(data);
      setPanelError('');
    } catch (err) {
      const message = err.message || 'Unable to load space details';
      if (/space not found|invalid space id/i.test(message)) {
        clearSession();
        navigate('/join', {
          replace: true,
          state: { error: 'That space could not be found. Join again using the latest details.' },
        });
        return;
      }
      setPanelError(message);
    } finally {
      if (!silent) setOverviewLoading(false);
    }
  }, [spaceId, navigate]);

  // Mark messages from the other friend as seen whenever we load
  const markSeen = useCallback(async () => {
    if (!spaceId || !sender) return;
    if (activeTab !== 'messages') return;
    try {
      await markMessagesSeen(spaceId, sender);
      // Notify partner in real-time that messages were read
      socketRef.current?.emit('mark-seen', { spaceId, reader: sender });
      setMessages((prev) =>
        prev.map((m) =>
          normalizeSender(m.sender) !== normalizeSender(sender) && !m.seen
            ? { ...m, seen: true, seenAt: new Date().toISOString(), delivered: true }
            : m
        )
      );
    } catch {} // silent — non-critical
  }, [spaceId, sender, activeTab]);

  // Socket.IO presence
  useEffect(() => {
    if (!spaceId || !sender) return;

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join-space', { spaceId, userName: sender });

    socket.on('presence-state', ({ online, lastSeen }) => {
      const pn = partnerNameRef.current;
      if (!pn) return;
      const normalizedPartner = normalizeSender(pn);
      const isOnline = Array.isArray(online)
        ? online.some((u) => normalizeSender(u) === normalizedPartner)
        : false;
      setPartnerOnline(isOnline);

      if (isOnline) {
        setPartnerLastSeen(null);
        return;
      }

      const storedLastSeen = Array.isArray(lastSeen)
        ? lastSeen.find((entry) => normalizeSender(entry.userName) === normalizedPartner)?.lastSeen
        : null;

      setPartnerLastSeen(storedLastSeen ? new Date(storedLastSeen) : null);
    });

    socket.on('user-online', ({ userName }) => {
      const pn = partnerNameRef.current;
      if (!pn) return;
      if (normalizeSender(userName) === normalizeSender(pn)) {
        setPartnerOnline(true);
        setPartnerLastSeen(null);
      }
    });

    socket.on('user-last-seen', ({ userName, lastSeen }) => {
      const pn = partnerNameRef.current;
      if (!pn) return;
      if (normalizeSender(userName) === normalizeSender(pn)) {
        setPartnerOnline(false);
        setPartnerLastSeen(new Date(lastSeen));
      }
    });

    socket.on('user-typing', ({ userName }) => {
      const pn = partnerNameRef.current;
      if (!pn) return;
      if (normalizeSender(userName) === normalizeSender(pn)) {
        setPartnerTyping(true);
        clearTimeout(partnerTypingTimerRef.current);
        partnerTypingTimerRef.current = setTimeout(() => setPartnerTyping(false), 3000);
      }
    });

    socket.on('user-stop-typing', ({ userName }) => {
      const pn = partnerNameRef.current;
      if (!pn) return;
      if (normalizeSender(userName) === normalizeSender(pn)) {
        setPartnerTyping(false);
        clearTimeout(partnerTypingTimerRef.current);
      }
    });

    // Real-time read receipts: patch local state instantly, no HTTP round-trip
    socket.on('messages-read', ({ reader }) => {
      // If the partner read the chat, mark all our outgoing messages as seen locally
      if (normalizeSender(reader) !== normalizeSender(sender)) {
        const seenAt = new Date().toISOString();
        setMessages((prev) =>
          prev.map((m) =>
            normalizeSender(m.sender) === normalizeSender(sender) && !m.seen
              ? { ...m, delivered: true, seen: true, seenAt }
              : m
          )
        );
      }
    });

    socket.on('message-delivered', ({ receiver, deliveredAt }) => {
      // Partner came online; our outgoing messages are now delivered.
      if (normalizeSender(receiver) !== normalizeSender(sender)) {
        const deliveredTime = deliveredAt || new Date().toISOString();
        setMessages((prev) =>
          prev.map((m) =>
            normalizeSender(m.sender) === normalizeSender(sender) && !m.delivered
              ? { ...m, delivered: true, deliveredAt: deliveredTime }
              : m
          )
        );
      }
    });

    socket.on('messages-updated', () => {
      const refresh = [fetchMessages({ preserveUnreadMarker: activeTab !== 'messages' }), fetchOverview({ silent: true })];
      if (activeTab === 'messages') {
        Promise.all([markSeen(), ...refresh]);
      } else {
        Promise.all(refresh);
      }
    });

    return () => {
      clearTimeout(partnerTypingTimerRef.current);
      clearTimeout(stopTypingTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [spaceId, sender, fetchMessages, fetchOverview, markSeen, activeTab]); // partnerName intentionally excluded — partnerNameRef keeps it current

  useEffect(() => {
    document.title = spaceData?.spaceName
      ? `Messages - ${spaceData.spaceName} - Pinglet`
      : 'Messages - Pinglet';
  }, [spaceData?.spaceName]);

  useEffect(() => {
    Promise.all([markSeen(), fetchMessages(), fetchOverview()]);
  }, [fetchMessages, fetchOverview, markSeen]);

  useEffect(() => {
    if (activeTab !== 'messages') return;
    Promise.all([markSeen(), fetchMessages()]);
  }, [activeTab, markSeen, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const trimmedText = text.trim();
  const canSend = trimmedText.length > 0 && trimmedText.length <= MAX_CHARS && sender;

  const unreadCount = useMemo(
    () =>
      messages.filter(
        (m) => normalizeSender(m.sender) !== normalizeSender(sender) && !m.seen
      ).length,
    [messages, sender]
  );

  const messageTimeline = useMemo(() => {
    const rows = [];
    let lastDayKey = '';

    messages.forEach((msg) => {
      const created = new Date(msg.createdAt);
      const dayKey = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`;
      if (dayKey !== lastDayKey) {
        rows.push({
          type: 'date',
          key: `date-${dayKey}`,
          label: formatDateSeparator(msg.createdAt),
        });
        lastDayKey = dayKey;
      }

      if (firstUnreadIncomingId && msg._id === firstUnreadIncomingId) {
        rows.push({ type: 'unread', key: `unread-${msg._id}` });
      }

      rows.push({ type: 'message', key: msg._id, msg });
    });

    return rows;
  }, [messages, firstUnreadIncomingId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    setSendError('');
    setSending(true);

    try {
      // cancel any pending stop-typing before sending
      clearTimeout(stopTypingTimerRef.current);
      socketRef.current?.emit('stop-typing', { spaceId, userName: sender });

      saveSenderName(sender.trim());
      const createdMessage = await sendMessage({ spaceId, sender: sender.trim(), text: trimmedText });

      setMessages((prev) => [...prev, createdMessage]);
      socketRef.current?.emit('message-sent', { spaceId, userName: sender });
      fetchOverview({ silent: true });

      setText('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
      inputRef.current?.focus();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend && !sending) {
        handleSend(e);
      }
    }
  };

  const handlePing = async () => {
    if (!spaceId || !sender || pinging) return;

    setPinging(true);
    setPanelError('');
    try {
      await sendPing(spaceId, sender);
      setPingFeedback('Ping sent');
      setTimeout(() => setPingFeedback(''), 1600);
      await fetchOverview({ silent: true });
    } catch (err) {
      setPanelError(err.message || 'Unable to send ping');
    } finally {
      setPinging(false);
    }
  };

  const handleMemorySubmit = async (e) => {
    e.preventDefault();

    const title = memoryForm.title.trim();
    const note = memoryForm.note.trim();
    const imageUrl = memoryForm.imageUrl.trim();
    if (!spaceId || !sender || !title || !note || savingMemory) return;

    setSavingMemory(true);
    setMemoryError('');
    try {
      await addMemory(spaceId, { title, note, imageUrl, displayName: sender });
      setMemoryForm({ title: '', note: '', imageUrl: '' });
      await fetchOverview({ silent: true });
    } catch (err) {
      setMemoryError(err.message || 'Unable to save memory');
    } finally {
      setSavingMemory(false);
    }
  };

  // Redirect to join if no sender selected
  if (!sender) {
    return (
      <main className={styles.pageWrap}>
        <div className={styles.noSender}>
          <span className={styles.emptyEmoji}>?</span>
          <p>You need to select who you are first.</p>
          <button
            className={styles.actionBtn}
            onClick={() => navigate('/join')}
          >
            Join a Space
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pageWrap}>
      <section className={styles.chatShell}>
        <header className={styles.headerBar}>
          <button
            className={styles.backBtn}
            onClick={() =>
              navigate(`/`, { state: { space: spaceData } })
            }
            aria-label="Back to home"
          >
            ←
          </button>
          <div className={styles.headerCenter}>
            <h2 className={styles.headerTitle}>
              {partnerName || 'Messages'}
            </h2>
            <p className={styles.headerStatus}>{statusText}</p>
          </div>
          <button
            className={styles.pingBtn}
            onClick={handlePing}
            type="button"
            disabled={pinging}
            aria-label="Send ping"
          >
            {pinging ? '...' : 'Ping'}
          </button>
        </header>

        {(panelError || pingFeedback) && (
          <div className={styles.panelInfoRow}>
            {panelError && <p className={styles.errorInline}>{panelError}</p>}
            {!panelError && pingFeedback && <p className={styles.successInline}>{pingFeedback}</p>}
          </div>
        )}

        <nav className={styles.tabBar} aria-label="Panels">
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`${styles.tabBtn} ${activeTab === 'messages' ? styles.tabActiveMessages : ''}`}
          >
            Messages {unreadCount > 0 ? `[${unreadCount}]` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memories')}
            className={`${styles.tabBtn} ${activeTab === 'memories' ? styles.tabActiveMemories : ''}`}
          >
            Memories
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`${styles.tabBtn} ${activeTab === 'activity' ? styles.tabActiveActivity : ''}`}
          >
            Activity
          </button>
        </nav>

        {activeTab === 'messages' && (
          <div className={styles.list} ref={listRef}>
            {loading && (
              <div className={styles.statusWrap}>
                <div className={styles.loadingDots}>
                  <span>Loading messages</span>
                  <span className={styles.dot}>.</span>
                  <span className={styles.dot}>.</span>
                  <span className={styles.dot}>.</span>
                </div>
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}

            {!loading && !error && messages.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyEmoji}>#</span>
                <p className={styles.emptyTitle}>No messages yet.</p>
                <p className={styles.emptyHint}>Start the conversation.</p>
              </div>
            )}

            {messageTimeline.map((row) => {
              if (row.type === 'date') {
                return (
                  <div key={row.key} className={styles.dateSeparator}>
                    <span>{row.label}</span>
                  </div>
                );
              }

              if (row.type === 'unread') {
                return (
                  <div key={row.key} className={styles.unreadSeparator}>
                    <span>--- New Messages ---</span>
                  </div>
                );
              }

              const msg = row.msg;
              const isMine = normalizeSender(msg.sender) === normalizeSender(sender);
              const isSeen = Boolean(msg.seen);
              const isDelivered = Boolean(msg.delivered || isSeen);
              const deliveryTitle = isSeen
                ? msg.seenAt
                  ? `Read at ${new Date(msg.seenAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                  : 'Read'
                : isDelivered
                  ? 'Delivered'
                  : 'Sent';

              return (
                <div
                  key={row.key}
                  className={`${styles.messageRow} ${isMine ? styles.rowMine : styles.rowPartner}`}
                >
                  <div
                    className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubblePartner} ${styles.bubbleEnter}`}
                  >
                    <p className={styles.text}>{msg.text}</p>
                    <div className={styles.meta}>
                      <span className={styles.time}>{formatTime(msg.createdAt)}</span>
                      {isMine && (
                        <span
                          className={`${styles.tick} ${isSeen ? styles.tickSeen : isDelivered ? styles.tickDelivered : styles.tickSent}`}
                          title={deliveryTitle}
                        >
                          {isSeen || isDelivered ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={listEndRef} />
          </div>
        )}

        {activeTab === 'memories' && (
          <div className={styles.panelScroll}>
            <form className={styles.memoryComposer} onSubmit={handleMemorySubmit}>
              <h3>Add Memory</h3>
              <input
                value={memoryForm.title}
                onChange={(e) => setMemoryForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                maxLength={80}
              />
              <textarea
                value={memoryForm.note}
                onChange={(e) => setMemoryForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Write the memory"
                rows={3}
                maxLength={500}
              />
              <input
                value={memoryForm.imageUrl}
                onChange={(e) => setMemoryForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="Optional image URL"
              />
              {memoryError && <p className={styles.errorInline}>{memoryError}</p>}
              <button type="submit" disabled={savingMemory}>
                {savingMemory ? 'Saving...' : 'Save Memory'}
              </button>
            </form>

            <div className={styles.memoryGrid}>
              {overviewLoading && <p className={styles.helperText}>Loading memories...</p>}
              {!overviewLoading && memories.length === 0 && (
                <p className={styles.helperText}>No memories yet.</p>
              )}
              {memories.map((memory) => (
                <article key={memory._id} className={styles.memoryCard}>
                  <h4>{memory.title}</h4>
                  <p>{memory.note}</p>
                  <div className={styles.memoryMeta}>
                    <span>{memory.createdBy}</span>
                    <span>{formatMemoryDate(memory.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className={styles.panelScroll}>
            {overviewLoading && <p className={styles.helperText}>Loading activity...</p>}
            {!overviewLoading && activityTimeline.length === 0 && (
              <p className={styles.helperText}>No activity yet.</p>
            )}
            {!overviewLoading && activityTimeline.length > 0 && (
              <ul className={styles.activityList}>
                {activityTimeline.map((item) => {
                  const kind = getActivityKind(item.type);
                  return (
                    <li key={item._id} className={styles.activityItem}>
                      <span className={`${styles.activityTag} ${styles[`tag${kind[0].toUpperCase()}${kind.slice(1)}`]}`}>
                        {kind}
                      </span>
                      <div className={styles.activityBody}>
                        <p>{item.description}</p>
                        <span>{formatMemoryDate(item.createdAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <form className={styles.sendForm} onSubmit={handleSend}>
          {sendError && <p className={styles.sendError}>{sendError}</p>}

          <div className={styles.sendRow}>
            <div className={styles.inputWrap}>
              <textarea
                ref={inputRef}
                className={styles.msgInput}
                placeholder={activeTab === 'messages' ? 'Write a message...' : 'Switch to Messages tab to send'}
                value={text}
                rows={1}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

                  if (socketRef.current && spaceId && sender) {
                    const now = Date.now();
                    if (now - lastTypingEmitRef.current > 1500) {
                      socketRef.current.emit('typing', { spaceId, userName: sender });
                      lastTypingEmitRef.current = now;
                    }
                    clearTimeout(stopTypingTimerRef.current);
                    stopTypingTimerRef.current = setTimeout(() => {
                      socketRef.current?.emit('stop-typing', { spaceId, userName: sender });
                    }, 2500);
                  }
                }}
                onKeyDown={handleKeyDown}
                maxLength={MAX_CHARS}
                autoComplete="off"
                disabled={activeTab !== 'messages'}
              />
              {text.length > 0 && (
                <span
                  className={`${styles.charCount} ${
                    trimmedText.length > MAX_CHARS ? styles.charOver : ''
                  }`}
                >
                  {trimmedText.length}/{MAX_CHARS}
                </span>
              )}
            </div>
            <button
              className={styles.sendBtn}
              type="submit"
              disabled={!canSend || sending || activeTab !== 'messages'}
              title={canSend ? 'Send message' : 'Type a message first'}
            >
              {sending ? (
                <span className={styles.sendingSpinner}>...</span>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default MessagesPage;
