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
// DEV-SERVER MEDIA PROXY: the backend serves garment images at
// http://127.0.0.1:8000/media/<gridfs-name>.png. Without this proxy the dev
// page either 404s relative /media/* paths or loads them cross-origin,
// which taints the canvases used for transparent-margin crop and the
// try-on warp. Proxying keeps media SAME-ORIGIN in dev, mirroring what
// local_staging_server.mjs already does in staging.
const certDir = join(process.env.LOCALAPPDATA ?? '', 'FitFusionAI', 'certs');
const certPath = process.env.FITFUSION_TLS_CERT || join(certDir, 'localhost.pem');
const keyPath = process.env.FITFUSION_TLS_KEY || join(certDir, 'localhost-key.pem');
const hasTls = existsSync(certPath) && existsSync(keyPath);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8443,
    strictPort: false,
    https: hasTls
      ? { cert: readFileSync(certPath), key: readFileSync(keyPath) }
      : undefined,
    proxy: {
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});