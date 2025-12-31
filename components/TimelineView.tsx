import React, { useEffect, useRef } from 'react';
import { ItineraryItem, ActivityType } from '../types';
import { Plane, Hotel, Utensils, MapPin, Bus, Calendar, MoreHorizontal, Plus, Trash2, Edit3, ArrowRight, Star, ExternalLink } from 'lucide-react';

interface TimelineViewProps {
  items: ItineraryItem[];
  onItemClick: (item: ItineraryItem) => void;
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddAfter?: (afterItem?: ItineraryItem, dateStr?: string) => void;
  activeId?: string;
  hoveredItemId?: string;
  onItemHover?: (id: string | undefined) => void;
}

const getIcon = (type: ActivityType) => {
  switch (type) {
    case 'flight': return <Plane className="w-5 h-5" />;
    case 'hotel': return <Hotel className="w-5 h-5" />;
    case 'restaurant': return <Utensils className="w-5 h-5" />;
    case 'attraction': return <MapPin className="w-5 h-5" />;
    case 'transport': return <Bus className="w-5 h-5" />;
    default: return <MoreHorizontal className="w-5 h-5" />;
  }
};

const getColor = (type: ActivityType) => {
  switch (type) {
    case 'flight': return 'bg-ocean-500';
    case 'hotel': return 'bg-terracotta-500';
    case 'restaurant': return 'bg-amber-500';
    case 'attraction': return 'bg-emerald-500';
    case 'transport': return 'bg-sand-500';
    default: return 'bg-sand-400';
  }
};

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TimelineView: React.FC<TimelineViewProps> = ({ items, onItemClick, onEditItem, onDeleteItem, onAddAfter, activeId, hoveredItemId, onItemHover }) => {
  const sortedItems = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to active item
  useEffect(() => {
    if (activeId && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-item-id="${activeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeId]);

  // Group by date
  const groups: Record<string, ItineraryItem[]> = {};
  sortedItems.forEach(item => {
    const date = new Date(item.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
  });

  const AddButton = ({ item, dateStr }: { item?: ItineraryItem, dateStr?: string }) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onAddAfter?.(item, dateStr);
      }}
      className="absolute -left-[40px] z-10 w-7 h-7 bg-white border-2 border-sand-100 rounded-full flex items-center justify-center text-sand-400 hover:text-ocean-600 hover:border-ocean-200 hover:shadow-md transition-all group/add"
      title="Add event here"
    >
      <Plus className="w-4 h-4 transition-transform group-hover/add:rotate-90" />
    </button>
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-6 p-4 pb-24">
      {Object.entries(groups).map(([date, dayItems]) => (
        <div key={date} className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-sand-400" />
            <h3 className="font-bold text-ocean-900 text-sm uppercase tracking-wider">{date}</h3>
          </div>
          
          <div className="space-y-8 ml-3 border-l-2 border-sand-200 pl-6 relative">
            <div className="relative h-0">
              <div className="absolute -top-4">
                <AddButton dateStr={dayItems[0].startTime} />
              </div>
            </div>

            {dayItems.map((item) => (
              <React.Fragment key={item.id}>
                <div 
                  data-item-id={item.id}
                  onClick={() => onItemClick(item)}
                  onMouseEnter={() => onItemHover?.(item.id)}
                  onMouseLeave={() => onItemHover?.(undefined)}
                  className={`group relative p-4 rounded-2xl transition-all cursor-pointer border ${
                    activeId === item.id 
                      ? 'bg-white border-ocean-200 shadow-lg scale-[1.02]' 
                      : hoveredItemId === item.id
                        ? 'bg-white border-ocean-300 shadow-md ring-2 ring-ocean-100'
                        : 'bg-white/50 border-transparent hover:bg-white hover:border-sand-200 shadow-sm'
                  }`}
                >
                  <div className={`absolute -left-[33px] top-6 w-3 h-3 rounded-full border-2 border-white ${getColor(item.type)} transition-transform ${hoveredItemId === item.id ? 'scale-150' : 'group-hover:scale-125'}`} />
                  
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg text-white ${getColor(item.type)}`}>
                        {getIcon(item.type)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ocean-900">
                            {formatTime(item.startTime)}
                          </span>
                          {item.rating && (
                            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              <span className="text-[9px] font-black text-amber-700">{item.rating.toFixed(1)}</span>
                            </div>
                          )}
                          {item.priceRange && (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                              {item.priceRange}
                            </span>
                          )}
                        </div>
                        {item.endTime && (
                          <span className="text-sand-400 text-[10px] font-medium flex items-center gap-1">
                            <ArrowRight className="w-2.5 h-2.5" /> {formatTime(item.endTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.googleMapsUrl && (
                        <a 
                          href={item.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-sand-400 hover:text-terracotta-600 hover:bg-terracotta-50 rounded-lg transition-colors"
                          title="View on Google Maps"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditItem(item); }}
                        className="p-1.5 text-sand-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors"
                        title="Edit activity"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                        className="p-1.5 text-sand-400 hover:text-terracotta-600 hover:bg-terracotta-50 rounded-lg transition-colors"
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-ocean-900 leading-tight mt-2">{item.title}</h4>
                  <p className="text-sm text-sand-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {item.location}
                  </p>
                  {item.description && (
                    <p className="text-xs text-sand-400 mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="relative h-0">
                   <div className="absolute -top-4">
                      <AddButton item={item} />
                   </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-20 px-6 bg-white/50 border-2 border-dashed border-sand-200 rounded-[32px] animate-in fade-in zoom-in duration-500">
          <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto mb-6 text-sand-300">
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4"/>
            <path d="M60 20 L60 100 M20 60 L100 60" stroke="currentColor" strokeWidth="2"/>
            <polygon points="60,25 55,45 65,45" fill="#eb6b42"/>
            <polygon points="60,95 55,75 65,75" fill="currentColor"/>
            <circle cx="60" cy="60" r="6" fill="currentColor"/>
          </svg>
          <h3 className="text-2xl font-serif font-bold text-ocean-900">Your adventure awaits</h3>
          <p className="text-sand-500 text-sm mt-2 mb-8 max-w-xs mx-auto leading-relaxed">
            Start by adding your first destination, flight, or activity with the Magic AI button above.
          </p>
          <button
            onClick={() => onAddAfter?.()}
            className="inline-flex items-center gap-2 px-8 py-4 bg-ocean-600 text-white rounded-2xl font-bold shadow-lg shadow-ocean-500/30 hover:bg-ocean-700 transition-all active:scale-95 group"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            Plan an Activity
          </button>
        </div>
      )}
    </div>
  );
};

export default TimelineView;