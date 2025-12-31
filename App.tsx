import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  ChevronLeft
} from 'lucide-react';
import { Trip } from './types';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';

const App: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDest, setNewDest] = useState('');
  const [newDays, setNewDays] = useState(3);

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId]);

  const handleAddTrip = () => {
    if (!newDest.trim()) return;
    const tripId = Math.random().toString(36).substr(2, 9);
    const newTrip: Trip = {
      id: tripId,
      destination: newDest,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + (newDays || 1) * 24 * 60 * 60 * 1000).toISOString(),
      coverImage: `https://picsum.photos/seed/${newDest.replace(/\s+/g, '')}/800/600`,
      itinerary: [],
      budget: 0
    };
    setTrips(prev => [...prev, newTrip]);
    setSelectedTripId(tripId);
    setShowAddModal(false);
    setNewDest('');
  };

  const deleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrips(prev => prev.filter(t => t.id !== id));
    if (selectedTripId === id) setSelectedTripId(null);
  };

  const handleUpdateTrip = (updatedTrip: Trip) => {
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col relative overflow-hidden font-sans text-ocean-900">
      <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-sand-200 px-4 py-4 flex items-center justify-between transition-all duration-300">
        {selectedTripId && selectedTrip ? (
          <div className="flex items-center gap-3 animate-in slide-in-from-left duration-300">
            <button onClick={() => setSelectedTripId(null)} className="p-2 hover:bg-sand-100 rounded-full transition-colors group">
              <ChevronLeft className="w-5 h-5 text-ocean-700 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-2xl font-serif font-bold text-ocean-900 leading-none">{selectedTrip.destination}</h1>
              <p className="text-[10px] text-terracotta-500 font-bold uppercase mt-1 tracking-widest">PLANNING TRIP</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 animate-in fade-in duration-300">
            <div className="w-8 h-8 bg-terracotta-500 rounded-xl flex items-center justify-center shadow-lg shadow-terracotta-500/20"><Sparkles className="w-5 h-5 text-white" /></div>
            <h1 className="text-xl font-serif font-bold text-ocean-900 tracking-tight">WanderList</h1>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {!selectedTripId ? (
          <div className="flex-1 overflow-y-auto">
             <TripList 
               trips={trips} 
               onSelectTrip={setSelectedTripId} 
               onDeleteTrip={deleteTrip} 
               onCreateNew={() => setShowAddModal(true)} 
             />
          </div>
        ) : selectedTrip ? (
          <TripDetail 
            trip={selectedTrip} 
            onBack={() => setSelectedTripId(null)} 
            onUpdateTrip={handleUpdateTrip} 
          />
        ) : (
           <div className="flex-1 flex items-center justify-center text-sand-400">Trip not found</div>
        )}
      </main>

      {/* Create Trip Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-ocean-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-serif font-bold mb-6 text-ocean-900">Start New Trip</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-sand-400 uppercase tracking-widest block mb-2 ml-1">Destination</label>
                <input 
                  type="text" 
                  placeholder="e.g. Tokyo, Paris, Bali" 
                  className="w-full p-4 bg-sand-50 border-2 border-sand-100 rounded-2xl font-medium focus:border-terracotta-500 focus:bg-white outline-none transition-all placeholder:text-sand-300 text-ocean-900 text-lg" 
                  value={newDest} 
                  onChange={e => setNewDest(e.target.value)} 
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && newDest.trim() && handleAddTrip()}
                />
              </div>
              <div>
                 <label className="text-[10px] font-bold text-sand-400 uppercase tracking-widest block mb-2 ml-1">Duration (Days)</label>
                 <div className="flex items-center gap-4">
                    <button onClick={() => setNewDays(Math.max(1, newDays - 1))} className="w-12 h-12 rounded-2xl border-2 border-sand-100 flex items-center justify-center text-xl font-bold text-sand-400 hover:border-ocean-200 hover:text-ocean-600 transition-all">-</button>
                    <span className="flex-1 text-center font-black text-2xl text-ocean-900">{newDays}</span>
                    <button onClick={() => setNewDays(newDays + 1)} className="w-12 h-12 rounded-2xl border-2 border-sand-100 flex items-center justify-center text-xl font-bold text-sand-400 hover:border-ocean-200 hover:text-ocean-600 transition-all">+</button>
                 </div>
              </div>
            </div>
            <div className="mt-10 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-sand-400 font-black text-xs uppercase tracking-widest hover:bg-sand-50 rounded-2xl transition-all">Cancel</button>
              <button onClick={handleAddTrip} disabled={!newDest.trim()} className="flex-[2] py-4 bg-ocean-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-ocean-500/30 hover:bg-ocean-700 transition-all disabled:opacity-50 active:scale-95">Create Trip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
