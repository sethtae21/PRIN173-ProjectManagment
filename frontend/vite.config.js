import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// DEV-SERVER MEDIA PROXY: the backend serves garment images at
// http://127.0.0.1:8000/media/<gridfs-name>.png. Without this proxy the dev
// page (localhost:5173) either 404s relative /media/* paths or loads them
// cross-origin, which taints the canvases used for transparent-margin crop
// and the try-on warp. Proxying keeps media SAME-ORIGIN in dev, mirroring
// what local_staging_server.mjs already does in staging.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});