import { test, expect } from '@playwright/test';
import { abrirApp } from './helpers.js';

/**
 * PARIDAD DE FUNCIONES EN EL TELEFONO
 *
 * Regla del proyecto (decision del dueno, 2026-09-25):
 *   "Toda funcion esta disponible en el iPhone. El iPad no agrega funciones:
 *    agrega espacio."
 *
 * Estas pruebas son el criterio de aceptacion de la Fase 3. Varias FALLAN
 * hoy a proposito, marcadas con `test.fail` para el perfil iphone: describen
 * lo que la app TIENE que hacer, no lo que hace.
 *
 * Cuando la Fase 3 este lista, estas pruebas van a empezar a pasar y
 * Playwright va a avisar que la marca `test.fail` sobra. Ese es el momento
 * de quitarla: la prueba pasa a ser un candado permanente contra que alguien
 * vuelva a esconder funciones por tamano de pantalla.
 */

test.describe('Editor de recetas', () => {
  test('las 5 secciones son alcanzables', async ({ page }) => {
    // RESUELTO en la Fase 3. Antes la regla `hidden sm:flex` ocultaba la
    // barra entera bajo 640px y un matchMedia encerraba al usuario en
    // "Formulación". Queda como candado permanente.
    await abrirApp(page, '/recipes/2');

    for (const seccion of [/Formulaci/i, /Proceso/i, /Curva/i, /Nutricional/i, /An.lisis/i]) {
      await expect(page.getByRole('tab', { name: seccion })).toBeVisible();
    }
  });

  test('no se le sugiere al usuario irse al escritorio', async ({ page }) => {
    // RESUELTO en la Fase 3: MobileDesktopHint se elimino de toda la app.
    // La prueba queda como candado permanente.
    await abrirApp(page, '/recipes/2');
    await expect(page.getByText(/Mejor experiencia en escritorio/i)).toHaveCount(0);
  });
});

/**
 * "Generar reporte" y "Comparar recetas" son funciones DEL PLAN PRO
 * (PRINT_PRODUCTION y RECIPE_COMPARE estan en PRO_ONLY). Para llegar a ellas
 * en el telefono hay dos barreras encadenadas, y cada una tiene su prueba
 * para que quede claro que son dos arreglos distintos.
 *
 * RESUELTO en la Fase 3: el boton ya no depende del hover, tiene nombre
 * accesible propio y su texto sale de las traducciones.
 */
test.describe('Lista de recetas', () => {
  const SELECTOR = 'button[aria-pressed="false"]';

  test('la seleccion de recetas se puede tocar sin mouse', async ({ page }) => {
    // RESUELTO en la Fase 3. Antes el boton usaba
    // `opacity-0 group-hover:opacity-100` y solo aparecia con el mouse
    // encima, lo que lo hacia inalcanzable en telefono Y en iPad.

    await abrirApp(page, '/recipes');
    const opacidad = await page.locator(SELECTOR).first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacidad).not.toBe('0');
  });

  test('comparar y generar reporte estan disponibles al seleccionar', async ({ page }) => {
    // RESUELTO en la Fase 3: ambos botones perdieron el `hidden sm:` y el
    // texto "Disponible solo en escritorio" desaparecio. Son funciones del
    // plan Pro: no se puede cobrar por algo que el comprador no ve.

    await abrirApp(page, '/recipes');
    const seleccionar = page.locator(SELECTOR);
    await seleccionar.nth(0).click({ force: true });
    await seleccionar.nth(0).click({ force: true }); // la primera ya cambio de title

    await expect(page.getByText(/Disponible solo en escritorio/i)).toBeHidden();
    // Se usa el anclaje `data-tour` que la app ya tiene: buscar por el texto
    // "Comparar" trae tambien el contenido de la ayuda.
    await expect(page.locator('[data-tour="compare-btn"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Generar|reporte/i }).first()).toBeVisible();
  });
});

test.describe('Base de ingredientes', () => {
  test('no se le sugiere al usuario irse al escritorio', async ({ page }) => {
    // RESUELTO en la Fase 3. Candado permanente.
    await abrirApp(page, '/ingredients');
    await expect(page.getByText(/Mejor experiencia en escritorio/i)).toHaveCount(0);
  });
});
