import { useT, useI18nStore } from '../lib/i18n';
import { useAppStore } from '../store/appStore';
import { useEscapeKey } from '../lib/hooks';

const LOCALES = { es:'es-CL', en:'en-US', fr:'fr-FR', de:'de-DE', it:'it-IT', pt:'pt-BR', ja:'ja-JP', ko:'ko-KR' };

function fmtDate(ts, lang) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString(LOCALES[lang] || 'es-CL', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Modal con el historial de revisiones de una receta. El usuario puede
 * previsualizar cualquier revision y restaurarla al editor (no se aplica al
 * disco hasta que guarda).
 */
export function RecipeHistory({ revisions = [], onRestore, onClose }) {
  const t = useT();
  useEscapeKey(onClose);
  const lang = useI18nStore(s => s.lang);
  const { confirm } = useAppStore();

  async function handleRestore(rev) {
    const ok = await confirm(t('history_confirm_restore', { date: fmtDate(rev.ts, lang) }));
    if (!ok) return;
    onRestore(rev);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="history-modal-title"
           className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="history-modal-title" className="font-display text-lg text-[var(--ink)]">🕘 {t('history_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('history_subtitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {revisions.length === 0 ? (
            <div className="text-center text-sm text-[var(--ink3)] py-8">
              {t('history_empty')}
            </div>
          ) : (
            <ul className="space-y-2">
              {revisions.map((rev, i) => {
                const totalG = (rev.ingredients || []).reduce((s, ri) => s + (parseFloat(ri.qty_grams) || 0), 0);
                const ingCount = (rev.ingredients || []).length;
                const isCurrent = i === 0;
                return (
                  <li key={rev.ts || i}
                      className={`border rounded-xl p-3 ${isCurrent ? 'border-[var(--mint)] bg-[var(--mint3)]/30' : 'border-black/10 hover:bg-[var(--cream)]'}`}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold text-[var(--ink)]">
                            {fmtDate(rev.ts, lang)}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]">
                              {t('history_current')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--ink3)]">
                          {ingCount} {t('ingredients_count')} · {Math.round(totalG)}g
                          {rev.fpd != null && ` · FPD ${rev.fpd.toFixed(2)}°C`}
                          {rev.cost != null && ` · $${Math.round(rev.cost).toLocaleString('es-CL')}`}
                        </div>
                        {rev.note && (
                          <div className="text-[11px] text-[var(--ink2)] mt-1 italic">"{rev.note}"</div>
                        )}
                      </div>
                      {!isCurrent && (
                        <button
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--mint)] text-[var(--mint)] hover:bg-[var(--mint)] hover:text-white transition-colors cursor-pointer bg-transparent"
                          onClick={() => handleRestore(rev)}
                        >
                          {t('history_restore')}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 text-[10px] text-[var(--ink3)] leading-relaxed border-t border-black/10 pt-3">
            ℹ {t('history_legend')}
          </p>
        </div>

        <div className="px-6 py-3 border-t border-black/10 flex justify-end">
          <button className="btn-secondary text-xs" onClick={onClose}>{t('history_close')}</button>
        </div>
      </div>
    </div>
  );
}
