/**
 * API_BASE — the root URL prefix for all backend API calls.
 *
 * Development:  VITE_API_URL is unset → "" → relative URLs (/api/...) hit the
 *               same origin, which the Replit dev proxy routes to the API server.
 *
 * Production:   VITE_API_URL=https://api.braintam.com is injected at build time
 *               → every fetch becomes https://api.braintam.com/api/...
 *
 * Never use import.meta.env.BASE_URL for API calls — that is the app's routing
 * base path (e.g. "/"), not the backend host.
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
