import { useState, useMemo, useEffect } from 'react';
import { useT, useLocale, useIngredientName, useCategoryName } from '../lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { usePlanStore } from '../store/planStore';
import { useProductionStore } from '../store/productionStore';
import { useInventoryStore, processDueInventoryDeductions } from '../store/inventoryStore';
import { track } from '../lib/analytics';
import { useAppStore } from '../store/appStore';
import SearchSelect from '../components/SearchSelect';
import { calcStats } from '../lib/icecreamCalc';
import { printHtml } from '../lib/printHtml';
import { MachineVolumeWarning, PasteurizerVolumeWarning } from '../components/MachineVolumeWarning';
import { NumberInput } from '../components/NumberInput';
import { ProGate } from '../components/ProGate';
import { MobileDesktopHint } from '../components/MobileDesktopHint';
import { FEATURES } from '../lib/entitlement';
import { useBusinessStore } from '../store/businessStore';
import { getMachine, rateBatchVolume, ratePasteurizerVolume, pickBestFit } from '../data/machines';

const today   = () => new Date().toISOString().slice(0, 10);
const DENSITY = 1070; // g/L
const BALL_G  = 120;

const CAT_COLORS = {
  'Lacteo':'#1a5c3a','Azucar':'#b8860b','Fruta':'#2e7d52',
  'Saborizante':'#6a1b9a','Estabilizante':'#1565c0','Emulsionante':'#00695c',
  'Acido/Sabor':'#e65100','Dulce':'#b71c1c','Coco':'#2e7b5c',
  'Fruto seco':'#6d4c41','Bebida/Licor':'#283593','Colorante nat.':'#424242','Base':'#607d8b',
};

// TYPE_LBL moved inside component as typeLbl() to support i18n

/* Enrich recipe ingredients with full ingredient data from the store */
function enrichRecipeIngredients(recipe, ingredientMap) {
  if (!recipe?.ingredients?.length) return [];
  return recipe.ingredients.map(ri => {
    const ing = ingredientMap[ri.ingredient_id] || ri.ingredient || ri;
    return {
      qty_grams: parseFloat(ri.qty_grams) || 0,
      ingredient_id: ri.ingredient_id,
      ingredient: {
        name:        ing.name || '?',
        category:    ing.category || '',
        water_pct:   parseFloat(ing.water_pct   || 0),
        fat_pct:     parseFloat(ing.fat_pct     || 0),
        sng_pct:     parseFloat(ing.sng_pct     || 0),
        sugar_pct:   parseFloat(ing.sugar_pct   || 0),
        others_pct:  parseFloat(ing.others_pct  || 0),
        pod:         parseFloat(ing.pod         || 0),
        pac:         parseFloat(ing.pac         || 0),
        cost_per_kg: parseFloat(ing.cost_per_kg || 0),
        protein:     parseFloat(ing.protein     || 0),
        salt:        parseFloat(ing.salt        || 0),
        calories:    parseFloat(ing.calories    || 0),
        satfat:      parseFloat(ing.satfat      || 0),
        trans_fat:   parseFloat(ing.trans_fat   || 0),
        sodium_mg:   parseFloat(ing.sodium_mg   || 0),
        sugars:      parseFloat(ing.sugars      || 0),
        added_sugars: parseFloat(ing.added_sugars || 0),
        allergens:   Array.isArray(ing.allergens) ? ing.allergens : [],
      },
    };
  });
}

function calcRecipeStats(recipe, ingredientMap) {
  const items = enrichRecipeIngredients(recipe, ingredientMap);
  if (!items.length) return null;
  return calcStats(items);
}

function recipeLiters(stats) {
  if (!stats || stats.T === 0) return 0;
  return stats.T / DENSITY;
}

export default function ProductionPlan() {
  const t = useT();
  const tIng = useIngredientName();
  const tCat = useCategoryName();
  const locale = useLocale();
  const typeLbl = (type) => ({ helado: t('ice_cream'), gelato: t('gelato'), sorbete: t('sorbet') }[type] || type);
  const navigate = useNavigate();
  const { showToast, confirm } = useAppStore();

  // Zustand stores
  const recipes     = useRecipeStore(s => s.recipes);
  const ingredients = useIngredientStore(s => s.ingredients);
  const addEntries     = useProductionStore(s => s.addEntries);
  const removeProdByDate = useProductionStore(s => s.removeByDate);
  const productionLog  = useProductionStore(s => s.log);
  const removeInvByLote = useInventoryStore(s => s.removeByLoteRef);
  const upsertPlan  = usePlanStore(s => s.upsert);
  const removePlan  = usePlanStore(s => s.remove);
  const plans       = usePlanStore(s => s.plans);

  // Configured equipment (for warnings and printable sheet)
  const machineIds     = useBusinessStore(s => s.machine_ids || []);
  const pasteurizerIds = useBusinessStore(s => s.pasteurizer_ids || []);
  const batchFreezers  = machineIds.map(getMachine).filter(Boolean);
  const pasteurizers   = pasteurizerIds.map(getMachine).filter(Boolean);
  // Show per-order assignment selectors only when the operator has 2+ of
  // either type — for a single machine the assignment is implicit.
  const showBatchPicker = batchFreezers.length >= 2;
  const showPastPicker  = pasteurizers.length >= 2;

  // Resolve effective equipment for an order: explicit > auto-pick > none.
  function effectiveBatchId(order) {
    if (order.batch_freezer_id) return order.batch_freezer_id;
    if (machineIds.length === 0) return '';
    const m = pickBestFit(order.liters, machineIds, ['batch_freezer', 'combo']);
    return m?.id || '';
  }
  function effectivePasteurizerId(order) {
    if (order.pasteurizer_id) return order.pasteurizer_id;
    if (pasteurizerIds.length === 0) return '';
    const m = pickBestFit(order.liters, pasteurizerIds, ['pasteurizer', 'combo']);
    return m?.id || '';
  }

  // Local state
  const [date,   setDate]   = useState(today());
  const [pname,  setPname]  = useState('');
  const [orders, setOrders] = useState([]); // { _key, recipe_id, liters }
  const [confirming, setConfirming] = useState(false);

  // Past dates are read-only — production has already happened, no point editing.
  const isPast = date < today();
  // Whether the selected date already has a saved plan in storage.
  // Used to allow "deleting" a saved plan by emptying it and confirming.
  const hasSavedPlan = !!plans?.[date]?.items?.length;

  // Load saved plan when the selected date changes (or on mount).
  // The selected date is the source of truth: if it has a plan, show it;
  // otherwise show a clean slate so the user knows there's nothing planned.
  // We read plans straight from the store getState() to avoid stale closures
  // and to react to async hydration of the persist middleware.
  useEffect(() => {
    const plan = usePlanStore.getState().plans?.[date];
    if (plan && Array.isArray(plan.items) && plan.items.length > 0) {
      setOrders(plan.items.map((it, idx) => ({
        _key:             Date.now() + idx,
        recipe_id:        String(it.recipe_id),
        liters:           parseFloat(it.liters) || 0,
        batch_freezer_id: it.batch_freezer_id || '',
        pasteurizer_id:   it.pasteurizer_id   || '',
      })));
      setPname(plan.plan_name || '');
    } else {
      setOrders([]);
      setPname('');
    }
  }, [date, plans]);

  // Maps for quick lookup
  const recipeMap = useMemo(
    () => Object.fromEntries(recipes.map(r => [String(r.id), r])),
    [recipes]
  );
  const ingredientMap = useMemo(
    () => Object.fromEntries(ingredients.map(i => [i.id, i])),
    [ingredients]
  );

  // ── Order management ──────────────────────────────────────
  function addOrder() {
    setOrders(p => [...p, { _key: Date.now(), recipe_id: '', liters: 5, batch_freezer_id: '', pasteurizer_id: '' }]);
  }
  async function removeOrder(key) {
    // Pide confirmacion si el lote ya tiene datos cargados; si esta vacio
    // (sin receta ni litros) lo quita directo para no molestar.
    const o = orders.find(x => x._key === key);
    if (o && (o.recipe_id || (o.liters && o.liters > 0))) {
      const r = recipeMap[o.recipe_id];
      const ok = await confirm(t('confirm_remove_plan_order', {
        name: r?.name || t('select_recipe'),
        liters: o.liters,
      }));
      if (!ok) return;
    }
    setOrders(p => p.filter(x => x._key !== key));
  }
  function updateOrder(key, field, val) {
    setOrders(p => p.map(o => o._key !== key ? o : { ...o, [field]: val }));
  }

  // ── Enriched orders with live calculations ────────────────
  const enriched = useMemo(() =>
    orders.filter(o => o.recipe_id).map(o => {
      const r       = recipeMap[o.recipe_id];
      const stats   = calcRecipeStats(r, ingredientMap);
      const baseLit = recipeLiters(stats);
      const factor  = baseLit > 0 ? o.liters / baseLit : 0;
      const bolas   = Math.floor(o.liters * DENSITY / BALL_G);
      const cost    = stats ? stats.cost * factor : 0;
      return { ...o, r, stats, factor, bolas, cost };
    }),
    [orders, recipeMap, ingredientMap]
  );

  // ── Consolidated ingredients ──────────────────────────────
  const consolidated = useMemo(() => {
    const map = {};
    enriched.forEach(({ r, factor, liters }) => {
      const items = enrichRecipeIngredients(r, ingredientMap);
      items.forEach(ri => {
        const name = ri.ingredient?.name || '?';
        const cat  = ri.ingredient?.category || '';
        const g    = ri.qty_grams * factor;
        const cost = g * (ri.ingredient?.cost_per_kg || 0) / 1000;
        if (!map[name]) map[name] = { name, cat, total_g: 0, total_cost: 0, details: [] };
        map[name].total_g    += g;
        map[name].total_cost += cost;
        map[name].details.push(`${r?.name} ${liters}L: ${Math.round(g)}g`);
      });
    });
    return Object.values(map).sort((a, b) => b.total_g - a.total_g);
  }, [enriched, ingredientMap]);

  // ── Summary totals ────────────────────────────────────────
  const totalConsolidatedG    = consolidated.reduce((s, i) => s + i.total_g,    0);
  const totalConsolidatedCost = consolidated.reduce((s, i) => s + i.total_cost, 0);
  const totalLiters = enriched.reduce((s, o) => s + o.liters, 0);
  const totalBolas  = enriched.reduce((s, o) => s + o.bolas,  0);
  const totalCost   = enriched.reduce((s, o) => s + o.cost,   0);

  // ── Breakdown by type ─────────────────────────────────────
  const byType = enriched.reduce((acc, o) => {
    const type = o.r?.type || 'helado';
    acc[type] = (acc[type] || 0) + o.liters;
    return acc;
  }, {});

  // ── Cancel / discard ──────────────────────────────────────
  async function handleCancel() {
    if (orders.length > 0) {
      const ok = await confirm(t('discard_plan'));
      if (!ok) return;
    }
    setOrders([]);
    setPname('');
    showToast(t('plan_discarded'));
  }

  // ── Build ingredients snapshot for production log ─────────
  function buildIngredientsSnapshot(recipe, factor) {
    const items = enrichRecipeIngredients(recipe, ingredientMap);
    return items.map(ri => {
      const g = ri.qty_grams;
      const batchG = Math.round(g * factor * 100) / 100;
      const ing = ri.ingredient;
      return {
        ingredient_id: ri.ingredient_id,
        name:          ing.name,
        category:      ing.category,
        base_g:        Math.round(g),
        batch_g:       Math.round(batchG),
        cost_per_kg:   ing.cost_per_kg,
        // Nutritional data (absolute amounts in batch) for label printing.
        // sugars_g uses the dedicated 'sugars' field (azúcares totales) when
        // available, falling back to sugar_pct (formulation sugar). sodium_mg
        // and trans_fat_g feed the Chilean ALTO EN seal calculations.
        fat_g:         batchG * (ing.fat_pct || 0) / 100,
        satfat_g:      batchG * (parseFloat(ing.satfat) || ing.fat_pct * 0.6 || 0) / 100,
        trans_fat_g:   batchG * (parseFloat(ing.trans_fat) || 0) / 100,
        sugar_g:       batchG * (ing.sugar_pct || 0) / 100,
        sugars_g:      batchG * (parseFloat(ing.sugars) || ing.sugar_pct || 0) / 100,
        protein_g:     batchG * (parseFloat(ing.protein) || 0) / 100,
        salt_g:        batchG * (parseFloat(ing.salt) || 0) / 100,
        sodium_mg:     batchG * (parseFloat(ing.sodium_mg) || 0) / 100,
        added_sugars_g: batchG * (parseFloat(ing.added_sugars) || 0) / 100,
        calories:      batchG * (parseFloat(ing.calories) || 0) / 100,
        allergens:     Array.isArray(ing.allergens) ? ing.allergens : [],
      };
    });
  }

  // ── Confirm production ────────────────────────────────────
  async function handleConfirm() {
    // Empty + existing saved plan → delete the plan AND all production entries
    // for that date. Re-read state from the store to avoid stale closures.
    if (!enriched.length) {
      const liveHasPlan = !!usePlanStore.getState().plans?.[date]?.items?.length;
      if (!liveHasPlan) return showToast(t('add_at_least_one'), 'error');
      const target = String(date).slice(0, 10);
      const affectedLotes = useProductionStore.getState().log
        .filter(e => String(e.prod_date).slice(0, 10) === target);
      const lotCount = affectedLotes.length;
      const ok = await confirm(t('confirm_delete_plan_with_lotes', { date, lotes: lotCount }));
      if (!ok) return;
      try {
        // Roll back inventory only for lotes that were already deducted; lotes
        // whose date hadn't arrived never touched inventory, so nothing to undo.
        affectedLotes.forEach(e => {
          if (e.lote_str && e.inventory_deducted_at) removeInvByLote(e.lote_str);
        });
        removePlan(date);
        const removed = removeProdByDate(date);
        setOrders([]);
        setPname('');
        showToast(removed > 0 ? t('plan_and_lotes_deleted', { lotes: removed }) : t('plan_deleted'));
      } catch (e) {
        showToast(e.message || 'Error', 'error');
      }
      return;
    }

    const lines = enriched.map(o =>
      `- ${o.r?.name}: ${o.liters}L / ${o.bolas} bolas / $${Math.round(o.cost).toLocaleString(locale)}`
    ).join('\n');

    // Equipment range warnings: list each batch whose effective machine
    // assignment (explicit or auto-picked) is outside its operating range.
    // Note: when the operator has multiple machines configured we only
    // complain when ALL options miss — the auto-picker already chose the
    // closest one, so its rating is the best achievable.
    const equipIssues = [];
    for (const o of enriched) {
      const bId = effectiveBatchId(o);
      const pId = effectivePasteurizerId(o);
      const m = bId && rateBatchVolume(o.liters, bId);
      const p = pId && ratePasteurizerVolume(o.liters, pId);
      if (m && (m.state === 'under' || m.state === 'over')) {
        equipIssues.push(`! ${o.r?.name} (${o.liters}L): ${t(m.state === 'over' ? 'machine_warning_over' : 'machine_warning_under',
          { name: m.machine.name, max: m.machine.max, min: m.machine.min })}`);
      }
      if (p && (p.state === 'under' || p.state === 'over') && p.machine.id !== bId) {
        equipIssues.push(`! ${o.r?.name} (${o.liters}L): ${t(p.state === 'over' ? 'machine_warning_over' : 'machine_warning_under',
          { name: p.machine.name, max: p.machine.max, min: p.machine.min })}`);
      }
    }
    const warningsBlock = equipIssues.length > 0
      ? `\n\n⚠ ${t('plan_confirm_equip_warning')}\n${equipIssues.join('\n')}\n`
      : '';

    const ok = await confirm(
      `${t('confirm_prod_date')} ${date}?\n\n${lines}\n\nTotal: ${totalLiters.toFixed(1)}L / $${Math.round(totalCost).toLocaleString(locale)}${warningsBlock}`
    );
    if (!ok) return;

    setConfirming(true);
    try {
      // Build production entries
      const entries = enriched.map(o => ({
        recipe_id:            Number(o.recipe_id),
        recipe_name:          o.r?.name || '',
        prod_date:            date,
        liters:               parseFloat(o.liters.toFixed(1)),
        cost:                 parseFloat(o.cost.toFixed(2)),
        scoops:               o.bolas,
        recipe_type:          o.r?.type || 'helado',
        // Snapshot the recipe's process notes so production has them even if
        // the recipe is later edited or deleted.
        proc_notes:           o.r?.proc_notes || '',
        // Snapshot del best-before. Si la receta cambia despues, el lote
        // mantiene la fecha de vencimiento que tenia al momento de producirse.
        best_before_days:     o.r?.best_before_days ?? 90,
        // Snapshot de overrides de alergenos (declaracion 3-estados)
        allergen_overrides:   o.r?.allergen_overrides || {},
        ingredients_snapshot: buildIngredientsSnapshot(o.r, o.factor),
      }));

      addEntries(entries);

      // Inventory is NOT deducted here. It is deducted only when the
      // prod_date arrives (handled by processDueInventoryDeductions, which
      // runs on app mount and after this confirm). For plans dated today or
      // earlier, this triggers the deduction immediately.
      processDueInventoryDeductions();
      track('plan_confirmed', { recipes: entries.length, liters: Math.round(totalLiters) });

      // Also save the plan
      upsertPlan(date, {
        plan_name: pname,
        items: enriched.map(o => ({
          recipe_id:        Number(o.recipe_id),
          liters:           parseFloat(o.liters.toFixed(1)),
          cost:             parseFloat(o.cost.toFixed(2)),
          batch_freezer_id: o.batch_freezer_id || '',
          pasteurizer_id:   o.pasteurizer_id   || '',
        })),
      });

      showToast(t('plan_confirmed'));
      navigate('/production');
      setOrders([]);
      setPname('');
    } catch (e) {
      showToast(e.message || t('error_confirming'), 'error');
    } finally {
      setConfirming(false);
    }
  }

  // ── Print consolidated list (styled HTML, A4) ─────────────
  function handlePrint() {
    const escape = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    // Per-batch volume warnings + assigned equipment for printing. The
    // assigned equipment may have been picked explicitly by the operator or
    // auto-resolved (closest fit) so the printed sheet is unambiguous about
    // which machine to use for each batch.
    const equipmentWarnings = enriched.map(o => {
      const bId = effectiveBatchId(o);
      const pId = effectivePasteurizerId(o);
      const bM = bId ? getMachine(bId) : null;
      const pM = pId ? getMachine(pId) : null;
      const m = bId && rateBatchVolume(o.liters, bId);
      const p = pId && ratePasteurizerVolume(o.liters, pId);
      const issues = [];
      if (m && (m.state === 'under' || m.state === 'over')) {
        issues.push(t(m.state === 'over' ? 'machine_warning_over' : 'machine_warning_under',
          { name: m.machine.name, max: m.machine.max, min: m.machine.min }));
      }
      if (p && (p.state === 'under' || p.state === 'over') && p.machine.id !== bId) {
        issues.push(t(p.state === 'over' ? 'machine_warning_over' : 'machine_warning_under',
          { name: p.machine.name, max: p.machine.max, min: p.machine.min }));
      }
      // Build assigned-equipment label cells (de-dup if the same combo plays both roles).
      const assigned = [];
      if (bM) assigned.push(bM.name);
      if (pM && pM.id !== bM?.id) assigned.push(pM.name);
      return { order: o, issues, assignedLabel: assigned.join(' / ') };
    });

    const showAssignedCol = batchFreezers.length > 0 || pasteurizers.length > 0;

    const recipesRows = equipmentWarnings.map(({ order: o, issues, assignedLabel }) => `
      <tr>
        <td>${escape(o.r?.name || '?')}${issues.length > 0 ? ' <span class="warn">⚠</span>' : ''}</td>
        <td class="num">${o.liters.toFixed(1)} L</td>
        <td class="num">${o.bolas}</td>
        <td class="num">$${Math.round(o.cost).toLocaleString(locale)}</td>
        ${showAssignedCol ? `<td>${escape(assignedLabel || '—')}</td>` : ''}
      </tr>`).join('');

    const fmtMachine = (m) => `${escape(m.name)} (${m.min}-${m.max} L)`;
    const equipmentMetaParts = [];
    if (batchFreezers.length > 0) {
      equipmentMetaParts.push(`<div><strong>${t('print_equip_batchfreezer')}:</strong> ${batchFreezers.map(fmtMachine).join(' · ')}</div>`);
    }
    const standalonePast = pasteurizers.filter(p => !machineIds.includes(p.id));
    if (standalonePast.length > 0) {
      equipmentMetaParts.push(`<div><strong>${t('print_equip_pasteurizer')}:</strong> ${standalonePast.map(fmtMachine).join(' · ')}</div>`);
    }
    const equipmentMeta = equipmentMetaParts.join('');

    const issuesList = equipmentWarnings.filter(w => w.issues.length > 0);
    const issuesSection = issuesList.length > 0 ? `
<h2>${t('print_equip_warnings_title')}</h2>
<ul style="margin: 0 0 4mm 4mm; font-size: 9.5pt;">
  ${issuesList.map(w => `<li><strong>${escape(w.order.r?.name || '?')}</strong> (${w.order.liters.toFixed(1)} L): ${w.issues.map(escape).join(' · ')}</li>`).join('')}
</ul>
` : '';

    const ingredientsRows = consolidated.map(i => `
      <tr>
        <td>${escape(i.name)}</td>
        <td>${escape(i.cat || '')}</td>
        <td class="num">${Math.round(i.total_g).toLocaleString(locale)}</td>
        <td class="num">${(i.total_g / 1000).toFixed(3)}</td>
        <td class="num">$${Math.round(i.total_cost).toLocaleString(locale)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${t('consol_list_title')} ${date}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.4; margin: 0; color: #111; }
  header { border-bottom: 2px solid #000; padding-bottom: 6mm; margin-bottom: 6mm; }
  h1 { font-size: 18pt; margin: 0 0 2mm; }
  .meta { display: flex; gap: 10mm; flex-wrap: wrap; font-size: 9pt; color: #444; }
  .meta strong { color: #000; }
  h2 { font-size: 12pt; margin: 6mm 0 2mm; padding-bottom: 1mm; border-bottom: 1px solid #999; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 4mm; }
  th { background: #f0f0f0; text-align: left; padding: 2mm; border-bottom: 1.5px solid #000; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
  th.num { text-align: right; }
  td { padding: 2mm; border-bottom: 0.5px solid #ddd; vertical-align: top; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .warn { color: #c0392b; font-weight: bold; }
  tfoot td { font-weight: bold; border-top: 1.5px solid #000; background: #fafafa; }
  footer { margin-top: 10mm; padding-top: 3mm; border-top: 0.5px solid #999; font-size: 8pt; color: #666; display: flex; justify-content: space-between; }
</style></head><body>

<header>
  <h1>${t('consol_list_title')}</h1>
  <div class="meta">
    <div><strong>${t('date_label')}:</strong> ${date}</div>
    ${pname ? `<div><strong>${t('plan_name_label')}:</strong> ${escape(pname)}</div>` : ''}
    <div><strong>${t('total_recipes_count')}:</strong> ${enriched.length}</div>
    <div><strong>${t('total_litros')}:</strong> ${totalLiters.toFixed(1)} L</div>
    ${equipmentMeta}
  </div>
</header>

${enriched.length > 0 ? `
<h2>${t('plan_recipes_section')}</h2>
<table>
  <thead>
    <tr>
      <th>${t('recipe_label')}</th>
      <th class="num">${t('litros')}</th>
      <th class="num">${t('scoops')}</th>
      <th class="num">${t('cost')}</th>
      ${showAssignedCol ? `<th>${t('print_equip_assigned')}</th>` : ''}
    </tr>
  </thead>
  <tbody>${recipesRows}</tbody>
  <tfoot>
    <tr>
      <td>${t('total_label')}</td>
      <td class="num">${totalLiters.toFixed(1)} L</td>
      <td class="num">${totalBolas}</td>
      <td class="num">$${Math.round(totalCost).toLocaleString(locale)}</td>
      ${showAssignedCol ? '<td></td>' : ''}
    </tr>
  </tfoot>
</table>
${issuesSection}
` : ''}

<h2>${t('consolidated_ingredients')}</h2>
<table>
  <thead>
    <tr>
      <th>${t('ingredient')}</th>
      <th>${t('category')}</th>
      <th class="num">${t('total_g_col')}</th>
      <th class="num">${t('total_kg_col')}</th>
      <th class="num">${t('cost')}</th>
    </tr>
  </thead>
  <tbody>${ingredientsRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="2">${t('total_label')}</td>
      <td class="num">${Math.round(totalConsolidatedG).toLocaleString(locale)}</td>
      <td class="num">${(totalConsolidatedG / 1000).toFixed(3)}</td>
      <td class="num">$${Math.round(totalConsolidatedCost).toLocaleString(locale)}</td>
    </tr>
  </tfoot>
</table>

<footer>
  <span>GelatoLab — ${t('sheet_internal_doc')}</span>
  <span>${date}</span>
</footer>

</body></html>`;

    printHtml(html, { width: 800, height: 1000 });
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <MobileDesktopHint pageId="production-plan" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-[var(--ink)]">{t('production_plan')}</h1>
          <p className="text-sm text-[var(--ink3)] mt-1">
            {t('plan_subtitle')}
          </p>
        </div>
        <button className="btn-primary" onClick={addOrder} disabled={isPast}
                style={isPast ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
          + {t('add_order')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="space-y-5">
          {/* Date and plan name */}
          <div data-tour="plan-date" className="card p-5 flex gap-4 flex-wrap items-end">
            <div className="min-w-[160px]">
              <label htmlFor="plan-date" className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('select_date')}</label>
              <input id="plan-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              {/* Fecha verbose en es-CL: "miércoles 6 de mayo de 2026". Resuelve
                  ambigüedad DD-MM vs MM-DD que el input nativo arrastra según
                  locale del browser. Crítico porque planificar producción en
                  la fecha equivocada es un error costoso en cocina. */}
              {date && (() => {
                // toLocaleDateString en es-CL devuelve "miércoles, 6 de mayo
                // de 2026" en minúsculas (correcto en español, los días y
                // meses no llevan mayúscula). Solo capitalizamos la primera
                // letra del weekday para que arranque la frase como debe.
                const formatted = new Date(date + 'T00:00:00').toLocaleDateString(locale, {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                });
                return (
                  <p className="text-[10px] text-[var(--ink3)] mt-1">
                    {formatted.charAt(0).toUpperCase() + formatted.slice(1)}
                  </p>
                );
              })()}
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="plan-name" className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('plan_name_label')}</label>
              <input id="plan-name" className="input" placeholder={t('plan_name_placeholder')}
                     value={pname} onChange={e => setPname(e.target.value)}
                     disabled={isPast} />
            </div>
          </div>

          {/* Past-date read-only banner */}
          {isPast && (
            <div className="rounded-lg p-3 text-xs flex items-center gap-2"
                 style={{ background: 'var(--gold2)', color: '#5c3d00' }}>
              <span aria-hidden="true">🔒</span>
              <span>{t('plan_past_readonly')}</span>
            </div>
          )}

          {/* Orders list */}
          <div className="card p-5">
            {orders.length === 0 && (
              <p className="text-sm text-[var(--ink3)] text-center py-8">
                {t('plan_empty_msg')}
              </p>
            )}

            {orders.map(o => {
              const r       = recipeMap[o.recipe_id];
              const stats   = calcRecipeStats(r, ingredientMap);
              const baseLit = recipeLiters(stats);
              const factor  = baseLit > 0 ? o.liters / baseLit : 0;
              const bolas   = Math.floor(o.liters * DENSITY / BALL_G);
              const cost    = stats ? stats.cost * factor : 0;

              return (
                <div key={o._key} className="py-3 border-b border-black/10 last:border-0">
                  <div className="grid grid-cols-[1fr_100px_auto_28px] gap-3 items-center">
                    <SearchSelect
                      options={recipes.map(r => ({ value: r.id, label: r.name }))}
                      value={o.recipe_id}
                      onChange={val => updateOrder(o._key, 'recipe_id', val)}
                      placeholder={t('select_recipe')}
                      className="flex-1"
                      disabled={isPast}
                    />

                    <NumberInput min="0.1" max="500" step="0.1"
                           className="input-gold rounded-lg text-right w-full"
                           value={o.liters}
                           onChange={v => updateOrder(o._key, 'liters', v)}
                           fallback={0}
                           disabled={isPast} />

                    {o.recipe_id && stats ? (
                      <span className="text-xs text-[var(--ink3)] whitespace-nowrap">
                        {o.liters}L | {bolas} bolas | ${Math.round(cost).toLocaleString(locale)}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--ink3)]">-- L</span>
                    )}

                    <button onClick={() => removeOrder(o._key)}
                            className="text-[var(--ink3)] hover:text-[var(--coral)] transition-colors text-lg
                                       bg-transparent border-none cursor-pointer leading-none"
                            aria-label={t('remove')}
                            title={t('remove')}
                            disabled={isPast}
                            style={isPast ? { opacity: 0.3, cursor: 'not-allowed' } : {}}>
                      ×
                    </button>
                  </div>

                  {(showBatchPicker || showPastPicker) && o.recipe_id && (
                    <div className="mt-2 ml-1 flex flex-wrap gap-3 text-[11px] text-[var(--ink2)]">
                      {showBatchPicker && (
                        <label className="flex items-center gap-1.5">
                          <span className="text-[var(--ink3)]">{t('plan_order_batchfreezer')}:</span>
                          <select className="select py-0.5 px-2 text-[11px]"
                                  value={o.batch_freezer_id || ''}
                                  onChange={e => updateOrder(o._key, 'batch_freezer_id', e.target.value)}
                                  disabled={isPast}>
                            <option value="">{(() => {
                              const auto = pickBestFit(o.liters, machineIds, ['batch_freezer', 'combo']);
                              return auto ? t('plan_order_auto_pick', { name: auto.name }) : t('plan_order_auto');
                            })()}</option>
                            {batchFreezers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {showPastPicker && (
                        <label className="flex items-center gap-1.5">
                          <span className="text-[var(--ink3)]">{t('plan_order_pasteurizer')}:</span>
                          <select className="select py-0.5 px-2 text-[11px]"
                                  value={o.pasteurizer_id || ''}
                                  onChange={e => updateOrder(o._key, 'pasteurizer_id', e.target.value)}
                                  disabled={isPast}>
                            <option value="">{(() => {
                              const auto = pickBestFit(o.liters, pasteurizerIds, ['pasteurizer', 'combo']);
                              return auto ? t('plan_order_auto_pick', { name: auto.name }) : t('plan_order_auto');
                            })()}</option>
                            {pasteurizers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  )}

                  {o.recipe_id && o.liters > 0 && (
                    <div className="mt-2 ml-1 space-y-1">
                      <MachineVolumeWarning liters={o.liters} machineId={effectiveBatchId(o)} />
                      <PasteurizerVolumeWarning liters={o.liters} machineId={effectivePasteurizerId(o)} />
                    </div>
                  )}
                </div>
              );
            })}

            {orders.length > 0 && !isPast && (
              <button onClick={addOrder}
                      className="mt-4 w-full border-2 border-dashed border-black/10 rounded-xl
                                 py-2.5 text-sm text-[var(--ink3)] hover:border-[var(--mint2)]
                                 hover:text-[var(--mint)] transition-colors cursor-pointer bg-transparent">
                {t('add_recipe_to_plan')}
              </button>
            )}
          </div>

          {/* Consolidated ingredients table */}
          {consolidated.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-black/10 flex items-center justify-between">
                <span className="font-display text-base text-[var(--ink)]">
                  {t('consolidated_ingredients')}
                </span>
                <ProGate feature={FEATURES.PRINT_PRODUCTION} mode="intercept">
                  <button onClick={handlePrint}
                          className="text-xs px-3 py-1.5 rounded-lg border border-black/10
                                     hover:bg-[var(--cream2)] transition-colors cursor-pointer bg-transparent">
                    {t('print_list')}
                  </button>
                </ProGate>
              </div>
              <div className="overflow-x-auto">
                <table className="tbl text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">{t('ingredient')}</th>
                      <th>{t('category')}</th>
                      <th>{t('total_g_col')}</th>
                      <th>{t('total_kg_col')}</th>
                      <th>{t('est_cost_col')}</th>
                      <th className="text-left" style={{ minWidth: 180 }}>{t('detail_by_recipe')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidated.map((ing, i) => {
                      const color = CAT_COLORS[ing.cat] || '#888';
                      return (
                        <tr key={i}>
                          <td className="font-medium">{tIng(ing.name)}</td>
                          <td>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                                  style={{ background: color }}>
                              {tCat(ing.cat)}
                            </span>
                          </td>
                          <td className="font-semibold">{Math.round(ing.total_g).toLocaleString(locale)}</td>
                          <td>{(ing.total_g / 1000).toFixed(3)}</td>
                          <td>${Math.round(ing.total_cost).toLocaleString(locale)}</td>
                          <td className="text-xs text-[var(--ink3)] text-left">
                            {ing.details.join(' | ')}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="row-total">
                      <td colSpan={2}>{t('total_label')}</td>
                      <td>{Math.round(totalConsolidatedG).toLocaleString(locale)} g</td>
                      <td>{(totalConsolidatedG / 1000).toFixed(3)} kg</td>
                      <td>${Math.round(totalConsolidatedCost).toLocaleString(locale)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="sticky top-20 space-y-4">
          <div className="card p-5">
            <div className="font-display text-base text-[var(--ink)] mb-4">{t('summary')}</div>

            {enriched.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { lbl: t('total_volume'), val: `${totalLiters.toFixed(1)}L` },
                    { lbl: t('scoops_120g'),   val: totalBolas },
                    { lbl: t('ingredient_cost'), val: `$${Math.round(totalCost).toLocaleString(locale)}` },
                    { lbl: t('recipes'),        val: enriched.length },
                  ].map(({ lbl, val }) => (
                    <div key={lbl} className="bg-[var(--cream2)] rounded-xl p-3 text-center">
                      <div className="font-display text-xl text-[var(--ink)]">{val}</div>
                      <div className="text-[10px] text-[var(--ink3)] mt-0.5">{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Type breakdown */}
                {Object.entries(byType).map(([type, liters]) => (
                  <div key={type} className="flex justify-between text-sm py-1 border-t border-black/10">
                    <span className="text-[var(--ink2)]">{typeLbl(type)}</span>
                    <span className="font-semibold text-[var(--ink)]">{liters.toFixed(1)}L</span>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-xs text-[var(--ink3)] text-center py-4">
                {t('add_recipes_for_summary')}
              </p>
            )}

            <div className="mt-4 space-y-2">
              {(() => {
                // Empty + saved plan exists -> outlined coral "Eliminar plan"
                // Has recipes -> outlined mint "Confirmar produccion"
                // Empty + nothing saved -> disabled
                const isDeleteMode = !enriched.length && hasSavedPlan;
                const enabled = !confirming && !isPast && (enriched.length > 0 || hasSavedPlan);
                const label = confirming ? '...'
                  : isDeleteMode ? t('delete_plan')
                  : t('confirm_production');
                const cls = isDeleteMode
                  ? 'w-full py-2.5 rounded-lg text-sm font-semibold border cursor-pointer transition-colors bg-transparent border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'btn-primary w-full';
                // Tooltip explicativo cuando el botón está disabled. Antes
                // mostraba vacío y el usuario no entendía por qué no podía
                // cliquear. Ahora le decimos exactamente qué falta.
                const disabledReason = isPast
                  ? t('plan_past_readonly')
                  : confirming ? '...'
                  : enriched.length === 0 && !hasSavedPlan ? t('plan_add_recipes_first')
                  : '';
                return (
                  <button
                    className={cls}
                    onClick={handleConfirm}
                    disabled={!enabled}
                    title={disabledReason}
                    aria-label={!enabled && disabledReason ? `${label} — ${disabledReason}` : label}
                  >
                    {label}
                  </button>
                );
              })()}

              <button className="btn-secondary w-full" onClick={handleCancel}>
                {t('cancel_discard')}
              </button>

              <p className="text-[10px] text-[var(--ink3)] text-center">
                {t('confirm_saves_cancel_discards')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
