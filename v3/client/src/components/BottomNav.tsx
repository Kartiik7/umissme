import { MessageCircle, Sparkles, Heart, Settings as SettingsIcon, Activity } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'memories', label: 'Memories', icon: Sparkles },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-2xl border-t border-gray-200">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center px-1.5 min-w-[64px] py-2 transition-all duration-300 rounded-2xl ${
              isActive 
                ? 'bg-gradient-to-br from-primary to-[#c026d3] text-white shadow-lg shadow-pink-500/20 scale-110' 
                : 'text-gray-500 hover:text-primary'
            }`}
          >
            <Icon size={24} className={isActive ? 'fill-current' : ''} />
            <span className="text-[11px] font-semibold uppercase tracking-wider mt-1">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
