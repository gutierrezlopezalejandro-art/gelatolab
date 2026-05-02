import { useState } from 'react';
import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';
import { formatBytes } from '../lib/desktopUpdate';

/**
 * Modal "Hay una version nueva disponible" para la app de escritorio.
 *
 * Tres estados:
 *   - 'idle': muestra version, notas y botones (Actualizar / Ahora no).
 *   - 'downloading': barra de progreso. No se puede cerrar — la firma
 *     ya esta verificandose; cancelar dejaria un instalador a medias.
 *   - 'error': mensaje + boton para cerrar. Se reintenta al proximo boot.
 */
export function UpdateAvailableModal({ update, onDismiss }) {
  const t = useT();
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });
  const [error, setError] = useState(null);

  // Esc solo cierra en estados que no esten descargando.
  useEscapeKey(() => { if (phase !== 'downloading') onDismiss(); }, !!update);

  if (!update) return null;

  async function handleInstall() {
    setPhase('downloading');
    setError(null);
    try {
      await update.downloadAndInstall((evt) => {
        if (evt.phase === 'started') {
          setProgress({ downloaded: 0, total: evt.total || 0 });
        } else if (evt.phase === 'progress') {
          setProgress({ downloaded: evt.downloaded, total: evt.total });
        }
      });
      // Si llega aca, relaunch() ya se llamo y la app deberia haber muerto.
      // En caso raro de que no relance, cerramos el modal.
      onDismiss();
    } catch (e) {
      console.error('[updater] install failed', e);
      setError(String(e?.message || e));
      setPhase('error');
    }
  }

  const pct = progress.total > 0
    ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
    : null;

  return (
    <div
      className="fixed inset-0 z-[450] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={() => { if (phase !== 'downloading') onDismiss(); }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="updater-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7 border-2 border-[var(--mint)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden="true">⬆️</span>
          <h2 id="updater-title" className="font-display text-xl text-[var(--ink)]">
            {t('updater_title')}
          </h2>
        </div>

        <p className="text-sm text-[var(--ink2)] leading-relaxed mb-3">
          {t('updater_intro', { current: update.currentVersion, next: update.version })}
        </p>

        {update.notes ? (
          <div className="text-xs text-[var(--ink3)] leading-relaxed mb-5 bg-black/5 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
            {update.notes}
          </div>
        ) : null}

        {phase === 'downloading' && (
          <div className="mb-5">
            <div className="text-xs text-[var(--ink2)] mb-1.5 flex justify-between">
              <span>{t('updater_downloading')}</span>
              <span>
                {formatBytes(progress.downloaded)}
                {progress.total ? ` / ${formatBytes(progress.total)}` : ''}
                {pct !== null ? ` (${pct}%)` : ''}
              </span>
            </div>
            <div className="h-2 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--mint)] transition-all"
                style={{ width: pct !== null ? `${pct}%` : '50%' }}
              />
            </div>
          </div>
        )}

        {phase === 'error' && error && (
          <div className="text-xs text-[var(--coral)] leading-relaxed mb-5 bg-[var(--coral)]/10 rounded-lg p-3">
            {t('updater_error')}: {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {phase === 'idle' && (
            <>
              <button onClick={onDismiss}
                      className="text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-black/10 hover:bg-black/5 cursor-pointer">
                {t('updater_dismiss')}
              </button>
              <button onClick={handleInstall}
                      className="text-sm font-bold px-4 py-2 rounded-lg bg-[var(--mint)] text-white hover:opacity-90 cursor-pointer border-none">
                {t('updater_install')}
              </button>
            </>
          )}
          {phase === 'error' && (
            <button onClick={onDismiss}
                    className="text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-black/10 hover:bg-black/5 cursor-pointer">
              {t('updater_dismiss')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
