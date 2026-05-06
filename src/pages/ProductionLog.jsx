import { useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { useProductionStore } from '../store/productionStore';
import { useAppStore } from '../store/appStore';
import { useRecipeStore } from '../store/recipeStore';
import { useT, useI18nStore, useIngredientName } from '../lib/i18n';
import { EmptyState, StatCard } from '../components/ui/index.jsx';
import { printHtml } from '../lib/printHtml';
import { track } from '../lib/analytics';
import { calcLabelSeals, getCountry, getBusinessFields } from '../lib/countryRegulations';
import { useCountryStore } from '../store/countryStore';
import { useBusinessStore } from '../store/businessStore';
import { BatchRating } from '../components/BatchRating';

const TYPE_COLOR = { helado: '#1a5c3a', gelato: '#6a1b9a', sorbete: '#0d5c6e' };
const TYPE_BG    = { helado: '#c8e8d4', gelato: '#ede7f6', sorbete: '#d4eef5' };
// TYPE_LBL removed – translated inline via typeLbl() inside the component

const LOCALE_MAP = { es:'es-CL', en:'en-US', fr:'fr-FR', de:'de-DE', it:'it-IT', ko:'ko-KR', ja:'ja-JP' };
function formatDate(dateStr, lang = 'es') {
  const locale = LOCALE_MAP[lang] || 'es-CL';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Default shelf life in days when the recipe doesn't specify one.
const DEFAULT_SHELF_LIFE_DAYS = 90;

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Genera el payload del QR de trazabilidad. Texto plano para que sea legible
// con cualquier app: lote, receta, fecha producción, vence.
function batchQrPayload(entry, bestBefore) {
  const recipeStr = entry.recipe_name || '';
  return [
    `LOTE: ${entry.lote_str || ''}`,
    `RECETA: ${recipeStr}`,
    `PROD: ${entry.prod_date || ''}`,
    bestBefore ? `VENCE: ${bestBefore}` : '',
    entry.liters ? `${parseFloat(entry.liters).toFixed(1)} L` : '',
  ].filter(Boolean).join('\n');
}

// Maps internal nutrient keys to label text (HTML allowed for line breaks).
// Country prefix (ALTO EN / EXCESO EN / ...) is concatenated at render time.
const SEAL_NUTRIENT_TEXT = {
  energy:   'CALORÍAS',
  sugars:   'AZÚCARES',
  satfat:   'GRASAS<br>SATURADAS',
  transfat: 'GRASAS<br>TRANS',
  sodium:   'SODIO',
  totalfat: 'GRASAS<br>TOTALES',
};

// Ecuador traffic-light colours.
const TRAFFIC_COLORS = { low: '#2e7d32', med: '#f9a825', high: '#c62828' };

function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

async function printLabel(entry, t, country, business, portionG = 60, recipeMap = {}) {
  const snapshot = entry.ingredients_snapshot || [];
  const totalG = snapshot.reduce((s, i) => s + (parseFloat(i.batch_g) || parseFloat(i.qty_grams) || 0), 0);
  const ingList = snapshot.map(i => i.name).join(', ');
  // Best-before: prefer the snapshot at production time; fall back to the
  // current recipe's value or the default 90 days.
  const shelfLifeDays = entry.best_before_days
    ?? recipeMap[String(entry.recipe_id)]?.best_before_days
    ?? DEFAULT_SHELF_LIFE_DAYS;
  const bestBefore = entry.prod_date ? addDays(entry.prod_date, shelfLifeDays) : '';
  // Generate the traceability QR (dataURL PNG) ahead of building the HTML.
  const qrPayload = batchQrPayload(entry, bestBefore);
  let qrDataUrl = '';
  try { qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 110 }); } catch { /* non-fatal */ }

  // Aggregate allergens from the snapshot, combined with the recipe's
  // allergen_overrides (3-state declaration: contains/trace/none).
  const ALLERGEN_ORDER = ['milk', 'egg', 'gluten', 'soy', 'tree_nuts', 'peanut', 'sesame', 'sulfites'];
  const detectedSet = new Set();
  snapshot.forEach(i => (Array.isArray(i.allergens) ? i.allergens : []).forEach(a => detectedSet.add(a)));
  const overrides = entry.allergen_overrides || recipeMap[String(entry.recipe_id)]?.allergen_overrides || {};
  const allergensContains = [];
  const allergensTrace = [];
  ALLERGEN_ORDER.forEach(a => {
    const auto = detectedSet.has(a) ? 'contains' : 'none';
    const state = overrides[a] || auto;
    if (state === 'contains') allergensContains.push(a);
    else if (state === 'trace') allergensTrace.push(a);
  });
  const allergens = allergensContains; // legacy alias for the existing block

  // per-100g and per-portion helpers
  const sumOf = (field) => snapshot.reduce((s, i) => s + (parseFloat(i[field]) || 0), 0);
  const per100 = (field, fallbackField) => {
    if (totalG === 0) return 0;
    let sum = sumOf(field);
    if (sum === 0 && fallbackField) sum = sumOf(fallbackField);
    return (sum / totalG) * 100;
  };
  const fmt = (v, dec = 1) => (Number.isFinite(v) ? v.toFixed(dec) : '0');

  // per-100g values (for seal calculations and "Por 100 g" column)
  const nv100 = {
    kcal:     per100('calories'),
    fat:      per100('fat_g'),
    satfat:   per100('satfat_g'),
    transfat: per100('trans_fat_g'),
    carbs:    per100('sugar_g'),                 // legacy: formulation sugar as carbs
    sugars:   per100('sugars_g', 'sugar_g'),     // total sugars (label) — fallback to formulation sugar
    addedSugars: per100('added_sugars_g'),       // for ANVISA Brasil
    protein:  per100('protein_g'),
    sodium:   per100('sodium_mg'),
    salt:     per100('salt_g'),
  };
  const kJ100 = nv100.kcal * 4.184;

  // per-portion values
  const f = portionG / 100;
  const portion = {
    kcal:     nv100.kcal     * f,
    kJ:       kJ100          * f,
    fat:      nv100.fat      * f,
    satfat:   nv100.satfat   * f,
    transfat: nv100.transfat * f,
    carbs:    nv100.carbs    * f,
    sugars:   nv100.sugars   * f,
    protein:  nv100.protein  * f,
    sodium:   nv100.sodium   * f,
  };

  // Build the same nv structure that calcLabelSeals expects, derived from
  // the lote's snapshot (per-100g values).
  const nvForSeals = {
    energyKcal:   nv100.kcal,
    energyKJ:     kJ100,
    totalFat:     nv100.fat,
    saturatedFat: nv100.satfat,
    transFat:     nv100.transfat,
    sugars:       nv100.sugars,
    addedSugars:  nv100.addedSugars,
    sodiumMg:     nv100.sodium,
    protein:      nv100.protein,
    carbs:        nv100.carbs,
  };
  const { seals, lights } = calcLabelSeals(nvForSeals, country?.code);

  let sealsHtml = '';
  if (country?.system === 'octagon') {
    sealsHtml = seals.length === 0
      ? `<div class="no-seals">${t('label_no_seals_country')}</div>`
      : `<div class="seals-row">${seals.map(s => `
          <div class="seal" role="img"><span>${country.text}<br>${SEAL_NUTRIENT_TEXT[s.key] || s.key.toUpperCase()}</span></div>
        `).join('')}</div>`;
  } else if (country?.system === 'magnifying_glass') {
    sealsHtml = seals.length === 0
      ? `<div class="no-seals">${t('label_no_seals_country')}</div>`
      : `<div class="seals-row">${seals.map(s => `
          <div class="lupa" role="img">
            <div class="lupa-body"><span>${country.text}<br>${SEAL_NUTRIENT_TEXT[s.key] || s.key.toUpperCase()}</span></div>
            <div class="lupa-handle"></div>
          </div>
        `).join('')}</div>`;
  } else if (country?.system === 'traffic_light' && lights) {
    sealsHtml = `<div class="lights">
      <div class="light" style="background:${TRAFFIC_COLORS[lights.sugar]}"><span>AZÚCARES</span><span>${lights.sugar.toUpperCase()}</span></div>
      <div class="light" style="background:${TRAFFIC_COLORS[lights.fat]}"><span>GRASAS</span><span>${lights.fat.toUpperCase()}</span></div>
      <div class="light" style="background:${TRAFFIC_COLORS[lights.salt]}"><span>SAL</span><span>${lights.salt.toUpperCase()}</span></div>
    </div>`;
  } else {
    sealsHtml = `<div class="no-seals">${t('country_no_regulation_short')}</div>`;
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${t('label_title')} ${entry.lote_str}</title>
<style>
  @page { size: 80mm 140mm; margin: 3mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; line-height: 1.3; margin: 0; padding: 4mm; max-width: 74mm; color: #000; }
  h2 { font-size: 11pt; margin: 0 0 2mm; text-align: center; border-bottom: 1px solid #000; padding-bottom: 2mm; }
  .lote { font-size: 7pt; text-align: center; margin-bottom: 1mm; color: #555; }
  .best-before { font-size: 8pt; text-align: center; margin-bottom: 2mm; padding: 1mm; border: 1px solid #000; background: #f5f5f5; }
  .section { font-weight: bold; font-size: 7pt; text-transform: uppercase; margin: 3mm 0 1mm; border-bottom: 0.5px solid #999; }
  .ingredients { font-size: 7pt; margin-bottom: 2mm; word-wrap: break-word; }
  table.nut { width: 100%; border-collapse: collapse; font-size: 7pt; }
  table.nut th { font-size: 6.5pt; text-align: right; font-weight: bold; padding: 0.5mm 1mm; border-bottom: 0.5px solid #000; }
  table.nut th:first-child { text-align: left; }
  table.nut td { padding: 0.5mm 1mm; }
  table.nut td:nth-child(n+2) { text-align: right; font-weight: bold; }
  table.nut tr.indent td:first-child { padding-left: 4mm; font-weight: normal; font-style: italic; }
  table.nut tr.head td { font-weight: bold; border-top: 0.5px solid #000; }
  .seals-row { display: flex; flex-wrap: wrap; gap: 2mm; justify-content: center; margin: 2mm 0; }
  .seal { width: 18mm; height: 18mm; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 6pt; font-weight: bold; line-height: 1.05; padding: 1mm;
    /* octagon (stop-sign) shape */
    clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  }
  .no-seals { font-size: 7pt; text-align: center; padding: 2mm; border: 0.5px dashed #999; color: #555; margin: 2mm 0; }
  .lights { display: flex; flex-direction: column; gap: 1mm; margin: 2mm 0; }
  .light { display: flex; justify-content: space-between; padding: 1mm 2mm; color: #fff; font-weight: bold; font-size: 7pt; border-radius: 1mm; }
  /* Brazilian magnifying glass (ANVISA style) */
  .lupa { position: relative; display: inline-block; width: 22mm; height: 21mm; }
  .lupa-body { position: absolute; top: 0; left: 0; width: 17mm; height: 14mm; background: #000; color: #fff; border-radius: 1.5mm; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 6pt; font-weight: bold; line-height: 1.05; padding: 0.5mm; }
  .lupa-handle { position: absolute; bottom: 0; right: 0; width: 7mm; height: 7mm; background: #000; border-radius: 50%; border: 0.8mm solid #fff; box-shadow: 0 0 0 0.3mm #000; }
  .allergens { font-size: 7.5pt; padding: 2mm 3mm; border: 1px solid #000; background: #fff8e1; margin: 2mm 0; }
  .allergens strong { text-transform: uppercase; }
  .brand { font-size: 12pt; font-weight: bold; text-align: center; padding: 1mm 0 2mm; border-bottom: 1px dashed #999; margin-bottom: 2mm; letter-spacing: 0.3mm; }
  .biz { font-size: 6pt; color: #444; margin-top: 2mm; padding: 1mm 0; border-top: 0.5px solid #999; line-height: 1.3; }
  .biz strong { color: #000; }
  .footer { font-size: 6pt; color: #666; text-align: center; margin-top: 3mm; border-top: 0.5px solid #999; padding-top: 1mm; }
  .law { font-size: 5.5pt; color: #777; text-align: center; margin-top: 1mm; }
  .qr-row { display: flex; gap: 2mm; align-items: center; margin: 2mm 0; padding: 1.5mm; border: 0.5px solid #ccc; border-radius: 1mm; }
  .qr-row img { width: 14mm; height: 14mm; }
  .qr-info { flex: 1; font-size: 6pt; line-height: 1.3; color: #333; }
  .qr-info strong { display: block; font-size: 7pt; color: #000; }
</style></head><body>

${business?.fantasy_name ? `<div class="brand">${business.fantasy_name}</div>` : ''}

<h2>${entry.recipe_name}</h2>
<div class="lote">${entry.lote_str} | ${entry.prod_date} | ${parseFloat(entry.liters || 0).toFixed(1)} L</div>
${bestBefore ? `<div class="best-before"><strong>${t('label_best_before')}:</strong> ${bestBefore}</div>` : ''}

${qrDataUrl ? `<div class="qr-row">
  <img src="${qrDataUrl}" alt="QR ${entry.lote_str}" />
  <div class="qr-info">
    <strong>${t('label_traceability')}</strong>
    ${t('label_lot')}: ${entry.lote_str}<br>
    ${t('label_prod_date')}: ${entry.prod_date}
  </div>
</div>` : ''}

${sealsHtml}
${(seals.length > 0 || lights) && country?.law ? `<div class="law"><img src="https://flagcdn.com/w20/${country.code.toLowerCase()}.png" alt="" width="14" height="10" style="vertical-align:middle;margin-right:2mm"> ${country.name} — ${country.law}</div>` : ''}

<div class="section">${t('ingredients_section')}</div>
<div class="ingredients">${ingList}</div>

${allergensContains.length > 0 ? `
<div class="allergens">
  <strong>${t('allergens_contains')}:</strong> ${allergensContains.map(a => t('allergen_' + a)).join(', ')}.
</div>
` : ''}
${allergensTrace.length > 0 ? `
<div class="allergens" style="background:#fff8e1; border-style:dashed">
  <strong>${t('allergens_may_contain')}:</strong> ${allergensTrace.map(a => t('allergen_' + a)).join(', ')}.
</div>
` : ''}

<div class="section">${t('label_nutri_per_serving')} (${portionG} g)</div>
<table class="nut">
  <thead>
    <tr>
      <th>${t('nutrient_col')}</th>
      <th>${t('chile_per_100g')}</th>
      <th>${t('chile_per_portion')}</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>${t('energy_value')} (kcal)</td><td>${fmt(nv100.kcal)}</td><td>${fmt(portion.kcal)}</td></tr>
    <tr><td>${t('energy_value')} (kJ)</td><td>${fmt(kJ100)}</td><td>${fmt(portion.kJ)}</td></tr>
    <tr><td>${t('proteins')} (g)</td><td>${fmt(nv100.protein, 2)}</td><td>${fmt(portion.protein, 2)}</td></tr>
    <tr><td>${t('total_fats')} (g)</td><td>${fmt(nv100.fat, 2)}</td><td>${fmt(portion.fat, 2)}</td></tr>
    <tr class="indent"><td>${t('saturated_fats')} (g)</td><td>${fmt(nv100.satfat, 2)}</td><td>${fmt(portion.satfat, 2)}</td></tr>
    <tr class="indent"><td>${t('trans_fats')} (g)</td><td>${fmt(nv100.transfat, 2)}</td><td>${fmt(portion.transfat, 2)}</td></tr>
    <tr><td>${t('carbohydrates')} (g)</td><td>${fmt(nv100.carbs, 2)}</td><td>${fmt(portion.carbs, 2)}</td></tr>
    <tr class="indent"><td>${t('sugars')} (g)</td><td>${fmt(nv100.sugars, 2)}</td><td>${fmt(portion.sugars, 2)}</td></tr>
    <tr><td>${t('sodium')} (mg)</td><td>${fmt(nv100.sodium, 0)}</td><td>${fmt(portion.sodium, 0)}</td></tr>
  </tbody>
</table>

<div class="footer">
  ${t('label_keep_frozen')}<br>
  GelatoLab | ${entry.prod_date}
</div>

${business?.legal_name || business?.tax_id || business?.address || business?.sanitary_reg ? `
<div class="biz">
  ${business.legal_name ? `<div><strong>${business.legal_name}</strong></div>` : ''}
  ${business.tax_id ? `<div>${getBusinessFields(country?.code).tax_id_label}: ${business.tax_id}</div>` : ''}
  ${business.sanitary_reg ? `<div>${getBusinessFields(country?.code).sanitary_label}: ${business.sanitary_reg}</div>` : ''}
  ${business.address ? `<div>${business.address}</div>` : ''}
</div>
` : ''}
</body></html>`;

  printHtml(html, { width: 350, height: 600 });
}

// Production worksheet: a kitchen-friendly printout with the full ingredient
// table (base/batch/real grams + brand) and the process notes from the recipe.
// Designed for A4/Letter — taken to the lab, not stuck on the product.
function printProductionSheet(entry, t) {
  const snapshot = entry.ingredients_snapshot || [];
  const totalBatchG = snapshot.reduce((s, i) => s + (parseFloat(i.batch_g) || 0), 0);
  const procNotes = entry.proc_notes || '';
  const escape = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const ingredientsRows = snapshot.map(i => `
    <tr>
      <td>${escape(i.name)}</td>
      <td class="num">${(parseFloat(i.base_g) || 0).toFixed(0)}</td>
      <td class="num strong">${(parseFloat(i.batch_g) || 0).toFixed(0)}</td>
      <td class="num"></td>
      <td>${escape(i.brand || '')}</td>
    </tr>`).join('');

  const procHtml = procNotes
    ? `<div class="proc">${escape(procNotes).replace(/\n/g, '<br>')}</div>`
    : `<div class="proc empty">${t('sheet_no_process')}</div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${t('sheet_title')} ${entry.lote_str}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.4; margin: 0; color: #111; }
  header { border-bottom: 2px solid #000; padding-bottom: 6mm; margin-bottom: 6mm; }
  h1 { font-size: 18pt; margin: 0 0 2mm; }
  .meta { display: flex; gap: 10mm; flex-wrap: wrap; font-size: 9pt; color: #444; }
  .meta div { white-space: nowrap; }
  .meta strong { color: #000; }
  h2 { font-size: 12pt; margin: 6mm 0 2mm; padding-bottom: 1mm; border-bottom: 1px solid #999; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #f0f0f0; text-align: left; padding: 2mm 2mm; border-bottom: 1.5px solid #000; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 2mm; border-bottom: 0.5px solid #ddd; vertical-align: top; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.strong { font-weight: bold; }
  tfoot td { font-weight: bold; border-top: 1.5px solid #000; }
  .proc { white-space: pre-wrap; padding: 4mm; background: #fafafa; border-left: 3px solid #1a5c3a; min-height: 30mm; }
  .proc.empty { color: #888; font-style: italic; border-left-color: #ccc; }
  footer { margin-top: 10mm; padding-top: 3mm; border-top: 0.5px solid #999; font-size: 8pt; color: #666; display: flex; justify-content: space-between; }
  .signatures { margin-top: 12mm; display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; font-size: 9pt; }
  .signatures > div { border-top: 1px solid #000; padding-top: 1mm; text-align: center; color: #555; }
</style></head><body>

<header>
  <h1>${escape(entry.recipe_name)}</h1>
  <div class="meta">
    <div><strong>${t('sheet_batch')}:</strong> ${entry.lote_str}</div>
    <div><strong>${t('date_label')}:</strong> ${entry.prod_date}</div>
    <div><strong>${t('sheet_volume')}:</strong> ${parseFloat(entry.liters || 0).toFixed(1)} L</div>
    <div><strong>${t('sheet_total_mass')}:</strong> ${totalBatchG.toFixed(0)} g</div>
  </div>
</header>

<h2>${t('sheet_ingredients')}</h2>
<table>
  <thead>
    <tr>
      <th>${t('ingredient')}</th>
      <th style="text-align:right">${t('base_g')}</th>
      <th style="text-align:right">${t('batch_g')}</th>
      <th style="text-align:right">${t('real_g')}</th>
      <th>${t('brand')}</th>
    </tr>
  </thead>
  <tbody>${ingredientsRows}</tbody>
  <tfoot>
    <tr>
      <td>${t('total_mix')}</td>
      <td class="num"></td>
      <td class="num">${totalBatchG.toFixed(0)} g</td>
      <td class="num"></td>
      <td></td>
    </tr>
  </tfoot>
</table>

<h2>${t('sheet_process')}</h2>
${procHtml}

<div class="signatures">
  <div>${t('sheet_made_by')}</div>
  <div>${t('sheet_verified_by')}</div>
</div>

<footer>
  <span>GelatoLab — ${t('sheet_internal_doc')}</span>
  <span>${entry.prod_date}</span>
</footer>

</body></html>`;

  printHtml(html, { width: 800, height: 1000 });
}

export default function ProductionLog() {
  const t = useT();
  const tIng = useIngredientName();
  const lang = useI18nStore(s => s.lang);
  const { showToast, confirm } = useAppStore();
  const store = useProductionStore();
  const countryCode = useCountryStore(s => s.country);
  const country = getCountry(countryCode);
  const business = useBusinessStore();
  const allRecipes = useRecipeStore(s => s.recipes);
  const recipeMap = useMemo(
    () => Object.fromEntries(allRecipes.map(r => [String(r.id), r])),
    [allRecipes]
  );

  const [openDates, setOpenDates] = useState(new Set());
  const [openLotes, setOpenLotes] = useState(new Set());
  const [editingSnapshot, setEditingSnapshot] = useState(null); // { entryId, index, field, value }

  const typeLbl = (tp) => ({ helado: t('ice_cream'), gelato: t('gelato'), sorbete: t('sorbet') }[tp] || tp);

  const log = store.list();

  const byDate = useMemo(() => {
    const acc = {};
    for (const entry of log) {
      const d = String(entry.prod_date).slice(0, 10);
      if (!acc[d]) acc[d] = [];
      acc[d].push(entry);
    }
    return acc;
  }, [log]);

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const monthStats = store.monthlyStats(currentYearMonth());

  function toggleDate(d) {
    setOpenDates(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });
  }
  function toggleLote(id) {
    setOpenLotes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleDelete(entry) {
    const ok = await confirm(t('confirm_delete_batch', { name: entry.recipe_name, lote: entry.lote_str }));
    if (ok) { store.remove(entry.id); showToast(t('batch_deleted')); }
  }

  function handleSnapshotEdit(entryId, ingIndex, field, value) {
    const entry = log.find(e => e.id === entryId);
    if (!entry) return;
    const snapshot = [...(entry.ingredients_snapshot || [])];
    snapshot[ingIndex] = { ...snapshot[ingIndex], [field]: value };
    store.update(entryId, { ingredients_snapshot: snapshot });
  }

  function handleNotesChange(entryId, notes) {
    store.update(entryId, { batch_notes: notes });
  }

  function handleRatingChange(entryId, rating) {
    store.update(entryId, { rating });
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl text-[var(--ink)]">{t('production_log')}</h1>
          <p className="text-sm text-[var(--ink3)] mt-1">
            {t('production_log_desc')}
          </p>
        </div>
      </div>

      {log.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label={t('batches_this_month')} value={monthStats.count} />
          <StatCard label={t('liters_this_month')} value={`${monthStats.liters.toFixed(1)} L`} />
          <StatCard label={t('cost_this_month')} value={`$${Math.round(monthStats.cost).toLocaleString('es-CL')}`} />
        </div>
      )}

      {dates.length === 0 ? (
        <EmptyState title={t('no_production_yet')} description={t('confirm_from_planning')} />
      ) : (
        <div className="space-y-3">
          {dates.map(date => {
            const entries = byDate[date];
            const isOpen = openDates.has(date);
            const totalL = entries.reduce((s, e) => s + (parseFloat(e.liters) || 0), 0);
            const totalCost = entries.reduce((s, e) => s + (parseFloat(e.cost) || 0), 0);

            return (
              <div key={date} className="rounded-xl overflow-hidden shadow-sm border border-black/10">
                {/* Date header */}
                <div
                  className="bg-[var(--ink)] text-[var(--cream)] px-5 py-3 flex items-center gap-4 cursor-pointer select-none"
                  onClick={() => toggleDate(date)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base capitalize">{formatDate(date, lang)}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[48px]">
                      <div className="font-display text-lg text-[var(--gold)]">{entries.length}</div>
                      <div className="text-[9px] text-[var(--cream)]/50 uppercase tracking-wide">{t('batches')}</div>
                    </div>
                    <div className="text-center min-w-[64px]">
                      <div className="font-display text-lg text-[var(--gold)]">{totalL.toFixed(1)} L</div>
                      <div className="text-[9px] text-[var(--cream)]/50 uppercase tracking-wide">{t('litros')}</div>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <div className="font-display text-lg text-[var(--gold)]">
                        ${Math.round(totalCost).toLocaleString('es-CL')}
                      </div>
                      <div className="text-[9px] text-[var(--cream)]/50 uppercase tracking-wide">{t('costo')}</div>
                    </div>
                  </div>
                  <span className="text-base ml-1 transition-transform duration-200"
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                    ›
                  </span>
                </div>

                {/* Entries */}
                {isOpen && (
                  <div className="bg-white p-4 space-y-3">
                    {entries.map(entry => {
                      const loteOpen = openLotes.has(entry.id);
                      const rType = entry.recipe_type || entry.type || 'helado';
                      const typeColor = TYPE_COLOR[rType] || '#607d8b';
                      const typeBg = TYPE_BG[rType] || '#eee';
                      const typeLabel = typeLbl(rType);
                      const loteStr = entry.lote_str || `LOTE-${String(entry.lote_num || '?').padStart(4, '0')}`;
                      const snapshot = entry.ingredients_snapshot || [];

                      return (
                        <div key={entry.id} className="border border-black/10 rounded-xl overflow-hidden">
                          {/* Lote header */}
                          <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap"
                               style={{ background: typeBg + '55' }}>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                                  style={{ background: typeColor }}>
                              {loteStr}
                            </span>
                            <span className="font-display text-sm text-[var(--ink)]">{entry.recipe_name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                                  style={{ background: typeColor }}>
                              {typeLabel}
                            </span>
                            <div className="flex gap-2 ml-auto items-center flex-wrap">
                              {entry.rating?.overall > 0 && (
                                <span className="text-[11px] font-semibold text-[#b8860b]" title={t('rating_overall')}>
                                  {'★'.repeat(entry.rating.overall)}{'☆'.repeat(5 - entry.rating.overall)}
                                </span>
                              )}
                              <span className="text-xs text-[var(--ink2)]">
                                {parseFloat(entry.liters || 0).toFixed(1)} L
                              </span>
                              <span className="text-xs font-semibold text-[var(--mint)]">
                                ${Math.round(entry.cost || 0).toLocaleString('es-CL')}
                              </span>
                              <button className="text-xs px-3 py-1 rounded-lg bg-[var(--teal)] text-white
                                                 hover:opacity-90 transition-colors"
                                      onClick={async () => {
                                        // Guard: para etiquetas legales (Chile Ley 20.606, Brasil RDC 429,
                                        // etc.) faltan RUT y razón social puede ser un problema con
                                        // fiscalización SAG/ANVISA. Avisamos antes de imprimir y damos
                                        // la opción de cancelar.
                                        if (!business?.tax_id || !business?.legal_name) {
                                          const ok = await confirm(t('label_business_incomplete_warning'));
                                          if (!ok) return;
                                        }
                                        printLabel(entry, t, country, business, 60, recipeMap);
                                        track('label_printed', { country: country.code });
                                      }}>
                                {t('label_btn')}
                              </button>
                              <button className="text-xs px-3 py-1 rounded-lg bg-[var(--mint)] text-white
                                                 hover:opacity-90 transition-colors"
                                      onClick={() => { printProductionSheet(entry, t); track('production_sheet_printed'); }}
                                      title={t('print_sheet_tooltip')}>
                                {t('print_sheet_btn')}
                              </button>
                              <button className="text-xs px-3 py-1 rounded-lg border border-black/10
                                                 hover:bg-[var(--cream2)] transition-colors"
                                      onClick={() => toggleLote(entry.id)}>
                                {loteOpen ? t('hide_detail') : t('show_detail')}
                              </button>
                            </div>
                          </div>

                          {/* Lote detail */}
                          {loteOpen && (
                            <div className="p-4 space-y-4">
                              {/* Editable ingredients snapshot */}
                              {snapshot.length > 0 && (
                                <div className="overflow-x-auto">
                                  <h4 className="text-xs font-semibold text-[var(--ink2)] mb-2">
                                    {t('batch_ingredients')}
                                  </h4>
                                  <table className="tbl text-xs">
                                    <thead>
                                      <tr>
                                        <th className="text-left">{t('ingredient')}</th>
                                        <th>{t('base_g')}</th>
                                        <th>{t('batch_g')}</th>
                                        <th>{t('real_g')}</th>
                                        <th>{t('brand')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {snapshot.map((ing, ii) => (
                                        <tr key={ii}>
                                          <td>{tIng(ing.name)}</td>
                                          <td>{ing.base_g || Math.round(ing.qty_grams || 0)}</td>
                                          <td className="font-semibold">{ing.batch_g || Math.round(ing.qty_grams || 0)}</td>
                                          <td>
                                            <input
                                              type="number"
                                              className="input-gold w-20 py-0.5 px-1 text-xs"
                                              value={ing.real_g ?? ing.batch_g ?? ing.qty_grams ?? ''}
                                              onChange={e => handleSnapshotEdit(entry.id, ii, 'real_g', e.target.value)}
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="text"
                                              className="input w-24 py-0.5 px-1 text-xs"
                                              placeholder={t('brand_placeholder')}
                                              value={ing.brand || ''}
                                              onChange={e => handleSnapshotEdit(entry.id, ii, 'brand', e.target.value)}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {snapshot.length === 0 && (
                                <p className="text-xs text-[var(--ink3)]">
                                  {t('no_snapshot')}
                                </p>
                              )}

                              {/* Recipe process notes (snapshot at production time) */}
                              {entry.proc_notes && (
                                <div>
                                  <h4 className="text-xs font-semibold text-[var(--ink2)] mb-2">
                                    {t('recipe_process_notes')}
                                  </h4>
                                  <div className="text-xs text-[var(--ink2)] bg-[var(--cream)] border border-black/10
                                                  rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                                    {entry.proc_notes}
                                  </div>
                                </div>
                              )}

                              {/* Batch rating (multi-dim) */}
                              <BatchRating
                                rating={entry.rating || {}}
                                onChange={(r) => handleRatingChange(entry.id, r)}
                              />

                              {/* Batch notes */}
                              <div>
                                <h4 className="text-xs font-semibold text-[var(--ink2)] mb-2">
                                  {t('batch_notes')}
                                </h4>
                                <textarea
                                  className="input text-xs min-h-[60px] resize-y"
                                  placeholder={t('production_notes_placeholder')}
                                  value={entry.batch_notes || ''}
                                  onChange={e => handleNotesChange(entry.id, e.target.value)}
                                />
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end gap-2 pt-2 border-t border-black/10">
                                <button
                                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--coral)]
                                             text-[var(--coral)] hover:bg-[var(--coral2)] transition-colors"
                                  onClick={() => handleDelete(entry)}
                                >
                                  {t('delete_batch')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
