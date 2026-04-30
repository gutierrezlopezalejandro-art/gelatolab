import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS opcional via env var. iOS Safari requiere HTTPS para getUserMedia,
// asi que cuando vayas a probar el escaner desde el iPhone usa:
//   set VITE_HTTPS=1 && npm run dev   (Windows cmd)
//   $env:VITE_HTTPS=1; npm run dev    (PowerShell)
// Por defecto sigue en HTTP para que Tauri y PC browser funcionen sin cambios.
const useHttps = String(process.env.VITE_HTTPS || '').trim() === '1';

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    host: true, // escuchar en todas las interfaces (LAN)
  },
  base: './',
  test: {
    environment: 'node',
    globals: true,
    // El setup se aplica a todos los tests; los matchers de jest-dom solo
    // aplican cuando el archivo opta por jsdom via "// @vitest-environment jsdom".
    setupFiles: ['./vitest.setup.js'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts':       ['recharts'],
          'xlsx':         ['xlsx'],
        },
      },
    },
  },
});
