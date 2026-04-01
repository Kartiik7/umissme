import { Search, Archive, X, History, MessageCircle, Sparkles, Zap, User, Users, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function SearchArchive() {
  return (
    <div className="bg-[#f8f9ff] min-h-screen pb-32">
      <header className="flex justify-between items-center w-full px-6 py-4 backdrop-blur-xl bg-white/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black bg-gradient-to-br from-primary to-[#4f46e5] bg-clip-text text-transparent">Pinglet</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <Search size={24} />
          </button>
          <button className="p-2 rounded-xl text-primary font-bold hover:bg-gray-100 transition-colors">
            <Archive size={24} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8 space-y-8">
        {/* Search Section */}
        <section className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-accent rounded-[2rem] blur opacity-25 group-focus-within:opacity-100 transition duration-1000"></div>
            <div className="relative flex items-center bg-white border-4 border-black rounded-[2rem] px-6 py-4 shadow-xl">
              <Search className="text-primary mr-4" size={24} />
              <input 
                className="bg-transparent border-none focus:ring-0 w-full font-bold text-lg text-black placeholder-gray-400" 
                placeholder="Find a memory or message..." 
                type="text"
              />
              <X className="text-gray-400 cursor-pointer hover:text-red-500 transition-colors" size={24} />
            </div>
          </div>

          {/* Recent Searches */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold text-sm tracking-widest uppercase text-gray-500">Recent Searches</h2>
              <button className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1 rounded-full">Clear All</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <SearchTag label="Beach trip 2023" color="bg-secondary/20 border-secondary/30" />
              <SearchTag label="Secret recipe" color="bg-accent/20 border-accent/30" />
              <SearchTag label="@alex_m" color="bg-gray-100 border-transparent" />
            </div>
          </div>
        </section>

        {/* Filters */}
        <nav className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <FilterButton label="All Results" active icon={<Zap size={16} />} />
          <FilterButton label="Messages" icon={<MessageCircle size={16} />} />
          <FilterButton label="Memories" icon={<Sparkles size={16} />} />
          <FilterButton label="Activity" icon={<Zap size={16} />} />
        </nav>

        {/* Archived Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-black text-2xl text-black">Archived Pings</h2>
            <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">12 Items</span>
          </div>

          <div className="space-y-4">
            {/* Message Card 1 */}
            <div className="bg-white rounded-3xl p-5 flex gap-4 transition-all hover:translate-x-1 active:scale-[0.98] cursor-pointer shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white shrink-0">
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-black truncate">Sarah Jenkins</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Oct 12</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-1">Don't forget to check out that new coffee place downtown. I heard the espresso is...</p>
                <div className="flex gap-2 pt-1">
                  <span className="text-[10px] font-bold bg-gray-50 text-primary px-2 py-0.5 rounded uppercase">Work</span>
                  <span className="text-[10px] font-bold bg-gray-50 text-primary px-2 py-0.5 rounded uppercase">Reference</span>
                </div>
              </div>
            </div>

            {/* Memory Card */}
            <div className="bg-white rounded-3xl p-5 space-y-4 border-l-8 border-accent transition-all hover:translate-x-1 active:scale-[0.98] cursor-pointer shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Star className="text-accent fill-current" size={16} />
                  <span className="font-extrabold text-sm uppercase tracking-wider text-black">Weekend Cabin Trip</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Sep 28</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <img className="w-full h-24 object-cover rounded-2xl" src="https://picsum.photos/seed/cabin/300/200" alt="Cabin" referrerPolicy="no-referrer" />
                <img className="w-full h-24 object-cover rounded-2xl" src="https://picsum.photos/seed/fire/300/200" alt="Fire" referrerPolicy="no-referrer" />
              </div>
              <p className="text-sm text-gray-500">The best weekend ever. We need to do this every year. Archive for the memories!</p>
            </div>

            {/* Message Card 3 */}
            <div className="bg-white rounded-3xl p-5 flex gap-4 transition-all hover:translate-x-1 active:scale-[0.98] cursor-pointer shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                <Users size={24} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-black truncate">The Breakfast Club</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Sep 15</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-1">Leo: Who's bringing the orange juice this time? I brought the bagels last...</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SearchTag({ label, color }: any) {
  return (
    <div className={`${color} text-black font-bold text-xs px-4 py-2 rounded-full flex items-center gap-2 border-2 hover:border-black transition-all cursor-pointer`}>
      <span>{label}</span>
      <History size={14} />
    </div>
  );
}

function FilterButton({ label, active, icon }: any) {
  return (
    <button className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-2xl shrink-0 transition-all ${
      active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-gray-500 hover:bg-gray-50'
    }`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
