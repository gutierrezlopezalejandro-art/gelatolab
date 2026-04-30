import { useState } from 'react';
import { useT, useLocale, useIngredientName, useCategoryName } from '../lib/i18n';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { calcStats } from '../lib/icecreamCalc';
import { printHtml } from '../lib/printHtml';
import { StatCard } from '../components/ui/index.jsx';
import SearchSelect from '../components/SearchSelect.jsx';
import { MachineVolumeWarning } from '../components/MachineVolumeWarning';

const CAT_COLORS = {
  'Lacteo':'#1a5c3a','Azucar':'#b8860b','Fruta':'#2e7d52',
  'Saborizante':'#6a1b9a','Estabilizante':'#1565c0','Emulsionante':'#00695c',
  'Acido/Sabor':'#e65100','Dulce':'#b71c1c','Coco':'#2e7b5c',
  'Fruto seco':'#6d4c41','Bebida/Licor':'#283593','Colorante nat.':'#424242','Base':'#607d8b',
};

const DENSITY = 1070; // g/L — densidad mezcla helado

export default function BatchCalc() {
  const t = useT();
  const tIng = useIngredientName();
  const tCat = useCategoryName();
  const locale = useLocale();
  const [recipeId, setRecipeId] = useState('');
  const [liters,   setLiters]   = useState(5);

  const recipes     = useRecipeStore(s => s.recipes);
  const ingredients = useIngredientStore(s => s.ingredients);

  const recipe = recipes.find(r => String(r.id) === String(recipeId));

  // Enrich recipe ingredients with full ingredient data
  const ingItems = (recipe?.ingredients || []).map(ri => {
    const ing = ingredients.find(i => i.id === ri.ingredient_id);
    return { qty_grams: parseFloat(ri.qty_grams), ingredient: ing || {} };
  });

  const stats    = ingItems.length ? calcStats(ingItems) : null;
  const baseKg   = stats ? stats.T / 1000 : 0;
  const baseLiters = baseKg > 0 ? (baseKg * 1000) / DENSITY : 0;

  // Factor de escala: cuantas veces la receta base para producir N litros
  const factor     = baseLiters > 0 ? liters / baseLiters : 0;
  const totalKg    = baseKg * factor;
  const totalG     = totalKg * 1000;
  const bolas      = Math.floor(liters * DENSITY / 120);
  const totalCost  = stats ? stats.cost * factor : 0;
  const costPerL   = liters > 0 ? totalCost / liters : 0;
  const costPerBola= bolas  > 0 ? totalCost / bolas  : 0;

  // Ingredientes escalados
  const scaledItems = (recipe?.ingredients || []).map(ri => {
    const ing      = ingredients.find(i => i.id === ri.ingredient_id);
    const g        = parseFloat(ri.qty_grams) * factor;
    const unitCost = ing?.cost_per_kg || 0;
    const cost     = g * unitCost / 1000;
    return {
      ...ri,
      ingredient: ing || {},
      lote_g:  Math.round(g),
      lote_kg: parseFloat((g / 1000).toFixed(3)),
      cost:    Math.round(cost),
    };
  });

  function handlePrint() {
    if (!recipe) return;
    const lines = [
      `LOTE DE PRODUCCION — ${recipe.name}`,
      `Fecha: ${new Date().toLocaleDateString(locale)}`,
      `Produccion: ${liters} L | Mezcla total: ${totalKg.toFixed(2)} kg | Factor: x${factor.toFixed(2)}`,
      '',
      'INGREDIENTE'.padEnd(30) + 'BASE(g)'.padStart(10) + 'LOTE(g)'.padStart(10) + 'LOTE(kg)'.padStart(10) + 'COSTO($)'.padStart(12),
      '-'.repeat(72),
      ...scaledItems.map(ri =>
        (ri.ingredient?.name || '?').padEnd(30) +
        String(Math.round(ri.qty_grams)).padStart(10) +
        String(ri.lote_g).padStart(10) +
        String(ri.lote_kg).padStart(10) +
        `$${ri.cost.toLocaleString(locale)}`.padStart(12)
      ),
      '-'.repeat(72),
      'TOTAL'.padEnd(30) +
        String(Math.round(stats?.T || 0)).padStart(10) +
        String(Math.round(totalG)).padStart(10) +
        String(totalKg.toFixed(3)).padStart(10) +
        `$${Math.round(totalCost).toLocaleString(locale)}`.padStart(12),
      '',
      `Costo/litro: $${Math.round(costPerL).toLocaleString(locale)}   Costo/bola: $${Math.round(costPerBola).toLocaleString(locale)}   FPD: ${stats?.fpd.toFixed(2) || '—'}C`,
    ].join('\n');

    printHtml(`<html><head><title>Lote ${recipe.name}</title>
      <style>body{font-family:monospace;padding:2rem;white-space:pre}h1{font-family:serif}</style>
      </head><body><pre>${lines}</pre></body></html>`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl text-[var(--ink)]">{t('batch_calculator')}</h1>
          <p className="text-sm text-[var(--ink2)] mt-1">{t('batch_subtitle')}</p>
        </div>
        {recipe && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white border-none cursor-pointer"
            style={{ background: '#0d5c6e' }}
          >
            {t('print')}
          </button>
        )}
      </div>

      {/* Selector */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('recipe')}</label>
            <SearchSelect
              options={recipes.map(r => ({ value: r.id, label: r.name }))}
              value={recipeId}
              onChange={setRecipeId}
              placeholder={t('select_recipe')}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('liters_to_produce')}</label>
            <input
              type="number" min="0.5" max="500" step="0.5"
              className="input w-full rounded-lg text-right"
              value={liters}
              onChange={e => setLiters(parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>
        <div className="mt-3">
          <MachineVolumeWarning liters={liters} />
        </div>
      </div>

      {recipe && stats && (
        <>
          {/* Stat cards: si la receta es para moldes (mould_g > 0) reemplazamos
              "bolas" por "paletas". */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label={t('production_l')} value={`${liters} L`} />
            <StatCard label={t('total_mix_kg')} value={`${totalKg.toFixed(2)} kg`} />
            {(recipe.mould_g || 0) > 0
              ? <StatCard
                  label={t('mould_units_label', { each: recipe.mould_g })}
                  value={Math.floor(totalKg * 1000 / recipe.mould_g)}
                />
              : <StatCard label={t('scoops')} value={bolas} />
            }
            <StatCard label={t('factor')} value={`x${factor.toFixed(2)}`} />
          </div>

          {/* Tabla escalada */}
          <div className="card overflow-x-auto mb-4">
            <div className="p-4 border-b border-black/10 font-display text-base text-[var(--ink)]">
              {recipe.name} x {liters} L
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="text-left">{t('ingredient')}</th>
                  <th>{t('category')}</th>
                  <th>{t('base_g')}</th>
                  <th>{t('batch_g')}</th>
                  <th>{t('kg')}</th>
                  <th>{t('cost')}</th>
                </tr>
              </thead>
              <tbody>
                {scaledItems.map((ri, idx) => {
                  const color = CAT_COLORS[ri.ingredient?.category] || '#888';
                  return (
                    <tr key={idx}>
                      <td className="font-medium">{tIng(ri.ingredient?.name) || '—'}</td>
                      <td>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded text-white"
                              style={{ background: color }}>
                          {tCat(ri.ingredient?.category) || ''}
                        </span>
                      </td>
                      <td>{Math.round(ri.qty_grams)}</td>
                      <td className="font-semibold">{ri.lote_g.toLocaleString(locale)}</td>
                      <td>{ri.lote_kg}</td>
                      <td>${ri.cost.toLocaleString(locale)}</td>
                    </tr>
                  );
                })}
                <tr className="row-total">
                  <td colSpan={2}>{t('total_label')}</td>
                  <td>{Math.round(stats.T).toLocaleString(locale)}</td>
                  <td>{Math.round(totalG).toLocaleString(locale)}</td>
                  <td>{totalKg.toFixed(3)}</td>
                  <td>${Math.round(totalCost).toLocaleString(locale)}</td>
                </tr>
              </tbody>
            </table>

            {/* Pie de tabla */}
            <div className="px-4 py-3 flex gap-6 flex-wrap text-sm border-t border-black/10 bg-[var(--cream)]">
              <span className="text-[var(--ink2)]">
                {t('cost_per_liter')}: <strong className="text-[var(--ink)]">${Math.round(costPerL).toLocaleString(locale)}</strong>
              </span>
              <span className="text-[var(--ink2)]">
                {t('cost_per_scoop')}: <strong className="text-[var(--ink)]">${Math.round(costPerBola).toLocaleString(locale)}</strong>
              </span>
              <span className="text-[var(--ink2)]">
                {t('recipe_fpd')}: <strong className="text-[var(--ink)]">{stats.fpd.toFixed(2)}°C</strong>
              </span>
            </div>
          </div>
        </>
      )}

      {!recipeId && (
        <div className="text-center py-16 text-[var(--ink3)]">
          <p className="text-4xl mb-4">🍦</p>
          <p className="text-sm">{t('select_recipe')}</p>
        </div>
      )}
    </div>
  );
}
