import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo: abren la app de verdad en un navegador y la
 * usan como la usaria una persona.
 *
 * POR QUE EXISTEN
 * ---------------
 * Las pruebas unitarias (vitest) verifican funciones sueltas. No detectan
 * que una pantalla quedo en blanco, que un boton dejo de existir o que una
 * receta no sobrevivio a cerrar y abrir la app.
 *
 * Durante la Fase 0 aparecio un `user is not defined` que paso limpio por la
 * compilacion y solo se vio al ejecutar la app. Estas pruebas cubren
 * exactamente ese hueco.
 *
 * DOS PERFILES, porque la regla del proyecto es paridad total de funciones
 * en el telefono y el iPad solo agrega espacio:
 *   - iphone: 390x844, la medida que pone el liston
 *   - ipad:   820x1180, para verificar que lo mismo se ve bien en grande
 *
 * Se ejecutan con `npm run e2e`. El servidor lo levanta Playwright solo.
 */
export default defineConfig({
  testDir: './e2e',
  // Sin paralelismo entre archivos: cada uno arranca con su propio
  // almacenamiento y el servidor es uno solo.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://localhost:4173',
    // Deja rastro solo cuando algo falla, para poder ver que paso.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'ipad',
      use: { ...devices['iPad (gen 7) landscape'] },
    },
  ],

  // Playwright levanta y apaga el servidor solo. Usa la build de produccion
  // (la misma que va a la tienda), no el servidor de desarrollo.
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
