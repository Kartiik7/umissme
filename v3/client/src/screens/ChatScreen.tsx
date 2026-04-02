import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Send, Zap, Info, Check, CheckCheck, X, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { getMessages, sendMessage, markMessagesSeen, getAuth, sendPing } from '../services/api';
import { socketService } from '../services/socket';

export default function ChatScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasJoinedRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { spaceId, userName } = getAuth();

  useEffect(() => {
    if (!spaceId || !userName) return;

    loadMessages();

    const unsubJoined = socketService.on('joined-space', () => {
      hasJoinedRef.current = true;
      markSeenRealtime();
    });

    const unsubPresence = socketService.on('presence-state', (data) => {
      hasJoinedRef.current = true;
      if (data.online.some((name: string) => name !== userName)) {
        setIsPartnerOnline(true);
      } else {
        setIsPartnerOnline(false);
        const partnerLs = data.lastSeen.find((l: any) => l.userName !== userName);
        if (partnerLs?.lastSeen) setPartnerLastSeen(new Date(partnerLs.lastSeen));
      }

      markSeenRealtime();
    });

    const unsubUserOnline = socketService.on('user-online', ({ userName: joinedUser }) => {
      if (joinedUser !== userName) setIsPartnerOnline(true);
    });

    const unsubUserLastSeen = socketService.on('user-last-seen', ({ userName: leftUser, lastSeen }) => {
      if (leftUser !== userName) {
        setIsPartnerOnline(false);
        setPartnerLastSeen(new Date(lastSeen));
      }
    });

    const unsubMessageCreated = socketService.on('message-created', ({ message }) => {
      if (!message) return;
      const incomingSpaceId = String(message.spaceId?._id || message.spaceId || '');
      if (incomingSpaceId !== spaceId) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, { ...message, content: message.text }];
      });

      if (message.sender !== userName) {
        markSeenRealtime();
      }
    });

    const unsubMessageUpdated = socketService.on('messages-updated', () => {
      loadMessages();
    });
    const unsubMessageRead = socketService.on('messages-read', ({ reader }) => {
      if (reader === userName) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === userName
            ? {
                ...msg,
                delivered: true,
                seen: true,
              }
            : msg
        )
      );
    });
    const unsubMessageDelivered = socketService.on('message-delivered', ({ receiver }) => {
      if (receiver === userName) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === userName
            ? {
                ...msg,
                delivered: true,
              }
            : msg
        )
      );
    });
    const unsubTyping = socketService.on('user-typing', ({ userName: typingUser }) => {
      if (typingUser !== userName) setPartnerTyping(true);
    });
    const unsubStopTyping = socketService.on('user-stop-typing', ({ userName: typingUser }) => {
      if (typingUser !== userName) setPartnerTyping(false);
    });

    return () => {
      unsubJoined();
      unsubMessageUpdated();
      unsubMessageCreated();
      unsubMessageRead();
      unsubMessageDelivered();
      unsubTyping();
      unsubStopTyping();
      unsubPresence();
      unsubUserOnline();
      unsubUserLastSeen();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [spaceId, userName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, partnerTyping]);

  const markSeenRealtime = async () => {
    if (!spaceId || !userName || !hasJoinedRef.current) return;

    try {
      await markMessagesSeen(spaceId);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await getMessages(spaceId as string);
      const formatted = Array.isArray(data) ? data.map((m: any) => ({ ...m, content: m.text })) : [];
      setMessages(formatted);
      markSeenRealtime();
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !spaceId || !userName) return;

    const content = input;
    setInput('');
    socketService.emitStopTyping(spaceId, userName);

    try {
      setMessages(prev => [...prev, { _id: Date.now().toString(), sender: userName, content, type: 'text', createdAt: new Date(), delivered: false }]);
      await sendMessage(spaceId, content);
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePing = async () => {
    if (!spaceId || !userName) return;
    try {
      await Promise.all([
        sendMessage(spaceId, 'Sent a Ping 👋', 'ping' as any),
        sendPing(spaceId, 'zap') // Adds it to the Activity Timeline
      ]);
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!spaceId || !userName) return;

    socketService.emitTyping(spaceId, userName);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketService.emitStopTyping(spaceId, userName);
    }, 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-black text-primary">Loading Vibes...</div>;
  }

  // Group messages by date
  const groupedMessages: { dateLabel: string; messages: any[] }[] = [];
  messages.forEach(msg => {
    const d = new Date(msg.createdAt);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.dateLabel === label) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ dateLabel: label, messages: [msg] });
    }
  });

  return (
    <div className="bg-[#F0F4FF] min-h-screen flex flex-col pb-36">
      {/* Header */}
      <header className="fixed top-0 w-full flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-xl z-50 border-b-4 border-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0_#000]">
            <span className="text-xl">👾</span>
          </div>
          <div>
            <h1 className="font-black text-lg text-black">Crew Chat</h1>
            {isPartnerOnline ? (
              <p className="text-xs font-bold text-green-500 uppercase tracking-wider">● Online</p>
            ) : (
              <p className="text-xs font-bold text-gray-400">
                {partnerLastSeen ? `Last seen ${partnerLastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '● Offline'}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowInfo(v => !v)}
          className={`p-2 rounded-full border-2 transition-all ${showInfo ? 'bg-primary text-white border-black shadow-none' : 'bg-gray-100 border-transparent hover:border-black'}`}
        >
          {showInfo ? <X size={20} /> : <Info size={20} className="text-black" />}
        </button>
      </header>

      {/* Info Drawer */}
      {showInfo && (
        <div className="fixed top-[72px] left-0 w-full z-40 px-4 pt-3">
          <div className="bg-white border-4 border-black shadow-[6px_6px_0_#000] rounded-3xl p-5 space-y-3">
            <h3 className="font-black text-lg">Space Info</h3>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Space ID</span>
              <button onClick={() => { navigator.clipboard.writeText(spaceId || ''); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }} className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                {copiedId ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <p className="font-mono text-xs text-black break-all bg-gray-50 p-2 rounded-xl border border-gray-200">{spaceId}</p>
            <p className="text-xs text-gray-500 font-medium text-center">Share the Space name & Access Code — not the ID — to invite your friend.</p>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 pt-24 pb-4 space-y-2">
        {groupedMessages.map((group, gIdx) => (
          <div key={gIdx}>
            {/* Date Separator */}
            <div className="flex justify-center my-4">
              <span className="bg-black/10 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                {group.dateLabel}
              </span>
            </div>

            <div className="space-y-2">
              {group.messages.map((msg, i) => {
                const isMe = msg.sender === userName;
                const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    key={msg._id || i}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[65%] px-4 py-3 text-sm neo-shadow-sm ${
                        isMe
                          ? 'bg-primary text-white rounded-3xl rounded-tr-sm border-2 border-black'
                          : 'bg-white text-black rounded-3xl rounded-tl-sm border-2 border-black'
                      }`}
                    >
                      {!isMe && (
                        <span className="block text-[10px] uppercase text-gray-500 mb-1 tracking-wider font-black">
                          {msg.sender}
                        </span>
                      )}
                      <p className="font-bold leading-relaxed">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                        <span className="text-[10px] font-semibold">{time}</span>
                        {isMe && (
                          msg.seen
                            ? <CheckCheck size={14} className="text-secondary drop-shadow-md" />
                            : msg.delivered
                              ? <CheckCheck size={14} className="opacity-70" />
                              : <Check size={14} className="opacity-70" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {partnerTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-3xl rounded-tl-sm border-2 border-black neo-shadow-sm flex items-center gap-1">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-gray-400 rounded-full" />
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-gray-400 rounded-full" />
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-gray-400 rounded-full" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="fixed bottom-[88px] left-0 w-full px-4 bg-transparent z-40">
        <form onSubmit={handleSend} className="bg-white p-2 rounded-2xl flex items-center gap-2 border-4 border-black shadow-[4px_4px_0_#000]">
          <button type="button" className="p-3 bg-gray-100 rounded-xl hover:bg-accent hover:text-black transition-colors text-lg">
            😊
          </button>
          <input
            type="text"
            value={input}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:ring-0 font-bold placeholder-gray-400"
          />
          <button
            type="button"
            onClick={handlePing}
            className="p-3 bg-secondary text-black rounded-xl border-2 border-black hover:-translate-y-1 transition-transform"
          >
            <Zap size={20} className="fill-current" />
          </button>
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-primary text-white rounded-xl border-2 border-black disabled:opacity-50 hover:-translate-y-1 transition-transform"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
