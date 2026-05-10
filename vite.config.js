import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// HTTPS opcional via env var. iOS Safari requiere HTTPS para getUserMedia,
// asi que cuando vayas a probar el escaner desde el iPhone usa:
//   set VITE_HTTPS=1 && npm run dev   (Windows cmd)
//   $env:VITE_HTTPS=1; npm run dev    (PowerShell)
// Por defecto sigue en HTTP para que Tauri y PC browser funcionen sin cambios.
const useHttps = String(process.env.VITE_HTTPS || '').trim() === '1';

// Config PWA — genera service worker via Workbox que pre-cachea TODO el bundle
// (JS/CSS/imagenes/fuentes), permitiendo open offline despues del primer load.
// devOptions.enabled=false: NUNCA registrar SW en dev (rompe HMR de Vite).
// El index.html tiene logica adicional para deregistrar SW en Tauri/localhost.
const pwaConfig = {
  registerType: 'autoUpdate',
  // injectRegister:false → NO inyectamos el script auto. Lo registramos manual
  // en index.html con un guard para Tauri/localhost (ahi NO debe correr SW,
  // rompe HMR en dev y causa stale-chunk en desktop, ver historico v1.0.6).
  injectRegister: false,
  devOptions: { enabled: false },
  workbox: {
    // skipWaiting + clientsClaim: forzar al SW nuevo a tomar control sin
    // esperar que "todas las tabs cierren". Critico para PWA standalone iOS:
    // ahi el "tab" nunca se cierra (la app siempre esta abierta como icono),
    // sin estos flags el SW nuevo se queda en estado "waiting" indefinido y
    // el usuario sigue viendo el bundle viejo. Bug 2026-05-10: usuario
    // quedo trabado en v1.0.13 aunque deployamos v1.0.14.
    skipWaiting: true,
    clientsClaim: true,
    // Pre-cache: todos los chunks Vite + iconos + manifest. globPatterns mira
    // en /dist (output de build), no en /public.
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
    // Cap por archivo: aumentar a 5MB para chunks gordos (xlsx, recharts).
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    // Forzar cleanup de caches viejas al activar SW nuevo. Sin esto los
    // caches del SW anterior pueden quedar dando vueltas (waste storage,
    // posibles hits accidentales).
    cleanupOutdatedCaches: true,
    // Runtime caching para recursos que no estan en el bundle pre-cacheado:
    runtimeCaching: [
      {
        // Google Fonts CSS — stale-while-revalidate (cambia rara vez).
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'google-fonts-css' },
      },
      {
        // Google Fonts files — cache-first (immutable, hash en URL).
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-files',
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
      {
        // Supabase API — network-only. Datos vivos, NO se deben cachear o
        // mostraria info stale (ej: receta editada en otro device).
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkOnly',
      },
    ],
    // Permite navigationFallback al index.html para que las rutas SPA funcionen
    // offline (ej: /#/recipes abre directo cuando no hay red).
    navigateFallback: 'index.html',
    // Excluir paths que NO deben ir al fallback (ej: archivos del sw mismo).
    navigateFallbackDenylist: [/^\/api/, /\/[^/?]+\.[^/]+$/],
  },
  // Manifest se inyecta en el HTML por el plugin. Mantiene en sync con
  // public/manifest.json pero el plugin lo regenera al build.
  manifest: {
    name: 'GelatoLab',
    short_name: 'GelatoLab',
    description: 'Formulación profesional de helados, gelatos y sorbetes',
    start_url: './',
    display: 'standalone',
    orientation: 'any',
    lang: 'es',
    background_color: '#1a1a1a',
    theme_color: '#1a1a1a',
    icons: [
      { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: './icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  // El public/manifest.json existente se mantiene por compatibilidad con
  // referencias antiguas. El plugin genera /manifest.webmanifest aparte.
  // Si quisieras eliminar el viejo: borrar public/manifest.json y dejar
  // que el plugin sea la unica fuente de verdad.
  filename: 'sw.js', // mantener mismo nombre que el SW custom anterior
  strategies: 'generateSW',
};

export default defineConfig({
  // Expone la version del package.json como constante en el bundle.
  // Asi la UI puede mostrar "v1.0.4" sin importar el archivo en runtime.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA(pwaConfig),
    ...(useHttps ? [basicSsl()] : []),
  ],
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
