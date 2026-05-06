import { useState } from 'react';
import { analyzeRecipe, autoBalanceRecipe } from '../lib/icecreamCalc';
import { useT, useIngredientName } from '../lib/i18n';
import { useDirtyClose } from '../lib/hooks';

/**
 * Modal that shows actionable adjustments to push a recipe back into the
 * optimal range for its type.
 *
 * Two modes:
 *   - Per-suggestion: user clicks "Aplicar" on each row (existing behavior)
 *   - Auto: user clicks "Aplicar todo" → run autoBalanceRecipe and replace
 *     all quantities in one shot, with a confirmation diff first.
 */
export function BalancePanel({ items, type, subtype = 'base', stats, servingTemp, onApply, onApplyAll, onClose }) {
  const t = useT();
  const tIng = useIngredientName();
  const [autoResult, setAutoResult] = useState(null); // pending auto-balance preview

  // Dirty cuando hay un preview de auto-balance pendiente. Cerrar sin aplicar
  // ni descartar perdería el cómputo (30-60s de iteraciones).
  const requestClose = useDirtyClose(onClose, autoResult !== null);

  const suggestions = analyzeRecipe(items, type, stats, { servingTemp, subtype });

  function runAuto() {
    const result = autoBalanceRecipe(items, type, { servingTemp, subtype });
    setAutoResult(result);
  }

  function confirmAuto() {
    if (autoResult) onApplyAll(autoResult.items);
    setAutoResult(null);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm"
      onClick={requestClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="balance-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="balance-modal-title" className="font-display text-lg text-[var(--ink)]">{t('balance_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('balance_subtitle')}</p>
          </div>
          <button onClick={requestClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Auto-balance preview (diff) */}
          {autoResult && (
            <div className="mb-5 rounded-xl border-2 border-[var(--mint)] p-4 bg-[var(--mint3)]/30">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-display text-base text-[var(--ink)]">
                  {t('balance_auto_preview')}
                </h3>
                <span className="text-[10px] text-[var(--ink3)] uppercase tracking-widest">
                  {autoResult.iterations} {t('balance_iterations')} ·
                  {' '}{autoResult.converged ? t('balance_converged') : t('balance_partial')}
                </span>
              </div>

              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-1 font-semibold">{t('ingredient')}</th>
                    <th className="text-right py-1 font-semibold">{t('balance_before')}</th>
                    <th className="text-right py-1 font-semibold">{t('balance_after')}</th>
                    <th className="text-right py-1 font-semibold">{t('balance_delta')}</th>
                  </tr>
                </thead>
                <tbody>
                  {autoResult.items.map((after, i) => {
                    const before = items[i];
                    const delta = after.qty_grams - (before?.qty_grams || 0);
                    if (Math.abs(delta) < 0.5) return null;
                    return (
                      <tr key={i} className="border-b border-black/5">
                        <td className="py-1">{tIng(after.ingredient?.name || '')}</td>
                        <td className="text-right py-1 text-[var(--ink3)] tabular-nums">{(before?.qty_grams || 0).toFixed(0)}g</td>
                        <td className="text-right py-1 font-semibold tabular-nums">{after.qty_grams.toFixed(0)}g</td>
                        <td className="text-right py-1 tabular-nums font-semibold"
                            style={{ color: delta > 0 ? 'var(--mint)' : 'var(--coral)' }}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(0)}g
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {autoResult.remainingSuggestions.length > 0 && (
                <p className="text-[11px] text-[var(--ink3)] mb-3">
                  ⚠ {t('balance_partial_note', { count: autoResult.remainingSuggestions.length })}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button className="btn-secondary text-xs" onClick={() => setAutoResult(null)}>
                  {t('balance_discard')}
                </button>
                <button className="btn-primary text-xs" onClick={confirmAuto}>
                  {t('balance_apply_all')}
                </button>
              </div>
            </div>
          )}

          {/* Per-suggestion list */}
          {suggestions.length === 0 ? (
            <div className="rounded-lg bg-[var(--mint3)] text-[var(--mint)] p-6 text-center font-medium">
              ✓ {t('balance_all_good')}
            </div>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s, i) => {
                const dirColor = s.direction === 'add' ? 'var(--mint)' : 'var(--coral)';
                const dirSign = s.direction === 'add' ? '+' : '−';
                const fmtVal = (v) => (v < 1 ? v.toFixed(3) : v.toFixed(1));
                return (
                  <li key={i} className="border border-black/10 rounded-xl p-4 hover:bg-[var(--cream)] transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink3)]">
                            {t(s.paramLabel)}
                          </span>
                          <span className="text-xs text-[var(--coral)]">
                            {fmtVal(s.current * (s.paramKey.startsWith('p') && s.paramKey !== 'podPct' && s.paramKey !== 'pacPct' ? 100 : (s.paramKey === 'podPct' || s.paramKey === 'pacPct' ? 10 : 1)))}
                            {' → '}
                            <span className="text-[var(--mint)]">
                              {fmtVal(s.target_low * (s.paramKey.startsWith('p') && s.paramKey !== 'podPct' && s.paramKey !== 'pacPct' ? 100 : (s.paramKey === 'podPct' || s.paramKey === 'pacPct' ? 10 : 1)))}
                              {'-'}
                              {fmtVal(s.target_high * (s.paramKey.startsWith('p') && s.paramKey !== 'podPct' && s.paramKey !== 'pacPct' ? 100 : (s.paramKey === 'podPct' || s.paramKey === 'pacPct' ? 10 : 1)))}
                            </span>
                          </span>
                        </div>
                        <div className="text-sm text-[var(--ink)]">
                          <span className="font-semibold" style={{ color: dirColor }}>
                            {dirSign}{Math.abs(s.delta_g).toFixed(0)}g
                          </span>
                          {' '}
                          <span>{tIng(s.ingredient_name)}</span>
                        </div>
                      </div>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer border-none"
                        style={{ background: dirColor }}
                        onClick={() => onApply(s)}
                      >
                        {t('balance_apply')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-6 text-[10px] text-[var(--ink3)] leading-relaxed border-t border-black/10 pt-3">
            ⚠ {t('balance_disclaimer')}
          </p>
        </div>

        <div className="px-6 py-3 border-t border-black/10 flex justify-between items-center gap-2">
          <button
            className="btn-primary"
            onClick={runAuto}
            disabled={suggestions.length === 0 || autoResult}
            title={t('balance_auto_tooltip')}
          >
            ⚡ {t('balance_auto_btn')}
          </button>
          <button
            className="btn-secondary"
            onClick={onClose}
          >
            {t('balance_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
