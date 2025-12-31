# Security Enhancement: Backend Proxy Migration Strategy

## Objective
Document the strategy to move from client-side API calls (exposed keys) to a secure server-side proxy architecture, preventing API abuse and securing sensitive credentials.

## Problem Statement
The current architecture relies on client-side API calls to Google Gemini and Google Places. While this simplifies deployment on static hosting platforms like GitHub Pages, it introduces significant security risks:

- **Credential Exposure**: API keys (`GEMINI_API_KEY` and `GOOGLE_PLACES_API_KEY`) are injected into the frontend bundle via Vite's `define` configuration. Anyone can view these keys by inspecting the network traffic or the source code in the browser.
- **Abuse Risk**: Exposed keys can be stolen and used by unauthorized parties, potentially leading to exhausted quotas, service disruption, and unexpected financial costs.
- **Ineffective Restrictions**: Referrer restrictions (domain-level locking) provide some protection but can be spoofed and do not prevent programmatic abuse outside of a standard browser environment.

## The "Real" Solution: Backend Proxy
To achieve production-grade security, the application must transition to a server-side proxy architecture.

### Concept
The backend proxy acts as a secure intermediary:
1. **Frontend** sends a request to the application's own **Backend API**.
2. **Backend API** validates the request (authentication, rate limiting).
3. **Backend API** retrieves the secret API key from its secure environment variables.
4. **Backend API** calls the **Google API** and receives the result.
5. **Backend API** forwards the sanitized data back to the **Frontend**.

### Benefits
- **Key Secrecy**: API keys never reach the client; they stay on the server.
- **Custom Rate Limiting**: Prevent abuse by limiting the number of requests per user/IP.
- **Caching**: Store common API responses (like popular place searches) to save costs and improve speed.
- **Request Validation**: Ensure only properly formatted requests are processed.

## Implementation Options

### Option A: Cloudflare Workers (Recommended for GitHub Pages)
*Best for: Maintaining current hosting while adding security.*
- **Strategy**: Keep the frontend on GitHub Pages. Deploy a Cloudflare Worker to handle `/api/*` routes.
- **Pros**: Extremely low latency (Edge-based), generous free tier, no need to migrate frontend hosting.
- **Cons**: Requires Cloudflare DNS or Route configuration.

### Option B: Vercel / Netlify Functions
*Best for: All-in-one simplicity and developer experience.*
- **Strategy**: Migrate hosting from GitHub Pages to Vercel/Netlify. Use their built-in Serverless Functions.
- **Pros**: Seamless integration, automatic environment variable management, "zero-config" backend.
- **Cons**: Requires changing the current deployment platform.

### Option C: Standalone Backend (Node/Express)
*Best for: Complex logic and maximum control.*
- **Strategy**: Deploy a separate Node.js application on a service like Render, Railway, or Fly.io.
- **Pros**: Full flexibility, easier implementation of stateful logic or complex caching.
- **Cons**: Slightly higher operational overhead and potential costs.

## Migration Roadmap

### Step 1: Choose a Provider
Select a backend provider based on the options above. For this project, **Vercel** is highly recommended for its ease of use with React/Vite apps.

### Step 2: Create API Endpoints
Implement secure endpoints to replace current direct calls:
- `POST /api/generate-trip`: Proxies to Gemini AI.
- `POST /api/places-search`: Proxies to Google Places API.
- `GET /api/place-photo`: Proxies image requests to hide the API key from photo URLs.

### Step 3: Refactor Frontend Services
Modify `services/geminiService.ts` and `services/placesService.ts` to call the new internal endpoints.

**Example Refactor:**
```typescript
// BEFORE: services/placesService.ts
const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
  headers: { "X-Goog-Api-Key": PLACES_API_KEY, ... }
});

// AFTER: services/placesService.ts
const response = await fetch("/api/places-search", {
  method: "POST",
  body: JSON.stringify({ query, location })
});
```

### Step 4: Implement Rate Limiting & CORS
- **Rate Limiting**: Limit requests (e.g., 10 per minute per IP) to prevent automated scraping.
- **CORS**: Restrict the backend to only accept requests from your production domain.

### Step 5: Rotate Keys & Cleanup
1. Generate fresh API keys in the Google Cloud Console.
2. Save these keys in the backend provider's secret manager.
3. **CRITICAL**: Remove the `define` block from `vite.config.ts` that currently leaks the keys.
4. Delete the old, compromised keys from the Google Cloud Console.
