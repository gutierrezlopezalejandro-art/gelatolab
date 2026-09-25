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

const enTelefono = ({}, testInfo) => testInfo.project.name === 'iphone';

test.describe('Editor de recetas', () => {
  test('las 5 secciones son alcanzables', async ({ page }, testInfo) => {
    // Hoy en telefono la barra de pestanas completa esta oculta por la regla
    // `hidden sm:flex` y un matchMedia fuerza la seccion "Formulacion".
    test.fail(enTelefono({}, testInfo), 'Pendiente Fase 3: la barra de pestanas se oculta bajo 640px');

    await abrirApp(page, '/recipes/2');

    for (const seccion of [/Formulaci/i, /Proceso/i, /Curva/i, /Nutricional/i, /An.lisis/i]) {
      await expect(page.getByRole('button', { name: seccion })).toBeVisible();
    }
  });

  test('no se le sugiere al usuario irse al escritorio', async ({ page }, testInfo) => {
    // El aviso MobileDesktopHint manda al usuario al PC. En una app de
    // telefono vendida en la tienda, eso no puede existir.
    test.fail(enTelefono({}, testInfo), 'Pendiente Fase 3: MobileDesktopHint sigue presente');

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
 * Se localiza el boton por `title` y no por su nombre accesible porque su
 * unico contenido es "✓": para un lector de pantalla se llama "marca de
 * verificacion". Ademas ese `title` esta escrito en espanol fijo, sin pasar
 * por las traducciones, en una app con 6 idiomas.
 */
test.describe('Lista de recetas', () => {
  const SELECTOR = 'button[title="Seleccionar para reporte"]';

  test('la seleccion de recetas se puede tocar sin mouse', async ({ page }, testInfo) => {
    // El boton usa `opacity-0 group-hover:opacity-100`: solo aparece cuando
    // el mouse pasa por encima. En una pantalla tactil no hay hover.
    // OJO: esto NO es un problema solo del telefono. El iPad tampoco tiene
    // mouse, asi que la seleccion multiple esta rota en los dos perfiles.
    test.fail(true, 'Pendiente Fase 3: el boton depende de hover, roto en todo dispositivo tactil');

    await abrirApp(page, '/recipes');
    const opacidad = await page.locator(SELECTOR).first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacidad).not.toBe('0');
  });

  test('comparar y generar reporte estan disponibles al seleccionar', async ({ page }, testInfo) => {
    // Aun forzando la seleccion, ambos botones llevan `hidden sm:inline-block`
    // y bajo 640px se reemplazan por el texto "Disponible solo en escritorio".
    // No se puede cobrar por algo que el comprador no alcanza a ver.
    test.fail(enTelefono({}, testInfo), 'Pendiente Fase 3: ambos botones ocultos bajo 640px');

    await abrirApp(page, '/recipes');
    const seleccionar = page.locator(SELECTOR);
    await seleccionar.nth(0).click({ force: true });
    await seleccionar.nth(0).click({ force: true }); // la primera ya cambio de title

    await expect(page.getByText(/Disponible solo en escritorio/i)).toBeHidden();
    await expect(page.getByRole('button', { name: /Comparar/i })).toBeVisible();
  });
});

test.describe('Base de ingredientes', () => {
  test('no se le sugiere al usuario irse al escritorio', async ({ page }, testInfo) => {
    test.fail(enTelefono({}, testInfo), 'Pendiente Fase 3: MobileDesktopHint sigue presente');

    await abrirApp(page, '/ingredients');
    await expect(page.getByText(/Mejor experiencia en escritorio/i)).toHaveCount(0);
  });
});
