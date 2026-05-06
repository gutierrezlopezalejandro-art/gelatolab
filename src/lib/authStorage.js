// Custom storage adapter for Supabase Auth.
//
// Default behaviour is plain localStorage. On the Tauri desktop app we ALSO
// mirror writes into a file-backed key-value store via tauri-plugin-store.
// That second copy survives WebView2 cache wipes — which happen during
// some auto-updates / NSIS reinstalls and were causing users to be
// unexpectedly logged out of the installed desktop version.
//
// On boot the adapter prefers the localStorage value (faster, sync) and
// falls back to the file when localStorage is empty (post-wipe scenario).
// The first read after a wipe restores localStorage so subsequent reads
// are fast again.
//
// Browser / iOS / web: same as before, behaves like plain localStorage.

import { isTauriDesktop } from './platform';

const STORE_FILE = 'auth.json';

let _store = null;
let _storeReady = null;

// Lazy-load the Tauri store so the bundle stays small for web/iOS builds
// and we don't crash if the plugin isn't available.
async function getStore() {
  if (!isTauriDesktop()) return null;
  if (_store) return _store;
  if (_storeReady) return _storeReady;
  _storeReady = (async () => {
    try {
      const mod = await import('@tauri-apps/plugin-store');
      // Tauri 2 plugin-store API: load returns a Store instance.
      _store = await mod.load(STORE_FILE, { autoSave: true });
      return _store;
    } catch (e) {
      console.warn('[authStorage] tauri-plugin-store unavailable, fallback to localStorage only:', e);
      _store = null;
      return null;
    }
  })();
  return _storeReady;
}

// Best-effort hydrate: on app start, if localStorage is empty but the file
// has a value, copy it back so Supabase's sync `getItem` finds it.
// Called eagerly (top-level) so it's done before Supabase initialises.
async function hydrateFromFile() {
  const store = await getStore();
  if (!store) return;
  try {
    const keys = await store.keys();
    for (const key of keys) {
      // Don't clobber existing localStorage values — only fill gaps.
      if (typeof localStorage !== 'undefined' && localStorage.getItem(key) == null) {
        const val = await store.get(key);
        if (typeof val === 'string') {
          localStorage.setItem(key, val);
        }
      }
    }
  } catch (e) {
    console.warn('[authStorage] hydrate failed:', e);
  }
}

// Kick off hydration immediately. Supabase's first `getItem` call may race
// with this, but Supabase also calls `getSession()` from within an effect
// after the store is created, by which time hydration has resolved.
const _hydratePromise = hydrateFromFile();

export const authStorage = {
  getItem(key) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    const store = await getStore();
    if (store) {
      try {
        await store.set(key, value);
      } catch (e) {
        console.warn('[authStorage] file write failed:', e);
      }
    }
  },
  async removeItem(key) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    const store = await getStore();
    if (store) {
      try {
        await store.delete(key);
      } catch (e) {
        console.warn('[authStorage] file delete failed:', e);
      }
    }
  },
};

// Export a promise that resolves once the file → localStorage hydration is
// done. main.jsx awaits this before mounting the React tree so the very
// first render already sees the restored session and never flashes the
// login screen.
export const authStorageReady = _hydratePromise;
