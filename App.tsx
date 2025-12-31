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
  Wand2
} from 'lucide-react';
import { Trip, ItineraryItem, ActivityType, AISuggestion } from './types';
import TimelineView from './components/TimelineView';
import MapView from './components/MapView';
import { generateTripItinerary, getAIPersonalizedSuggestions, parseExistingBookings, getTypeSpecificSuggestions, magicParseActivities } from './services/geminiService';

// Fallback component for broken image links
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
  return d.toISOString().slice(0, 16);
};

const toISODate = (inputString?: string) => {
  if (!inputString) return '';
  const d = new Date(inputString);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
};

const App: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'ai'>('timeline');
  const [activeItemId, setActiveItemId] = useState<string | undefined>();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showMagicModal, setShowMagicModal] = useState(false);
  
  const [magicText, setMagicText] = useState('');
  const [isMagicParsing, setIsMagicParsing] = useState(false);
  const [magicResults, setMagicResults] = useState<Partial<ItineraryItem>[]>([]);
  const [selectedMagicIndices, setSelectedMagicIndices] = useState<Set<number>>(new Set());

  const [newDest, setNewDest] = useState('');
  const [newDays, setNewDays] = useState(3);

  const [activityFormData, setActivityFormData] = useState<Partial<ItineraryItem>>({
    title: '',
    location: '',
    type: 'attraction',
    startTime: '',
    endTime: '',
    description: '',
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [typeSuggestions, setTypeSuggestions] = useState<Partial<ItineraryItem & { rating?: number, imageUrl?: string, googleMapsUrl?: string, priceRange?: string }>[]>([]);

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId]);
  const tripHotel = useMemo(() => selectedTrip?.itinerary.find(i => i.type === 'hotel'), [selectedTrip]);

  const handleOpenModal = () => { setShowAddModal(true); setNewDest(''); };

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
  };

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
    if (!magicText.trim() || !selectedTrip) return;
    setIsMagicParsing(true);
    setMagicResults([]);
    setSelectedMagicIndices(new Set());
    try {
      const results = await magicParseActivities(magicText, selectedTrip.destination);
      setMagicResults(results);
      // Default select all
      setSelectedMagicIndices(new Set(results.map((_, i) => i)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsMagicParsing(false);
    }
  };

  const handleAddMagicResults = () => {
    if (!selectedTripId) return;
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

    setTrips(prev => prev.map(t => {
      if (t.id === selectedTripId) {
        const updatedItinerary = [...t.itinerary, ...itemsToAdd].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return { ...t, itinerary: updatedItinerary };
      }
      return t;
    }));

    setShowMagicModal(false);
    setMagicText('');
    setMagicResults([]);
  };

  const fetchQuickSuggestions = async () => {
    if (!selectedTrip?.destination || !activityFormData.type) return;
    setIsFetchingSuggestions(true);
    setTypeSuggestions([]);
    try {
      const suggestions = await getTypeSpecificSuggestions(
        selectedTrip.destination, 
        activityFormData.type as ActivityType,
        {
          title: activityFormData.title,
          location: activityFormData.location || selectedTrip.destination,
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
    if (!selectedTripId) return;
    const isoStart = toISODate(activityFormData.startTime);
    if (!isoStart) return;

    const formattedItem: ItineraryItem = {
      id: editingItemId || Math.random().toString(36).substr(2, 9),
      type: activityFormData.type as ActivityType,
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

    setTrips(prev => prev.map(t => {
      if (t.id === selectedTripId) {
        let newItinerary;
        if (editingItemId) {
          newItinerary = t.itinerary.map(i => i.id === editingItemId ? formattedItem : i);
        } else {
          newItinerary = [...t.itinerary, formattedItem];
        }
        return {
          ...t,
          itinerary: newItinerary.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        };
      }
      return t;
    }));

    setEditingItemId(null);
    setShowQuickAdd(false);
    setShowEditItemModal(false);
  };

  const deleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrips(prev => prev.filter(t => t.id !== id));
    if (selectedTripId === id) setSelectedTripId(null);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative shadow-2xl overflow-hidden">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        {selectedTripId ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedTripId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">{selectedTrip?.destination}</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-wider tracking-widest font-black">PLANNING TRIP</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight italic">WanderList</h1>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col">
        {!selectedTripId ? (
          <div className="p-4 space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200/50">
              <h2 className="text-2xl font-bold leading-tight">Where to next?</h2>
              <button onClick={handleOpenModal} className="mt-6 w-full py-3 bg-white text-blue-700 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-transform active:scale-95">
                <Plus className="w-5 h-5" /> Start New Plan
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {trips.map(trip => (
                <div key={trip.id} onClick={() => setSelectedTripId(trip.id)} className="group relative h-48 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all">
                  <img src={trip.coverImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={trip.destination} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h4 className="text-2xl font-black">{trip.destination}</h4>
                    <p className="text-xs text-white/80 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {trip.itinerary.length} Activities</p>
                  </div>
                  <button onClick={(e) => deleteTrip(trip.id, e)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex p-2 bg-slate-200/50 rounded-2xl mx-4 my-2">
              <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Timeline</button>
              <button onClick={() => setActiveTab('map')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Map</button>
              <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'ai' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Suggestions</button>
            </div>
            
            <div className="px-4 flex gap-2">
              <button onClick={() => setShowMagicModal(true)} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
                <Wand2 className="w-3 h-3" /> Magic AI Add
              </button>
              <button onClick={() => handleOpenQuickAdd()} className="flex-1 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all">
                <Plus className="w-3 h-3" /> Quick Add
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden mt-2">
              <div className={`absolute inset-0 overflow-y-auto transition-opacity duration-300 ${activeTab === 'timeline' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <TimelineView items={selectedTrip?.itinerary || []} activeId={activeItemId} onItemClick={(item) => setActiveItemId(item.id)} onEditItem={(item) => { setEditingItemId(item.id); setActivityFormData({ ...item, startTime: toInputDate(item.startTime), endTime: item.endTime ? toInputDate(item.endTime) : '' }); setShowEditItemModal(true); }} onDeleteItem={(id) => setTrips(prev => prev.map(t => t.id === selectedTripId ? { ...t, itinerary: t.itinerary.filter(i => i.id !== id) } : t))} onAddAfter={handleOpenQuickAdd} />
              </div>
              <div className={`absolute inset-0 p-4 pb-24 transition-opacity duration-300 ${activeTab === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <MapView items={selectedTrip?.itinerary || []} activeId={activeItemId} isVisible={activeTab === 'map'} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto transition-opacity duration-300 ${activeTab === 'ai' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <AISuggestionsView destination={selectedTrip?.destination || ''} />
              </div>
            </div>
          </div>
        )}
      </main>

      {showMagicModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-indigo-600" /> Magic Add
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Paste your messy itinerary below</p>
                </div>
                <button onClick={() => { setShowMagicModal(false); setMagicResults([]); }} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              {magicResults.length === 0 ? (
                <div className="space-y-4">
                  <textarea 
                    value={magicText}
                    onChange={(e) => setMagicText(e.target.value)}
                    placeholder="Paste anything... 'Dinner at 8pm at Pizza Hut', 'Visiting the Louvre tomorrow morning', or even a whole email from a tour operator."
                    className="w-full h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-5 text-sm font-medium focus:border-indigo-500 focus:bg-white transition-all outline-none resize-none"
                  />
                  <button 
                    disabled={!magicText.trim() || isMagicParsing}
                    onClick={handleMagicParse}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50 hover:bg-indigo-700 active:scale-95 transition-all"
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
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedMagicIndices.has(idx) ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                               {item.type === 'restaurant' ? <Utensils className="w-4 h-4" /> : item.type === 'hotel' ? <Building2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                             </div>
                             <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">{item.type}</span>
                           </div>
                           {selectedMagicIndices.has(idx) ? <CheckCircle2 className="w-5 h-5 text-indigo-600" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                        </div>
                        <h4 className="font-bold text-slate-900 leading-tight">{item.title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {item.location}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-6 flex gap-3">
                    <button onClick={() => setMagicResults([])} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl">Reset</button>
                    <button 
                      onClick={handleAddMagicResults}
                      disabled={selectedMagicIndices.size === 0}
                      className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto shadow-2xl">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">{showEditItemModal ? 'Edit Activity' : 'Quick Add Activity'}</h2>
                <button onClick={() => { setShowQuickAdd(false); setShowEditItemModal(false); setEditingItemId(null); }} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
             </div>
             <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Activity Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ type: 'attraction', icon: MapPin, label: 'Visit' }, { type: 'restaurant', icon: Utensils, label: 'Food' }, { type: 'hotel', icon: Building2, label: 'Stay' }, { type: 'transport', icon: Bus, label: 'Move' }, { type: 'other', icon: MoreHorizontal, label: 'Other' }].map(item => (
                      <button key={item.type} onClick={() => { setActivityFormData({ ...activityFormData, type: item.type as ActivityType }); setTypeSuggestions([]); }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${activityFormData.type === item.type ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>
                        <item.icon className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Title</label><input type="text" value={activityFormData.title} onChange={(e) => setActivityFormData({ ...activityFormData, title: e.target.value })} placeholder="e.g. French Cuisine" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 font-medium focus:border-blue-500 focus:outline-none transition-colors" /></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Location</label><input type="text" value={activityFormData.location} onChange={(e) => setActivityFormData({ ...activityFormData, location: e.target.value })} placeholder="e.g. Paris" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 font-medium focus:border-blue-500 focus:outline-none transition-colors" /></div>

                {!showEditItemModal && activityFormData.type && (
                  <div className="pt-1">
                    <button onClick={fetchQuickSuggestions} disabled={isFetchingSuggestions} className="w-full py-3 border-2 border-indigo-100 bg-indigo-50/50 rounded-2xl text-xs font-bold text-indigo-600 flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all disabled:opacity-50 shadow-sm">
                      {isFetchingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} GET SMART SUGGESTIONS
                    </button>
                  </div>
                )}

                {typeSuggestions.length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-[24px] p-4 space-y-4 max-h-[500px] overflow-y-auto shadow-inner">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Found in {activityFormData.location || selectedTrip?.destination}</p>
                    <div className="space-y-5">
                      {typeSuggestions.map((s, idx) => (
                        <div key={idx} onClick={() => applySuggestion(s)} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:border-indigo-400 hover:shadow-lg transition-all group cursor-pointer">
                          <div className="w-full text-left">
                            <div className="h-48 w-full overflow-hidden relative">
                              <ImageWithFallback 
                                src={s.imageUrl} 
                                seed={`${s.title}-${s.location}`}
                                alt={s.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                <div className="flex gap-1.5">
                                  {s.rating && (
                                    <div className="flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-lg shadow-sm border border-amber-400/50">
                                      <Star className="w-3 h-3 fill-white" />
                                      <span className="text-[10px] font-black">{s.rating.toFixed(1)}</span>
                                    </div>
                                  )}
                                  {s.priceRange && (
                                    <div className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-0.5 rounded-lg shadow-sm border border-emerald-500/50">
                                      <span className="text-[10px] font-black">{s.priceRange}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <h5 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{s.title}</h5>
                              <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1.5 line-clamp-1">
                                <MapPin className="w-3 h-3 text-indigo-300 shrink-0" /> {s.location}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Start Time</label><input type="datetime-local" value={activityFormData.startTime} onChange={(e) => setActivityFormData({ ...activityFormData, startTime: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-3 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none transition-colors" /></div>
                  <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">End Time</label><input type="datetime-local" value={activityFormData.endTime || ''} onChange={(e) => setActivityFormData({ ...activityFormData, endTime: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-3 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none transition-colors" /></div>
                </div>
                <button disabled={!toISODate(activityFormData.startTime)} onClick={executeActivitySave} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 hover:bg-blue-700 transition-all active:scale-[0.98]">
                  {showEditItemModal ? <Save className="w-4 h-4 mr-2 inline" /> : <Plus className="w-4 h-4 mr-2 inline" />}
                  {showEditItemModal ? 'Save Changes' : 'Add Activity'}
                </button>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md animate-in zoom-in duration-300 shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-bold mb-4 font-black">Start New Trip</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 ml-1">Destination</label>
                <input type="text" placeholder="e.g. Tokyo" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium focus:border-blue-600 outline-none transition-all" value={newDest} onChange={e => setNewDest(e.target.value)} />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all font-black text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={handleAddTrip} disabled={!newDest.trim()} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95">Create Trip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
    <div className="flex flex-col items-center justify-center h-64 p-8">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      <p className="text-slate-500 text-sm mt-4 font-medium">Curating unique experiences...</p>
    </div>
  );

  return (
    <div className="p-4 pb-20 overflow-y-auto h-full space-y-6">
      {suggestions.map((s, idx) => (
        <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <div className="h-56 w-full overflow-hidden relative">
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
            <h4 className="font-black text-slate-900 text-lg mb-2">{s.title}</h4>
            <div className="flex items-center gap-2 mb-3 text-slate-500">
              <MapPin className="w-3 h-3 text-indigo-400" />
              <p className="text-[11px] font-bold">{s.location}</p>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{s.description}</p>
            <div className="bg-indigo-50 rounded-xl p-3 mb-4 border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 tracking-widest">Why we love it</p>
              <p className="text-xs text-slate-600 italic leading-relaxed">"{s.reason}"</p>
            </div>
            {s.googleMapsUrl && (
              <a href={s.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm uppercase tracking-widest">
                <ExternalLink className="w-4 h-4" /> VIEW ON MAPS
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;