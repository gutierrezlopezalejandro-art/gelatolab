import { test, expect } from '@playwright/test';
import { abrirApp, reabrirApp } from './helpers.js';

/**
 * RESPALDO Y RESTAURACION (Fase 1)
 *
 * Al no haber nube propia, esta es la unica forma que tiene el heladero de
 * sacar una copia de su recetario y llevarsela. Si este camino se rompe,
 * un telefono perdido significa perder el trabajo de anios.
 *
 * NOTA SOBRE EL ENTORNO: estas pruebas corren en navegador, donde el archivo
 * se entrega como descarga. En la app nativa el mismo archivo sale por la
 * hoja de compartir hacia el Drive del usuario. El contenido del respaldo y
 * la restauracion son identicos en ambos casos; lo unico que cambia es el
 * ultimo paso de entrega, que hay que probar en un dispositivo real.
 */

/** Abre la configuracion del negocio desde la barra superior. */
async function abrirConfiguracion(page) {
  await page.getByRole('button', { name: /Configuraci.n del negocio/i }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  // Se devuelve el dialogo para acotar los selectores: el recordatorio del
  // panel tiene un boton "Respaldar ahora" con el mismo nombre.
  return dialogo;
}

test.describe('Copia de seguridad', () => {
  test('la seccion de respaldo esta visible y no se cobra por ella', async ({ page }) => {
    await abrirApp(page, '/dashboard');
    const d = await abrirConfiguracion(page);

    await expect(d.getByRole('heading', { name: /Copia de seguridad/i })).toBeVisible();
    await expect(d.getByRole('button', { name: /Respaldar ahora/i })).toBeVisible();
    await expect(d.getByRole('button', { name: /Restaurar desde una copia/i })).toBeVisible();

    // Sin copia previa, lo dice explicitamente en vez de quedar en blanco.
    await expect(d.getByText(/Nunca has hecho una copia/i)).toBeVisible();
  });

  test('ya no se ofrece conectar una carpeta del PC', async ({ page }) => {
    // El respaldo a carpeta dependia de una API que no existe en un telefono.
    // Ofrecerlo era mandar al usuario a un callejon sin salida.
    await abrirApp(page, '/dashboard');
    await abrirConfiguracion(page);
    await expect(page.getByText(/carpeta de tu PC/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Conectar carpeta/i })).toHaveCount(0);
  });

  test('telefono nuevo: respaldar aqui, restaurar alla', async ({ page, browser }) => {
    // Este es el escenario que de verdad importa: el heladero pierde el
    // telefono y estrena otro. Se simula con un contexto de navegador nuevo,
    // que arranca con el almacenamiento vacio igual que una instalacion
    // limpia.
    //
    // NO se simula borrando la base de datos del contexto actual: la app la
    // tiene abierta, el borrado queda bloqueado y la app sigue escribiendo
    // contra una conexion que ya no existe. Eso no le pasa a un usuario real
    // y hacia la prueba intermitente.
    const nombre = `Respaldo de prueba ${Date.now()}`;

    // ── Telefono viejo ──────────────────────────────────────────────────
    await abrirApp(page, '/recipes/new');
    await page.locator('#recipe-name-input').fill(nombre);
    await page.getByRole('button', { name: /Guardar/ }).click();
    await expect(page).toHaveURL(/#\/recipes\/\d+/);

    await reabrirApp(page, '/dashboard');
    const ajustes = await abrirConfiguracion(page);
    const descarga = page.waitForEvent('download');
    await ajustes.getByRole('button', { name: /Respaldar ahora/i }).click();
    const archivo = await descarga;
    const ruta = await archivo.path();
    expect(archivo.suggestedFilename()).toMatch(/^gelatolab-respaldo-\d{4}-\d{2}-\d{2}\.zip$/);

    // ── Telefono nuevo ──────────────────────────────────────────────────
    const contextoNuevo = await browser.newContext();
    const nuevo = await contextoNuevo.newPage();
    try {
      await abrirApp(nuevo, '/recipes');
      // Arranca limpio: estan las recetas de fabrica, no la del usuario.
      await expect(nuevo.getByText('Vainilla Clásica')).toBeVisible();
      await expect(nuevo.getByText(nombre)).toHaveCount(0);

      await nuevo.getByRole('button', { name: /Configuraci.n del negocio/i }).click();
      const ajustesNuevo = nuevo.getByRole('dialog');
      await expect(ajustesNuevo).toBeVisible();
      await ajustesNuevo.locator('input[type="file"]').setInputFiles(ruta);

      // La app se recarga sola medio segundo despues de restaurar. Hay que
      // armar la espera ANTES de confirmar: si se arma despues, la recarga
      // puede dispararse en medio de la siguiente navegacion.
      const recarga = nuevo.waitForEvent('load');
      await nuevo.getByRole('button', { name: /^Confirmar$/i }).click();
      await recarga;

      await reabrirApp(nuevo, '/recipes');
      await expect(nuevo.getByText(nombre)).toBeVisible();
    } finally {
      await contextoNuevo.close();
    }
  });
});
