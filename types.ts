
export type ActivityType = 'flight' | 'hotel' | 'restaurant' | 'attraction' | 'transport' | 'other';

export interface ItineraryItem {
  id: string;
  type: ActivityType;
  title: string;
  location: string;
  startTime: string; // ISO string
  endTime?: string;
  description?: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  rating?: number;
  googleMapsUrl?: string;
  priceRange?: string; // e.g., "$", "$$", "$$$"
  confirmationNumber?: string;
  flightInfo?: {
    departureAirport: string;
    arrivalAirport: string;
    flightNumber?: string;
  };
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  itinerary: ItineraryItem[];
  budget?: number;
}

export interface AISuggestion {
  title: string;
  description: string;
  type: ActivityType;
  location: string;
  rating?: number;
  imageUrl?: string;
  googleMapsUrl?: string;
  estimatedCost?: string;
  priceRange?: string;
  reason: string;
}
