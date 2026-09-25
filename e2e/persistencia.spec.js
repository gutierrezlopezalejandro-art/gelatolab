import { test, expect } from '@playwright/test';
import { abrirApp, reabrirApp, vigilarConsola } from './helpers.js';

/**
 * LA PRUEBA MAS IMPORTANTE DEL PROYECTO.
 *
 * Al desconectar Supabase, el dispositivo quedo como UNICA copia del
 * recetario de una heladeria. Si un dato no sobrevive a cerrar y abrir la
 * app, el usuario pierde su trabajo y no hay nube de donde recuperarlo.
 *
 * Estas pruebas recorren el camino completo: crear, guardar, reabrir y
 * verificar que sigue ahi. Cubren el adaptador `appStorage`, que en web usa
 * IndexedDB y en la app nativa escribe archivos.
 */

test.describe('Persistencia de datos', () => {
  test('una receta nueva sobrevive a cerrar y abrir la app', async ({ page }) => {
    const errores = vigilarConsola(page);
    const nombre = `Pistacho de prueba ${Date.now()}`;

    await abrirApp(page, '/recipes/new');

    // El nombre de la receta es un input editable, no un encabezado: el h1
    // existe pero esta oculto para lectores de pantalla.
    const campoNombre = page.locator('#recipe-name-input');
    await expect(campoNombre).toBeVisible();
    await campoNombre.fill(nombre);

    await page.getByRole('button', { name: /Guardar/ }).click();

    // Al guardar una receta nueva, la app navega a su ficha.
    await expect(page).toHaveURL(/#\/recipes\/\d+/);

    // Ahora lo que importa: cerrar y volver a abrir.
    await reabrirApp(page, '/recipes');
    await expect(page.getByText(nombre)).toBeVisible();

    expect(errores, `errores de consola: ${errores.join(' | ')}`).toHaveLength(0);
  });

  test('las recetas de fabrica estan disponibles al primer arranque', async ({ page }) => {
    await abrirApp(page, '/recipes');
    // La app trae mas de 30 recetas precargadas; se verifica una conocida.
    await expect(page.getByText('Vainilla Clásica')).toBeVisible();
  });

  test('el idioma elegido se conserva al reabrir', async ({ page }) => {
    // Se verifica sobre el titulo de la pagina y no sobre el menu de
    // navegacion, porque en telefono los enlaces viven dentro del cajon
    // plegable y no estan visibles.
    await abrirApp(page, '/recipes');
    await expect(page.getByRole('heading', { level: 1, name: 'Recetas' })).toBeVisible();

    await page.getByRole('button', { name: /Idioma/ }).click();
    await page.getByRole('option', { name: /English/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Recipes' })).toBeVisible();

    await reabrirApp(page, '/recipes');
    await expect(page.getByRole('heading', { level: 1, name: 'Recipes' })).toBeVisible();
  });
});
