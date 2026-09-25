import { test, expect } from '@playwright/test';
import { abrirApp, vigilarConsola } from './helpers.js';

/**
 * Pruebas de arranque: que la app abra y que todas sus pantallas carguen sin
 * romperse, en telefono y en iPad.
 *
 * Cubren el hueco que dejo la Fase 0: un `user is not defined` sobrevivio a
 * la compilacion porque las variables libres dentro del JSX solo fallan al
 * ejecutarse. Una pantalla en blanco no la detecta ningun compilador.
 */

const PANTALLAS = [
  { ruta: '/dashboard',   titulo: /Dashboard/i },
  { ruta: '/recipes',     titulo: /Recetas/i },
  { ruta: '/plan',        titulo: /Planificaci/i },
  { ruta: '/production',  titulo: /Producci/i },
  { ruta: '/haccp',       titulo: /HACCP/i },
  { ruta: '/ingredients', titulo: /Ingredientes/i },
  { ruta: '/batch',       titulo: /tanda|lote/i },
];

test.describe('Arranque', () => {
  test('la app abre sin pedir cuenta', async ({ page }) => {
    const errores = vigilarConsola(page);
    await abrirApp(page, '/dashboard');

    // Nada de iniciar sesion ni registrarse: esas pantallas ya no existen.
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Iniciar sesi|Crear cuenta/i)).toHaveCount(0);

    expect(errores, `errores de consola: ${errores.join(' | ')}`).toHaveLength(0);
  });

  test('la raiz entra directo a la app, sin pagina de marketing', async ({ page }) => {
    await abrirApp(page, '/');
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });

  for (const { ruta, titulo } of PANTALLAS) {
    test(`carga ${ruta} sin errores`, async ({ page }) => {
      const errores = vigilarConsola(page);
      await abrirApp(page, ruta);

      // Que haya contenido real, no una pantalla en blanco.
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('heading').first()).toBeVisible();
      expect(errores, `errores en ${ruta}: ${errores.join(' | ')}`).toHaveLength(0);
    });
  }

  test('la configuracion del negocio sigue siendo alcanzable', async ({ page }) => {
    // UserMenu se elimino con las cuentas y era la UNICA via de acceso a este
    // modal. Esta prueba existe para que no vuelva a quedar huerfano.
    await abrirApp(page, '/dashboard');
    await page.getByRole('button', { name: /Configuraci.n del negocio/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
