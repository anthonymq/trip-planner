import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Map as MapIcon, 
  List, 
  Sparkles, 
  ChevronLeft, 
  Calendar, 
  Search,
  Settings,
  MoreVertical,
  Trash2,
  Camera, 
  Loader2,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
  Plane,
  Building2,
  FileText,
  ChevronRight,
  DollarSign,
  Image as ImageIcon,
  Save,
  X,
  AlertCircle,
  ArrowRightCircle,
  Moon,
  Info,
  Edit2,
  Check,
  Utensils,
  Bus,
  MoreHorizontal,
  Edit3,
  Zap,
  PlaneTakeoff,
  PlaneLanding,
  Sparkle,
  Star,
  ExternalLink,
  Coins,
  Wand2,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { Trip, ItineraryItem, ActivityType, AISuggestion } from '../types';
import TimelineView from './TimelineView';
import MapView from './MapView';
import { getAIPersonalizedSuggestions, getTypeSpecificSuggestions, magicParseActivities } from '../services/geminiService';

// Utilities
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

const toInputDate = (isoString?: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  // Adjust to local time for input
  const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  return localIso;
};

const toISODate = (inputString?: string) => {
  if (!inputString) return '';
  const d = new Date(inputString);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
};

interface TripDetailProps {
  trip: Trip;
  onBack: () => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const TripDetail: React.FC<TripDetailProps> = ({ trip, onBack, onUpdateTrip }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'ai'>('timeline');
  const [activeItemId, setActiveItemId] = useState<string | undefined>();
  const [hoveredItemId, setHoveredItemId] = useState<string | undefined>();
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  
  // Modal States
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showMagicModal, setShowMagicModal] = useState(false);
  
  // Magic AI State
  const [magicText, setMagicText] = useState('');
  const [isMagicParsing, setIsMagicParsing] = useState(false);
  const [magicResults, setMagicResults] = useState<Partial<ItineraryItem>[]>([]);
  const [selectedMagicIndices, setSelectedMagicIndices] = useState<Set<number>>(new Set());
  const [magicError, setMagicError] = useState<string | null>(null);

  // Activity Form State
  const [activityFormData, setActivityFormData] = useState<Partial<ItineraryItem>>({
    title: '',
    location: '',
    type: 'attraction',
    startTime: '',
    endTime: '',
    description: '',
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Suggestions State
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [typeSuggestions, setTypeSuggestions] = useState<Partial<ItineraryItem & { rating?: number, imageUrl?: string, googleMapsUrl?: string, priceRange?: string }>[]>([]);

  const tripHotel = useMemo(() => trip.itinerary.find(i => i.type === 'hotel'), [trip]);

  // --- Handlers ---

  const handleOpenQuickAdd = (afterItem?: ItineraryItem, dateStr?: string) => {
    const defaultStart = afterItem 
      ? toInputDate(new Date(new Date(afterItem.startTime).getTime() + 3600000).toISOString())
      : (dateStr ? toInputDate(dateStr) : toInputDate(new Date().toISOString()));

    setActivityFormData({
      title: '',
      location: '',
      type: 'attraction',
      startTime: defaultStart,
      endTime: '',
      description: '',
    });
    setTypeSuggestions([]);
    setShowQuickAdd(true);
  };

  const handleMagicParse = async () => {
    if (!magicText.trim()) return;
    setIsMagicParsing(true);
    setMagicResults([]);
    setMagicError(null);
    setSelectedMagicIndices(new Set());
    try {
      const results = await magicParseActivities(magicText, trip.destination);
      setMagicResults(results);
      setSelectedMagicIndices(new Set(results.map((_, i) => i)));
    } catch (e) {
      console.error(e);
      setMagicError('Failed to magically parse. Please try again or check your API key.');
    } finally {
      setIsMagicParsing(false);
    }
  };

  const handleAddMagicResults = () => {
    const itemsToAdd: ItineraryItem[] = magicResults
      .filter((_, i) => selectedMagicIndices.has(i))
      .map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        type: (item.type as ActivityType) || 'attraction',
        title: item.title || 'Activity',
        location: item.location || 'Location',
        startTime: item.startTime || new Date().toISOString(),
        endTime: item.endTime,
        description: item.description,
        lat: item.lat || 0,
        lng: item.lng || 0,
        imageUrl: item.imageUrl
      }));

    const updatedItinerary = [...trip.itinerary, ...itemsToAdd].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    onUpdateTrip({ ...trip, itinerary: updatedItinerary });

    setShowMagicModal(false);
    setMagicText('');
    setMagicResults([]);
  };

  const fetchQuickSuggestions = async () => {
    if (!trip.destination || !activityFormData.type) return;
    setIsFetchingSuggestions(true);
    setTypeSuggestions([]);
    try {
      const suggestions = await getTypeSpecificSuggestions(
        trip.destination, 
        activityFormData.type as ActivityType,
        {
          title: activityFormData.title,
          location: activityFormData.location || trip.destination,
          hotelCoords: tripHotel ? { lat: tripHotel.lat, lng: tripHotel.lng } : undefined,
          startTime: toISODate(activityFormData.startTime)
        }
      );
      setTypeSuggestions(suggestions);
    } catch (e) { console.error(e); } finally { setIsFetchingSuggestions(false); }
  };

  const applySuggestion = (s: Partial<ItineraryItem & { rating?: number, googleMapsUrl?: string, priceRange?: string }>) => {
    setActivityFormData(prev => ({
      ...prev,
      title: s.title,
      location: s.location,
      lat: s.lat,
      lng: s.lng,
      imageUrl: s.imageUrl,
      rating: s.rating,
      priceRange: s.priceRange,
      googleMapsUrl: s.googleMapsUrl,
      startTime: toInputDate(s.startTime) || prev.startTime,
      endTime: toInputDate(s.endTime) || prev.endTime,
      description: s.description
    }));
    setTypeSuggestions([]);
  };

  const executeActivitySave = () => {
    const isoStart = toISODate(activityFormData.startTime);
    if (!isoStart) return;

    const formattedItem: ItineraryItem = {
      id: editingItemId || Math.random().toString(36).substr(2, 9),
      type: (activityFormData.type as ActivityType) || 'attraction',
      title: activityFormData.title || 'Activity',
      location: activityFormData.location || 'Location',
      startTime: isoStart,
      endTime: toISODate(activityFormData.endTime) || undefined,
      description: activityFormData.description,
      lat: activityFormData.lat || 0,
      lng: activityFormData.lng || 0,
      imageUrl: activityFormData.imageUrl,
      rating: activityFormData.rating,
      priceRange: activityFormData.priceRange,
      googleMapsUrl: activityFormData.googleMapsUrl
    };

    let newItinerary;
    if (editingItemId) {
      newItinerary = trip.itinerary.map(i => i.id === editingItemId ? formattedItem : i);
    } else {
      newItinerary = [...trip.itinerary, formattedItem];
    }

    onUpdateTrip({
      ...trip,
      itinerary: newItinerary.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    });

    setEditingItemId(null);
    setShowQuickAdd(false);
    setShowEditItemModal(false);
  };

  const handleDeleteItem = (id: string) => {
    onUpdateTrip({
        ...trip,
        itinerary: trip.itinerary.filter(i => i.id !== id)
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cream relative">
      {/* Mobile Tab Navigation */}
      <div className="lg:hidden px-4 py-2 bg-cream sticky top-0 z-40 border-b border-sand-200">
        <div className="flex p-1.5 bg-sand-200/50 rounded-xl mb-3">
          <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'timeline' ? 'bg-white shadow-sm text-ocean-600' : 'text-sand-500'}`}>Timeline</button>
          <button onClick={() => setActiveTab('map')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'map' ? 'bg-white shadow-sm text-ocean-600' : 'text-sand-500'}`}>Map</button>
          <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ai' ? 'bg-white shadow-sm text-terracotta-600' : 'text-sand-500'}`}>Ideas</button>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setShowMagicModal(true)} className="flex-1 py-3 bg-terracotta-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-terracotta-600 active:scale-95 transition-all">
            <Wand2 className="w-3 h-3" /> Magic Add
          </button>
          <button onClick={() => handleOpenQuickAdd()} className="flex-1 py-3 bg-white text-ocean-800 border border-sand-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sand-50 active:scale-95 transition-all">
            <Plus className="w-3 h-3" /> Quick Add
          </button>
        </div>
      </div>

      {/* Desktop Controls (Header Actions) */}
      <div className="hidden lg:flex absolute top-[-3.5rem] right-4 gap-3 z-50">
        <button onClick={() => setShowMagicModal(true)} className="py-2.5 px-4 bg-terracotta-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-terracotta-500/20 hover:bg-terracotta-600 active:scale-95 transition-all">
           <Wand2 className="w-3 h-3" /> Magic Add
        </button>
        <button onClick={() => handleOpenQuickAdd()} className="py-2.5 px-4 bg-white text-ocean-800 border border-sand-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sand-50 active:scale-95 transition-all shadow-sm">
           <Plus className="w-3 h-3" /> Quick Add
        </button>
        <button onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)} className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${showSuggestionsPanel ? 'bg-terracotta-100 text-terracotta-600 border-terracotta-200' : 'bg-white text-ocean-600 border-sand-200 hover:bg-sand-50'}`}>
           <Sparkles className="w-3 h-3" /> Suggestions
        </button>
      </div>

      {/* Main Content Area - Split View */}
      <div className="flex-1 relative overflow-hidden lg:grid lg:grid-cols-[2fr_3fr]">
        
        {/* Timeline Column */}
        <div className={`absolute inset-0 overflow-y-auto lg:static lg:h-full bg-cream transition-all duration-300 z-10 ${activeTab === 'timeline' ? 'opacity-100 translate-x-0' : 'lg:opacity-100 lg:translate-x-0 opacity-0 -translate-x-full pointer-events-none lg:pointer-events-auto'}`}>
           <div className="p-4 lg:p-6 lg:pb-32">
             <TimelineView 
                 items={trip.itinerary} 
                 activeId={activeItemId}
                 hoveredItemId={hoveredItemId}
                 onItemHover={setHoveredItemId}
                 onItemClick={(item) => setActiveItemId(item.id)} 
                 onEditItem={(item) => { 
                     setEditingItemId(item.id); 
                     setActivityFormData({ ...item, startTime: toInputDate(item.startTime), endTime: item.endTime ? toInputDate(item.endTime) : '' }); 
                     setShowEditItemModal(true); 
                 }} 
                 onDeleteItem={handleDeleteItem} 
                 onAddAfter={handleOpenQuickAdd} 
               />
           </div>
        </div>

        {/* Map Column */}
        <div className={`absolute inset-0 lg:sticky lg:top-0 lg:h-[calc(100vh-5rem)] transition-all duration-300 z-20 bg-sand-100 lg:border-l lg:border-sand-200 ${activeTab === 'map' ? 'opacity-100 translate-x-0' : 'lg:opacity-100 lg:translate-x-0 opacity-0 translate-x-full pointer-events-none lg:pointer-events-auto'}`}>
            <MapView 
              items={trip.itinerary} 
              activeId={activeItemId} 
              hoveredItemId={hoveredItemId}
              onMarkerClick={(id) => setActiveItemId(id)}
              isVisible={activeTab === 'map' || true} 
            />
            
            {/* Desktop Suggestions Panel (Overlay) */}
            <div className={`hidden lg:block absolute top-4 right-4 bottom-4 w-96 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 transform transition-all duration-500 ease-out z-30 flex flex-col overflow-hidden ${showSuggestionsPanel ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}`}>
               <div className="p-4 border-b border-sand-100 flex items-center justify-between bg-white/50">
                  <h3 className="font-serif font-bold text-lg text-ocean-900 flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-terracotta-500" /> AI Suggestions
                  </h3>
                  <button onClick={() => setShowSuggestionsPanel(false)} className="p-2 hover:bg-sand-100 rounded-full text-sand-500 transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto">
                 <AISuggestionsView destination={trip.destination} />
               </div>
            </div>
        </div>

        {/* Mobile Suggestions Tab */}
        <div className={`lg:hidden absolute inset-0 overflow-y-auto bg-cream transition-all duration-300 z-30 ${activeTab === 'ai' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           <AISuggestionsView destination={trip.destination} />
        </div>
      </div>

      {/* --- MODALS --- */}

      {showMagicModal && (
        <div className="fixed inset-0 z-[120] bg-ocean-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl transition-all border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-ocean-900 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-terracotta-500" /> Magic Add
                  </h2>
                  <p className="text-[10px] text-sand-400 font-bold uppercase tracking-widest mt-1">Paste your messy itinerary below</p>
                </div>
                <button onClick={() => { setShowMagicModal(false); setMagicResults([]); setMagicError(null); }} className="p-2 bg-sand-100 rounded-full text-sand-400 hover:text-ocean-900 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {magicResults.length === 0 ? (
                <div className="space-y-4">
                  {magicError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {magicError}
                    </div>
                  )}
                  <textarea 
                     value={magicText}
                     onChange={(e) => setMagicText(e.target.value)}
                     placeholder="Paste anything... 'Dinner at 8pm at Pizza Hut', 'Visiting the Louvre tomorrow morning', or even a whole email from a tour operator."
                     className="w-full h-64 bg-sand-50 notepad-bg border-2 border-sand-200 rounded-3xl p-5 pt-6 text-sm font-medium focus:border-terracotta-500 focus:bg-cream transition-all outline-none resize-none text-ocean-900 placeholder:text-sand-400 shadow-inner"
                   />
                  <button 
                    disabled={!magicText.trim() || isMagicParsing}
                    onClick={handleMagicParse}
                    className="w-full py-4 bg-terracotta-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-terracotta-500/20 disabled:opacity-50 hover:bg-terracotta-600 active:scale-95 transition-all"
                  >
                    {isMagicParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {isMagicParsing ? 'PARSING WITH AI...' : 'MAGICALLY ORGANIZE'}
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
                    {magicResults.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          const next = new Set(selectedMagicIndices);
                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          setSelectedMagicIndices(next);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedMagicIndices.has(idx) ? 'border-terracotta-500 bg-terracotta-50' : 'border-sand-100 bg-sand-50/50 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-terracotta-500 shadow-sm border border-sand-100">
                               {item.type === 'restaurant' ? <Utensils className="w-4 h-4" /> : item.type === 'hotel' ? <Building2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                             </div>
                             <span className="text-[10px] font-black uppercase text-terracotta-400 tracking-wider">{item.type}</span>
                           </div>
                           {selectedMagicIndices.has(idx) ? <CheckCircle2 className="w-5 h-5 text-terracotta-500" /> : <div className="w-5 h-5 rounded-full border-2 border-sand-200" />}
                        </div>
                        <h4 className="font-bold text-ocean-900 leading-tight">{item.title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-sand-500">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {item.location}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-6 flex gap-3">
                    <button onClick={() => setMagicResults([])} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-sand-400 hover:bg-sand-50 rounded-2xl transition-colors">Reset</button>
                    <button 
                      onClick={handleAddMagicResults}
                      disabled={selectedMagicIndices.size === 0}
                      className="flex-[2] py-4 bg-terracotta-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-terracotta-500/20 hover:bg-terracotta-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      ADD {selectedMagicIndices.size} TO TRIP
                    </button>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      {(showQuickAdd || showEditItemModal) && (
        <div className="fixed inset-0 z-[110] bg-ocean-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto shadow-2xl">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-ocean-900">{showEditItemModal ? 'Edit Activity' : 'Quick Add Activity'}</h2>
                <button onClick={() => { setShowQuickAdd(false); setShowEditItemModal(false); setEditingItemId(null); }} className="p-2 bg-sand-100 rounded-full text-sand-400 hover:text-ocean-900 transition-colors"><X className="w-5 h-5" /></button>
             </div>
             <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Activity Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ type: 'attraction', icon: MapPin, label: 'Visit' }, { type: 'restaurant', icon: Utensils, label: 'Food' }, { type: 'hotel', icon: Building2, label: 'Stay' }, { type: 'transport', icon: Bus, label: 'Move' }, { type: 'other', icon: MoreHorizontal, label: 'Other' }].map(item => (
                      <button key={item.type} onClick={() => { setActivityFormData({ ...activityFormData, type: item.type as ActivityType }); setTypeSuggestions([]); }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${activityFormData.type === item.type ? 'border-ocean-600 bg-ocean-50 text-ocean-600' : 'border-sand-100 bg-sand-50 text-sand-500 hover:border-sand-200'}`}>
                        <item.icon className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Title</label><input type="text" value={activityFormData.title} onChange={(e) => setActivityFormData({ ...activityFormData, title: e.target.value })} placeholder="e.g. French Cuisine" className="w-full bg-sand-50 border-2 border-sand-100 rounded-2xl py-3 px-4 font-medium focus:border-ocean-500 focus:outline-none transition-colors text-ocean-900" /></div>
                <div><label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Location</label><input type="text" value={activityFormData.location} onChange={(e) => setActivityFormData({ ...activityFormData, location: e.target.value })} placeholder="e.g. Paris" className="w-full bg-sand-50 border-2 border-sand-100 rounded-2xl py-3 px-4 font-medium focus:border-ocean-500 focus:outline-none transition-colors text-ocean-900" /></div>

                {!showEditItemModal && activityFormData.type && (
                  <div className="pt-1">
                    <button onClick={fetchQuickSuggestions} disabled={isFetchingSuggestions} className="w-full py-3 border-2 border-terracotta-100 bg-terracotta-50/50 rounded-2xl text-xs font-bold text-terracotta-600 flex items-center justify-center gap-2 hover:bg-terracotta-100 transition-all disabled:opacity-50 shadow-sm">
                      {isFetchingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} GET SMART SUGGESTIONS
                    </button>
                  </div>
                )}

                {typeSuggestions.length > 0 && (
                  <div className="bg-terracotta-50/30 border border-terracotta-100 rounded-[24px] p-4 space-y-4 max-h-[300px] overflow-y-auto shadow-inner">
                    <p className="text-[10px] font-black text-terracotta-400 uppercase tracking-widest">Found in {activityFormData.location || trip.destination}</p>
                    <div className="space-y-4">
                      {typeSuggestions.map((s, idx) => (
                        <div key={idx} className="bg-white rounded-3xl border border-sand-100 shadow-sm overflow-hidden hover:border-terracotta-400 hover:shadow-lg transition-all group cursor-pointer flex gap-3 p-3">
                           <div onClick={() => applySuggestion(s)} className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                               <ImageWithFallback src={s.imageUrl} seed={s.title || ''} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => applySuggestion(s)}>
                               <h5 className="text-xs font-black text-ocean-900 truncate">{s.title}</h5>
                               <p className="text-[10px] text-sand-500 mt-0.5 truncate">{s.location}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 {s.rating && <div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /><span className="text-[10px] font-bold text-amber-500">{s.rating}</span></div>}
                                 {s.priceRange && <span className="text-[10px] font-bold text-emerald-600">{s.priceRange}</span>}
                               </div>
                               {s.description && <p className="text-[10px] text-sand-400 mt-1 line-clamp-2">{s.description}</p>}
                            </div>
                            <a 
                              href={s.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.title} ${s.location}`)}`}
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="self-center p-2 text-sand-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-xl transition-colors shrink-0"
                              title="View on Google Maps"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                         </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">Start Time</label><input type="datetime-local" value={activityFormData.startTime} onChange={(e) => setActivityFormData({ ...activityFormData, startTime: e.target.value })} className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-3 px-3 text-xs font-bold text-ocean-700 focus:border-ocean-500 focus:outline-none transition-colors" /></div>
                  <div><label className="text-xs font-bold text-sand-400 uppercase tracking-widest block mb-2">End Time</label><input type="datetime-local" value={activityFormData.endTime || ''} onChange={(e) => setActivityFormData({ ...activityFormData, endTime: e.target.value })} className="w-full bg-sand-50 border-2 border-sand-100 rounded-xl py-3 px-3 text-xs font-bold text-ocean-700 focus:border-ocean-500 focus:outline-none transition-colors" /></div>
                </div>
                <button disabled={!toISODate(activityFormData.startTime)} onClick={executeActivitySave} className="w-full py-4 bg-ocean-600 text-white rounded-2xl font-bold shadow-lg shadow-ocean-500/30 disabled:opacity-50 hover:bg-ocean-700 transition-all active:scale-[0.98]">
                  {showEditItemModal ? <Save className="w-4 h-4 mr-2 inline" /> : <Plus className="w-4 h-4 mr-2 inline" />}
                  {showEditItemModal ? 'Save Changes' : 'Add Activity'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Skeleton Loader Component
const SuggestionSkeleton = () => (
  <div className="bg-white rounded-[2rem] overflow-hidden border border-sand-100">
    <div className="h-48 w-full skeleton" />
    <div className="p-5 space-y-3">
      <div className="h-6 w-3/4 skeleton rounded-lg" />
      <div className="h-4 w-1/2 skeleton rounded-lg" />
      <div className="h-20 skeleton rounded-lg" />
      <div className="h-12 skeleton rounded-xl" />
    </div>
  </div>
);

// Internal AISuggestionsView component
const AISuggestionsView: React.FC<{ destination: string }> = ({ destination }) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const res = await getAIPersonalizedSuggestions(destination, ["Culture", "Food", "Relaxation"]);
      setSuggestions(res);
      setIsLoading(false);
    };
    fetch();
  }, [destination]);

  if (isLoading) return (
    <div className="p-4 pb-20 lg:pb-4 space-y-6">
      <SuggestionSkeleton />
      <SuggestionSkeleton />
      <SuggestionSkeleton />
    </div>
  );

  return (
    <div className="p-4 pb-20 lg:pb-4 space-y-6">
      {suggestions.map((s, idx) => (
        <div key={idx} className="bg-white rounded-[2rem] border border-sand-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
          <div className="h-48 w-full overflow-hidden relative">
            <ImageWithFallback 
              src={s.imageUrl} 
              seed={`${s.title}-${s.location}`}
              alt={s.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="flex items-center gap-2">
                {s.rating && (
                  <div className="flex items-center gap-1 text-[10px] font-black text-white bg-amber-500/90 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm">
                    <Star className="w-3 h-3 fill-white" /> {s.rating.toFixed(1)}
                  </div>
                )}
                {s.priceRange && (
                  <div className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600/90 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm">
                    {s.priceRange}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-5">
            <h4 className="font-black text-ocean-900 text-lg mb-2 leading-tight">{s.title}</h4>
            <div className="flex items-center gap-2 mb-3 text-sand-500">
              <MapPin className="w-3 h-3 text-terracotta-400" />
              <p className="text-[11px] font-bold">{s.location}</p>
            </div>
            <p className="text-sm text-sand-600 leading-relaxed mb-4 line-clamp-3">{s.description}</p>
            <div className="bg-terracotta-50/50 rounded-xl p-3 mb-4 border border-terracotta-100/50">
              <p className="text-[10px] font-black text-terracotta-600 uppercase mb-1 tracking-widest">Why we love it</p>
              <p className="text-xs text-terracotta-800/80 italic leading-relaxed">"{s.reason}"</p>
            </div>
            <a 
              href={s.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.title} ${s.location}`)}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-sand-100 rounded-xl text-xs font-black text-ocean-800 hover:bg-ocean-50 hover:border-ocean-200 transition-all shadow-sm uppercase tracking-widest group-hover:bg-ocean-600 group-hover:text-white group-hover:border-ocean-600"
            >
              <ExternalLink className="w-4 h-4" /> VIEW ON MAPS
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TripDetail;
