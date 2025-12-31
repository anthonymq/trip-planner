import React from 'react';
import { ItineraryItem, ActivityType } from '../types';
import { Plane, Hotel, Utensils, MapPin, Bus, Calendar, MoreHorizontal, Plus, Trash2, Edit3, ArrowRight, Star, ExternalLink } from 'lucide-react';

interface TimelineViewProps {
  items: ItineraryItem[];
  onItemClick: (item: ItineraryItem) => void;
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddAfter?: (afterItem?: ItineraryItem, dateStr?: string) => void;
  activeId?: string;
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
    case 'flight': return 'bg-blue-500';
    case 'hotel': return 'bg-indigo-500';
    case 'restaurant': return 'bg-orange-500';
    case 'attraction': return 'bg-emerald-500';
    case 'transport': return 'bg-slate-500';
    default: return 'bg-slate-400';
  }
};

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TimelineView: React.FC<TimelineViewProps> = ({ items, onItemClick, onEditItem, onDeleteItem, onAddAfter, activeId }) => {
  const sortedItems = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

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
      className="absolute -left-[40px] z-10 w-7 h-7 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all group/add"
      title="Add event here"
    >
      <Plus className="w-4 h-4 transition-transform group-hover/add:rotate-90" />
    </button>
  );

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      {Object.entries(groups).map(([date, dayItems]) => (
        <div key={date} className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{date}</h3>
          </div>
          
          <div className="space-y-8 ml-3 border-l-2 border-slate-100 pl-6 relative">
            <div className="relative h-0">
              <div className="absolute -top-4">
                <AddButton dateStr={dayItems[0].startTime} />
              </div>
            </div>

            {dayItems.map((item) => (
              <React.Fragment key={item.id}>
                <div 
                  onClick={() => onItemClick(item)}
                  className={`group relative p-4 rounded-2xl transition-all cursor-pointer border ${
                    activeId === item.id 
                      ? 'bg-white border-blue-200 shadow-lg scale-[1.02]' 
                      : 'bg-white/50 border-transparent hover:bg-white hover:border-slate-200 shadow-sm'
                  }`}
                >
                  <div className={`absolute -left-[33px] top-6 w-3 h-3 rounded-full border-2 border-white ${getColor(item.type)} transition-transform group-hover:scale-125`} />
                  
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg text-white ${getColor(item.type)}`}>
                        {getIcon(item.type)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
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
                          <span className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
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
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View on Google Maps"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditItem(item); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit activity"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 leading-tight mt-2">{item.title}</h4>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {item.location}
                  </p>
                  {item.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
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
        <div className="text-center py-20 px-6 bg-white/50 border-2 border-dashed border-slate-200 rounded-[32px] animate-in fade-in zoom-in duration-500">
          <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Calendar className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Your itinerary is empty</h3>
          <p className="text-slate-500 text-sm mt-2 mb-8 max-w-xs mx-auto leading-relaxed">
            Ready to start planning? Add your first flight, hotel stay, or sight to see.
          </p>
          <button
            onClick={() => onAddAfter?.()}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 group"
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