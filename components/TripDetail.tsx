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
  PanelRightClose,
  RefreshCw,
  ClipboardList
} from 'lucide-react';
import { Trip, ItineraryItem, ActivityType, AISuggestion, ChecklistItem } from '../types';
import TimelineView from './TimelineView';
import MapView from './MapView';
import ChecklistView from './ChecklistView';
import ActivityForm from './ActivityForm';
import ErrorBoundary from './ErrorBoundary';
import { getAIPersonalizedSuggestions, magicParseActivities } from '../services/geminiService';

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
  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'ai' | 'checklist'>('timeline');
  const [activeItemId, setActiveItemId] = useState<string | undefined>();
  const [hoveredItemId, setHoveredItemId] = useState<string | undefined>();
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [showChecklistPanel, setShowChecklistPanel] = useState(false);
  
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
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);

  const tripHotel = useMemo(() => trip.itinerary.find(i => i.type === 'hotel'), [trip]);

  // --- Handlers ---

  const handleRefreshSuggestions = async () => {
    setIsRefreshingSuggestions(true);
    try {
      const newSuggestions = await getAIPersonalizedSuggestions(trip.destination, ["Culture", "Food", "Relaxation"]);
      onUpdateTrip({ ...trip, suggestions: newSuggestions });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingSuggestions(false);
    }
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

  const executeActivitySave = (data?: Partial<ItineraryItem>) => {
    const dataToSave = data || activityFormData;
    const isoStart = toISODate(dataToSave.startTime);
    if (!isoStart) return;

    const formattedItem: ItineraryItem = {
      id: editingItemId || Math.random().toString(36).substr(2, 9),
      type: (dataToSave.type as ActivityType) || 'attraction',
      title: dataToSave.title || 'Activity',
      location: dataToSave.location || 'Location',
      startTime: isoStart,
      endTime: toISODate(dataToSave.endTime) || undefined,
      description: dataToSave.description,
      lat: dataToSave.lat || 0,
      lng: dataToSave.lng || 0,
      imageUrl: dataToSave.imageUrl,
      rating: dataToSave.rating,
      priceRange: dataToSave.priceRange,
      googleMapsUrl: dataToSave.googleMapsUrl
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
    <div className="flex-1 flex flex-col h-full bg-cream dark:bg-slate-900 relative transition-colors duration-300">
      {/* Mobile Tab Navigation */}
      <div className="lg:hidden px-4 py-2 bg-cream dark:bg-slate-900 sticky top-0 z-40 border-b border-sand-200 dark:border-slate-700">
        <div className="flex p-1.5 bg-sand-200/50 dark:bg-slate-800 rounded-xl mb-3">
          <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-ocean-600 dark:text-ocean-400' : 'text-sand-500 dark:text-slate-400'}`}>Timeline</button>
          <button onClick={() => setActiveTab('map')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-ocean-600 dark:text-ocean-400' : 'text-sand-500 dark:text-slate-400'}`}>Map</button>
          <button onClick={() => setActiveTab('checklist')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'checklist' ? 'bg-white dark:bg-slate-700 shadow-sm text-ocean-600 dark:text-ocean-400' : 'text-sand-500 dark:text-slate-400'}`}>Checklist</button>
          <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ai' ? 'bg-white dark:bg-slate-700 shadow-sm text-terracotta-600 dark:text-terracotta-400' : 'text-sand-500 dark:text-slate-400'}`}>Ideas</button>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setShowMagicModal(true)} className="flex-1 py-3 bg-terracotta-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-terracotta-600 active:scale-95 transition-all">
            <Wand2 className="w-3 h-3" /> Magic Add
          </button>
          <button onClick={() => handleOpenQuickAdd()} className="flex-1 py-3 bg-white dark:bg-slate-800 text-ocean-800 dark:text-sand-100 border border-sand-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sand-50 dark:hover:bg-slate-700 active:scale-95 transition-all">
            <Plus className="w-3 h-3" /> Quick Add
          </button>
        </div>
      </div>

      {/* Desktop Controls (Header Actions) */}
      <div className="hidden lg:flex absolute top-[-3.5rem] right-4 gap-3 z-50">
        <button onClick={() => setShowMagicModal(true)} className="py-2.5 px-4 bg-terracotta-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-terracotta-500/20 hover:bg-terracotta-600 active:scale-95 transition-all">
           <Wand2 className="w-3 h-3" /> Magic Add
        </button>
        <button onClick={() => handleOpenQuickAdd()} className="py-2.5 px-4 bg-white dark:bg-slate-800 text-ocean-800 dark:text-sand-100 border border-sand-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sand-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm">
           <Plus className="w-3 h-3" /> Quick Add
        </button>
        <button onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)} className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${showSuggestionsPanel ? 'bg-terracotta-100 dark:bg-terracotta-900/30 text-terracotta-600 dark:text-terracotta-400 border-terracotta-200 dark:border-terracotta-700' : 'bg-white dark:bg-slate-800 text-ocean-600 dark:text-ocean-400 border-sand-200 dark:border-slate-600 hover:bg-sand-50 dark:hover:bg-slate-700'}`}>
           <Sparkles className="w-3 h-3" /> Suggestions
        </button>
        <button onClick={() => setShowChecklistPanel(!showChecklistPanel)} className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${showChecklistPanel ? 'bg-ocean-100 dark:bg-ocean-900/30 text-ocean-600 dark:text-ocean-400 border-ocean-200 dark:border-ocean-700' : 'bg-white dark:bg-slate-800 text-ocean-600 dark:text-ocean-400 border-sand-200 dark:border-slate-600 hover:bg-sand-50 dark:hover:bg-slate-700'}`}>
           <ClipboardList className="w-3 h-3" /> Checklist
        </button>
      </div>

      {/* Main Content Area - Split View */}
      <div className="flex-1 relative overflow-hidden lg:grid lg:grid-cols-[2fr_3fr]">
        
        {/* Timeline Column */}
        <div className={`absolute inset-0 lg:static lg:h-full bg-cream dark:bg-slate-900 transition-all duration-300 z-10 flex flex-col ${activeTab === 'timeline' ? 'opacity-100 translate-x-0' : 'lg:opacity-100 lg:translate-x-0 opacity-0 -translate-x-full pointer-events-none lg:pointer-events-auto'}`}>
           
           {/* Inline Quick Add Panel */}
           <div className={`transition-all duration-500 ease-in-out overflow-hidden bg-white dark:bg-slate-800 border-b border-sand-200 dark:border-slate-700 shadow-xl z-20 ${showQuickAdd ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6 bg-cream/50 dark:bg-slate-900/50">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-serif font-bold text-lg text-ocean-900 dark:text-sand-100 flex items-center gap-2">
                       <Plus className="w-4 h-4 text-terracotta-500" /> Quick Add
                    </h3>
                    <button onClick={() => setShowQuickAdd(false)} className="p-2 hover:bg-sand-100 dark:hover:bg-slate-700 rounded-full text-sand-400 dark:text-slate-500 transition-colors">
                       <X className="w-4 h-4" />
                    </button>
                 </div>
                 <ErrorBoundary fallback={
                   <div className="p-6 text-center bg-sand-50 dark:bg-slate-800 rounded-2xl border border-sand-200 dark:border-slate-600">
                      <div className="w-12 h-12 bg-terracotta-100 dark:bg-terracotta-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-terracotta-600 dark:text-terracotta-400">
                          <AlertCircle className="w-6 h-6" />
                      </div>
                      <p className="text-ocean-900 dark:text-sand-100 font-bold mb-1">Could not load form</p>
                      <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-white dark:bg-slate-700 border border-sand-200 dark:border-slate-600 rounded-lg text-xs font-bold text-ocean-700 dark:text-sand-200 hover:bg-sand-50 dark:hover:bg-slate-600">Reload</button>
                   </div>
                 }>
                   <ActivityForm 
                      initialData={activityFormData}
                      tripDestination={trip.destination}
                      onSubmit={(data) => {
                         setActivityFormData(data); 
                         executeActivitySave(data); 
                      }}
                      onCancel={() => setShowQuickAdd(false)}
                   />
                 </ErrorBoundary>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto">
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
        </div>

        {/* Map Column */}
        <div className={`absolute inset-0 lg:sticky lg:top-0 lg:h-[calc(100vh-5rem)] transition-all duration-300 z-20 bg-sand-100 dark:bg-slate-800 lg:border-l lg:border-sand-200 dark:lg:border-slate-700 ${activeTab === 'map' ? 'opacity-100 translate-x-0' : 'lg:opacity-100 lg:translate-x-0 opacity-0 translate-x-full pointer-events-none lg:pointer-events-auto'}`}>
            <MapView 
              items={trip.itinerary} 
              activeId={activeItemId} 
              hoveredItemId={hoveredItemId}
              onMarkerClick={(id) => setActiveItemId(id)}
              isVisible={activeTab === 'map' || true} 
            />
            
            {/* Desktop Suggestions Panel (Overlay) */}
            <div className={`hidden lg:block absolute top-4 right-4 bottom-4 w-96 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-700 transform transition-all duration-500 ease-out z-30 flex flex-col overflow-hidden ${showSuggestionsPanel ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}`}>
               <div className="p-4 border-b border-sand-100 dark:border-slate-700 flex items-center justify-between bg-white/50 dark:bg-slate-800/50">
                  <h3 className="font-serif font-bold text-lg text-ocean-900 dark:text-sand-100 flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-terracotta-500" /> AI Suggestions
                  </h3>
                  <button onClick={() => setShowSuggestionsPanel(false)} className="p-2 hover:bg-sand-100 dark:hover:bg-slate-700 rounded-full text-sand-500 dark:text-slate-400 transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto">
                 <AISuggestionsView 
                   destination={trip.destination} 
                   suggestions={trip.suggestions || []} 
                   isLoading={isRefreshingSuggestions} 
                   onRefresh={handleRefreshSuggestions} 
                 />
</div>
             </div>

             {/* Desktop Checklist Panel (Overlay) */}
             <div className={`hidden lg:flex absolute top-4 left-4 bottom-4 w-96 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-700 transform transition-all duration-500 ease-out z-30 flex-col overflow-hidden ${showChecklistPanel ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0'}`}>
               <div className="p-4 border-b border-sand-100 dark:border-slate-700 flex items-center justify-between bg-white/50 dark:bg-slate-800/50">
                  <h3 className="font-serif font-bold text-lg text-ocean-900 dark:text-sand-100 flex items-center gap-2">
                     <ClipboardList className="w-4 h-4 text-ocean-500" /> Packing Checklist
                  </h3>
                  <button onClick={() => setShowChecklistPanel(false)} className="p-2 hover:bg-sand-100 dark:hover:bg-slate-700 rounded-full text-sand-500 dark:text-slate-400 transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto">
                 <ChecklistView 
                   items={trip.checklist || []} 
                   onUpdateItems={(items) => onUpdateTrip({ ...trip, checklist: items })} 
                 />
               </div>
            </div>
        </div>

        {/* Mobile Checklist Tab */}
        <div className={`lg:hidden absolute inset-0 overflow-y-auto bg-cream dark:bg-slate-900 transition-all duration-300 z-30 ${activeTab === 'checklist' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           <ChecklistView 
             items={trip.checklist || []} 
             onUpdateItems={(items) => onUpdateTrip({ ...trip, checklist: items })} 
           />
        </div>

        {/* Mobile Suggestions Tab */}
        <div className={`lg:hidden absolute inset-0 overflow-y-auto bg-cream dark:bg-slate-900 transition-all duration-300 z-30 ${activeTab === 'ai' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           <AISuggestionsView 
             destination={trip.destination} 
             suggestions={trip.suggestions || []} 
             isLoading={isRefreshingSuggestions} 
             onRefresh={handleRefreshSuggestions} 
           />
        </div>
      </div>

      {/* --- MODALS --- */}

      {showMagicModal && (
        <div className="fixed inset-0 z-[120] bg-ocean-900/60 dark:bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl transition-all border border-white/20 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-ocean-900 dark:text-sand-100 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-terracotta-500" /> Magic Add
                  </h2>
                  <p className="text-[10px] text-sand-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Paste your messy itinerary below</p>
                </div>
                <button onClick={() => { setShowMagicModal(false); setMagicResults([]); setMagicError(null); }} className="p-2 bg-sand-100 dark:bg-slate-700 rounded-full text-sand-400 dark:text-slate-400 hover:text-ocean-900 dark:hover:text-sand-100 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {magicResults.length === 0 ? (
                <div className="space-y-4">
                  {magicError && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold border border-red-100 dark:border-red-800 flex items-center gap-2 animate-in slide-in-from-top-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {magicError}
                    </div>
                  )}
                  <textarea 
                     value={magicText}
                     onChange={(e) => setMagicText(e.target.value)}
                     placeholder="Paste anything... 'Dinner at 8pm at Pizza Hut', 'Visiting the Louvre tomorrow morning', or even a whole email from a tour operator."
                     className="w-full h-64 bg-sand-50 dark:bg-slate-700 notepad-bg border-2 border-sand-200 dark:border-slate-600 rounded-3xl p-5 pt-6 text-sm font-medium focus:border-terracotta-500 focus:bg-cream dark:focus:bg-slate-600 transition-all outline-none resize-none text-ocean-900 dark:text-sand-100 placeholder:text-sand-400 dark:placeholder:text-slate-500 shadow-inner"
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
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedMagicIndices.has(idx) ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/30' : 'border-sand-100 dark:border-slate-600 bg-sand-50/50 dark:bg-slate-700/50 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center text-terracotta-500 shadow-sm border border-sand-100 dark:border-slate-500">
                               {item.type === 'restaurant' ? <Utensils className="w-4 h-4" /> : item.type === 'hotel' ? <Building2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                             </div>
                             <span className="text-[10px] font-black uppercase text-terracotta-400 tracking-wider">{item.type}</span>
                           </div>
                           {selectedMagicIndices.has(idx) ? <CheckCircle2 className="w-5 h-5 text-terracotta-500" /> : <div className="w-5 h-5 rounded-full border-2 border-sand-200 dark:border-slate-500" />}
                        </div>
                        <h4 className="font-bold text-ocean-900 dark:text-sand-100 leading-tight">{item.title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-sand-500 dark:text-slate-400">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {item.location}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-6 flex gap-3">
                    <button onClick={() => setMagicResults([])} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-sand-400 dark:text-slate-500 hover:bg-sand-50 dark:hover:bg-slate-700 rounded-2xl transition-colors">Reset</button>
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

      {showEditItemModal && (
        <div className="fixed inset-0 z-[110] bg-ocean-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto shadow-2xl">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-ocean-900 dark:text-sand-100">Edit Activity</h2>
                <button onClick={() => { setShowEditItemModal(false); setEditingItemId(null); }} className="p-2 bg-sand-100 dark:bg-slate-700 rounded-full text-sand-400 dark:text-slate-400 hover:text-ocean-900 dark:hover:text-sand-100 transition-colors"><X className="w-5 h-5" /></button>
             </div>
             <ErrorBoundary fallback={
               <div className="p-6 text-center bg-sand-50 dark:bg-slate-700 rounded-2xl border border-sand-200 dark:border-slate-600">
                  <div className="w-12 h-12 bg-terracotta-100 dark:bg-terracotta-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-terracotta-600 dark:text-terracotta-400">
                      <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-ocean-900 dark:text-sand-100 font-bold mb-1">Could not load form</p>
                  <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-white dark:bg-slate-600 border border-sand-200 dark:border-slate-500 rounded-lg text-xs font-bold text-ocean-700 dark:text-sand-200 hover:bg-sand-50 dark:hover:bg-slate-500">Reload</button>
               </div>
             }>
               <ActivityForm 
                  initialData={activityFormData}
                  tripDestination={trip.destination}
                  isEditing={true}
                  onSubmit={(data) => {
                     setActivityFormData(data);
                     executeActivitySave(data);
                  }}
                  onCancel={() => { setShowEditItemModal(false); setEditingItemId(null); }}
               />
             </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
};

// Skeleton Loader Component
const SuggestionSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden border border-sand-100 dark:border-slate-700">
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
interface AISuggestionsViewProps {
  destination: string;
  suggestions: AISuggestion[];
  isLoading: boolean;
  onRefresh: () => void;
}

const AISuggestionsView: React.FC<AISuggestionsViewProps> = ({ destination, suggestions, isLoading, onRefresh }) => {
  if (isLoading && suggestions.length === 0) return (
    <div className="p-4 pb-20 lg:pb-4 space-y-6">
      <SuggestionSkeleton />
      <SuggestionSkeleton />
      <SuggestionSkeleton />
    </div>
  );

  return (
    <div className="p-4 pb-20 lg:pb-4 space-y-6">
      <div className="flex justify-between items-center px-2">
        <p className="text-[10px] font-black text-sand-400 dark:text-slate-500 uppercase tracking-widest">
          {suggestions.length} Ideas for {destination}
        </p>
        <button 
          onClick={onRefresh}
          disabled={isLoading} 
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-sand-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-ocean-600 dark:text-ocean-400 hover:bg-sand-50 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {suggestions.length === 0 && !isLoading && (
        <div className="text-center py-12 px-6">
          <Sparkles className="w-12 h-12 text-sand-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-sand-500 dark:text-slate-400 font-medium">No suggestions yet.</p>
          <button 
            onClick={onRefresh}
            className="mt-4 px-6 py-3 bg-terracotta-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-terracotta-600 transition-colors"
          >
            Get AI Ideas
          </button>
        </div>
      )}

      {suggestions.map((s, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-800 rounded-[2rem] border border-sand-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
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
            <h4 className="font-black text-ocean-900 dark:text-sand-100 text-lg mb-2 leading-tight">{s.title}</h4>
            <div className="flex items-center gap-2 mb-3 text-sand-500 dark:text-slate-400">
              <MapPin className="w-3 h-3 text-terracotta-400" />
              <p className="text-[11px] font-bold">{s.location}</p>
            </div>
            <p className="text-sm text-sand-600 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3">{s.description}</p>
            <div className="bg-terracotta-50/50 dark:bg-terracotta-900/20 rounded-xl p-3 mb-4 border border-terracotta-100/50 dark:border-terracotta-800/30">
              <p className="text-[10px] font-black text-terracotta-600 dark:text-terracotta-400 uppercase mb-1 tracking-widest">Why we love it</p>
              <p className="text-xs text-terracotta-800/80 dark:text-terracotta-300/80 italic leading-relaxed">"{s.reason}"</p>
            </div>
            <a 
              href={s.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.title} ${s.location}`)}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-700 border-2 border-sand-100 dark:border-slate-600 rounded-xl text-xs font-black text-ocean-800 dark:text-sand-200 hover:bg-ocean-50 dark:hover:bg-slate-600 hover:border-ocean-200 dark:hover:border-ocean-700 transition-all shadow-sm uppercase tracking-widest group-hover:bg-ocean-600 group-hover:text-white group-hover:border-ocean-600"
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
