import { useMemo } from 'react';
import { calcStats, resolveRecipeItems, overallVerdict } from '../lib/icecreamCalc';
import { useT, useLocale } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';

/**
 * Comparacion side-by-side de varias recetas. Muestra una tabla con metricas
 * tecnicas (PAC, POD, FPD), composicion (grasa, azucar, agua, SNG) y nutricion
 * (kcal, proteina, sodio, grasa saturada) por 100g.
 *
 * Cada fila resalta el mejor (verde) y peor (rojo) de cada metrica para que
 * el operador vea de un vistazo cual receta tiene mas/menos de algo. La
 * direccion "buena" depende de la metrica: para azucar/sodio/calorias menos
 * es mejor; para proteina mas es mejor; para PAC/POD no hay direccion
 * universal asi que solo destacamos extremos.
 */

// direction: 'lower_better' | 'higher_better' | 'neutral' (solo destacar extremos)
const ROWS = [
  // Tecnicas
  { key: 'pacPct',   label_key: 'compare_pac',     fmt: (v) => v.toFixed(0),                direction: 'neutral' },
  { key: 'podPct',   label_key: 'compare_pod',     fmt: (v) => v.toFixed(0),                direction: 'neutral' },
  { key: 'fpd',      label_key: 'compare_fpd',     fmt: (v) => v.toFixed(2) + ' °C',        direction: 'neutral' },
  // Composicion
  { key: 'pGrasa',   label_key: 'compare_fat_pct',     fmt: (v) => (v * 100).toFixed(2) + ' %',  direction: 'neutral' },
  { key: 'pAzucar',  label_key: 'compare_sugar_pct',   fmt: (v) => (v * 100).toFixed(2) + ' %',  direction: 'lower_better' },
  { key: 'pAgua',    label_key: 'compare_water_pct',   fmt: (v) => (v * 100).toFixed(2) + ' %',  direction: 'neutral' },
  { key: 'pSng',     label_key: 'compare_sng_pct',     fmt: (v) => (v * 100).toFixed(2) + ' %',  direction: 'neutral' },
  { key: 'pSolids',  label_key: 'compare_solids_pct',  fmt: (v) => (v * 100).toFixed(2) + ' %',  direction: 'neutral' },
];

// Filas nutricionales — calculadas por 100g a partir de los acumulados absolutos.
const NUTRITION_ROWS = [
  { key: 'calories',     label_key: 'compare_kcal',         per100: true,  fmt: (v) => v.toFixed(0) + ' kcal', direction: 'lower_better' },
  { key: 'protein',      label_key: 'compare_protein',      per100: true,  fmt: (v) => v.toFixed(2) + ' g',    direction: 'higher_better' },
  { key: 'satfat',       label_key: 'compare_satfat',       per100: true,  fmt: (v) => v.toFixed(2) + ' g',    direction: 'lower_better' },
  { key: 'sugars',       label_key: 'compare_total_sugars', per100: true,  fmt: (v) => v.toFixed(2) + ' g',    direction: 'lower_better' },
  { key: 'added_sugars', label_key: 'compare_added_sugars', per100: true,  fmt: (v) => v.toFixed(2) + ' g',    direction: 'lower_better' },
  { key: 'sodium_mg',    label_key: 'compare_sodium',       per100: true,  fmt: (v) => v.toFixed(0) + ' mg',   direction: 'lower_better' },
  { key: 'fibers',       label_key: 'compare_fiber',        per100: true,  fmt: (v) => v.toFixed(2) + ' g',    direction: 'higher_better' },
  { key: 'lactose',      label_key: 'compare_lactose',      per100: true,  fmt: (v) => v.toFixed(2) + ' g',    direction: 'lower_better' },
];

function bestWorstIndices(values, direction) {
  if (direction === 'neutral' || values.length < 2) {
    // Para neutral solo destacamos extremos (min y max) sin asignar bueno/malo.
    if (values.length < 2) return { best: -1, worst: -1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return { best: -1, worst: -1 };
    return { best: -1, worst: -1, minIdx: values.indexOf(min), maxIdx: values.indexOf(max) };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { best: -1, worst: -1 };
  if (direction === 'lower_better') {
    return { best: values.indexOf(min), worst: values.indexOf(max) };
  }
  return { best: values.indexOf(max), worst: values.indexOf(min) };
}

function cellStyle(idx, hl) {
  if (hl.best === idx) return { background: 'var(--mint3)', color: 'var(--mint)', fontWeight: 700 };
  if (hl.worst === idx) return { background: 'var(--coral2)', color: 'var(--coral)', fontWeight: 700 };
  if (hl.minIdx === idx || hl.maxIdx === idx) return { fontWeight: 700 };
  return {};
}

export function RecipeComparisonModal({ recipes, ingredients, allRecipes, onClose }) {
  const t = useT();
  const locale = useLocale();
  useEscapeKey(onClose);

  const recipesMap = useMemo(() => {
    const m = {};
    for (const r of allRecipes || []) m[String(r.id)] = r;
    return m;
  }, [allRecipes]);

  const ingredientsMap = useMemo(() => {
    const m = {};
    for (const i of ingredients || []) m[String(i.id)] = i;
    return m;
  }, [ingredients]);

  const stats = useMemo(() => recipes.map(r => {
    const enriched = (r.ingredients || []).map(ri => ({
      qty_grams: ri.qty_grams,
      ingredient_id: ri.ingredient_id,
      recipe_id: ri.recipe_id,
      ingredient: ri.ingredient_id ? ingredientsMap[String(ri.ingredient_id)] : null,
    }));
    const items = resolveRecipeItems(enriched, recipesMap, ingredientsMap);
    return items.length ? calcStats(items) : null;
  }), [recipes, recipesMap, ingredientsMap]);

  function valueForRow(s, row) {
    if (!s || s.T <= 0) return null;
    const raw = s[row.key];
    if (!Number.isFinite(raw)) return null;
    if (row.per100) return (raw / s.T) * 100;
    return raw;
  }

  function renderRow(row) {
    const values = stats.map(s => valueForRow(s, row));
    const numeric = values.filter(v => v != null);
    const hl = bestWorstIndices(numeric, row.direction);
    // Recompose hl indices to match position in `values` (some entries may be null).
    const numericIdxToFull = [];
    values.forEach((v, i) => { if (v != null) numericIdxToFull.push(i); });
    const fullHl = {
      best: hl.best >= 0 ? numericIdxToFull[hl.best] : -1,
      worst: hl.worst >= 0 ? numericIdxToFull[hl.worst] : -1,
      minIdx: hl.minIdx >= 0 ? numericIdxToFull[hl.minIdx] : -1,
      maxIdx: hl.maxIdx >= 0 ? numericIdxToFull[hl.maxIdx] : -1,
    };

    return (
      <tr key={row.key} className="border-b border-black/5">
        <td className="py-1.5 px-3 text-[var(--ink2)] font-medium whitespace-nowrap">
          {t(row.label_key)}
        </td>
        {values.map((v, i) => (
          <td key={i} className="py-1.5 px-3 text-right tabular-nums" style={cellStyle(i, fullHl)}>
            {v != null ? row.fmt(v) : '—'}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm"
         onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="compare-modal-title"
           className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[92vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="compare-modal-title" className="font-display text-lg text-[var(--ink)]">⚖️ {t('compare_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('compare_subtitle', { count: recipes.length })}</p>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        <div className="flex-1 overflow-auto px-2">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-black/10">
                <th className="text-left py-2 px-3 font-semibold w-[180px]">{t('compare_metric')}</th>
                {recipes.map((r, i) => {
                  const s = stats[i];
                  const verdict = s ? overallVerdict(s, r.type, r.subtype || 'base') : null;
                  // overallVerdict devuelve 'opt' | 'acc' | 'bad'
                  const vColor = verdict === 'opt' ? 'var(--mint)' : verdict === 'acc' ? 'var(--gold)' : 'var(--coral)';
                  const vIcon  = verdict === 'opt' ? '✓' : verdict === 'acc' ? '⚠' : '✗';
                  return (
                    <th key={r.id} className="text-right py-2 px-3 font-semibold align-bottom min-w-[140px]">
                      <div className="text-[var(--ink)] font-display text-sm">{r.name}</div>
                      <div className="text-[10px] text-[var(--ink3)] font-normal">
                        {t(r.type === 'helado' ? 'ice_cream' : r.type === 'gelato' ? 'gelato' : 'sorbet')}
                        {s ? ` · ${s.T.toLocaleString(locale)} g` : ''}
                      </div>
                      {verdict && (
                        <div className="text-[9px] mt-0.5 font-normal" style={{ color: vColor }}>
                          {vIcon} {t('compare_balance_' + verdict)}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={recipes.length + 1} className="pt-3 pb-1 px-3 text-[10px] uppercase tracking-widest text-[var(--ink3)] font-semibold">
                  {t('compare_section_technical')}
                </td>
              </tr>
              {ROWS.slice(0, 3).map(renderRow)}
              <tr>
                <td colSpan={recipes.length + 1} className="pt-3 pb-1 px-3 text-[10px] uppercase tracking-widest text-[var(--ink3)] font-semibold">
                  {t('compare_section_composition')}
                </td>
              </tr>
              {ROWS.slice(3).map(renderRow)}
              <tr>
                <td colSpan={recipes.length + 1} className="pt-3 pb-1 px-3 text-[10px] uppercase tracking-widest text-[var(--ink3)] font-semibold">
                  {t('compare_section_nutrition_100g')}
                </td>
              </tr>
              {NUTRITION_ROWS.map(renderRow)}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-black/10 bg-[var(--cream2)]/40 flex items-center gap-4 text-[10px] text-[var(--ink3)]">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--mint3)', border: '1px solid var(--mint)' }}></span>
            {t('compare_legend_best')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--coral2)', border: '1px solid var(--coral)' }}></span>
            {t('compare_legend_worst')}
          </span>
          <span className="ml-auto">{t('compare_legend_neutral_note')}</span>
        </div>
      </div>
    </div>
  );
}
