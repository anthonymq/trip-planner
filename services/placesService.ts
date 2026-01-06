const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  photos?: { name: string }[];
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  priceLevel?: string;
  googleMapsUri?: string;
  editorialSummary?: { text: string };
}

interface TextSearchResponse {
  places: Place[];
}

// Map ActivityType to Google Places includedType
const ACTIVITY_TYPE_TO_PLACES_TYPE: Record<string, string[]> = {
  restaurant: ['restaurant', 'cafe', 'bakery', 'bar'],
  attraction: ['tourist_attraction', 'museum', 'art_gallery', 'park', 'point_of_interest'],
  hotel: ['lodging', 'hotel'],
  transport: ['transit_station', 'airport', 'train_station', 'bus_station'],
  other: ['point_of_interest']
};

// Map Google priceLevel to display format
const PRICE_LEVEL_MAP: Record<string, string> = {
  'PRICE_LEVEL_FREE': 'Free',
  'PRICE_LEVEL_INEXPENSIVE': '$',
  'PRICE_LEVEL_MODERATE': '$$',
  'PRICE_LEVEL_EXPENSIVE': '$$$',
  'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
};

export interface PlaceSuggestion {
  title: string;
  location: string;
  description?: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  rating?: number;
  priceRange?: string;
  googleMapsUrl?: string;
}

/**
 * Search for places using Google Places API with type filtering
 * This replaces the AI-based getTypeSpecificSuggestions for faster results
 */
export const searchPlacesByType = async (
  query: string,
  location: string,
  activityType: string,
  maxResults: number = 4
): Promise<PlaceSuggestion[]> => {
  if (!PLACES_API_KEY) {
    console.warn("GOOGLE_PLACES_API_KEY not set");
    return [];
  }

  // Build the search query
  const typeHint = activityType === 'restaurant' ? 'restaurant' : 
                   activityType === 'hotel' ? 'hotel' : 
                   activityType === 'attraction' ? '' : '';
  const searchQuery = query ? `${query} ${typeHint} in ${location}` : `best ${typeHint || 'places'} in ${location}`;
  
  // Get the included types for this activity
  const includedTypes = ACTIVITY_TYPE_TO_PLACES_TYPE[activityType] || ACTIVITY_TYPE_TO_PLACES_TYPE.other;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos,places.location,places.rating,places.priceLevel,places.googleMapsUri,places.editorialSummary"
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        includedType: includedTypes[0], // Use primary type
        maxResultCount: maxResults,
        languageCode: "en"
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Places API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Places API failed with status ${response.status}`);
    }

    const data: TextSearchResponse = await response.json();
    
    if (!data.places || data.places.length === 0) {
      // Fallback: try without type restriction
      // We create a new controller for the fallback request
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000);

      try {
        const fallbackResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": PLACES_API_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos,places.location,places.rating,places.priceLevel,places.googleMapsUri,places.editorialSummary"
          },
          body: JSON.stringify({
            textQuery: searchQuery,
            maxResultCount: maxResults,
            languageCode: "en"
          }),
          signal: fallbackController.signal
        });

        clearTimeout(fallbackTimeoutId);

        if (!fallbackResponse.ok) {
           console.error(`Places API Fallback error: ${fallbackResponse.status}`);
           throw new Error(`Places API Fallback failed with status ${fallbackResponse.status}`);
        }

        const fallbackData: TextSearchResponse = await fallbackResponse.json();
        if (!fallbackData.places) return []; // Valid "no results"
        data.places = fallbackData.places;
      } catch (fallbackError) {
        clearTimeout(fallbackTimeoutId);
        console.error("Places API fallback search error:", fallbackError);
        throw fallbackError;
      }
    }
    
    // Transform to PlaceSuggestion format
    return data.places.map(place => ({
      title: place.displayName?.text || 'Unknown Place',
      location: place.formattedAddress || location,
      description: place.editorialSummary?.text,
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
      imageUrl: place.photos?.[0]?.name ? getPhotoUrl(place.photos[0].name, 400) : undefined,
      rating: place.rating,
      priceRange: place.priceLevel ? PRICE_LEVEL_MAP[place.priceLevel] : undefined,
      googleMapsUrl: place.googleMapsUri
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("Places API request timed out after 10s");
      throw new Error("Request timed out. Please check your connection.");
    } else {
      console.error("Places API search error:", error);
      throw error;
    }
  }
};

/**
 * Search for a place using Places API (New) - supports CORS
 */
export const searchPlace = async (query: string, location?: string): Promise<Place | null> => {
  if (!PLACES_API_KEY) {
    console.warn("GOOGLE_PLACES_API_KEY not set");
    return null;
  }

  const searchQuery = location ? `${query} ${location}` : query;
  
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.photos,places.location"
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });
    
    const data: TextSearchResponse = await response.json();
    
    if (data.places && data.places.length > 0) {
      return data.places[0];
    }
    return null;
  } catch (error) {
    console.error("Places API search error:", error);
    return null;
  }
};

/**
 * Get photo URL from a photo resource name (Places API New format)
 * Photo name format: "places/{place_id}/photos/{photo_reference}"
 */
export const getPhotoUrl = (photoName: string, maxWidth: number = 400): string => {
  if (!PLACES_API_KEY || !photoName) return "";
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${PLACES_API_KEY}`;
};

/**
 * Fetch a real photo URL for a place by searching for it
 */
export const fetchPlacePhoto = async (
  placeName: string, 
  location?: string,
  maxWidth: number = 400
): Promise<string | null> => {
  const place = await searchPlace(placeName, location);
  
  if (place?.photos && place.photos.length > 0) {
    return getPhotoUrl(place.photos[0].name, maxWidth);
  }
  
  return null;
};

/**
 * Enrich an array of items with real Google Places photos
 * Works with any object that has a 'title' and optional 'location' property
 */
export const enrichWithPlacePhotos = async <T extends { title?: string; location?: string; imageUrl?: string }>(
  items: T[],
  maxWidth: number = 400
): Promise<T[]> => {
  if (!PLACES_API_KEY) {
    console.warn("GOOGLE_PLACES_API_KEY not set - skipping photo enrichment");
    return items;
  }

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      if (!item.title) return item;
      
      const photoUrl = await fetchPlacePhoto(item.title, item.location, maxWidth);
      return {
        ...item,
        imageUrl: photoUrl || item.imageUrl || undefined
      };
    })
  );

  return enrichedItems;
};
