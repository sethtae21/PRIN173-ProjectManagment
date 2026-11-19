import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// DEV PORT: always START at 8443 (project requirement).
// CHANGED: strictPort is now FALSE — Vite's default "continuation" behavior
// is restored: if 8443 is already taken (another `npm run dev` terminal, or
// the local_staging_server.mjs proxy), this instance automatically tries
// 8444, 8445, ... instead of crashing with "Port 8443 is already in use".
// ALWAYS read the printed "Local:" line — the FIRST instance to start owns
// http://localhost:8443; later instances live on the next free port.
//
// OPTIONAL AUTO-TLS: 8443 is also the project's staging HTTPS port
// (backend/scripts/local_staging_server.mjs defaults to 8443, SRS §5.3).
// If the mkcert files from backend/README.md exist
// (%LOCALAPPDATA%\FitFusionAI\certs\localhost.pem + localhost-key.pem), the
// dev server automatically upgrades to https with the trusted local CA.
// No certs -> plain http (loopback dev is allowed per SRS §5.3). Override
// the paths with FITFUSION_TLS_CERT / FITFUSION_TLS_KEY — the same env vars
// the staging server uses.
//
// DEMO NOTE: local_staging_server.mjs does NOT port-hop — it hard-fails if
// 8443 is busy. So for a demo/evidence run, stop the dev instance(s) first
// (or start staging first) so staging owns https://localhost:8443.
//
// DEV-SERVER API PROXY (mixed-content / CORS fix):
// api.js now uses a same-origin RELATIVE base in development, so every backend
// call (e.g. https://localhost:8443/auth/login/) is forwarded by Vite to Django
// on http://127.0.0.1:8000. The browser only ever talks HTTPS to :8443, so there
// is no mixed-content block and no cross-origin CORS preflight. Keeping /media
// same-origin also stops the try-on canvases from being tainted.
// EVERY first path segment used by api.js must be listed below — if one is
// missing Vite serves the SPA shell (200 HTML) and the client's JSON.parse fails.
const certDir = join(process.env.LOCALAPPDATA ?? '', 'FitFusionAI', 'certs');
const certPath = process.env.FITFUSION_TLS_CERT || join(certDir, 'localhost.pem');
const keyPath = process.env.FITFUSION_TLS_KEY || join(certDir, 'localhost-key.pem');
const hasTls = existsSync(certPath) && existsSync(keyPath);

// Single backend target for every proxied route.
const DJANGO_TARGET = 'http://127.0.0.1:8000';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // SessionBootGuard.jsx owns a SECOND absolute fallback
  // (VITE_API_URL -> http://127.0.0.1:8000) used for GET /profile/. That file is
  // out of scope here, so force it same-origin at config level in dev. A
  // production build keeps its configured absolute URL.
  define: mode === 'development'
    ? { 'import.meta.env.VITE_API_URL': JSON.stringify('') }
    : {},
  server: {
    port: 8443,
    strictPort: false,
    // Vite 8 ships no bundled self-signed certificate: a bare `https: true`
    // resolves to no key/cert and http2.createSecureServer fails. Keep loading
    // the trusted mkcert key/cert so https://localhost:8443 stays valid —
    // HTTPS is never disabled.
    https: hasTls
      ? { cert: readFileSync(certPath), key: readFileSync(keyPath) }
      : undefined,
    proxy: {
      '/auth': { target: DJANGO_TARGET, changeOrigin: true },
      '/profile': { target: DJANGO_TARGET, changeOrigin: true },
      '/presets': { target: DJANGO_TARGET, changeOrigin: true },
      '/catalog': { target: DJANGO_TARGET, changeOrigin: true },
      '/media': { target: DJANGO_TARGET, changeOrigin: true },
      '/cart': { target: DJANGO_TARGET, changeOrigin: true },
      '/orders': { target: DJANGO_TARGET, changeOrigin: true },
      '/checkout': { target: DJANGO_TARGET, changeOrigin: true },
      '/ratings': { target: DJANGO_TARGET, changeOrigin: true },
      '/outfits': { target: DJANGO_TARGET, changeOrigin: true },
      '/api': { target: DJANGO_TARGET, changeOrigin: true },
      '/health': { target: DJANGO_TARGET, changeOrigin: true },
      // App-name prefixes from the standard recipe. Django actually serves
      // these routes at root, so these are harmless future-proofing.
      '/accounts': { target: DJANGO_TARGET, changeOrigin: true },
      '/commerce': { target: DJANGO_TARGET, changeOrigin: true },
    },
  },
}));