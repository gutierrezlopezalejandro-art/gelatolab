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
test.describe('Ficha de detalle del ingrediente', () => {
  test('la tabla de formulacion cabe en el telefono', async ({ page }, testInfo) => {
    // El desglose por ingrediente ocupaba ocho columnas permanentes y
    // obligaba a desplazar la tabla en horizontal. Ahora son tres datos.
    test.skip(testInfo.project.name !== 'iphone', 'solo aplica al telefono');

    await abrirApp(page, '/recipes/2');
    const medidas = await page.locator('table').first().evaluate((t) => ({
      tabla: t.scrollWidth,
      contenedor: t.parentElement.clientWidth,
      ventana: window.innerWidth,
    }));
    expect(medidas.tabla, 'la tabla se sale del contenedor').toBeLessThanOrEqual(medidas.contenedor);
    expect(medidas.contenedor, 'el contenedor se sale de la pantalla').toBeLessThanOrEqual(medidas.ventana);
  });

  test('el desglose completo sigue disponible al tocar la fila', async ({ page }) => {
    // Nada se elimino: agua, grasa, SNG, azucar, otros, POD, PAC y costo
    // dejaron de ocupar columnas y viven en la ficha.
    await abrirApp(page, '/recipes/2');
    await page.getByRole('button', { name: /Ver detalle del ingrediente/i }).first().click();

    const ficha = page.getByRole('dialog');
    await expect(ficha).toBeVisible();
    for (const dato of [/Agua/i, /Grasa/i, /SNG/i, /Az.car/i, /Otros/i, /POD/, /PAC/, /Costo/i]) {
      await expect(ficha.getByText(dato).first()).toBeVisible();
    }

    // Se cierra con Escape.
    await page.keyboard.press('Escape');
    await expect(ficha).toBeHidden();
  });
});

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

test.describe('Asistente flotante', () => {
  test('no tapa los botones de accion de las filas', async ({ page }) => {
    // Medido en 390x664: la burbuja ocupaba de (306,580) a (370,644) y el
    // boton de ficha de la fila que quedara abajo caia justo debajo. Como
    // las acciones de las tablas van pegadas al borde derecho, el choque se
    // repetia en cualquier fila al desplazar. La burbuja se movio a la
    // izquierda en telefono.
    await abrirApp(page, '/ingredients');

    const tapado = await page.evaluate(() => {
      const burbuja = document.querySelector('button[aria-label*="asistente"], button[aria-label*="ayuda"]');
      if (!burbuja) return 'sin burbuja';
      const b = burbuja.getBoundingClientRect();
      // Se recorre la lista comprobando que ningun boton de accion visible
      // caiga dentro del area de la burbuja.
      const acciones = [...document.querySelectorAll('button[aria-label="Ver ficha del ingrediente"]')];
      for (const a of acciones) {
        const r = a.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue; // fuera de pantalla
        const solapa = !(r.right < b.left || r.left > b.right || r.bottom < b.top || r.top > b.bottom);
        if (solapa) return `fila tapada en y=${Math.round(r.top)}`;
      }
      return null;
    });

    expect(tapado, 'el asistente flotante tapa un boton de accion').toBeNull();
  });
});

test.describe('Base de ingredientes', () => {
  test('todo lo que estaba escondido en telefono esta disponible', async ({ page }) => {
    // Habia 10 reglas `hidden sm:` que en un telefono dejaban la pantalla
    // reducida a nombre y categoria: sin conteo fisico, sin proveedores, sin
    // exportar ni importar, sin las pestanas de vista y sin NINGUNO de los
    // 21 datos numericos.
    await abrirApp(page, '/ingredients');

    await expect(page.getByRole('button', { name: /Conteo f.sico/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Proveedores/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exportar Excel/i })).toBeVisible();
    await expect(page.getByText(/Importar Excel/i)).toBeVisible();

    // Las tres vistas se pueden elegir desde el telefono.
    for (const vista of [/Formulaci/i, /Nutrici/i, /Inventario/i]) {
      await expect(page.getByRole('tab', { name: vista })).toBeVisible();
    }
  });

  test('la ficha trae los tres grupos de datos juntos', async ({ page }) => {
    // Antes habia que cambiar de pestana para editar los de nutricion,
    // aunque se estuviera mirando el mismo ingrediente.
    await abrirApp(page, '/ingredients');
    // Se centra antes de tocar: el asistente flotante ocupa la esquina
    // inferior derecha y el desplazamiento minimo puede dejar el boton justo
    // debajo.
    const abrirFicha = page.getByRole('button', { name: /Ver ficha del ingrediente/i }).first();
    await abrirFicha.scrollIntoViewIfNeeded();
    await abrirFicha.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const ficha = page.getByRole('dialog');
    await expect(ficha).toBeVisible();
    await expect(ficha.getByRole('heading', { name: /Formulaci/i })).toBeVisible();
    await expect(ficha.getByRole('heading', { name: /Nutrici/i })).toBeVisible();
    await expect(ficha.getByRole('heading', { name: /Inventario/i })).toBeVisible();
  });

  test('las columnas de cacao quedan aparte y plegadas', async ({ page }) => {
    // Las usan 3 ingredientes de 91, y `other_fat_pct` no lo usa ninguno.
    // Siguen disponibles, pero no estorban.
    await abrirApp(page, '/ingredients');
    const abrir = page.getByRole('button', { name: /Ver ficha del ingrediente/i }).first();
    await abrir.scrollIntoViewIfNeeded();
    await abrir.click();

    const ficha = page.getByRole('dialog');
    await expect(ficha).toBeVisible();
    const grupo = ficha.getByText(/Cacao y grasas vegetales/i);
    await expect(grupo).toBeVisible();
    // Plegado: el campo no se ve hasta abrirlo.
    await expect(ficha.getByLabel('Cocoa fat %')).toBeHidden();
    await grupo.click();
    await expect(ficha.getByLabel('Cocoa fat %')).toBeVisible();
  });


  test('no se le sugiere al usuario irse al escritorio', async ({ page }) => {
    // RESUELTO en la Fase 3. Candado permanente.
    await abrirApp(page, '/ingredients');
    await expect(page.getByText(/Mejor experiencia en escritorio/i)).toHaveCount(0);
  });
});
