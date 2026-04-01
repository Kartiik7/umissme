import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Bell, Moon, Shield, HelpCircle, LogOut,
  ChevronRight, User, X, Copy, Check, Sun, Volume2, VolumeX,
  Eye, EyeOff, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { clearAuth, getAuth, updateName, updateRetention, getSpaceOverview } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

type Panel = 'profile' | 'notifications' | 'appearance' | 'privacy' | 'retention' | 'faq' | null;

export default function Settings({ onLogout }: { onLogout: () => void }) {
  const [openPanel, setOpenPanel] = useState<Panel>(null);
  const { userName, spaceId } = getAuth();

  const [displayName, setDisplayName] = useState(userName || '');
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState('');
  
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('pinglet_notif') !== 'false');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pinglet_dark') === 'true');
  const [spaceIdVisible, setSpaceIdVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [retentionHours, setRetentionHours] = useState<number>(168);
  const [retentionSaved, setRetentionSaved] = useState(false);

  useEffect(() => {
    if (spaceId) {
      getSpaceOverview(spaceId).then((data) => {
        if (data?.space?.retentionHours) setRetentionHours(data.space.retentionHours);
      }).catch(console.error);
    }
  }, [spaceId]);

  const handleSaveName = async () => {
    if (!displayName.trim() || !spaceId) return;
    setNameError('');
    try {
      await updateName(spaceId, displayName.trim());
      localStorage.setItem('pinglet_userName', displayName.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err: any) {
      setNameError(err.message || 'Failed to update name');
    }
  };

  const handleSaveRetention = async (hours: number) => {
    if (!spaceId) return;
    try {
      await updateRetention(spaceId, hours);
      setRetentionHours(hours);
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNotif = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem('pinglet_notif', String(next));
  };

  const handleToggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('pinglet_dark', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  const handleCopySpaceId = () => {
    if (!spaceId) return;
    navigator.clipboard.writeText(spaceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = () => {
    clearAuth();
    onLogout();
  };

  const toggle = (panel: Panel) => setOpenPanel(p => p === panel ? null : panel);

  const faqs = [
    { q: 'What is a Space?', a: 'A Space is a private chat room for two people. Only the two people who know the Space Name and Access Code can join.' },
    { q: 'What is the Access Code?', a: 'A 6-digit PIN you set when creating the Space. Share it with your friend so they can join. Keep it private!' },
    { q: 'Can more than 2 people join?', a: 'No — Pinglet is designed exclusively for pairs. Once both people have joined, it\'s your private space.' },
    { q: 'What does Leave Space do?', a: 'It clears your local session. Your messages stay in the Space — you can rejoin anytime with the Space Name and Access Code.' },
    { q: 'Are messages stored permanently?', a: 'Messages follow your Space\'s retention period (default 168 hours / 7 days). After that, old messages auto-delete.' },
  ];

  const sections = [
    {
      title: 'Account',
      items: [
        {
          icon: User, label: 'Profile', description: 'Edit your display name',
          panel: 'profile' as Panel,
          content: (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Your name is shown to the other person in your Space.</p>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Display Name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full border-4 border-black rounded-xl px-4 py-3 font-bold focus:ring-0 focus:border-primary transition-colors"
                  placeholder="Your name"
                  maxLength={40}
                />
                {nameError && <p className="text-red-500 text-xs font-bold mt-2">{nameError}</p>}
              </div>
              <button
                onClick={handleSaveName}
                disabled={!displayName.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-black border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {nameSaved ? <><Check size={18} /> Saved!</> : 'Save Name'}
              </button>
            </div>
          )
        },
        {
          icon: notifEnabled ? Bell : VolumeX, label: 'Notifications', description: notifEnabled ? 'Enabled — tap to turn off' : 'Disabled — tap to turn on',
          panel: 'notifications' as Panel,
          content: (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Control whether you receive sound and badge notifications for new messages and pings.</p>
              <button
                onClick={handleToggleNotif}
                className={`w-full py-4 rounded-xl font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-3 ${notifEnabled ? 'bg-red-500 text-white' : 'bg-secondary text-black'}`}
              >
                {notifEnabled ? <><VolumeX size={22} /> Turn Off Notifications</> : <><Volume2 size={22} /> Turn On Notifications</>}
              </button>
              <p className={`text-center text-sm font-bold ${notifEnabled ? 'text-green-500' : 'text-gray-400'}`}>
                Notifications are currently <strong>{notifEnabled ? 'ON ✓' : 'OFF'}</strong>
              </p>
            </div>
          )
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: darkMode ? Sun : Moon, label: 'Appearance', description: darkMode ? 'Dark mode is on' : 'Light mode is on',
          panel: 'appearance' as Panel,
          content: (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Switch between light and dark themes. Your preference is saved locally.</p>
              <button
                onClick={handleToggleDark}
                className={`w-full py-4 rounded-xl font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-3 ${darkMode ? 'bg-accent text-black' : 'bg-gray-900 text-white'}`}
              >
                {darkMode ? <><Sun size={22} /> Switch to Light Mode</> : <><Moon size={22} /> Switch to Dark Mode</>}
              </button>
              <p className="text-center text-sm font-bold text-gray-400">
                Currently: <strong className="text-black">{darkMode ? '🌙 Dark' : '☀️ Light'}</strong>
              </p>
            </div>
          )
        },
        {
          icon: Clock, label: 'Message Retention', description: `Auto-delete after ${retentionHours} hours`,
          panel: 'retention' as Panel,
          content: (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Protect your privacy by choosing how long messages stay in the space before being deleted automatically.</p>
              <div className="grid grid-cols-2 gap-2">
                {[42, 72, 168, 240].map(hrs => (
                  <button
                    key={hrs}
                    onClick={() => handleSaveRetention(hrs)}
                    className={`p-3 rounded-xl border-2 font-bold transition-all text-sm ${retentionHours === hrs ? 'bg-black text-white border-black' : 'bg-white border-gray-200 hover:border-black text-black'}`}
                  >
                    {hrs === 168 ? '1 Week (168h)' : hrs === 240 ? '10 Days (240h)' : `${hrs} hours`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-center font-bold text-primary transition-opacity h-4">
                {retentionSaved ? 'Retention updated!' : ' '}
              </p>
            </div>
          )
        },
        {
          icon: spaceIdVisible ? Eye : Shield, label: 'Privacy', description: 'View your Space ID & code info',
          panel: 'privacy' as Panel,
          content: (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Your Space ID is used to identify this private Space. Do not share it publicly.</p>
              <div className="bg-gray-50 border-4 border-black rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">Space ID</span>
                  <button onClick={() => setSpaceIdVisible(v => !v)} className="text-xs font-bold text-primary flex items-center gap-1">
                    {spaceIdVisible ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Reveal</>}
                  </button>
                </div>
                <div className="font-mono text-sm font-bold text-black break-all">
                  {spaceIdVisible ? (spaceId || '—') : '••••••••••••••••••••••••'}
                </div>
              </div>
              <button
                onClick={handleCopySpaceId}
                className="w-full py-3 bg-accent text-black rounded-xl font-black border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy Space ID</>}
              </button>
            </div>
          )
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle, label: 'Help & FAQ', description: 'Common questions answered',
          panel: 'faq' as Panel,
          content: (
            <div className="space-y-3">
              {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
            </div>
          )
        },
      ],
    },
  ];

  return (
    <div className="bg-[#f8f9ff] min-h-screen pb-36">
      <header className="sticky top-0 w-full flex items-center gap-3 px-6 py-4 bg-white/90 backdrop-blur-xl z-50 border-b-4 border-black">
        <SettingsIcon className="text-primary" size={24} />
        <h1 className="font-black text-xl text-black">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto w-full px-6 py-8 pb-36 space-y-8">
        {/* User info card */}
        <div className="bg-primary text-white rounded-3xl p-5 flex items-center gap-4 border-4 border-black shadow-[4px_4px_0_#000]">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl border-2 border-white/30 shrink-0">
            {userName ? userName[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-black text-lg leading-tight">{userName || 'Anonymous'}</p>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-0.5">Active in Space</p>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3 px-1">
              {section.title}
            </h2>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              {section.items.map((item, i) => {
                const Icon = item.icon;
                const isOpen = openPanel === item.panel;
                return (
                  <div key={item.label} className={i < section.items.length - 1 ? 'border-b border-gray-100' : ''}>
                    <button
                      onClick={() => toggle(item.panel)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-black text-sm">{item.label}</p>
                        <p className="text-xs text-gray-400 font-medium">{item.description}</p>
                      </div>
                      {isOpen ? <ChevronUp size={18} className="text-primary" /> : <ChevronRight size={18} className="text-gray-300" />}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/50">
                            {item.content}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-red-500 text-white font-black text-base border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>

        <p className="text-center text-gray-400 text-xs pb-4">Pinglet v1.0 • Built for two 💖</p>
      </main>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-black rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-bold text-black text-sm pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="text-primary shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <p className="px-4 py-3 text-sm text-gray-600 font-medium bg-gray-50 border-t border-gray-100">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
