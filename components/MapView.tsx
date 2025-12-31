
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { Plane, Hotel, Utensils, MapPin, Bus, MoreHorizontal } from 'lucide-react';
import { ItineraryItem, ActivityType } from '../types';
// Add missing Map icon import
import { Map as MapIcon } from 'lucide-react';

// Fix for default Leaflet icon paths
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  items: ItineraryItem[];
  activeId?: string;
  isVisible?: boolean;
  hoveredItemId?: string;
  onMarkerClick?: (id: string) => void;
}

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

const getIconSvg = (type: ActivityType) => {
  const props = { className: "w-4 h-4" };
  let icon;
  switch (type) {
    case 'flight': icon = <Plane {...props} />; break;
    case 'hotel': icon = <Hotel {...props} />; break;
    case 'restaurant': icon = <Utensils {...props} />; break;
    case 'attraction': icon = <MapPin {...props} />; break;
    case 'transport': icon = <Bus {...props} />; break;
    default: icon = <MoreHorizontal {...props} />; break;
  }
  return renderToStaticMarkup(icon);
};

const MapView: React.FC<MapViewProps> = ({ items, activeId, isVisible, hoveredItemId, onMarkerClick }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const pathLayerRef = useRef<L.LayerGroup | null>(null);

  // Helper to calculate bearing between two points for arrow rotation
  const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const y = Math.sin(dLng) * Math.cos(lat2 * (Math.PI / 180));
    const x = Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
              Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLng);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
  };

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialLat = items.length > 0 ? items[0].lat : 0;
    const initialLng = items.length > 0 ? items[0].lng : 0;
    const initialZoom = items.length > 0 ? 12 : 2;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
    }).setView([initialLat, initialLng], initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    // Create a layer group for the travel path
    pathLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers, Path, and Bounds
  useEffect(() => {
    if (!mapRef.current || !pathLayerRef.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    
    // Clear existing path
    pathLayerRef.current.clearLayers();

    if (items.length === 0) return;

    // Sort items chronologically for the path
    const sortedItems = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const bounds = L.latLngBounds([]);
    const pathCoords: L.LatLngExpression[] = [];

    // 1. Draw Markers
    items.forEach(item => {
      if (item.lat === 0 && item.lng === 0) return;
      
      const isHovered = item.id === hoveredItemId;
      const type = item.type;
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${isHovered ? 'scale-125 bg-ocean-500 ring-4 ring-white' : getColor(type)} text-white border-2 border-white">
          ${getIconSvg(type)}
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const marker = L.marker([item.lat, item.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; min-width: 120px;">
            <strong style="display: block; margin-bottom: 2px; color: #1e293b;">${item.title}</strong>
            <span style="color: #64748b; font-size: 11px;">${item.location}</span>
          </div>
        `);
      
      marker.on('click', () => {
        onMarkerClick?.(item.id);
      });

      markersRef.current[item.id] = marker;
      bounds.extend([item.lat, item.lng]);

      if (item.id === activeId) {
        marker.openPopup();
      }
    });

    // 2. Draw Chronological Path with Arrows
    sortedItems.forEach((item, index) => {
      if (item.lat === 0 && item.lng === 0) return;
      pathCoords.push([item.lat, item.lng]);

      // If there's a next item, draw a segment and an arrow
      if (index < sortedItems.length - 1) {
        const next = sortedItems[index + 1];
        if (next.lat === 0 && next.lng === 0) return;

        // Draw segment
        const segment = L.polyline([[item.lat, item.lng], [next.lat, next.lng]], {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.6,
          dashArray: '8, 8'
        }).addTo(pathLayerRef.current!);

        // Calculate midpoint for the arrow using projection to match the line exactly
        const p1 = mapRef.current!.project([item.lat, item.lng]);
        const p2 = mapRef.current!.project([next.lat, next.lng]);
        const midPoint = p1.add(p2).divideBy(2);
        const midLatLng = mapRef.current!.unproject(midPoint);
        const midLat = midLatLng.lat;
        const midLng = midLatLng.lng;
        const bearing = getBearing(item.lat, item.lng, next.lat, next.lng);

        // Add directional arrow using a divIcon
        const arrowIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="transform: rotate(${bearing - 90}deg); display: flex; align-items: center; justify-content: center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        L.marker([midLat, midLng], { icon: arrowIcon, interactive: false })
          .addTo(pathLayerRef.current!);
      }
    });

    if (items.length > 0 && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [items]);

  // Handle Hover Item Selection
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Update all markers to reflect hover state
    // We do this by updating the icon of each marker
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const isHovered = id === hoveredItemId;
      const item = items.find(i => i.id === id);
      if (!item) return;

      const type = item.type;
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 ${isHovered ? 'scale-125 bg-ocean-500 ring-4 ring-white z-[1000]' : getColor(type)} text-white border-2 border-white">
          ${getIconSvg(type)}
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      marker.setIcon(icon);
      marker.setZIndexOffset(isHovered ? 1000 : 0);

      if (isHovered && mapRef.current) {
         mapRef.current.panTo(marker.getLatLng(), { animate: true, duration: 0.5 });
      }
    });

  }, [hoveredItemId, items]);

  // Handle Active Item Selection
  useEffect(() => {
    if (activeId && markersRef.current[activeId] && mapRef.current) {
      const marker = markersRef.current[activeId];
      mapRef.current.setView(marker.getLatLng(), 15);
      marker.openPopup();
    }
  }, [activeId]);

  // CRITICAL: Handle visibility changes (Tab Switching)
  useEffect(() => {
    if (isVisible && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [isVisible]);

  return (
    <div className="h-full w-full relative rounded-2xl overflow-hidden shadow-inner bg-sand-100 border border-sand-200">
      <div ref={containerRef} className="h-full w-full outline-none" style={{ minHeight: '300px' }} />
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream/80 backdrop-blur-sm z-[1000] pointer-events-none">
          <div className="text-center p-6">
            <svg viewBox="0 0 120 120" className="w-20 h-20 mx-auto mb-4 text-sand-300">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4"/>
              <path d="M60 20 L60 100 M20 60 L100 60" stroke="currentColor" strokeWidth="2"/>
              <polygon points="60,25 55,45 65,45" fill="#eb6b42"/>
              <polygon points="60,95 55,75 65,75" fill="currentColor"/>
              <circle cx="60" cy="60" r="6" fill="currentColor"/>
            </svg>
            <p className="text-ocean-800 font-bold text-lg">No locations yet</p>
            <p className="text-sand-500 text-sm mt-1">Add items to your itinerary to see the route.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
