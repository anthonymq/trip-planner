const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface Place {
  id: string;
  displayName?: { text: string };
  photos?: { name: string }[];
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface TextSearchResponse {
  places: Place[];
}

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
