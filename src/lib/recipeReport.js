// Genera un reporte imprimible (HTML → window.print) con varias recetas en
// una sola hoja, estilo "catalogo" / ficha tecnica por producto.
import { calcStats, calcNutritionalValues, calcRecipeAllergens, resolveRecipeItems } from './icecreamCalc';
import { printHtml } from './printHtml';

const TYPE_LBL = { helado: 'Helado', gelato: 'Gelato', sorbete: 'Sorbete' };

function escape(s) {
  return String(s ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
}

export function printRecipesReport(recipes, ingredients, businessName, t) {
  const ingMap = Object.fromEntries(ingredients.map(i => [String(i.id), i]));
  const recipeMap = Object.fromEntries(recipes.map(r => [String(r.id), r]));

  function recipeBlock(r) {
    const flat = resolveRecipeItems(
      (r.ingredients || []).map(ri => ({
        ingredient_id: ri.ingredient_id, recipe_id: ri.recipe_id, qty_grams: ri.qty_grams,
        ingredient: ri.ingredient_id ? ingMap[String(ri.ingredient_id)] : null,
        addin: !!ri.addin,
      })),
      recipeMap, ingMap,
    );
    const stats = flat.length ? calcStats(flat) : null;
    const nv = stats ? calcNutritionalValues(stats) : null;
    const allergens = calcRecipeAllergens(flat);

    const ings = flat.map(f => escape(f.ingredient?.name || '?')).join(', ');

    return `
      <div class="recipe-card">
        <div class="rc-head">
          <div>
            <h3>${escape(r.name)}</h3>
            <div class="rc-meta">${TYPE_LBL[r.type] || r.type}${r.subtype && r.subtype !== 'base' ? ' · ' + escape(r.subtype) : ''}</div>
          </div>
          ${stats ? `<div class="rc-stats">
            <span><b>FPD</b> ${stats.fpd.toFixed(2)}°C</span>
            <span><b>PAC</b> ${(stats.pacPct * 10).toFixed(0)}</span>
            <span><b>POD</b> ${(stats.podPct * 10).toFixed(0)}</span>
            <span><b>Costo</b> $${Math.round(stats.cost).toLocaleString('es-CL')}</span>
          </div>` : ''}
        </div>
        ${Array.isArray(r.tags) && r.tags.length > 0
          ? `<div class="rc-tags">${r.tags.map(tag => `<span>#${escape(tag)}</span>`).join('')}</div>`
          : ''}
        <div class="rc-section">
          <div class="rc-section-title">${t('ingredients_section')}</div>
          <div class="rc-ingredients">${ings}</div>
        </div>
        ${allergens.length > 0
          ? `<div class="rc-allergens"><b>${t('allergens_contains')}:</b> ${allergens.map(a => t('allergen_' + a)).join(', ')}</div>`
          : ''}
        ${nv ? `<div class="rc-section">
          <div class="rc-section-title">${t('chile_per_100g')}</div>
          <div class="rc-nutri">
            <span>${nv.energyKcal.toFixed(0)} kcal</span>
            <span>${nv.totalFat.toFixed(1)} g grasa</span>
            <span>${nv.sugars.toFixed(1)} g azucar</span>
            <span>${nv.protein.toFixed(1)} g proteina</span>
            <span>${nv.sodiumMg.toFixed(0)} mg sodio</span>
          </div>
        </div>` : ''}
      </div>
    `;
  }

  const today = new Date().toLocaleDateString();
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${t('report_title')} — ${escape(businessName || 'GelatoLab')}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: 'Outfit', system-ui, sans-serif; color: #222; margin: 0; padding: 0; }
  .header { border-bottom: 2px solid #1a5c3a; padding: 6mm 0; margin-bottom: 8mm; display: flex; justify-content: space-between; align-items: baseline; }
  .header h1 { font-family: 'Playfair Display', serif; margin: 0; font-size: 20pt; color: #1a5c3a; }
  .header small { color: #666; font-size: 9pt; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .recipe-card { border: 1px solid #ccc; border-radius: 4mm; padding: 4mm; page-break-inside: avoid; background: #fff; }
  .rc-head { display: flex; justify-content: space-between; gap: 4mm; padding-bottom: 2mm; border-bottom: 0.5px solid #ddd; margin-bottom: 2mm; }
  .rc-head h3 { font-family: 'Playfair Display', serif; margin: 0 0 1mm; font-size: 12pt; color: #1a5c3a; }
  .rc-meta { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .rc-stats { display: flex; flex-direction: column; gap: 0.5mm; font-size: 8pt; text-align: right; color: #444; }
  .rc-stats b { color: #1a5c3a; }
  .rc-tags { margin: 2mm 0; }
  .rc-tags span { display: inline-block; font-size: 7pt; padding: 0.5mm 1.5mm; border-radius: 2mm; background: #e8f5ed; color: #1a5c3a; margin: 0 1mm 1mm 0; }
  .rc-section { margin-top: 2mm; }
  .rc-section-title { font-size: 7pt; text-transform: uppercase; color: #666; letter-spacing: 0.5px; margin-bottom: 1mm; }
  .rc-ingredients { font-size: 8pt; color: #333; line-height: 1.4; }
  .rc-allergens { font-size: 8pt; padding: 1.5mm; background: #fff8e1; border-left: 1mm solid #f5c842; margin-top: 2mm; }
  .rc-nutri { display: flex; flex-wrap: wrap; gap: 1.5mm 4mm; font-size: 8pt; color: #444; }
  .footer { margin-top: 8mm; padding-top: 3mm; border-top: 0.5px solid #ddd; font-size: 7pt; color: #888; text-align: center; }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>${escape(businessName || 'GelatoLab')}</h1>
      <small>${t('report_subtitle')}</small>
    </div>
    <small>${today}</small>
  </div>
  <div class="grid">
    ${recipes.map(recipeBlock).join('')}
  </div>
  <div class="footer">${t('report_footer', { count: recipes.length })}</div>
</body></html>`;

  printHtml(html);
}
