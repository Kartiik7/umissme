import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Search, Archive, Music, Film, Utensils, Sunset, Coffee,
  HeartOff, Sparkles, Plus, X, Check, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSpaceOverview, getAuth, clearAuth, addMemory } from '../services/api';

const ALL_VIBES = [
  { label: 'Deep House', icon: '🎵', gradient: 'from-[#FF6B6B] to-[#FF8E53]', rotate: 'rotate-2' },
  { label: 'Sci-Fi Marathons', icon: '🎬', gradient: 'from-[#4facfe] to-[#00f2fe]', rotate: '-rotate-2' },
  { label: 'Spicy Ramen', icon: '🍜', gradient: 'from-[#6a11cb] to-[#2575fc]', rotate: 'rotate-1' },
  { label: 'Sunset Hikes', icon: '🌅', gradient: 'from-[#f093fb] to-[#f5576c]', rotate: '-rotate-1' },
  { label: 'Oat Lattes', icon: '☕', gradient: 'from-[#43e97b] to-[#38f9d7]', rotate: 'rotate-3' },
  { label: 'Road Trips', icon: '🚗', gradient: 'from-[#fa709a] to-[#fee140]', rotate: '-rotate-2' },
  { label: 'Vintage Vinyl', icon: '📀', gradient: 'from-[#a18cd1] to-[#fbc2eb]', rotate: 'rotate-1' },
  { label: 'Night Markets', icon: '🏮', gradient: 'from-[#f7971e] to-[#ffd200]', rotate: '-rotate-3' },
  { label: 'True Crime', icon: '🔍', gradient: 'from-[#4e54c8] to-[#8f94fb]', rotate: 'rotate-2' },
  { label: 'Cozy Gaming', icon: '🎮', gradient: 'from-[#11998e] to-[#38ef7d]', rotate: '-rotate-1' },
];

const DEFAULT_VIBES = ALL_VIBES.slice(0, 5);

export default function SanctuarySpace({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVibeEditor, setShowVibeEditor] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(() => {
    const stored = localStorage.getItem('pinglet_vibes');
    return stored ? JSON.parse(stored) : DEFAULT_VIBES.map(v => v.label);
  });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const { spaceId, userName } = getAuth();

  // New Memory fields
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryNote, setNewMemoryNote] = useState('');
  const [newMemoryImage, setNewMemoryImage] = useState('');
  const [savingMemory, setSavingMemory] = useState(false);

  const fetchOverview = () => {
    if (!spaceId) return;
    getSpaceOverview(spaceId)
      .then(data => { 
        setStats(data.space); 
        setMemories(data.memories || []);
        if (data.stats) setStats(prev => ({ ...prev, stats: data.stats }));
        setLoading(false); 
      })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchOverview();
  }, [spaceId]);

  const handleToggleVibe = (label: string) => {
    setSelectedVibes(prev =>
      prev.includes(label) ? prev.filter(v => v !== label) : [...prev, label]
    );
  };

  const handleSaveVibes = () => {
    localStorage.setItem('pinglet_vibes', JSON.stringify(selectedVibes));
    setShowVibeEditor(false);
  };

  const handleLeaveSpace = () => {
    clearAuth();
    onBack();
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryTitle.trim() || !newMemoryNote.trim() || !spaceId || !userName) return;
    setSavingMemory(true);
    try {
      await addMemory(spaceId, { title: newMemoryTitle, note: newMemoryNote, imageUrl: newMemoryImage });
      setShowAddMemory(false);
      setNewMemoryTitle('');
      setNewMemoryNote('');
      setNewMemoryImage('');
      fetchOverview();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMemory(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-black text-primary">Loading Sanctuary...</div>;
  }

  const daysTogether = stats?.createdAt
    ? Math.max(1, Math.ceil((new Date().getTime() - new Date(stats.createdAt).getTime()) / (1000 * 3600 * 24)))
    : 0;

  const activeVibes = ALL_VIBES.filter(v => selectedVibes.includes(v.label));

  return (
    <div className="bg-[#f8f9ff] min-h-screen pb-36">
      <header className="sticky top-0 w-full flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-xl z-50 border-b-4 border-black">
        <div className="flex items-center gap-4">
          <ArrowLeft className="text-gray-500 cursor-pointer hover:text-black transition-colors" onClick={onBack} />
          <h1 className="font-black text-xl text-black">Sanctuary Space</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-6 py-8 pb-36">
        {/* Profile Header */}
        <section className="flex flex-col items-center mb-12">
          <div className="relative flex items-center justify-center mb-6">
            <div className="relative flex -space-x-6">
              <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden z-10 shadow-lg">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${stats?.friendOneName || 'A'}`} alt="User 1" className="w-full h-full object-cover bg-gray-100" />
              </div>
              <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden z-0 shadow-lg">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${stats?.friendTwoName || 'B'}`} alt="User 2" className="w-full h-full object-cover bg-gray-100" />
              </div>
            </div>
            <div className="absolute -bottom-2 right-1/2 translate-x-12 bg-white shadow-xl rounded-full w-10 h-10 flex items-center justify-center text-xl z-20 border-2 border-gray-100">
              ❤️
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-black tracking-tight mb-1">
              {stats?.friendOneName || '?'} & {stats?.friendTwoName || 'Waiting...'}
            </h2>
            <p className="text-gray-500 text-sm font-medium">{daysTogether} day{daysTogether !== 1 ? 's' : ''} together 🎉</p>
          </div>
        </section>

        {/* Our Vibe Section */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-bold">Our Vibe</h3>
            <button
              onClick={() => setShowVibeEditor(true)}
              className="flex items-center gap-1.5 text-sm font-black text-black bg-accent px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <Plus size={14} /> Edit Vibe
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {activeVibes.length > 0
              ? activeVibes.map(v => (
                  <VibeCard key={v.label} label={v.label} emoji={v.icon} gradient={v.gradient} rotate={v.rotate} />
                ))
              : <p className="col-span-3 text-gray-400 text-sm font-bold text-center py-8">No vibes selected. Hit "Edit Vibe" to add some! ✨</p>
            }
          </div>
        </section>

        {/* Memories Section */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-bold">Memories</h3>
            <button
              onClick={() => setShowAddMemory(true)}
              className="flex items-center gap-1.5 text-sm font-black text-white bg-primary px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <Plus size={14} /> Add Memory
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {memories.length > 0 ? (
              memories.map((mem) => (
                <div key={mem._id} className="bg-white rounded-[2rem] border-4 border-black p-5 shadow-[4px_4px_0_#000] flex flex-col hover:-translate-y-1 transition-transform">
                  {mem.imageUrl && (
                    <div className="rounded-2xl overflow-hidden mb-4 border-2 border-black bg-gray-50 aspect-video">
                      <img src={mem.imageUrl} alt={mem.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h4 className="font-black text-lg mb-1">{mem.title}</h4>
                  <p className="text-sm font-medium text-gray-600 mb-4 whitespace-pre-wrap">{mem.note}</p>
                  <div className="mt-auto flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 border-t-2 border-dashed border-gray-100 pt-3">
                    <span>By {mem.createdBy}</span>
                    <span>{new Date(mem.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-gray-50 border-4 border-dashed border-gray-200 rounded-[2rem] p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-200 shadow-sm">
                  <ImageIcon className="text-gray-400" size={24} />
                </div>
                <h4 className="font-black text-gray-600 mb-1">No Memories Yet</h4>
                <p className="text-sm font-medium text-gray-400">Save your favorite moments here!</p>
              </div>
            )}
          </div>
        </section>

        {/* Space Stats */}
        <section className="mb-16">
          <h3 className="text-xl font-bold mb-6">Space Stats</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2 bg-white p-6 rounded-3xl flex flex-col justify-center shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Days Together</p>
              <p className="text-4xl font-black text-primary">{daysTogether}</p>
            </div>
            <div className="col-span-2 bg-white p-6 rounded-3xl flex flex-col justify-center shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Pings</p>
              <p className="text-4xl font-black text-secondary">{stats?.stats?.totalPings ?? '—'}</p>
            </div>
            <div className="col-span-4 bg-gradient-to-br from-primary to-indigo-600 p-6 rounded-3xl flex items-center justify-between shadow-lg">
              <div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Total Messages</p>
                <p className="text-3xl font-black text-white">{stats?.stats?.totalMessages ?? '—'}</p>
              </div>
              <Sparkles className="text-white/40" size={48} />
            </div>
          </div>
        </section>
        {/* Leave Space */}
        <section className="mt-8">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full bg-[#ff3b30] text-white font-black text-xl py-6 rounded-2xl border-4 border-[#191c20] neo-shadow flex items-center justify-center gap-3 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-tighter"
          >
            <HeartOff size={24} />
            Leave Space
          </button>
          <p className="text-center text-gray-500 text-xs mt-4 px-10 leading-relaxed font-medium">
            Your messages stay saved. You can rejoin with the Space Name & Access Code.
          </p>
        </section>
      </main>

      {/* ── Vibe Editor Modal ── */}
      <AnimatePresence>
        {showVibeEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
            onClick={e => e.target === e.currentTarget && setShowVibeEditor(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-t-[2rem] border-t-4 border-x-4 border-black p-6 pb-10 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black">Pick Your Vibes</h3>
                <button onClick={() => setShowVibeEditor(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-5">Select the things you both love. Tap to toggle.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {ALL_VIBES.map(v => {
                  const active = selectedVibes.includes(v.label);
                  return (
                    <button
                      key={v.label}
                      onClick={() => handleToggleVibe(v.label)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-4 font-bold text-sm transition-all text-left ${active ? 'border-black bg-accent shadow-[3px_3px_0_#000] translate-x-0 translate-y-0' : 'border-gray-200 bg-gray-50 hover:border-gray-400'}`}
                    >
                      <span className="text-xl">{v.icon}</span>
                      <span className="flex-1">{v.label}</span>
                      {active && <Check size={16} className="text-black shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleSaveVibes}
                className="w-full py-4 bg-primary text-white rounded-xl font-black text-xl border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                Save Vibes ✨
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Leave Confirm Modal ── */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6"
            onClick={e => e.target === e.currentTarget && setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] p-6 text-center space-y-5"
            >
              <div className="text-5xl">💔</div>
              <h3 className="text-2xl font-black text-black">Leave Space?</h3>
              <p className="text-sm text-gray-500 font-medium">Your messages will stay safe. You can always rejoin with the Space Name and Access Code.</p>
              <div className="space-y-3">
                <button
                  onClick={handleLeaveSpace}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-black border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  Yes, Leave Space
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full py-3 bg-white text-black rounded-xl font-bold border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Stay Here
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Memory Modal ── */}
      <AnimatePresence>
        {showAddMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6"
            onClick={e => e.target === e.currentTarget && setShowAddMemory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black">Add Memory</h3>
                <button onClick={() => setShowAddMemory(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddMemory} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                  <input required value={newMemoryTitle} onChange={e => setNewMemoryTitle(e.target.value)} className="w-full border-4 border-black rounded-xl px-4 py-3 font-bold focus:ring-0 focus:border-primary transition-colors" placeholder="e.g. Survived the Hike" maxLength={40} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Note / Story</label>
                  <textarea required value={newMemoryNote} onChange={e => setNewMemoryNote(e.target.value)} rows={3} className="w-full border-4 border-black rounded-xl px-4 py-3 font-medium focus:ring-0 focus:border-primary transition-colors resize-none" placeholder="What made this moment special?" maxLength={280}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Image URL (Optional)</label>
                  <input value={newMemoryImage} onChange={e => setNewMemoryImage(e.target.value)} type="url" className="w-full border-4 border-black rounded-xl px-4 py-3 font-medium focus:ring-0 focus:border-primary transition-colors text-sm" placeholder="https://..." />
                </div>
                <button disabled={savingMemory} type="submit" className="w-full py-4 mt-2 bg-primary text-white rounded-xl font-black text-xl border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50">
                  {savingMemory ? 'Saving...' : 'Save Memory ✨'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VibeCard({ label, emoji, gradient, rotate }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 0 }}
      className={`bg-gradient-to-br ${gradient} p-5 rounded-3xl text-white flex flex-col justify-between h-32 shadow-md cursor-pointer ${rotate}`}
    >
      <div className="text-3xl">{emoji}</div>
      <span className="font-bold text-sm">{label}</span>
    </motion.div>
  );
}
