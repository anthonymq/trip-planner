
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ItineraryItem } from '../types';
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
}

const MapView: React.FC<MapViewProps> = ({ items, activeId, isVisible }) => {
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
      
      const marker = L.marker([item.lat, item.lng])
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; min-width: 120px;">
            <strong style="display: block; margin-bottom: 2px; color: #1e293b;">${item.title}</strong>
            <span style="color: #64748b; font-size: 11px;">${item.location}</span>
          </div>
        `);
      
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

        // Calculate midpoint for the arrow
        const midLat = (item.lat + next.lat) / 2;
        const midLng = (item.lng + next.lng) / 2;
        const bearing = getBearing(item.lat, item.lng, next.lat, next.lng);

        // Add directional arrow using a divIcon
        const arrowIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="transform: rotate(${bearing}deg); display: flex; align-items: center; justify-content: center;">
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
    <div className="h-full w-full relative rounded-2xl overflow-hidden shadow-inner bg-slate-100 border border-slate-200">
      <div ref={containerRef} className="h-full w-full outline-none" style={{ minHeight: '300px' }} />
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-[1000] pointer-events-none">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-bold">No locations to display</p>
            <p className="text-slate-400 text-xs mt-1">Add items to your itinerary to see the route.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
