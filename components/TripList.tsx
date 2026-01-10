import React from 'react';
import { 
  Plus, 
  Calendar, 
  Trash2,
  Sparkles
} from 'lucide-react';
import { Trip } from '../types';

interface TripListProps {
  trips: Trip[];
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (id: string, e: React.MouseEvent) => void;
  onCreateNew: () => void;
}

const TripList: React.FC<TripListProps> = ({ trips, onSelectTrip, onDeleteTrip, onCreateNew }) => {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-ocean-600 via-ocean-700 to-ocean-800 dark:from-ocean-700 dark:via-ocean-800 dark:to-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl shadow-ocean-900/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-terracotta-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-4">Where to next?</h2>
          <p className="text-ocean-100 text-lg max-w-lg leading-relaxed">Plan your next adventure with AI-powered suggestions, smart itineraries, and beautiful maps.</p>
          
          <button 
            onClick={onCreateNew} 
            className="mt-8 px-8 py-4 bg-white text-ocean-800 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 group-hover:shadow-ocean-900/20"
          >
            <Plus className="w-4 h-4" /> Start New Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {trips.map(trip => (
          <div 
            key={trip.id} 
            onClick={() => onSelectTrip(trip.id)} 
            className="group relative h-80 rounded-[2rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 bg-sand-100 dark:bg-slate-800"
          >
            <img 
              src={trip.coverImage} 
              className="parallax-img absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt={trip.destination} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
            
            <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <h4 className="text-3xl font-serif font-bold text-white mb-2">{trip.destination}</h4>
              <div className="flex items-center gap-3 text-white/90">
                 <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {trip.itinerary.length} Items
                 </span>
                 <span className="px-3 py-1 bg-terracotta-500/80 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
                    Plan
                 </span>
              </div>
            </div>
            
            <button 
              onClick={(e) => onDeleteTrip(trip.id, e)} 
              className="absolute top-4 right-4 p-3 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:bg-terracotta-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 duration-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {trips.length === 0 && (
           <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50">
              <div className="w-16 h-16 bg-sand-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                 <Sparkles className="w-8 h-8 text-sand-400 dark:text-slate-500" />
              </div>
              <p className="text-sand-500 dark:text-slate-400 font-serif text-xl italic">Your travel journal is empty.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default TripList;
