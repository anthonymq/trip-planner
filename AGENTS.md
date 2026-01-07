# AGENTS.md - Trip Planner Codebase Guidelines

## Project Overview

React 19 + TypeScript trip planning PWA with AI-powered suggestions (Google Gemini), interactive maps (Leaflet), and IndexedDB persistence.

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Framework** | React 19, Vite 6, TypeScript 5.8 |
| **Styling** | Tailwind CSS (CDN-based, inline config) |
| **State** | React hooks (useState, useEffect, useMemo) |
| **Storage** | IndexedDB via `idb` library |
| **AI** | Google Gemini API (@google/genai) |
| **Maps** | Leaflet |
| **Icons** | lucide-react |
| **PWA** | vite-plugin-pwa with workbox |

---

## Build / Dev Commands

```bash
# Install dependencies
npm install

# Development server (port 5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### No Test Framework Configured

This project does not have a testing framework set up. If adding tests:
- Recommend: Vitest (native Vite integration)
- Add to package.json: `"test": "vitest"`, `"test:run": "vitest run"`

---

## Environment Variables

Create `.env.local` with:
```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_PLACES_API_KEY=your_google_places_key  # Optional, for place photos
```

Access in code via `process.env.API_KEY` or `process.env.GEMINI_API_KEY`.

---

## Project Structure

```
/
├── App.tsx                 # Main app component, routing, state
├── index.tsx               # React entry point
├── index.html              # HTML + Tailwind config + custom CSS
├── types.ts                # Shared TypeScript interfaces
├── vite.config.ts          # Vite + PWA configuration
├── components/
│   ├── TripList.tsx        # Trip listing grid
│   ├── TripDetail.tsx      # Trip editor with timeline/map/AI views
│   ├── TimelineView.tsx    # Chronological itinerary view
│   ├── MapView.tsx         # Leaflet map component
│   ├── ReloadPrompt.tsx    # PWA update prompt
│   └── InstallPrompt.tsx   # PWA install prompt
└── services/
    ├── geminiService.ts    # Google Gemini AI integration
    ├── placesService.ts    # Google Places API for photos
    └── storage.ts          # IndexedDB wrapper
```

---

## Code Style Guidelines

### TypeScript

- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **Strict mode**: Not explicitly enabled, but follow strict practices
- **No `as any`**: Avoid type assertions that bypass type safety
- **No `@ts-ignore`**: Fix type errors properly

```typescript
// Good: Explicit interface definition
interface TripListProps {
  trips: Trip[];
  onSelectTrip: (id: string) => void;
  onDeleteTrip: (id: string, e: React.MouseEvent) => void;
  onCreateNew: () => void;
}

// Good: React.FC with props type
const TripList: React.FC<TripListProps> = ({ trips, onSelectTrip, onDeleteTrip, onCreateNew }) => {
```

### Path Aliases

Use `@/*` for imports from project root:
```typescript
import { Trip } from '@/types';
import { storage } from '@/services/storage';
```

### React Patterns

- **Functional components only** - no class components
- **React.FC<Props>** for component typing
- **Hooks**: useState, useEffect, useMemo for state management
- **Event handlers**: Prefix with `handle` (e.g., `handleAddTrip`, `handleDeleteItem`)

```typescript
// Component structure pattern
const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // State hooks
  const [state, setState] = useState<Type>(initial);
  
  // Memoized values
  const computed = useMemo(() => /* ... */, [deps]);
  
  // Effects
  useEffect(() => {
    // Side effects
  }, [deps]);
  
  // Event handlers
  const handleAction = () => { /* ... */ };
  
  // Render
  return (/* JSX */);
};

export default ComponentName;
```

### Styling (Tailwind CSS)

Custom color palette defined in `index.html`:
- **sand**: Neutral beige tones (50-500)
- **ocean**: Blue tones (50-900)
- **terracotta**: Orange-red accent (50-900)
- **cream**: Background color `#fffef8`

```tsx
// Common patterns
className="bg-cream"                    // Main background
className="text-ocean-900"              // Primary text
className="text-sand-500"               // Muted text
className="bg-terracotta-500"           // Primary accent/CTA
className="border-sand-200"             // Subtle borders
className="rounded-2xl"                 // Standard border radius
className="font-serif"                  // Playfair Display headings
className="font-sans"                   // Plus Jakarta Sans body

// Interactive elements
className="hover:bg-sand-50 active:scale-95 transition-all"

// Responsive
className="lg:hidden"                   // Mobile only
className="hidden lg:flex"              // Desktop only
```

### Icons (lucide-react)

Import individual icons:
```typescript
import { Plus, Trash2, MapPin, Sparkles } from 'lucide-react';

// Usage with Tailwind sizing
<Plus className="w-4 h-4" />
<MapPin className="w-3 h-3 text-terracotta-400" />
```

---

## Service Patterns

### Gemini AI Service

All AI functions return structured JSON via response schemas:
```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: prompt,
  config: {
    tools: [{googleSearch: {}}],  // Enable grounding
    responseMimeType: "application/json",
    responseSchema: { /* Type schema */ }
  }
});
```

### Storage Service (IndexedDB)

```typescript
// Pattern: async/await with storage object
await storage.saveTrip(trip);
const trips = await storage.getAllTrips();
await storage.deleteTrip(id);
```

### Error Handling

```typescript
// Pattern: try/catch with console.error, graceful fallback
try {
  const result = await asyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return []; // or sensible default
}
```

---

## Component Conventions

### Props Interface Naming

```typescript
interface ComponentNameProps { /* ... */ }
```

### Callback Props

- Prefix with `on`: `onSelectTrip`, `onDeleteTrip`, `onUpdateTrip`
- Include event parameter type when needed: `(id: string, e: React.MouseEvent) => void`

### Internal State vs Props

- State for UI-only concerns (modals, form data, loading states)
- Props for data and callbacks from parent
- Lift state up when siblings need to share

### ID Generation

```typescript
const id = Math.random().toString(36).substr(2, 9);
```

---

## Type Definitions (types.ts)

```typescript
type ActivityType = 'flight' | 'hotel' | 'restaurant' | 'attraction' | 'transport' | 'other';

interface ItineraryItem {
  id: string;
  type: ActivityType;
  title: string;
  location: string;
  startTime: string;  // ISO string
  endTime?: string;
  description?: string;
  lat: number;
  lng: number;
  // ... additional optional fields
}

interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  itinerary: ItineraryItem[];
  budget?: number;
  suggestions?: AISuggestion[];
}
```

---

## PWA Configuration

Configured in `vite.config.ts` with:
- Register type: `prompt` (shows update UI)
- Icons: SVG format
- Workbox caching for fonts, CDN assets
- Dev mode enabled for testing

---

## Common Gotchas

1. **Date handling**: Use ISO strings, convert with helper functions (`toInputDate`, `toISODate` in TripDetail)
2. **Tailwind CDN**: Config is in `index.html` script tag, not separate file
3. **No ESLint/Prettier**: Maintain consistent style manually
4. **API Keys**: Never commit `.env.local`, use `process.env` pattern
5. **PWA**: Test service worker behavior in production build

---

## Adding New Features

1. **New component**: Create in `/components`, export default, use React.FC<Props>
2. **New service**: Create in `/services`, export named functions
3. **New type**: Add to `/types.ts`
4. **New AI feature**: Follow Gemini service pattern with response schemas
