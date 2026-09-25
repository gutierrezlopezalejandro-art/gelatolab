// ===========================================================================
// appStorage — almacenamiento persistente de la app, compatible con
// `zustand/middleware` (createJSONStorage).
//
// POR QUE EXISTE
// --------------
// Hasta la version 1.1.0 todos los stores persistian en IndexedDB via
// `idbStorage`. Eso funcionaba porque Supabase mantenia una copia en la nube:
// si el navegador perdia la base local, el dato se recuperaba al sincronizar.
//
// Al desconectar Supabase el dispositivo pasa a ser la UNICA copia, y ahi
// IndexedDB deja de ser aceptable: dentro de un WKWebView de iOS el sistema
// operativo puede purgar el almacenamiento del webview cuando el dispositivo
// se queda sin espacio. Perder esa base significa perder el recetario
// completo de una heladeria.
//
// COMO FUNCIONA
// -------------
// - En app nativa (Capacitor) escribe archivos en `Directory.Data`, que en
//   iOS apunta al directorio Documents de la app y en Android al directorio
//   de archivos de la app. Ambos entran en el respaldo del sistema (iCloud /
//   Google) y solo se borran si el usuario desinstala.
// - En web (desarrollo, y el sitio mientras siga existiendo) delega en el
//   `idbStorage` de siempre, sin cambios de comportamiento.
//
// GARANTIAS EN NATIVO
// -------------------
// 1. Escritura atomica: se escribe `<clave>.tmp`, recien despues se publica
//    como `<clave>.json`. Un cierre forzado a mitad de guardado nunca deja
//    el archivo bueno a medio escribir.
// 2. Copia rotativa: antes de publicar, el archivo vigente se copia a
//    `<clave>.bak`. Siempre hay una ultima version buena conocida.
// 3. Lectura con recuperacion: se intenta `.json`, luego `.tmp`, luego
//    `.bak`, descartando cualquiera que no sea JSON valido.
// 4. Escrituras serializadas por clave: zustand persiste en cada cambio de
//    estado, asi que dos guardados de la misma clave podrian pisarse. Cada
//    clave tiene su propia cola.
// 5. Migracion perezosa: la primera lectura de una clave que no existe en
//    disco la busca en IndexedDB y la traslada. Asi una instalacion previa
//    (APK antiguo, PWA convertida) no pierde sus datos.
// ===========================================================================

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { idbStorage } from './idbStorage';

const DIR = Directory.Data;
const ROOT = 'gelatolab';

// Vite reemplaza esto en build; en tests puede no existir.
const isNative = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

export function isNativeStorage() { return isNative; }

// Las claves en uso son del tipo `gelatolab-haccp` o `heladeria-ingredients`,
// todas seguras como nombre de archivo. Saneamos igual por si se agrega una
// clave nueva con caracteres raros.
function safeName(name) {
  return String(name).replace(/[^A-Za-z0-9._-]/g, '_');
}

const pathMain = (name) => `${ROOT}/${safeName(name)}.json`;
const pathTmp  = (name) => `${ROOT}/${safeName(name)}.tmp`;
const pathBak  = (name) => `${ROOT}/${safeName(name)}.bak`;

let dirReady = null;
function ensureDir() {
  if (dirReady) return dirReady;
  dirReady = Filesystem.mkdir({ path: ROOT, directory: DIR, recursive: true })
    .catch((e) => {
      // mkdir lanza si el directorio ya existe; eso no es un error.
      const msg = String(e?.message || e);
      if (/exist/i.test(msg)) return;
      throw e;
    });
  return dirReady;
}

async function readIfValid(path) {
  let res;
  try {
    res = await Filesystem.readFile({ path, directory: DIR, encoding: Encoding.UTF8 });
  } catch {
    return null; // no existe
  }
  const data = typeof res?.data === 'string' ? res.data : null;
  if (data == null || data === '') return null;
  try {
    JSON.parse(data); // solo validacion: el adapter devuelve el string crudo
    return data;
  } catch {
    console.warn('[appStorage] archivo descartado por JSON invalido:', path);
    return null;
  }
}

async function deleteQuiet(path) {
  try { await Filesystem.deleteFile({ path, directory: DIR }); } catch { /* no existia */ }
}

// ── Cola de escritura por clave ────────────────────────────────────────────
// Evita que dos setItem simultaneos de la misma clave se pisen entre si
// durante la secuencia tmp → bak → rename.
//
// Se aplica en los DOS backends, no solo en el nativo, porque tambien es lo
// que permite saber cuando terminaron de escribirse los datos. Ver
// `flushPendingWrites()`.
const queues = new Map();
function enqueue(name, task) {
  const prev = queues.get(name) || Promise.resolve();
  const next = prev.then(task, task);
  // La cola no debe romperse si una tarea falla.
  queues.set(name, next.catch(() => {}));
  return next;
}

/**
 * Espera a que terminen TODAS las escrituras pendientes.
 *
 * POR QUE EXISTE: `zustand/persist` escribe a disco de forma asincronica
 * despues de cada `setState`. Al restaurar un respaldo se reponen los ocho
 * stores y acto seguido se recarga la app para que todas las pantallas lean
 * el estado nuevo. Si la recarga llega antes de que terminen las escrituras,
 * **la restauracion se pierde en silencio** y el usuario cree que recupero
 * sus datos cuando no.
 *
 * NOTA DE PRECISION: la intermitencia que se vio en las pruebas de extremo a
 * extremo NO venia de aqui, venia de la propia prueba, que borraba la base de
 * datos con la app abierta. Esta espera es un blindaje legitimo igual: el
 * plazo de medio segundo que usa la restauracion antes de recargar alcanza
 * hoy, pero no hay nada que lo garantice con un recetario grande o un disco
 * lento. Con esto deja de depender del azar.
 */
export async function flushPendingWrites() {
  // Se toma una foto de las colas vivas y se esperan. Si mientras tanto
  // entran escrituras nuevas, entran a la misma cola y quedan encadenadas
  // detras, asi que esperar la ultima alcanza.
  const pendientes = [...queues.values()];
  await Promise.allSettled(pendientes);
  // Segunda pasada: una escritura puede haber encolado otra.
  await Promise.allSettled([...queues.values()]);
}

async function writeNative(name, value) {
  await ensureDir();
  const main = pathMain(name);
  const tmp  = pathTmp(name);
  const bak  = pathBak(name);

  // 1. Escribir la version nueva en un archivo aparte.
  await Filesystem.writeFile({ path: tmp, data: value, directory: DIR, encoding: Encoding.UTF8 });

  // 2. Rotar la version vigente a respaldo, si la hay.
  try {
    await Filesystem.stat({ path: main, directory: DIR });
    await deleteQuiet(bak);
    await Filesystem.copy({ from: main, to: bak, directory: DIR, toDirectory: DIR });
  } catch { /* no habia version previa: nada que rotar */ }

  // 3. Publicar. `rename` no sobrescribe de forma confiable en las dos
  //    plataformas, asi que se borra primero. La ventana entre el borrado y
  //    el rename queda cubierta por la lectura, que sabe leer el `.tmp`.
  await deleteQuiet(main);
  await Filesystem.rename({ from: tmp, to: main, directory: DIR, toDirectory: DIR });
}

async function readNative(name) {
  // `.tmp` va antes que `.bak`: si existe, es una escritura que alcanzo a
  // completarse y quedo sin publicar, o sea mas nueva que el respaldo.
  for (const path of [pathMain(name), pathTmp(name), pathBak(name)]) {
    const data = await readIfValid(path);
    if (data != null) return data;
  }

  // Migracion perezosa desde IndexedDB (instalacion previa).
  let legacy = null;
  try { legacy = await idbStorage.getItem(name); } catch { /* sin IndexedDB */ }
  if (legacy != null) {
    try {
      JSON.parse(legacy);
      await enqueue(name, () => writeNative(name, legacy));
      console.info('[appStorage] migrada clave desde IndexedDB:', name);
      return legacy;
    } catch {
      console.warn('[appStorage] clave legacy con JSON invalido, ignorada:', name);
    }
  }
  return null;
}

export const appStorage = {
  getItem: async (name) => {
    if (!isNative) return idbStorage.getItem(name);
    try {
      return await readNative(name);
    } catch (e) {
      // Nunca dejar caer el arranque de la app por un problema de disco:
      // se degrada a IndexedDB, que en el peor caso esta vacio.
      console.error('[appStorage] getItem fallo, se degrada a IndexedDB:', name, e);
      try { return await idbStorage.getItem(name); } catch { return null; }
    }
  },

  setItem: async (name, value) => {
    // La cola envuelve los dos backends: ademas de evitar que dos escrituras
    // de la misma clave se pisen, es lo que hace que `flushPendingWrites()`
    // pueda esperarlas.
    if (!isNative) return enqueue(name, () => idbStorage.setItem(name, value));
    try {
      await enqueue(name, () => writeNative(name, value));
    } catch (e) {
      console.error('[appStorage] setItem fallo, se escribe en IndexedDB:', name, e);
      try { await idbStorage.setItem(name, value); } catch { /* sin salida */ }
    }
  },

  removeItem: async (name) => {
    if (!isNative) return enqueue(name, () => idbStorage.removeItem(name));
    try {
      await enqueue(name, async () => {
        await deleteQuiet(pathMain(name));
        await deleteQuiet(pathTmp(name));
        await deleteQuiet(pathBak(name));
      });
    } catch (e) {
      console.error('[appStorage] removeItem fallo:', name, e);
    }
  },
};

// Diagnostico: que archivos existen y de que tamano. Lo consume
// DiagnosticPanel para que un usuario pueda reportar el estado real.
export async function storageDiagnostics() {
  if (!isNative) return { backend: 'indexeddb', files: [] };
  try {
    await ensureDir();
    const { files } = await Filesystem.readdir({ path: ROOT, directory: DIR });
    return {
      backend: 'filesystem',
      directory: DIR,
      files: files.map(f => ({ name: f.name, size: f.size, mtime: f.mtime })),
    };
  } catch (e) {
    return { backend: 'filesystem', error: String(e?.message || e), files: [] };
  }
}
