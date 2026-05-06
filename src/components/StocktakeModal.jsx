import { useState, useMemo } from 'react';
import { useT, useIngredientName, useCategoryName } from '../lib/i18n';
import { useIngredientStore } from '../store/ingredientStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useAppStore } from '../store/appStore';
import { track } from '../lib/analytics';
import { useDirtyClose } from '../lib/hooks';

/**
 * Modal de conteo fisico de inventario. Lista todos los ingredientes con su
 * stock esperado (lo que dice el sistema). El usuario tipea lo que efectiva-
 * mente conto en cada uno; al guardar, se generan ajustes para los que
 * difieren y se archiva el snapshot completo en stocktakes[].
 */
export function StocktakeModal({ onClose }) {
  const t = useT();
  const tIng = useIngredientName();
  const tCat = useCategoryName();
  const ingredients = useIngredientStore(s => s.ingredients);
  const recordStocktake = useInventoryStore(s => s.recordStocktake);
  const { showToast } = useAppStore();

  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('');
  const [notes, setNotes] = useState('');

  // Dirty cuando ya hay al menos un conteo o nota — el filtro no cuenta.
  const dirty = notes.trim() !== '' || Object.values(counts).some(v => v !== '' && v != null);
  const requestClose = useDirtyClose(onClose, dirty);

  // Lista filtrada por nombre/categoria.
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return ingredients
      .filter(i => !q || tIng(i.name).toLowerCase().includes(q) || tCat(i.category).toLowerCase().includes(q))
      .sort((a, b) => tIng(a.name).localeCompare(tIng(b.name)));
  }, [ingredients, filter, tIng, tCat]);

  // Cantidad de items con conteo ingresado (no vacios).
  const counted = Object.values(counts).filter(v => v !== '' && v != null).length;
  // Diferencia total absoluta (g) entre esperado y contado.
  const totalDiff = visible.reduce((sum, i) => {
    const c = counts[i.id];
    if (c === '' || c == null) return sum;
    const expected = parseFloat(i.stock_g) || 0;
    const cVal = parseFloat(c) || 0;
    return sum + Math.abs(cVal - expected);
  }, 0);

  function setCount(id, value) {
    setCounts(prev => ({ ...prev, [id]: value }));
  }

  function fillExpected(id) {
    setCount(id, ingredients.find(i => i.id === id)?.stock_g || 0);
  }

  function handleSave() {
    if (counted === 0) { showToast(t('stk_nothing_counted'), 'error'); return; }
    const lines = visible
      .filter(i => counts[i.id] !== '' && counts[i.id] != null)
      .map(i => ({
        ingredient_id: i.id,
        expected_g: parseFloat(i.stock_g) || 0,
        counted_g: parseFloat(counts[i.id]) || 0,
      }));
    const r = recordStocktake({ lines, notes });
    track('stocktake_saved', { lines: lines.length });
    showToast(t('stk_saved', { ref: r.ref, count: lines.length }));
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm p-4" onClick={requestClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="stocktake-modal-title"
           className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="stocktake-modal-title" className="font-display text-lg text-[var(--ink)]">🧮 {t('stk_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('stk_subtitle')}</p>
          </div>
          <button onClick={requestClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        <div className="px-6 py-3 border-b border-black/10 flex items-center gap-3 flex-wrap">
          <input className="input flex-1 min-w-[180px] text-sm"
                 placeholder={t('stk_filter_placeholder')}
                 value={filter} onChange={e => setFilter(e.target.value)} />
          <span className="text-xs text-[var(--ink3)]">{t('stk_counted', { n: counted, total: visible.length })}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          <table className="tbl text-xs w-full">
            <thead>
              <tr>
                <th className="text-left">{t('ingredient')}</th>
                <th className="text-right">{t('stk_expected')}</th>
                <th className="text-right">{t('stk_counted_col')}</th>
                <th className="text-right">{t('stk_diff')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(i => {
                const expected = parseFloat(i.stock_g) || 0;
                const cVal = counts[i.id];
                const c = cVal === '' || cVal == null ? null : parseFloat(cVal) || 0;
                const diff = c == null ? null : c - expected;
                const diffColor = diff == null ? '' : (Math.abs(diff) < 0.01 ? 'var(--mint)' : (diff < 0 ? 'var(--coral)' : '#b8860b'));
                return (
                  <tr key={i.id}>
                    <td className="py-1">
                      <div>{tIng(i.name)}</div>
                      <div className="text-[10px] text-[var(--ink3)]">{tCat(i.category)}</div>
                    </td>
                    <td className="text-right tabular-nums">{expected.toFixed(0)} g</td>
                    <td className="text-right">
                      <input
                        type="number" min="0" step="1"
                        className="w-20 text-right border border-black/10 rounded px-1.5 py-0.5 text-xs"
                        value={cVal ?? ''}
                        onChange={e => setCount(i.id, e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td className="text-right tabular-nums" style={{ color: diffColor, fontWeight: 600 }}>
                      {diff == null ? '—' : (diff > 0 ? '+' : '') + diff.toFixed(0) + ' g'}
                    </td>
                    <td>
                      <button type="button"
                              className="text-[10px] text-[var(--ink3)] hover:text-[var(--mint)] cursor-pointer bg-transparent border-none px-1"
                              onClick={() => fillExpected(i.id)}
                              title={t('stk_match_expected')}>
                        =
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={5} className="text-center text-[var(--ink3)] py-4">{t('stk_no_results')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-black/10 space-y-2">
          {counted > 0 && (
            <div className="text-xs text-[var(--ink2)] flex items-center justify-between flex-wrap gap-2">
              <span>{t('stk_summary', { n: counted, diff: Math.round(totalDiff) })}</span>
              <input className="input text-xs flex-1 min-w-[160px] max-w-md"
                     placeholder={t('stk_notes_placeholder')}
                     value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary text-xs" onClick={onClose}>{t('cancel')}</button>
            <button className="btn-primary text-xs" onClick={handleSave} disabled={counted === 0}>
              {t('stk_save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
