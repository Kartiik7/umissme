import { useState, useEffect } from 'react';
import { Zap, Archive, Flame, Camera, Clock, MessageCircle, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { getSpaceOverview, getAuth } from '../services/api';
import { socketService } from '../services/socket';

export default function ActivityTimeline() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { spaceId } = getAuth();

  useEffect(() => {
    if (!spaceId) return;
    const loadOverview = () => {
      getSpaceOverview(spaceId)
        .then(data => {
          setTimeline(data.activityTimeline || []);
          setStats(data.stats);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    };

    loadOverview();

    const unsubMessageCreated = socketService.on('message-created', loadOverview);
    const unsubMessagesUpdated = socketService.on('messages-updated', loadOverview);

    return () => {
      unsubMessageCreated();
      unsubMessagesUpdated();
    };
  }, [spaceId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-black text-primary">Loading Timeline...</div>;
  }

  const getEventUI = (type: string) => {
    switch (type) {
      case 'ping': return { icon: Zap, color: 'bg-secondary text-black' };
      case 'memory': return { icon: Camera, color: 'bg-accent text-black' };
      case 'joined': return { icon: Heart, color: 'bg-primary text-white' };
      case 'message': return { icon: MessageCircle, color: 'bg-indigo-500 text-white' };
      default: return { icon: Archive, color: 'bg-gray-200 text-gray-600' };
    }
  };

  const getTimeLabel = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-[#f8f9ff] min-h-screen pb-36">
      <header className="sticky top-0 w-full flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-xl z-50 border-b-4 border-black">
        <h1 className="font-black text-xl text-black">Activity</h1>
        <button className="p-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] bg-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
          <Clock size={20} />
        </button>
      </header>

      <main className="max-w-2xl mx-auto w-full px-6 py-8 pb-36">
        {/* Weekly Stats */}
        <div className="bg-white rounded-3xl border-4 border-black neo-shadow p-6 mb-8 flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg text-black mb-1">Activity Pulse</h3>
            <p className="text-sm font-bold text-gray-500">{stats?.totalMessages || 0} messages sent. Keep it up! 🎉</p>
          </div>
          <div className="text-3xl font-black text-primary flex items-center gap-1">
            <Flame size={24} className="text-orange-500" />
            {stats?.daysActive || 1} <span className="text-sm text-gray-400">Days</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative border-l-4 border-black ml-5 space-y-6 pb-4">
          {timeline.length === 0 ? (
            <p className="pl-6 text-sm font-bold text-gray-400">No activity yet. Send a Ping or add a Memory!</p>
          ) : (
            timeline.map((event, i) => {
              const { icon: Icon, color } = getEventUI(event.type);
              return (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={event._id || i}
                  className="relative pl-8"
                >
                  <div className={`absolute -left-[22px] top-1 w-10 h-10 rounded-full flex items-center justify-center border-4 border-black neo-shadow-sm ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0_#000] p-4 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer">
                    <p className="font-black text-black text-sm mb-1">{event.description}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{getTimeLabel(event.createdAt)}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
