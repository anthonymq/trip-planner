import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Utensils, 
  Building2, 
  Bus, 
  MoreHorizontal, 
  Sparkles, 
  Loader2, 
  Star, 
  ExternalLink, 
  Save, 
  Plus,
  AlertCircle
} from 'lucide-react';
import { ActivityType, ItineraryItem } from '../types';
import { searchPlacesByType, PlaceSuggestion } from '../services/placesService';

// Reusing the utility from TripDetail (or recreating it since it's small)
const toISODate = (inputString?: string) => {
  if (!inputString) return '';
  const d = new Date(inputString);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
};

const ImageWithFallback = ({ src, alt, className, seed }: { src?: string, alt?: string, className?: string, seed: string }) => {
  const [error, setError] = useState(false);
  const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1000/800`;
  
  return (
    <img 
      src={error || !src ? fallbackUrl : src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)}
    />
  );
};

interface ActivityFormProps {
  initialData: Partial<ItineraryItem>;
  tripDestination: string;
  isEditing?: boolean;
  onSubmit: (data: Partial<ItineraryItem>) => void;
  onCancel?: () => void;
  className?: string;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ 
  initialData, 
  tripDestination, 
  isEditing = false, 
  onSubmit, 
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState<Partial<ItineraryItem>>(initialData);
  const [typeSuggestions, setTypeSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const fetchQuickSuggestions = async () => {
    if (!tripDestination || !formData.type) return;
    setIsFetchingSuggestions(true);
    setHasSearched(true);
    setSearchError(null);
    setTypeSuggestions([]);
    try {
      const suggestions = await searchPlacesByType(
        formData.title || '',
        formData.location || tripDestination,
        formData.type as string,
        4
      );
      setTypeSuggestions(suggestions);
    } catch (e) { 
      console.error(e); 
      setSearchError(e instanceof Error ? e.message : "Failed to load suggestions. Please try again.");
    } finally { 
      setIsFetchingSuggestions(false); 
    }
  };

  const applySuggestion = (s: PlaceSuggestion) => {
    setFormData(prev => ({
      ...prev,
      title: s.title,
      location: s.location,
      lat: s.lat,
      lng: s.lng,
      imageUrl: s.imageUrl,
      rating: s.rating,
      priceRange: s.priceRange,
      googleMapsUrl: s.googleMapsUrl,
      description: s.description
    }));
    setTypeSuggestions([]);
    setHasSearched(false);
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Activity Type Selection */}
      <div>
        <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Activity Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { type: 'attraction', icon: MapPin, label: 'Visit' }, 
            { type: 'restaurant', icon: Utensils, label: 'Food' }, 
            { type: 'hotel', icon: Building2, label: 'Stay' }, 
            { type: 'transport', icon: Bus, label: 'Move' }, 
            { type: 'other', icon: MoreHorizontal, label: 'Other' }
          ].map(item => (
            <button 
              key={item.type} 
              onClick={() => { setFormData({ ...formData, type: item.type as ActivityType }); setTypeSuggestions([]); setHasSearched(false); setSearchError(null); }} 
              className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border-2 transition-all h-20 sm:h-auto ${formData.type === item.type ? 'border-ocean-600 bg-ocean-50 text-ocean-600' : 'border-sand-100 bg-sand-50 text-sand-500 hover:border-sand-200'}`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
        <div>
           <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Title</label>
           <input 
             type="text" 
             value={formData.title || ''} 
             onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
             placeholder="e.g. French Cuisine" 
             className="w-full bg-sand-50 border-2 border-sand-100 rounded-2xl py-3 px-4 font-medium focus:border-ocean-500 focus:outline-none transition-colors text-ocean-900 placeholder:text-sand-300" 
           />
        </div>
        <div>
           <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Location</label>
           <input 
             type="text" 
             value={formData.location || ''} 
             onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
             placeholder="e.g. Paris" 
             className="w-full bg-sand-50 border-2 border-sand-100 rounded-2xl py-3 px-4 font-medium focus:border-ocean-500 focus:outline-none transition-colors text-ocean-900 placeholder:text-sand-300" 
           />
        </div>
      </div>

      {/* Smart Suggestions Button */}
      {!isEditing && formData.type && (
        <div className="pt-1">
          <button 
            onClick={fetchQuickSuggestions} 
            onPointerDown={(e) => {
              // Ensure immediate response on touch devices
              if (e.pointerType === 'touch') {
                e.preventDefault();
                fetchQuickSuggestions();
              }
            }}
            disabled={isFetchingSuggestions} 
            className="w-full py-3 border-2 border-terracotta-100 bg-terracotta-50/50 rounded-2xl text-xs font-bold text-terracotta-600 flex items-center justify-center gap-2 hover:bg-terracotta-100 transition-all disabled:opacity-50 shadow-sm active:scale-[0.98] touch-manipulation"
          >
            {isFetchingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
            GET SMART SUGGESTIONS
          </button>
        </div>
      )}

      {/* Error Message */}
      {searchError && (
        <div className="bg-red-50 border-2 border-red-100 rounded-[24px] p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Search Failed</h4>
            <p className="text-[11px] font-medium text-red-500 leading-snug">{searchError}</p>
          </div>
        </div>
      )}

      {/* Suggestions Results */}
      {typeSuggestions.length > 0 && (
        <div className="bg-terracotta-50/30 border border-terracotta-100 rounded-[24px] p-4 space-y-3 shadow-inner">
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-black text-terracotta-400 uppercase tracking-widest">Found in {formData.location || tripDestination}</p>
             <button onClick={() => setTypeSuggestions([])} className="text-[10px] font-bold text-terracotta-400 hover:text-terracotta-600">Close</button>
          </div>
          
          {/* Horizontal scroll on mobile, Grid on desktop */}
          <div className="flex overflow-x-auto gap-3 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible pl-4 pr-10 -mx-4 no-scrollbar scroll-smooth">
            {typeSuggestions.map((s, idx) => (
              <div 
                key={idx} 
                className="min-w-[200px] w-[200px] sm:w-auto bg-white rounded-3xl border border-sand-100 shadow-sm overflow-hidden hover:border-terracotta-400 hover:shadow-lg transition-all group cursor-pointer flex flex-col sm:flex-row gap-0 sm:gap-3 shrink-0"
              >
                 <div onClick={() => applySuggestion(s)} className="h-24 sm:h-16 sm:w-16 w-full overflow-hidden shrink-0 relative">
                     <ImageWithFallback src={s.imageUrl} seed={s.title || ''} className="w-full h-full object-cover" />
                     {/* Mobile Only Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:hidden" />
                     <h5 className="absolute bottom-2 left-3 font-black text-white text-xs sm:hidden truncate max-w-[90%]">{s.title}</h5>
                  </div>
                  
                  <div className="flex-1 min-w-0 p-3 sm:p-2 sm:pl-0 pt-0 sm:pt-2 flex flex-col justify-center" onClick={() => applySuggestion(s)}>
                     <h5 className="hidden sm:block text-xs font-black text-ocean-900 truncate">{s.title}</h5>
                     <p className="text-[10px] text-sand-500 mt-0.5 truncate">{s.location}</p>
                     <div className="flex items-center gap-2 mt-1">
                       {s.rating && <div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /><span className="text-[10px] font-bold text-amber-500">{s.rating}</span></div>}
                       {s.priceRange && <span className="text-[10px] font-bold text-emerald-600">{s.priceRange}</span>}
                     </div>
                  </div>
                  
                  <a 
                    href={s.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.title} ${s.location}`)}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:flex self-center p-2 text-sand-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-xl transition-colors shrink-0 mr-2"
                    title="View on Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {hasSearched && !isFetchingSuggestions && !searchError && typeSuggestions.length === 0 && (
        <div className="bg-sand-50 border-2 border-dashed border-sand-200 rounded-[24px] p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <Sparkles className="w-6 h-6 text-sand-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-sand-500">No suggestions found.</p>
            <p className="text-[10px] text-sand-400 mt-1">Try specific terms like "Sushi" or "Park".</p>
        </div>
      )}

      {/* Date Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
           <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Start Time</label>
           <input 
             type="datetime-local" 
             value={formData.startTime || ''} 
             onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} 
             className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-3 px-3 text-xs font-bold text-ocean-700 focus:border-ocean-500 focus:outline-none transition-colors" 
           />
        </div>
        <div>
           <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">End Time</label>
           <input 
             type="datetime-local" 
             value={formData.endTime || ''} 
             onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} 
             className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-3 px-3 text-xs font-bold text-ocean-700 focus:border-ocean-500 focus:outline-none transition-colors" 
           />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button 
             onClick={onCancel}
             className="flex-1 py-4 bg-sand-100 text-sand-500 rounded-2xl font-bold hover:bg-sand-200 transition-all"
          >
            Cancel
          </button>
        )}
        <button 
           disabled={!toISODate(formData.startTime)} 
           onClick={handleSubmit} 
           className="flex-[2] py-4 bg-ocean-600 text-white rounded-2xl font-bold shadow-lg shadow-ocean-500/30 disabled:opacity-50 hover:bg-ocean-700 transition-all active:scale-[0.98]"
        >
          {isEditing ? <Save className="w-4 h-4 mr-2 inline" /> : <Plus className="w-4 h-4 mr-2 inline" />}
          {isEditing ? 'Save Changes' : 'Add Activity'}
        </button>
      </div>
    </div>
  );
};

export default ActivityForm;
