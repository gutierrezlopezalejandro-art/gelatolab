import { Component } from 'react';
import { logError } from '../lib/errorLog';
import { tRaw as t } from '../lib/i18n';

// Detecta errores de chunk loading post-deploy. Cuando deployamos una version
// nueva, los nombres de los chunks Vite (con hash content-addressed) cambian.
// El HTML que el SW tiene cacheado puede referenciar chunks viejos que ya no
// existen en el deploy nuevo. Resultado: TypeError al hacer `import()` lazy.
//
// La firma del error varia entre navegadores:
//   - Chrome/Edge: "ChunkLoadError" o "Loading chunk N failed"
//   - Firefox:     "error loading dynamically imported module"
//   - Safari/iOS:  "Importing a module script failed"
//   - Generico:    contiene "failed" + "module"/"script"/"chunk"
function isChunkLoadError(error) {
  if (!error) return false;
  const msg = String(error?.message || error || '').toLowerCase();
  if (msg.includes('chunkloaderror')) return true;
  if (msg.includes('loading chunk') && msg.includes('failed')) return true;
  if (msg.includes('importing a module script failed')) return true;
  if (msg.includes('dynamically imported module')) return true;
  if (msg.includes('failed to fetch dynamically imported')) return true;
  return false;
}

// Limpia el SW + caches + recarga la pagina. Se usa cuando detectamos que
// el SW viejo esta sirviendo chunks que ya no existen en el deploy nuevo.
// El reload con el cleanup garantiza que la siguiente carga obtiene HTML
// fresh + chunks nuevos sin estado intermedio.
async function purgeAndReload() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { /* tolerable: igual hacemos el reload */ }
  // Force-bypass cache reload (true en Firefox, ignorado pero no rompe en Chrome).
  window.location.reload(true);
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, autoRecovering: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError(error, { componentStack: errorInfo?.componentStack, source: 'ErrorBoundary' });

    // Si es un error de chunk loading post-deploy (el caso mas comun en
    // PWA iOS despues de un release), recuperamos automaticamente sin
    // que el usuario tenga que adivinar que hacer. Marcamos autoRecovering
    // para mostrar un mensaje distinto mientras se hace.
    if (isChunkLoadError(error)) {
      this.setState({ autoRecovering: true });
      // Dar un instante para que el render del fallback aparezca, luego purgar.
      setTimeout(() => { purgeAndReload(); }, 300);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    // Reload manual del boton "Recargar": igual purgamos por las dudas.
    purgeAndReload();
  };

  render() {
    if (this.state.hasError) {
      // ErrorBoundary es class component — no podemos usar el hook useT.
      // tRaw lee el idioma actual del store sin suscribirse; al renderizarse
      // este fallback el idioma ya está cargado, así que no perdemos nada.

      // Mensaje especial cuando estamos auto-recuperando de un ChunkLoadError
      // (deploy nuevo, SW con chunks viejos). El reload va a disparar solo
      // en ~300ms — solo mostramos un mensaje claro para que el usuario sepa
      // que algo esta pasando y no piense que se cuelgo.
      if (this.state.autoRecovering) {
        return (
          <div className="card p-8 text-center max-w-lg mx-auto mt-8" role="alert">
            <div className="text-5xl mb-4" aria-hidden="true">🔄</div>
            <h1 className="font-display text-2xl text-[var(--mint)] mb-2">
              {t('error_chunk_recovering_title')}
            </h1>
            <p className="text-sm text-[var(--ink3)]">
              {t('error_chunk_recovering_body')}
            </p>
          </div>
        );
      }

      return (
        <div className="card p-8 text-center max-w-lg mx-auto mt-8" role="alert">
          <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
          <h1 className="font-display text-2xl text-[var(--coral)] mb-2">
            {t('error_boundary_title')}
          </h1>
          <p className="text-sm text-[var(--ink3)] mb-6">
            {t('error_boundary_body')}
          </p>
          <details className="text-left text-xs text-[var(--ink3)] bg-[var(--cream)] p-3 rounded-lg mb-6 cursor-pointer">
            <summary className="font-semibold cursor-pointer">{t('error_technical_details')}</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{String(this.state.error)}</pre>
          </details>
          <div className="flex gap-3 justify-center">
            <button className="btn-secondary" onClick={this.handleReset}>
              {t('retry')}
            </button>
            <button className="btn-primary" onClick={this.handleReload}>
              {t('reload')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
