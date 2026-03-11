import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getMessages, sendMessage, markMessagesSeen } from '../services/api';
import {
  getSavedSenderName,
  saveSenderName,
  getSavedSpaceSession,
} from '../services/session';
import styles from './MessagesPage.module.css';

const MAX_CHARS = 500;

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' • ' +
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  );
}

function normalizeSender(name) {
  return String(name || '').trim().toLowerCase();
}

function MessagesPage() {
  const { spaceId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const space = state?.space || getSavedSpaceSession();
  const listEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sender] = useState(() => getSavedSenderName());
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const scrollToBottom = useCallback(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!spaceId) return;
    try {
      const data = await getMessages(spaceId);
      setMessages(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  // Mark partner messages as seen whenever we load
  const markSeen = useCallback(async () => {
    if (!spaceId || !sender) return;
    try {
      await markMessagesSeen(spaceId, sender);
    } catch {} // silent — non-critical
  }, [spaceId, sender]);

  useEffect(() => {
    markSeen().then(fetchMessages);
    const interval = setInterval(() => {
      markSeen().then(fetchMessages);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages, markSeen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const trimmedText = text.trim();
  const canSend = trimmedText.length > 0 && trimmedText.length <= MAX_CHARS && sender;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    setSendError('');
    setSending(true);

    try {
      saveSenderName(sender.trim());
      await sendMessage({ spaceId, sender: sender.trim(), text: trimmedText });
      setText('');
      await fetchMessages();
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

  // Redirect to join if no sender selected
  if (!sender) {
    return (
      <main className={styles.container}>
        <div className={styles.noSender}>
          <span className={styles.emptyEmoji}>🔑</span>
          <p>You need to select who you are first.</p>
          <button
            className={styles.actionBtn}
            onClick={() => navigate('/join')}
          >
            Join a Space →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* Header */}
      <div className={styles.headerBar}>
        <button
          className={styles.backBtn}
          onClick={() =>
            navigate(`/dashboard/${spaceId}`, { state: { space } })
          }
        >
          ←
        </button>
        <div className={styles.headerCenter}>
          <h2 className={styles.headerTitle}>
            {space ? space.spaceName : 'Messages'} 💕
          </h2>
          {space && (
            <p className={styles.headerSub}>
              {space.partnerOneName} & {space.partnerTwoName}
            </p>
          )}
        </div>
        <div className={styles.headerSpacer} />
      </div>

      {/* Messages list */}
      <div className={styles.list}>
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
            <span className={styles.emptyEmoji}>💌</span>
            <p className={styles.emptyTitle}>No messages yet.</p>
            <p className={styles.emptyHint}>
              Leave the first message for your partner ❤️
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine =
            normalizeSender(msg.sender) === normalizeSender(sender);
          return (
            <div
              key={msg._id}
              className={`${styles.messageRow} ${
                isMine ? styles.rowMine : styles.rowPartner
              }`}
            >
              <div
                className={`${styles.bubble} ${
                  isMine ? styles.bubbleMine : styles.bubblePartner
                } chat-bubble-enter`}
              >
                <span className={styles.senderName}>
                  {msg.sender}
                </span>
                <p className={styles.text}>{msg.text}</p>
                <div className={styles.meta}>
                  <span className={styles.time}>
                    {formatTime(msg.createdAt)}
                  </span>
                  {isMine && (
                    <span
                      className={`${styles.tick} ${
                        msg.seen ? styles.tickSeen : styles.tickSent
                      }`}
                      title={
                        msg.seen && msg.seenAt
                          ? `Seen at ${new Date(msg.seenAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                          : 'Sent'
                      }
                    >
                      {msg.seen ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={listEndRef} />
      </div>

      {/* Send form */}
      <form className={styles.sendForm} onSubmit={handleSend}>
        {sendError && <p className={styles.sendError}>{sendError}</p>}

        <div className={styles.senderLabel}>
          Sending as <strong>{sender}</strong>
        </div>

        <div className={styles.sendRow}>
          <div className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.msgInput}
              type="text"
              placeholder="Type something sweet... 💕"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_CHARS}
              autoComplete="off"
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
            disabled={!canSend || sending}
            title={canSend ? 'Send message' : 'Type a message first'}
          >
            {sending ? (
              <span className={styles.sendingSpinner}>⏳</span>
            ) : (
              '💌'
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

export default MessagesPage;
