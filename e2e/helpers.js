import { expect } from '@playwright/test';

/**
 * Utilidades compartidas por las pruebas de extremo a extremo.
 */

/**
 * Abre la app saltandose los dos asistentes que aparecen en el primer
 * arranque, que si no bloquean la pantalla:
 *   1. "Configuremos tu heladeria" (OnboardingWizard)
 *   2. El tour de Marco de 8 pasos (WelcomeTour)
 *
 * El tour se desactiva antes de cargar la pagina escribiendo su marca en
 * localStorage; el asistente se salta por la interfaz, y ese "Saltar" queda
 * guardado, asi que no reaparece al recargar.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} ruta  Ruta interna de la app, ej. '/recipes'
 */
export async function abrirApp(page, ruta = '/dashboard') {
  await page.addInitScript(() => {
    try { localStorage.setItem('gelatolab-tour-seen', '1'); } catch { /* sin storage */ }
  });
  await page.goto(`/#${ruta}`);
  await saltarAsistenteInicial(page);
}

/** Salta el asistente de configuracion si esta visible. */
export async function saltarAsistenteInicial(page) {
  const saltar = page.getByRole('button', { name: /^Saltar$/ });
  if (await saltar.isVisible().catch(() => false)) {
    await saltar.click();
    await expect(saltar).toBeHidden();
  }
}

/**
 * Recarga la app conservando el almacenamiento del navegador. Es la forma de
 * simular "cerrar la app y volver a abrirla", que es lo que hay que verificar
 * ahora que el dispositivo es la unica copia de los datos.
 */
export async function reabrirApp(page, ruta = '/dashboard') {
  await page.goto(`/#${ruta}`);
  await page.waitForLoadState('networkidle');
  await saltarAsistenteInicial(page);
}

/**
 * Recolecta errores de consola durante la prueba. Se filtran los que no
 * dependen del codigo de la app (recursos externos, extensiones).
 */
export function vigilarConsola(page) {
  const errores = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const texto = msg.text();
    if (/favicon|net::ERR_INTERNET_DISCONNECTED|Failed to load resource/i.test(texto)) return;
    errores.push(texto);
  });
  page.on('pageerror', (err) => errores.push(String(err)));
  return errores;
}
