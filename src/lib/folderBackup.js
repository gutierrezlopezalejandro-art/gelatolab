// Backup automatico a una carpeta REAL del PC del usuario.
//
// Tres caminos posibles segun donde corra la app:
//   1. App nativa Tauri (PROFESIONAL): usa el filesystem del SO directamente.
//      Carpeta default: Documents/GelatoLab/. Sin permisos ni picker; se
//      crea sola al primer arranque. Auto-sync silencioso desde el inicio.
//   2. Navegador con File System Access API (Chrome/Edge/Opera): el usuario
//      elige una carpeta una vez, se queda recordada. Auto-sync.
//   3. Navegador sin soporte (Firefox/Safari): no hay backup automatico
//      a carpeta; el usuario depende del export ZIP manual.
import { idbStoreValue, idbReadValue, idbDeleteValue } from './idbStorage';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useProductionStore } from '../store/productionStore';
import { usePlanStore } from '../store/planStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useBusinessStore } from '../store/businessStore';
import { useSupplierStore } from '../store/supplierStore';
import { useHaccpStore } from '../store/haccpStore';

// ── Deteccion de contexto ──────────────────────────────────
// Tauri inyecta __TAURI_INTERNALS__ (v2) o __TAURI__ (v1) en window.
export function isTauri() {
  if (typeof window === 'undefined') return false;
  return !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

// ── API Tauri (nativo) — carga perezosa para no romper el build web ──
let tauriFs = null;
let tauriPath = null;
async function loadTauri() {
  if (!isTauri()) return null;
  if (!tauriFs) {
    [tauriFs, tauriPath] = await Promise.all([
      import('@tauri-apps/plugin-fs'),
      import('@tauri-apps/api/path'),
    ]);
  }
  return { fs: tauriFs, path: tauriPath };
}

// Carpeta default cuando corremos como app nativa: Documents/GelatoLab/
const TAURI_FOLDER_NAME = 'GelatoLab';
async function tauriDefaultFolderPath() {
  const t = await loadTauri();
  if (!t) return null;
  const docs = await t.path.documentDir();
  return await t.path.join(docs, TAURI_FOLDER_NAME);
}

const HANDLE_KEY = '__gelatolab_folder_handle';
const LAST_SYNC_KEY = 'gelatolab-folder-last-sync';

const STORES = {
  recipes:     useRecipeStore,
  ingredients: useIngredientStore,
  productions: useProductionStore,
  plans:       usePlanStore,
  inventory:   useInventoryStore,
  business:    useBusinessStore,
  suppliers:   useSupplierStore,
  haccp:       useHaccpStore,
};

export function isFolderBackupSupported() {
  if (typeof window === 'undefined') return false;
  if (isTauri()) return true; // siempre soportado en app nativa
  return typeof window.showDirectoryPicker === 'function';
}

// Asegura que existe la carpeta nativa default (Documents/GelatoLab/) y
// guarda su path como "handle". Idempotente.
async function ensureTauriDefaultFolder() {
  const t = await loadTauri();
  if (!t) return null;
  const folderPath = await tauriDefaultFolderPath();
  const exists = await t.fs.exists(folderPath, { baseDir: undefined }).catch(() => false);
  if (!exists) {
    await t.fs.mkdir(folderPath, { recursive: true });
  }
  // Guardamos el path como string en IDB para que la UI pueda mostrarlo y la
  // logica trate igual el "handle" en web vs nativo.
  await idbStoreValue(HANDLE_KEY, { __tauri: true, path: folderPath, name: TAURI_FOLDER_NAME });
  return { __tauri: true, path: folderPath, name: TAURI_FOLDER_NAME };
}

export async function pickBackupFolder() {
  // En Tauri nativo: NO mostramos picker, creamos la carpeta default.
  if (isTauri()) {
    return await ensureTauriDefaultFolder();
  }
  // En web: el File System Access API exige picker.
  if (!isFolderBackupSupported()) throw new Error('UNSUPPORTED');
  const handle = await window.showDirectoryPicker({
    id: 'gelatolab-backup',
    mode: 'readwrite',
    startIn: 'documents',
  });
  await idbStoreValue(HANDLE_KEY, handle);
  return handle;
}

export async function getStoredFolderHandle() {
  if (!isFolderBackupSupported()) return null;
  try {
    const handle = await idbReadValue(HANDLE_KEY);
    return handle || null;
  } catch {
    return null;
  }
}

export async function ensureFolderPermission(handle, { interactive = false } = {}) {
  if (!handle) return false;
  // Tauri tiene permiso vivo siempre (concedido en capabilities/default.json).
  if (handle.__tauri) return true;
  // Validacion defensiva: si el handle guardado no es realmente un
  // FileSystemDirectoryHandle (puede pasar despues de cerrar el navegador
  // y abrir desde otro contexto, o si IDB se corrompio), limpiamos y
  // devolvemos false en vez de tirar error.
  if (typeof handle.queryPermission !== 'function') {
    try { await idbDeleteValue(HANDLE_KEY); } catch {}
    return false;
  }
  const opts = { mode: 'readwrite' };
  let perm = await handle.queryPermission(opts);
  if (perm === 'granted') return true;
  if (!interactive) return false;
  if (typeof handle.requestPermission !== 'function') return false;
  perm = await handle.requestPermission(opts);
  return perm === 'granted';
}

export async function disconnectFolder() {
  await idbDeleteValue(HANDLE_KEY);
}

// Escribe todos los stores como archivos JSON dentro de la carpeta. Sobre-
// escribe cada archivo (no acumula historico). Ademas escribe meta.json con
// fecha y version para identificar el contenido.
export async function writeAllStoresToFolder(handle) {
  if (!handle) return { ok: false, error: 'NO_HANDLE' };
  const ok = await ensureFolderPermission(handle, { interactive: false });
  if (!ok) return { ok: false, error: 'NO_PERMISSION' };

  const meta = {
    version: 1,
    written_at: new Date().toISOString(),
    app: 'GelatoLab',
    runtime: handle.__tauri ? 'tauri' : 'web',
  };
  await writeJson(handle, 'meta.json', meta);

  for (const [name, useStore] of Object.entries(STORES)) {
    const state = useStore.getState();
    const data = Object.fromEntries(
      Object.entries(state).filter(([_, v]) => typeof v !== 'function')
    );
    await writeJson(handle, `${name}.json`, data);
  }

  try {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch { /* tolerable */ }
  return { ok: true };
}

async function writeJson(folderHandle, filename, data) {
  const text = JSON.stringify(data, null, 2);
  if (folderHandle.__tauri) {
    // Camino nativo: escribir directo al filesystem via plugin-fs.
    const t = await loadTauri();
    const filePath = await t.path.join(folderHandle.path, filename);
    await t.fs.writeTextFile(filePath, text);
    return;
  }
  // Camino web: File System Access API.
  const fileHandle = await folderHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

// ── Snapshots diarios ──────────────────────────────────────
// Una vez por dia, escribe una copia con timestamp dentro de
// snapshots/YYYY-MM-DD/ asi tenes historial dia por dia. Idempotente: si ya
// existe el snapshot de hoy, no hace nada. Hace prune automatico de los
// snapshots con mas de N dias para que la carpeta no crezca infinito.
const LAST_SNAPSHOT_KEY = 'gelatolab-last-snapshot';
const SNAPSHOT_RETENTION_DAYS = 30;

function todayStr() { return new Date().toISOString().slice(0, 10); }

async function writeJsonInSubfolder(folderHandle, subfolder, filename, data) {
  const text = JSON.stringify(data, null, 2);
  if (folderHandle.__tauri) {
    const t = await loadTauri();
    const subPath = await t.path.join(folderHandle.path, subfolder);
    const exists = await t.fs.exists(subPath).catch(() => false);
    if (!exists) await t.fs.mkdir(subPath, { recursive: true });
    const filePath = await t.path.join(subPath, filename);
    await t.fs.writeTextFile(filePath, text);
    return;
  }
  // Web: File System Access API tiene getDirectoryHandle({create:true}).
  const subHandle = await folderHandle.getDirectoryHandle(subfolder, { create: true });
  const fileHandle = await subHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function writeDailySnapshot(handle) {
  if (!handle) return { ok: false, error: 'NO_HANDLE' };
  const ok = await ensureFolderPermission(handle, { interactive: false });
  if (!ok) return { ok: false, error: 'NO_PERMISSION' };

  const today = todayStr();
  // Guard: si ya escribimos snapshot de hoy, salimos.
  try {
    const last = localStorage.getItem(LAST_SNAPSHOT_KEY);
    if (last === today) return { ok: true, skipped: true };
  } catch { /* tolerable */ }

  const subfolder = `snapshots/${today}`;
  const meta = {
    version: 1,
    written_at: new Date().toISOString(),
    snapshot_date: today,
    app: 'GelatoLab',
    runtime: handle.__tauri ? 'tauri' : 'web',
  };
  await writeJsonInSubfolder(handle, subfolder, 'meta.json', meta);

  for (const [name, useStore] of Object.entries(STORES)) {
    const state = useStore.getState();
    const data = Object.fromEntries(
      Object.entries(state).filter(([_, v]) => typeof v !== 'function')
    );
    await writeJsonInSubfolder(handle, subfolder, `${name}.json`, data);
  }

  try { localStorage.setItem(LAST_SNAPSHOT_KEY, today); } catch {}

  // Prune: borra snapshots con mas de N dias.
  await pruneOldSnapshots(handle).catch(e =>
    console.warn('snapshot prune failed:', e)
  );

  return { ok: true, date: today };
}

async function pruneOldSnapshots(handle) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SNAPSHOT_RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  if (handle.__tauri) {
    const t = await loadTauri();
    const snapshotsDir = await t.path.join(handle.path, 'snapshots');
    const exists = await t.fs.exists(snapshotsDir).catch(() => false);
    if (!exists) return;
    const entries = await t.fs.readDir(snapshotsDir).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      const name = entry.name;
      if (/^\d{4}-\d{2}-\d{2}$/.test(name) && name < cutoffStr) {
        const oldPath = await t.path.join(snapshotsDir, name);
        await t.fs.remove(oldPath, { recursive: true }).catch(() => {});
      }
    }
    return;
  }
  // Web: iterar el directorio snapshots y borrar dias viejos.
  try {
    const snapshotsHandle = await handle.getDirectoryHandle('snapshots', { create: false });
    for await (const [name, entry] of snapshotsHandle.entries()) {
      if (entry.kind !== 'directory') continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(name) && name < cutoffStr) {
        await snapshotsHandle.removeEntry(name, { recursive: true }).catch(() => {});
      }
    }
  } catch { /* sin carpeta snapshots, ok */ }
}

export function getLastSyncDate() {
  try {
    const v = localStorage.getItem(LAST_SYNC_KEY);
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// Debounce y suscribe a todos los stores. Cuando alguno cambia, programa una
// escritura. Si la carpeta no esta conectada o no hay permiso, no hace nada.
let unsubscribers = [];
let timer = null;

async function flushNow() {
  const handle = await getStoredFolderHandle();
  if (!handle) return;
  const ok = await ensureFolderPermission(handle, { interactive: false });
  if (!ok) return;
  await writeAllStoresToFolder(handle).catch(e =>
    console.warn('folderBackup: auto-sync failed', e)
  );
}

function scheduleFlush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushNow, 2000);
}

export function startFolderAutoSync() {
  // Idempotente: limpia suscripciones previas.
  stopFolderAutoSync();
  for (const useStore of Object.values(STORES)) {
    unsubscribers.push(useStore.subscribe(scheduleFlush));
  }
}

export function stopFolderAutoSync() {
  unsubscribers.forEach(u => { try { u(); } catch {} });
  unsubscribers = [];
  if (timer) { clearTimeout(timer); timer = null; }
}
