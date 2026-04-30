// Adaptador de IndexedDB compatible con `zustand/middleware` (createJSONStorage).
// Razon: localStorage tiene cuota baja (~5 MB) y se borra con "limpiar caché".
// IndexedDB tiene quota mucho mayor (cientos de MB) y sobrevive limpiezas
// regulares — solo se borra si el usuario hace "borrar todos los datos del
// sitio" explicitamente.
//
// Migracion lazy: el primer getItem de cada clave intenta IndexedDB; si esta
// vacio, lee de localStorage y copia a IndexedDB. Asi los datos viejos se
// trasladan sin necesidad de un script de migracion bloqueante al arranque.

const DB_NAME = 'gelatolab-db';
const STORE = 'kv';
const VERSION = 1;

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
    req.onblocked = () => reject(new Error('IDB blocked'));
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    let result;
    try { result = fn(s); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onabort    = () => reject(t.error);
    t.onerror    = () => reject(t.error);
  }));
}

function idbGet(key) {
  return tx('readonly', s => s.get(key)).then(v => (v === undefined ? null : v));
}
function idbSet(key, value) {
  return tx('readwrite', s => s.put(value, key));
}
function idbDel(key) {
  return tx('readwrite', s => s.delete(key));
}

const supportsIdb = typeof indexedDB !== 'undefined';

// Adapter para `createJSONStorage(() => idbStorage)`.
export const idbStorage = {
  getItem: async (name) => {
    if (!supportsIdb) return localStorage.getItem(name);
    try {
      let v = await idbGet(name);
      if (v == null && typeof localStorage !== 'undefined') {
        // Migracion lazy: trasladamos la clave de localStorage la primera vez.
        const fromLs = localStorage.getItem(name);
        if (fromLs != null) {
          try { await idbSet(name, fromLs); } catch { /* non-fatal */ }
          v = fromLs;
        }
      }
      return v;
    } catch (e) {
      console.warn('idbStorage.getItem fallback to localStorage:', name, e);
      return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
    }
  },
  setItem: async (name, value) => {
    if (!supportsIdb) {
      try { localStorage.setItem(name, value); } catch {}
      return;
    }
    try { await idbSet(name, value); } catch (e) {
      console.warn('idbStorage.setItem fallback:', name, e);
      try { localStorage.setItem(name, value); } catch {}
    }
  },
  removeItem: async (name) => {
    if (!supportsIdb) {
      try { localStorage.removeItem(name); } catch {}
      return;
    }
    try { await idbDel(name); } catch (e) {
      console.warn('idbStorage.removeItem fallback:', name, e);
    }
  },
};

// Helper para guardar/leer datos arbitrarios desde la app (handle de carpeta,
// configuraciones, etc.) sin pasar por el adapter de zustand.
export async function idbStoreValue(key, value) { return idbSet(key, value); }
export async function idbReadValue(key)         { return idbGet(key); }
export async function idbDeleteValue(key)       { return idbDel(key); }
