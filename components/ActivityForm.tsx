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
  AlertCircle,
  ChevronDown,
  Pencil
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
  const [showManualInputs, setShowManualInputs] = useState(false);

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

  // Determine if we should show manual inputs (always on desktop, toggle on mobile, always in edit mode)
  const shouldShowManualInputs = isEditing || showManualInputs;
  // Check if a suggestion has been applied (has title filled from suggestion)
  const hasSuggestionApplied = !!(formData.title && formData.lat && formData.lng);

  return (
    <div className={`space-y-4 sm:space-y-5 ${className}`}>
      {/* Activity Type Selection - Larger on mobile */}
      <div>
        <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">What are you doing?</label>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
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
              className={`flex flex-col items-center justify-center gap-1 p-2.5 sm:p-2 rounded-xl border-2 transition-all active:scale-95 ${formData.type === item.type ? 'border-ocean-600 bg-ocean-50 text-ocean-600 shadow-sm' : 'border-sand-100 bg-sand-50 text-sand-500 hover:border-sand-200'}`}
            >
              <item.icon className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="text-[8px] sm:text-[10px] font-bold uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Smart Suggestions Button - Primary CTA on mobile, shown when type selected */}
      {!isEditing && formData.type && (
        <button 
          onClick={fetchQuickSuggestions} 
          onPointerDown={(e) => {
            if (e.pointerType === 'touch') {
              e.preventDefault();
              fetchQuickSuggestions();
            }
          }}
          disabled={isFetchingSuggestions} 
          className="w-full py-4 sm:py-3 bg-terracotta-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 hover:bg-terracotta-600 transition-all disabled:opacity-50 shadow-lg shadow-terracotta-500/20 active:scale-[0.98] touch-manipulation"
        >
          {isFetchingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
          {isFetchingSuggestions ? 'Finding places...' : `Find places in ${tripDestination}`}
        </button>
      )}

      {/* Selected place display (after suggestion applied) */}
      {hasSuggestionApplied && !isEditing && (
        <div className="bg-ocean-50 border-2 border-ocean-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ocean-100 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-ocean-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ocean-900 text-sm truncate">{formData.title}</p>
            <p className="text-xs text-ocean-600 truncate">{formData.location}</p>
          </div>
          <button 
            onClick={() => { setFormData({ ...formData, title: '', location: '', lat: undefined, lng: undefined }); setShowManualInputs(false); }}
            className="text-ocean-400 hover:text-ocean-600 p-1"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manual entry toggle - Mobile only, when no suggestion applied */}
      {!isEditing && !hasSuggestionApplied && (
        <button
          onClick={() => setShowManualInputs(!showManualInputs)}
          className="sm:hidden w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-sand-500 hover:text-ocean-600 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          {showManualInputs ? 'Hide manual entry' : 'Add manually instead'}
          <ChevronDown className={`w-3 h-3 transition-transform ${showManualInputs ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Inputs - Hidden on mobile by default, visible on desktop or when toggled */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        shouldShowManualInputs || hasSuggestionApplied ? 'hidden' : 'hidden sm:block'
      } ${shouldShowManualInputs && !hasSuggestionApplied ? '!block' : ''}`}>
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
          <div>
            <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Title</label>
            <input 
              type="text" 
              value={formData.title || ''} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              placeholder="e.g. French Cuisine" 
              className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-2.5 px-3 text-sm font-medium focus:border-ocean-500 focus:outline-none transition-colors text-ocean-900 placeholder:text-sand-300" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Location</label>
            <input 
              type="text" 
              value={formData.location || ''} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
              placeholder="e.g. Paris" 
              className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-2.5 px-3 text-sm font-medium focus:border-ocean-500 focus:outline-none transition-colors text-ocean-900 placeholder:text-sand-300" 
            />
          </div>
        </div>
      </div>

      {/* Error Message - More compact */}
      {searchError && (
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-0.5">Search Failed</h4>
            <p className="text-[10px] font-medium text-red-500 leading-snug">{searchError}</p>
          </div>
        </div>
      )}

      {/* Suggestions Results - Improved mobile layout */}
      {typeSuggestions.length > 0 && (
        <div className="bg-terracotta-50/30 border border-terracotta-100 rounded-2xl sm:rounded-[24px] p-3 sm:p-4 space-y-2 sm:space-y-3 shadow-inner">
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-black text-terracotta-400 uppercase tracking-widest">Tap to select</p>
             <button onClick={() => setTypeSuggestions([])} className="text-[10px] font-bold text-terracotta-400 hover:text-terracotta-600 px-2 py-1">Close</button>
          </div>
          
          {/* Horizontal scroll on mobile, Grid on desktop */}
          <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar scroll-smooth">
            {typeSuggestions.map((s, idx) => (
              <div 
                key={idx} 
                className="min-w-[160px] w-[160px] sm:w-auto bg-white rounded-2xl sm:rounded-3xl border border-sand-100 shadow-sm overflow-hidden hover:border-terracotta-400 hover:shadow-lg transition-all group cursor-pointer flex flex-col sm:flex-row gap-0 sm:gap-3 shrink-0 active:scale-[0.98]"
                onClick={() => applySuggestion(s)}
              >
                 <div className="h-20 sm:h-16 sm:w-16 w-full overflow-hidden shrink-0 relative">
                     <ImageWithFallback src={s.imageUrl} seed={s.title || ''} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:hidden" />
                  </div>
                  
                  <div className="flex-1 min-w-0 p-2.5 sm:p-2 sm:pl-0 flex flex-col justify-center">
                     <h5 className="text-[11px] sm:text-xs font-black text-ocean-900 truncate leading-tight">{s.title}</h5>
                     <p className="text-[9px] sm:text-[10px] text-sand-500 mt-0.5 truncate">{s.location}</p>
                     <div className="flex items-center gap-1.5 mt-1">
                       {s.rating && <div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /><span className="text-[9px] font-bold text-amber-500">{s.rating}</span></div>}
                       {s.priceRange && <span className="text-[9px] font-bold text-emerald-600">{s.priceRange}</span>}
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

      {/* No Results Message - More compact */}
      {hasSearched && !isFetchingSuggestions && !searchError && typeSuggestions.length === 0 && (
        <div className="bg-sand-50 border-2 border-dashed border-sand-200 rounded-2xl p-4 sm:p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sand-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-sand-500">No suggestions found.</p>
            <p className="text-[10px] text-sand-400 mt-1">Try a different activity type.</p>
        </div>
      )}

      {/* Date Times - More compact on mobile */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div>
           <label className="text-[10px] sm:text-xs font-bold text-sand-400 uppercase tracking-widest block mb-1.5 sm:mb-2">Start</label>
           <input 
             type="datetime-local" 
             value={formData.startTime || ''} 
             onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} 
             className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-2.5 px-2 sm:px-3 text-xs font-bold text-ocean-700 focus:border-ocean-500 focus:outline-none transition-colors" 
           />
        </div>
        <div>
           <label className="text-[10px] sm:text-xs font-bold text-sand-400 uppercase tracking-widest block mb-1.5 sm:mb-2">End</label>
           <input 
             type="datetime-local" 
             value={formData.endTime || ''} 
             onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} 
             className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-2.5 px-2 sm:px-3 text-xs font-bold text-ocean-700 focus:border-ocean-500 focus:outline-none transition-colors" 
           />
        </div>
      </div>

      {/* Actions - Stack on mobile */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
        {onCancel && (
          <button 
             onClick={onCancel}
             className="py-3 sm:py-4 sm:flex-1 bg-sand-100 text-sand-500 rounded-xl sm:rounded-2xl font-bold hover:bg-sand-200 transition-all text-sm"
          >
            Cancel
          </button>
        )}
        <button 
           disabled={!toISODate(formData.startTime)} 
           onClick={handleSubmit} 
           className="py-3 sm:py-4 flex-1 sm:flex-[2] bg-ocean-600 text-white rounded-xl sm:rounded-2xl font-bold shadow-lg shadow-ocean-500/30 disabled:opacity-50 hover:bg-ocean-700 transition-all active:scale-[0.98] text-sm"
        >
          {isEditing ? <Save className="w-4 h-4 mr-2 inline" /> : <Plus className="w-4 h-4 mr-2 inline" />}
          {isEditing ? 'Save Changes' : 'Add Activity'}
        </button>
      </div>
    </div>
  );
};

export default ActivityForm;
