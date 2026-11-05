/**
 * Resolves the API base URL.
 *
 * Order of precedence:
 *  1. `window.__INKWELL_API__` — set at runtime by `assets/config.js`, which lets
 *     the same build target any backend without rebuilding.
 *  2. `/api` — same-origin, works with the dev-server proxy and the nginx setup.
 */
declare global {
  interface Window {
    __INKWELL_API__?: string;
  }
}

export const API_BASE: string =
  (typeof window !== 'undefined' && window.__INKWELL_API__) || '/api';
