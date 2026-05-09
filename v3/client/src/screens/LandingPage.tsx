import React, { useState } from 'react';
import { Rocket, Heart, Sparkles, MessageCircle, ArrowLeft, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createSpace, joinSpace, setAuth } from '../services/api';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const [view, setView] = useState<'home' | 'create' | 'join' | 'select-user'>('home');

  // Create Space fields
  const [spaceName, setSpaceName] = useState('');
  const [friendOneName, setFriendOneName] = useState('');
  const [friendTwoName, setFriendTwoName] = useState('');
  const [accessCode, setAccessCode] = useState('');

  // Join Space fields
  const [joinSpaceName, setJoinSpaceName] = useState('');
  const [joinAccessCode, setJoinAccessCode] = useState('');
  const [joinedSpace, setJoinedSpace] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState<{ spaceName: string; accessCode: string; spaceId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName || !friendOneName || !friendTwoName || !accessCode) return;
    if (!/^\d{6}$/.test(accessCode)) {
      setError('Access code must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createSpace(spaceName, friendOneName, friendTwoName, accessCode);
      // Server returns the space object directly (not wrapped in { space: ... })
      setCreatedInfo({ spaceName, accessCode, spaceId: res._id });
      setAuth(res._id, friendOneName);
    } catch (err: any) {
      setError(err.message || 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinSpaceName || !joinAccessCode) return;
    setLoading(true);
    setError('');
    try {
      const res = await joinSpace(joinSpaceName, joinAccessCode);
      // Don't auto-assign friendTwoName anymore. Let them choose.
      setJoinedSpace(res);
      setView('select-user');
    } catch (err: any) {
      setError(err.message || 'Failed to join space');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdInfo) return;
    navigator.clipboard.writeText(`Space: ${createdInfo.spaceName}\nCode: ${createdInfo.accessCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <section className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 ${view === 'home' ? 'min-h-[90vh] [clip-path:polygon(0_0,100%_0,100%_85%,0_100%)]' : 'min-h-screen'}`}>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-10 w-80 h-80 bg-secondary rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center px-6 pt-20 max-w-2xl w-full">
          <motion.div 
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: 1, rotate: -2 }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#FFD600] text-black font-black rounded-full mb-8 shadow-[0_4px_0_#000] border-2 border-black transform -rotate-1"
          >
            <Sparkles size={18} className="text-black" />
            <span className="uppercase tracking-wider text-sm">JOIN THE VIBE!</span>
            <Sparkles size={18} className="text-black" />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-8xl md:text-[10rem] text-white font-fredoka mb-6 drop-shadow-[0_8px_15px_rgba(0,0,0,0.25)] tracking-tight"
          >
            Pinglet
          </motion.h1>

          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-8"
              >
                <p className="text-2xl md:text-3xl text-white font-bold leading-tight drop-shadow-md mb-12">
                  Find <span className="text-[#FFD600]">fun connections</span>, share laughs, and start <span className="underline decoration-[#00E5FF] decoration-4 underline-offset-4">building your crew</span> today!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <button 
                    onClick={() => setView('create')}
                    className="w-full sm:w-auto px-12 py-5 bg-white text-[#FF3DBC] rounded-full font-black text-2xl shadow-[0_8px_0_rgba(255,61,188,0.4)] hover:shadow-[0_4px_0_rgba(255,61,188,0.4)] hover:translate-y-1 active:translate-y-2 transition-all border-2 border-transparent"
                  >
                    Create Space
                  </button>
                  <button 
                    onClick={() => setView('join')}
                    className="w-full sm:w-auto px-12 py-5 bg-[#00E5FF] text-black rounded-full font-black text-2xl shadow-[0_8px_0_rgba(0,184,204,0.4)] hover:shadow-[0_4px_0_rgba(0,184,204,0.4)] hover:translate-y-1 active:translate-y-2 transition-all border-2 border-transparent"
                  >
                    Join Space
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── CREATE SPACE ── */}
            {view === 'create' && !createdInfo && (
              <motion.form 
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onSubmit={handleCreate}
                className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] space-y-4 text-left relative"
              >
                <button type="button" onClick={() => { setView('home'); setError(''); }} className="absolute -top-4 -left-4 bg-white p-2 rounded-full border-2 border-black shadow-[2px_2px_0_#000] hover:bg-gray-100">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-black text-black">Create a Space</h2>
                {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded border border-red-200">{error}</p>}

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Space Name</label>
                  <input required value={spaceName} onChange={e => setSpaceName(e.target.value)} className="w-full border-4 border-black rounded-xl px-4 py-3 font-bold focus:ring-0 focus:border-primary transition-colors" placeholder="e.g. The Cool Kidz" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Your Name</label>
                    <input required value={friendOneName} onChange={e => setFriendOneName(e.target.value)} className="w-full border-4 border-black rounded-xl px-4 py-3 font-bold focus:ring-0 focus:border-primary transition-colors" placeholder="Alex" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Friend's Name</label>
                    <input required value={friendTwoName} onChange={e => setFriendTwoName(e.target.value)} className="w-full border-4 border-black rounded-xl px-4 py-3 font-bold focus:ring-0 focus:border-primary transition-colors" placeholder="Sam" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">6-Digit Access Code</label>
                  <input required value={accessCode} onChange={e => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full border-4 border-black rounded-xl px-4 py-3 font-mono font-bold text-xl tracking-widest focus:ring-0 focus:border-primary transition-colors" placeholder="123456" maxLength={6} />
                  <p className="text-xs text-gray-500 mt-1 font-medium">Share this code with your friend so they can join.</p>
                </div>
                <button disabled={loading} type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-black text-xl border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50">
                  {loading ? 'Creating...' : 'Blast Off 🚀'}
                </button>
              </motion.form>
            )}

            {/* ── SPACE CREATED CONFIRMATION ── */}
            {view === 'create' && createdInfo && (
              <motion.div 
                key="created"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] space-y-4 text-left"
              >
                <div className="text-center text-4xl mb-2">🎉</div>
                <h2 className="text-2xl font-black text-black text-center">Space Created!</h2>
                <p className="text-sm font-bold text-gray-600 text-center">Share the details below with <strong>{friendTwoName}</strong> so they can join.</p>
                <div className="bg-gray-50 rounded-2xl border-2 border-black p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-gray-500">Space Name</span>
                    <span className="font-black text-black">{createdInfo.spaceName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-gray-500">Access Code</span>
                    <span className="font-mono font-black text-primary text-xl tracking-widest">{createdInfo.accessCode}</span>
                  </div>
                </div>
                <button onClick={handleCopy} className="w-full py-4 bg-accent text-black rounded-xl font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2">
                  {copied ? <><Check size={20} /> Copied!</> : <><Copy size={20} /> Copy Details</>}
                </button>
                <button onClick={onStart} className="w-full py-4 bg-primary text-white rounded-xl font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                  Enter Space 🚀
                </button>
              </motion.div>
            )}

            {/* ── JOIN SPACE ── */}
            {view === 'join' && (
              <motion.form 
                key="join"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onSubmit={handleJoin}
                className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] space-y-4 text-left relative"
              >
                <button type="button" onClick={() => { setView('home'); setError(''); }} className="absolute -top-4 -left-4 bg-white p-2 rounded-full border-2 border-black shadow-[2px_2px_0_#000] hover:bg-gray-100">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-black text-black">Join a Space</h2>
                {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded border border-red-200">{error}</p>}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Space Name</label>
                  <input required value={joinSpaceName} onChange={e => setJoinSpaceName(e.target.value)} className="w-full border-4 border-black rounded-xl px-4 py-3 font-bold focus:ring-0 focus:border-secondary transition-colors" placeholder="e.g. The Cool Kidz" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">6-Digit Access Code</label>
                  <input required value={joinAccessCode} onChange={e => setJoinAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full border-4 border-black rounded-xl px-4 py-3 font-mono font-bold text-xl tracking-widest focus:ring-0 focus:border-secondary transition-colors" placeholder="123456" maxLength={6} />
                </div>
                <button disabled={loading} type="submit" className="w-full py-4 bg-secondary text-black rounded-xl font-black text-xl border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50">
                  {loading ? 'Joining...' : 'Enter Space 🚪'}
                </button>
              </motion.form>
            )}

            {/* ── SELECT USER (WHO ARE YOU?) ── */}
            {view === 'select-user' && joinedSpace && (
              <motion.div 
                key="select"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] space-y-4 text-left relative text-center"
              >
                <div className="text-4xl mb-2">🤔</div>
                <h2 className="text-2xl font-black text-black">Who are you?</h2>
                <p className="text-sm font-bold text-gray-500 mb-4">Select your profile to continue.</p>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => { setAuth(joinedSpace._id, joinedSpace.friendOneName); onStart(); }}
                    className="w-full py-4 bg-primary text-white rounded-xl font-black text-xl border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    I am {joinedSpace.friendOneName}
                  </button>
                  <button 
                    onClick={() => { setAuth(joinedSpace._id, joinedSpace.friendTwoName); onStart(); }}
                    className="w-full py-4 bg-secondary text-black rounded-xl font-black text-xl border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    I am {joinedSpace.friendTwoName}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {view === 'home' && (
          <>
            <motion.div 
              animate={{ 
                y: [0, -20, 0],
                rotate: [-2, 2, -2]
              }} 
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
              className="absolute top-20 left-[10%] text-7xl hidden lg:block drop-shadow-2xl"
            >
              🚀
            </motion.div>
            <motion.div 
              animate={{ 
                y: [0, 15, 0],
                rotate: [5, -5, 5]
              }} 
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
              className="absolute top-1/2 right-[8%] text-8xl hidden lg:block drop-shadow-xl"
            >
              💖
            </motion.div>
          </>
        )}
      </section>

      <section className="px-6 pb-24 relative z-20 -mt-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <FeatureCard 
            icon={<MessageCircle size={44} />} 
            title="Sharing Laughs" 
            description="Send high-five memes, voice notes, and weird stickers. No boring texts allowed!" 
            color="pink" 
            image="https://picsum.photos/seed/chat/600/400" 
          />
          <FeatureCard 
            icon={<Rocket size={44} />} 
            title="Fast Pings" 
            description={'Send a nudge to say "I\'m here!" with one tap. Fast, fun, and totally effortless.'} 
            color="yellow" 
            isMiddle 
            image="https://picsum.photos/seed/rocket/600/400" 
          />
          <FeatureCard 
            icon={<Sparkles size={44} />} 
            title="Crew Memories" 
            description="A colorful vault for all your squad goals and epic late-night photos." 
            color="cyan" 
            image="https://picsum.photos/seed/memories/600/400" 
          />
        </div>
      </section>

      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-5xl font-fredoka text-secondary mb-8">Pinglet!</div>
          <div className="text-gray-500 font-bold">© 2024 Pinglet. No boring adults allowed. ✌️</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color, isMiddle, image }: any) {
  const themes = {
    pink: {
      text: 'text-[#FF3DBC]',
      bg: 'bg-[#FF3DBC]/10',
      icon: 'text-[#FF3DBC]',
      shadow: 'shadow-[12px_12px_0px_#FF3DBC]'
    },
    yellow: {
      text: 'text-[#E6B800]',
      bg: 'bg-[#FFD600]/20',
      icon: 'text-[#E6B800]',
      shadow: 'shadow-[12px_12px_0px_#FFD600]'
    },
    cyan: {
      text: 'text-[#00B8CC]',
      bg: 'bg-[#00E5FF]/10',
      icon: 'text-[#00B8CC]',
      shadow: 'shadow-[12px_12px_0px_#00E5FF]'
    }
  }[color as 'pink' | 'yellow' | 'cyan'];

  return (
    <motion.div 
      whileHover={{ y: -5, rotate: isMiddle ? 1 : -1 }} 
      className={`group bg-white p-8 sm:p-10 rounded-[3rem] border-4 border-black transition-all ${isMiddle ? 'md:mt-12' : ''} ${themes.shadow}`}
    >
      <div className={`w-20 h-20 ${themes.bg} rounded-3xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-6 transition-transform`}>
        <div className={themes.icon}>{icon}</div>
      </div>
      <h3 className={`text-3xl font-bold mb-4 ${themes.text}`}>{title}</h3>
      <p className="text-xl font-bold text-gray-500 mb-8 leading-snug">{description}</p>
      <div className="rounded-[2rem] overflow-hidden border-4 border-black/5 bg-gray-50 p-2">
        <img src={image} alt={title} className="w-full h-48 object-cover rounded-2xl grayscale-[0.2] group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
      </div>
    </motion.div>
  );
}
