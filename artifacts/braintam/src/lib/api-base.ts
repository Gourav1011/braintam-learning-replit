/**
 * API_BASE — the root URL prefix for all backend API calls.
 *
 * Development:  VITE_API_URL is unset → "" → relative URLs (/api/...) hit the
 *               same origin, which the Replit dev proxy routes to the API server.
 *
 * Production (VPS):  VITE_API_URL is empty → "" → relative URLs (/api/...) hit
 *               braintam.com, where nginx proxies /api to the Node.js process.
 *               Frontend and backend share the same origin — no CORS required.
 *
 * If the backend ever moves to a separate host, set VITE_API_URL to that host
 * in .env.production and ensure CORS is configured on the API server.
 *
 * Never use import.meta.env.BASE_URL for API calls — that is the app's routing
 * base path (e.g. "/"), not the backend host.
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
