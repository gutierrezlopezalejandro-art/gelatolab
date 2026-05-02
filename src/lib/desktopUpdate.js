// ===========================================================================
// Auto-update para la app de escritorio (Tauri 2).
//
// Solo corre dentro de Tauri. En navegador es no-op para mantener el bundle
// web sin dependencias extras (los imports a @tauri-apps/plugin-* son
// dinamicos, asi que no se incluyen en el bundle del browser).
//
// Flujo:
//   1) Al boot, App.jsx llama checkForUpdate(). Si hay version nueva, devuelve
//      el objeto { version, notes, downloadAndInstall, dismiss } y la UI
//      muestra un modal preguntandole al usuario.
//   2) Si acepta, downloadAndInstall() descarga, verifica firma Ed25519 con
//      la pubkey embebida en tauri.conf.json y, al terminar, llama a
//      relaunch() para reiniciar la app con la version nueva.
//
// Errores comunes:
//   - "no available update": no hay version mas reciente. Ignorar.
//   - "could not fetch update": red caida o GitHub Releases vacio. Loggear y
//     no molestar al usuario (auto-update es best-effort).
//   - firma invalida: el plugin tira error. No instalar — significa que
//     latest.json no fue firmado con la misma key de la app instalada.
// ===========================================================================

function isTauri() {
  if (typeof window === 'undefined') return false;
  return !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

export async function checkForUpdate() {
  if (!isTauri()) return null;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      currentVersion: update.currentVersion,
      date: update.date,
      notes: update.body || '',
      downloadAndInstall: async (onProgress) => {
        let total = 0;
        let downloaded = 0;
        await update.downloadAndInstall((event) => {
          // event.event: 'Started' | 'Progress' | 'Finished'
          if (event.event === 'Started') {
            total = event.data?.contentLength || 0;
            onProgress?.({ phase: 'started', total });
          } else if (event.event === 'Progress') {
            downloaded += event.data?.chunkLength || 0;
            onProgress?.({ phase: 'progress', downloaded, total });
          } else if (event.event === 'Finished') {
            onProgress?.({ phase: 'finished', downloaded, total });
          }
        });
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      },
    };
  } catch (e) {
    console.warn('[updater] check failed', e);
    return null;
  }
}

// Util para mostrar "X.Y MB" en el modal de progreso.
export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
