import { GoogleGenAI, Type } from "@google/genai";
import { ActivityType, AISuggestion, ItineraryItem } from "../types";
import { enrichWithPlacePhotos } from "./placesService";

export const parseExistingBookings = async (
  rawFlight?: string,
  rawHotel?: string
): Promise<Partial<ItineraryItem & { flightInfo?: any, hotelInfo?: any }>[]> => {
  if (!rawFlight && !rawHotel) return [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Extract structured travel events from the following text provided by a user.
    Identify any flights or hotel stays. 
    
    Flight info provided: ${rawFlight || 'None'}
    Hotel info provided: ${rawHotel || 'None'}

    CRITICAL FOR FLIGHTS: Try your best to identify the Departure City and Arrival City. 
    Return a list of items with:
    - title, type, location, startTime, flightInfo, hotelInfo
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING },
            location: { type: Type.STRING },
            startTime: { type: Type.STRING },
            description: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            flightInfo: { type: Type.OBJECT, properties: { departureCity: { type: Type.STRING }, arrivalCity: { type: Type.STRING }, flightNumber: { type: Type.STRING } } }
          },
          required: ["title", "type", "location", "startTime"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const magicParseActivities = async (text: string, destination: string): Promise<Partial<ItineraryItem>[]> => {
  if (!text.trim()) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Extract ALL travel activities, meals, tours, and transfers from this text: "${text}". 
    The trip destination is ${destination}. 
    
    Rules:
    1. Extract dates and times accurately. If only a time is mentioned, assume it refers to a reasonable day within the trip context.
    2. Categorize as 'attraction', 'restaurant', 'hotel', 'transport', or 'other'.
    3. Use Google Search to find approximate locations (city area/address) for named places.
    
    Return a JSON array of structured activity objects.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{googleSearch: {}}],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING },
            location: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            description: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            imageUrl: { type: Type.STRING }
          },
          required: ["title", "type", "location", "startTime"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const generateTripItinerary = async (
  destination: string, 
  duration: number, 
  confirmedItems: Partial<ItineraryItem>[]
): Promise<Partial<ItineraryItem>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let contextPrompt = `Generate a ${duration}-day travel itinerary for ${destination}. 
    Output a JSON array of activities with title, type, location, startTime, lat, lng, imageUrl.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contextPrompt,
    config: {
      tools: [{googleSearch: {}}],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING },
            location: { type: Type.STRING },
            startTime: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            imageUrl: { type: Type.STRING }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const getAIPersonalizedSuggestions = async (destination: string, interests: string[]): Promise<AISuggestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Suggest 5 high-quality, real-world attractions or hidden gems in ${destination} for someone interested in ${interests.join(", ")}.
    
    Data:
    - 'priceRange' ($, $$, $$$, $$$$).
    - Include rating and Google Maps URL.`,
    config: {
      tools: [{googleSearch: {}}],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            location: { type: Type.STRING },
            rating: { type: Type.NUMBER },
            googleMapsUrl: { type: Type.STRING },
            priceRange: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["title", "description", "type", "location", "rating", "googleMapsUrl", "priceRange", "reason"]
        }
      }
    }
  });

  try {
    const suggestions = JSON.parse(response.text || '[]');
    return enrichWithPlacePhotos(suggestions);
  } catch (e) {
    return [];
  }
};

export const getTypeSpecificSuggestions = async (
  destination: string, 
  type: ActivityType,
  context?: { 
    title?: string, 
    location?: string, 
    hotelCoords?: { lat: number, lng: number },
    startTime?: string
  }
): Promise<Partial<ItineraryItem & { rating?: number, googleMapsUrl?: string, priceRange?: string }>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const userCity = context?.location || destination;
  const userTitle = context?.title || "";
  
  const prompt = `
    Using GOOGLE SEARCH, find exactly 4 high-quality, REAL-WORLD ${type}s currently operating in ${userCity} that match: "${userTitle}".
    
    Data:
    - 'priceRange' ($, $$, $$$, $$$$).
    - Average rating, address, lat/lng, and Google Maps URL.
    
    Return the results in a JSON array.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{googleSearch: {}}],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            location: { type: Type.STRING },
            description: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            rating: { type: Type.NUMBER },
            priceRange: { type: Type.STRING },
            googleMapsUrl: { type: Type.STRING }
          },
          required: ["title", "location", "lat", "lng", "googleMapsUrl", "rating", "priceRange"]
        }
      }
    }
  });

  try {
    const suggestions = JSON.parse(response.text || '[]');
    return enrichWithPlacePhotos(suggestions);
  } catch (e) {
    return [];
  }
};
