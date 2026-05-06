// Captura de screenshots para auditoría de usabilidad.
//
// Uso:
//   1. Levantá el dev server en otra terminal: `npm run dev`
//   2. Asegurate de tener un usuario Pro de prueba creado y de haber completado
//      el OnboardingWizard al menos una vez con esa cuenta (así business-store
//      se sincroniza desde Supabase y no aparece el wizard tapando todo).
//   3. Definí las variables de entorno (en .env.local o en el shell):
//        TEST_USER_EMAIL="..."
//        TEST_USER_PASSWORD="..."
//        BASE_URL="http://localhost:5173"   (opcional, default este)
//   4. `npm run capture:screenshots`
//
// Las capturas se guardan en docs/usability-survey/screenshots/.
// Después corré /usability-review en Claude Code para auditar.

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Permitimos cargar variables desde .env.local sin dotenv (parser mínimo).
async function loadDotenv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const contents = await fs.readFile(path.join(repoRoot, file), 'utf-8');
      for (const line of contents.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/i);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    } catch { /* missing file is fine */ }
  }
}

await loadDotenv();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'usability-survey', 'screenshots');

// La app usa HashRouter (src/main.jsx). Las rutas viven en el fragment:
// /auth → http://localhost:5173/#/auth. Sin esto vemos siempre la Landing.
function urlFor(routePath) {
  if (routePath === '/' || routePath === '') return `${BASE_URL}/`;
  return `${BASE_URL}/#${routePath}`;
}

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

// Lista de pantallas a capturar. Cada entrada describe cómo llegar y cómo esperar.
// `auth: false` = pública (sin login). `auth: true` = requiere sesión.
// `setup` opcional: función async que recibe `page` y deja la UI lista.
const TARGETS = [
  // Públicas
  { name: 'landing',       url: '/',                   auth: false, viewport: DESKTOP, wait: 'h1' },
  { name: 'pricing',       url: '/pricing',            auth: false, viewport: DESKTOP, wait: 'h1' },
  { name: 'auth-login',    url: '/auth',               auth: false, viewport: DESKTOP, wait: 'input[type=email]' },
  { name: 'auth-signup',   url: '/auth?mode=signup',   auth: false, viewport: DESKTOP, wait: 'input[type=email]' },
  { name: 'help-public',   url: '/help',               auth: false, viewport: DESKTOP },
  { name: 'terms',         url: '/terms',              auth: false, viewport: DESKTOP },
  { name: 'privacy',       url: '/privacy',            auth: false, viewport: DESKTOP },
  { name: 'download',      url: '/download',           auth: false, viewport: DESKTOP },
  { name: '404',           url: '/no-existe-este-path', auth: false, viewport: DESKTOP },

  // Autenticadas
  { name: 'dashboard',          url: '/dashboard',  auth: true, viewport: DESKTOP },
  { name: 'recipes-list',       url: '/recipes',    auth: true, viewport: DESKTOP },
  { name: 'ingredient-db',      url: '/ingredients', auth: true, viewport: DESKTOP },
  { name: 'ingredient-db-mobile', url: '/ingredients', auth: true, viewport: MOBILE },
  { name: 'production-plan',    url: '/plan',       auth: true, viewport: DESKTOP },
  { name: 'production-log',     url: '/production', auth: true, viewport: DESKTOP },
  { name: 'haccp',              url: '/haccp',      auth: true, viewport: DESKTOP },
  { name: 'help-authed',        url: '/help',       auth: true, viewport: DESKTOP },
  { name: 'recipes-list-mobile', url: '/recipes',   auth: true, viewport: MOBILE },
  { name: 'dashboard-mobile',   url: '/dashboard',  auth: true, viewport: MOBILE },
];

// Pantallas que NO se capturan automáticamente y requieren intervención manual.
// Las listamos en el reporte final para que el usuario sepa qué falta.
const MANUAL_CAPTURES = [
  { name: 'desktop-welcome.png', why: 'Solo aparece en build de Tauri sin sesión. Capturalo abriendo la app instalada de escritorio.' },
  { name: 'onboarding.png', why: 'Aparece solo en primer login antes de completar el wizard. Capturalo desde una cuenta nueva.' },
  { name: 'recipe-editor-formulacion.png', why: 'Requiere abrir una receta existente. Capturá desde /recipes/{id} con la tab Formulación activa.' },
  { name: 'recipe-editor-balance.png', why: 'Tab Balance del editor. Capturá después de abrir una receta.' },
  { name: 'recipe-editor-etiqueta.png', why: 'Tab Etiquetado nutricional. Idealmente con país=Chile y receta con sellos.' },
  { name: 'recipe-editor-proceso.png', why: 'Tab Proceso del editor.' },
  { name: 'upgrade-modal.png', why: 'Aparece al chocar contra un gate Free→Pro. Capturalo desde una cuenta Free intentando usar feature Pro.' },
  { name: 'marco-ai.png', why: 'Asistente Marco IA abierto. Click en el icono flotante para invocarlo.' },
  { name: 'business-settings-modal.png', why: 'Modal de configuración de negocio. Abrir desde UserMenu.' },
  { name: 'empty-state-recipes.png', why: 'Lista de recetas vacía. Capturar con cuenta nueva sin recetas.' },
  { name: 'error-state.png', why: 'Cualquier estado de error visible — ej. cortar la conexión a Supabase y recargar.' },
];

function ts() {
  return new Date().toLocaleTimeString('es-CL', { hour12: false });
}

function log(...args) {
  console.log(`[${ts()}]`, ...args);
}

// Script que corre ANTES de cualquier código de la página (via addInitScript).
// Pre-completa flags que de otra forma harían aparecer banners/wizards/tours
// tapando las capturas. zustand-persist re-hidrata desde localStorage en cada
// montaje, así que solo `evaluate` después del goto no alcanza — el componente
// ya leyó el estado anterior.
const OVERLAY_DISMISS_SCRIPT = `
  (function () {
    try { localStorage.setItem('cookieConsent', JSON.stringify({ analytics: false, accepted: true, date: Date.now() })); } catch (e) {}
    try { localStorage.setItem('gelatolab-tour-seen', '1'); } catch (e) {}
    try {
      var existing = {};
      try { existing = JSON.parse(localStorage.getItem('gelatolab-business') || '{}'); } catch (e) {}
      var state = (existing && existing.state) || {};
      state.completed = true;
      state.fantasy_name = state.fantasy_name || 'QA Heladería';
      state.legal_name   = state.legal_name   || 'QA SpA';
      state.country      = state.country      || 'CL';
      localStorage.setItem('gelatolab-business', JSON.stringify({
        state: state,
        version: existing && existing.version != null ? existing.version : 0
      }));
    } catch (e) {}
  })();
`;

async function dismissOverlays(page) {
  // Cualquier banner/modal residual visible. Best-effort, no falla si no hay.
  const closeButtons = await page.$$('button[aria-label="Cerrar"], button:has-text("Aceptar"), button:has-text("Más tarde"), button:has-text("Saltar")');
  for (const btn of closeButtons) {
    try { await btn.click({ timeout: 500 }); } catch {}
  }
}

async function authenticate(browser) {
  log(`Autenticando como ${EMAIL}…`);
  const ctx = await browser.newContext({ viewport: DESKTOP });
  await ctx.addInitScript(OVERLAY_DISMISS_SCRIPT);
  const page = await ctx.newPage();
  // Vite dev mantiene un WebSocket HMR abierto, así que `networkidle` nunca
  // dispara. Usamos `domcontentloaded` + selector wait explícito.
  await page.goto(urlFor('/auth'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#auth-email', { timeout: 15000 });
  await dismissOverlays(page);

  await page.fill('#auth-email', EMAIL);
  await page.fill('#auth-password', PASSWORD);
  await Promise.all([
    page.waitForURL(/#\/(dashboard|recipes|$)/, { timeout: 15000 }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);

  // Esperá a que la sesión esté lista (auth store hidratado).
  await page.waitForFunction(() => {
    try {
      const auth = JSON.parse(localStorage.getItem('sb-' + Object.keys(localStorage).find(k => k.startsWith('sb-')).slice(3)) || '{}');
      return !!auth?.access_token || !!localStorage.getItem('auth-storage');
    } catch { return false; }
  }, { timeout: 10000 }).catch(() => {});

  // Esperá un momento para que CloudSyncProvider hidrate el business-store
  // desde Supabase. Si la cuenta ya completó onboarding, esto evita el wizard.
  await page.waitForTimeout(2500);

  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function capture(browser, target, storage) {
  const ctx = await browser.newContext({
    viewport: target.viewport,
    storageState: target.auth ? storage : undefined,
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(OVERLAY_DISMISS_SCRIPT);
  const page = await ctx.newPage();

  try {
    // Mismo motivo que en authenticate(): networkidle no dispara con Vite HMR.
    await page.goto(urlFor(target.url), { waitUntil: 'domcontentloaded', timeout: 20000 });
    await dismissOverlays(page);

    if (target.wait) {
      await page.waitForSelector(target.wait, { timeout: 8000 }).catch(() => {});
    }

    // Espera para que Suspense termine de cargar el chunk lazy + animaciones.
    await page.waitForTimeout(1500);

    if (target.setup) await target.setup(page);

    const file = path.join(OUTPUT_DIR, `${target.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    log(`✓ ${target.name}.png`);
  } catch (e) {
    log(`✗ ${target.name}: ${e.message}`);
  } finally {
    await ctx.close();
  }
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('\nFalta configurar credenciales del usuario de prueba.\n');
    console.error('  TEST_USER_EMAIL="..."');
    console.error('  TEST_USER_PASSWORD="..."');
    console.error('\nSugerencia: poné estas variables en .env.local (ya está en .gitignore).');
    console.error('Necesitás una cuenta con plan Pro para que las pantallas de Pro no muestren upgrade-modals.\n');
    process.exit(1);
  }

  // Verificá que el dev server esté corriendo antes de empezar.
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`\nNo se pudo conectar a ${BASE_URL}: ${e.message}`);
    console.error('Levantá el dev server primero: npm run dev\n');
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const storage = await authenticate(browser);

  log(`Capturando ${TARGETS.length} pantallas en ${OUTPUT_DIR}`);
  for (const target of TARGETS) {
    await capture(browser, target, storage);
  }
  await browser.close();

  // Reporte final con lo que falta capturar manualmente.
  console.log('\n--- Capturas manuales pendientes ---');
  for (const m of MANUAL_CAPTURES) {
    console.log(`  · ${m.name}`);
    console.log(`    ${m.why}`);
  }
  console.log(`\nGuardalas en: ${OUTPUT_DIR}`);
  console.log('Después corré /usability-review en Claude Code.\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
