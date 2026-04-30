import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT, useIngredientName } from '../lib/i18n';
import { useIngredientStore } from '../store/ingredientStore';
import { useRecipeStore } from '../store/recipeStore';
import { useAppStore } from '../store/appStore';
import { track } from '../lib/analytics';
import { useEscapeKey } from '../lib/hooks';

/**
 * Asistente paso a paso para crear una receta nueva. El usuario elige UN
 * ingrediente por rol (leche, crema, azucar, estabilizante, sabor) y la
 * receta se compone con cantidades default segun el tipo. Despues abre el
 * editor para que el usuario afine y balance.
 */

// Cantidades default por paso. Las "secas" (azucar/estabilizante) y las del
// sabor son fijas. La porcion liquida (leche/crema/agua) se ajusta al final
// para que el batch sume 1000g. Polvos/condensada dentro de lacteos van con
// cantidad fija por nombre dentro de build().
const DRY_DEFAULTS = {
  helado:  { azucar: 160, estabilizante: 5 },
  gelato:  { azucar: 180, estabilizante: 5 },
  sorbete: { azucar: 250, estabilizante: 5 },
};

// Cantidad para "Otros" (vainilla, miel, dulce de leche, sal, alcohol, huevo,
// coco, etc.). Decide por nombre porque la categoria 'Otro' es un cajon de
// sastre y los pesos varian mucho entre items.
function otrosQty(ingredient) {
  if (!ingredient) return 0;
  const cat = ingredient.category;
  const name = (ingredient.name || '').toLowerCase();
  if (/sal\b|\bsal\b|ácido|acido|cítrico|citrico/.test(name)) return 1;
  if (/vainilla|extracto|esencia/.test(name))                 return 5;
  if (/miel/.test(name))                                      return 30;
  if (/dulce de leche|manjar|caramelo/.test(name))            return 80;
  if (/coco/.test(name))                                      return 100;
  if (/café|cafe|espresso/.test(name))                        return 30;
  if (/yema/.test(name))                                      return 40;
  if (/clara/.test(name))                                     return 30;
  if (/huevo/.test(name))                                     return 50;
  if (/whisky|ron|grappa|amaretto|licor|brandy|rum/.test(name)) return 25;
  if (cat === 'Liquido')                                      return 25;
  if (cat === 'Huevo')                                        return 40;
  return 15;
}

// Cantidad del sabor segun la categoria del ingrediente y el subtipo.
// Una fruta pesa mucho mas que una pasta concentrada de pistacho o que un
// cacao en polvo. Si el subtipo es 'fruit' subimos un poco mas.
function flavorQty(type, subtype, ingredient) {
  if (!ingredient) return 0;
  const cat = ingredient.category;
  const name = (ingredient.name || '').toLowerCase();
  const isFruitSub = subtype === 'fruit';
  if (type === 'sorbete') {
    if (cat === 'Fruta')     return 400;
    if (cat === 'Pasta')     return /pistacho|avellana|pralin/.test(name) ? 80 : 100;
    if (cat === 'Chocolate') return /cacao en polvo/.test(name) ? 50 : 80;
    return 60;
  }
  // helado / gelato
  if (cat === 'Fruta')     return isFruitSub ? 280 : 180;
  if (cat === 'Pasta')     return isFruitSub ? 100 : (/pistacho|avellana|pralin/.test(name) ? 80 : 100);
  if (cat === 'Chocolate') return /cacao en polvo/.test(name) ? 50 : 100;
  return 50;
}


// Pasos del wizard. Orden: lacteos (o base) → azucares → fruta → pastas/
// chocolate → otros → neutro/estabilizante al final. Cada paso es opcional;
// "Limpiar" deselecciona y avanza saltando. Multi-select para que el usuario
// elija varios ingredientes de la misma categoria sin repetir pasos.
function getStepsForType(type) {
  // Patron usado por sorbete: items "base liquida" potenciales (agua, coco,
  // cafe, leche, etc.). Reutilizamos para excluirlos del paso "otros" y evitar
  // que el mismo ingrediente aparezca en 2 pasos.
  const isLiquidBase = (i) => /agua|coco|café|cafe/i.test(i.name) || i.category === 'Liquido';

  if (type === 'sorbete') {
    return [
      // Base liquida: agua purificada + leche/crema de coco (en Otro) + cafe + alcohol
      { role: 'lacteos', tKey: 'wiz_step_base_liquid', cats: ['Lacteo', 'Liquido', 'Otro'],
        filter: isLiquidBase, tipKey: 'wiz_tip_base_liquid' },
      { role: 'azucar',  tKey: 'wiz_step_sugar', cats: ['Azucar'], tipKey: 'wiz_tip_sugar' },
      { role: 'fruta',   tKey: 'wiz_step_fruit', cats: ['Fruta'],  tipKey: 'wiz_tip_fruit' },
      { role: 'pastas',  tKey: 'wiz_step_pastes', cats: ['Pasta', 'Chocolate'], tipKey: 'wiz_tip_pastes' },
      // Otros sin los items que ya van en la base liquida
      { role: 'otros',   tKey: 'wiz_step_others', cats: ['Otro', 'Huevo'],
        filter: i => !isLiquidBase(i), tipKey: 'wiz_tip_others' },
      { role: 'estabilizante', tKey: 'wiz_step_stab', cats: ['Estabilizante'], tipKey: 'wiz_tip_stab' },
    ];
  }
  return [
    // Lacteos: leche, crema, leche en polvo, condensada (excluye agua)
    { role: 'lacteos', tKey: 'wiz_step_dairy', cats: ['Lacteo'],
      filter: i => !/agua/i.test(i.name), tipKey: 'wiz_tip_dairy' },
    { role: 'azucar',  tKey: 'wiz_step_sugar', cats: ['Azucar'], tipKey: 'wiz_tip_sugar' },
    { role: 'fruta',   tKey: 'wiz_step_fruit', cats: ['Fruta'],  tipKey: 'wiz_tip_fruit' },
    { role: 'pastas',  tKey: 'wiz_step_pastes', cats: ['Pasta', 'Chocolate'], tipKey: 'wiz_tip_pastes' },
    // Otros: incluye agua (que esta en Lacteo) + vainilla, miel, especias, alcohol, huevo
    { role: 'otros',   tKey: 'wiz_step_others', cats: ['Otro', 'Liquido', 'Huevo', 'Lacteo'],
      filter: i => i.category !== 'Lacteo' || /agua/i.test(i.name), tipKey: 'wiz_tip_others' },
    { role: 'estabilizante', tKey: 'wiz_step_stab', cats: ['Estabilizante'], tipKey: 'wiz_tip_stab' },
  ];
}

export function RecipeWizard({ onClose }) {
  const t = useT();
  useEscapeKey(onClose);
  const tIng = useIngredientName();
  const allIngredients = useIngredientStore(s => s.ingredients);
  const recipeStore = useRecipeStore();
  const { showToast } = useAppStore();
  const navigate = useNavigate();

  const [type, setType] = useState('helado');
  const [subtype, setSubtype] = useState('base');
  const [name, setName] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  // selections: { roleKey: number[] }  — array de ids para permitir varios
  // ingredientes por categoria (ej. sacarosa + dextrosa).
  const [selections, setSelections] = useState({});

  const steps = useMemo(() => getStepsForType(type), [type]);
  const currentStep = stepIdx === 0 ? null : steps[stepIdx - 1];

  // Lista de ingredientes filtrados para el paso actual.
  const stepOptions = useMemo(() => {
    if (!currentStep) return [];
    return allIngredients
      .filter(i => currentStep.cats.includes(i.category))
      .filter(i => !currentStep.filter || currentStep.filter(i))
      .sort((a, b) => tIng(a.name).localeCompare(tIng(b.name)));
  }, [allIngredients, currentStep, tIng]);

  function toggleOption(roleKey, id) {
    setSelections(prev => {
      const current = prev[roleKey] || [];
      const has = current.some(v => String(v) === String(id));
      const next = has ? current.filter(v => String(v) !== String(id)) : [...current, id];
      return { ...prev, [roleKey]: next };
    });
  }

  function clearStep(roleKey) {
    setSelections(prev => ({ ...prev, [roleKey]: [] }));
  }

  // stepIdx 0 = basics; 1..steps.length = ingredient steps. La ultima es la
  // numero steps.length, donde mostramos "Crear receta" en vez de "Siguiente".
  const isLastStep = stepIdx === steps.length;
  function next() { setStepIdx(i => Math.min(i + 1, steps.length)); }
  function back() { setStepIdx(i => Math.max(i - 1, 0)); }

  function build() {
    if (!name.trim()) { showToast(t('wiz_name_required'), 'error'); setStepIdx(0); return; }
    const ingMap = Object.fromEntries(allIngredients.map(i => [String(i.id), i]));
    const dry = DRY_DEFAULTS[type] || DRY_DEFAULTS.helado;

    // Primera pasada: calcular cantidad por ingrediente (Map id → qty) sin
    // emitir filas todavia. La emision se hace despues iterando los pasos
    // en orden, asi la receta queda ordenada lacteos → azucar → fruta → ...
    const amountById = new Map();
    function distribute(ids, totalQty) {
      if (!ids?.length || totalQty <= 0) return 0;
      const perItem = Math.round((totalQty / ids.length) * 10) / 10;
      ids.forEach(id => amountById.set(String(id), perItem));
      return totalQty;
    }

    let nonLiquidSum = 0;

    // Lacteos: items secos (leche en polvo, condensada) con cantidad fija;
    // el resto entra al "presupuesto liquido" que se reparte al final.
    const lacteosIds = selections.lacteos || [];
    const liquidDairyIds = [];
    lacteosIds.forEach(id => {
      const ing = ingMap[String(id)]; if (!ing) return;
      const n = (ing.name || '').toLowerCase();
      if (/polvo|powder/.test(n))      { amountById.set(String(id), 50); nonLiquidSum += 50; }
      else if (/condensada/.test(n))   { amountById.set(String(id), 80); nonLiquidSum += 80; }
      else                             liquidDairyIds.push(id);
    });

    // Pasos secos (cantidad fija total repartida entre seleccionados).
    nonLiquidSum += distribute(selections.azucar,        dry.azucar || 0);
    nonLiquidSum += distribute(selections.estabilizante, dry.estabilizante || 0);

    // Fruta
    const frutaIds = selections.fruta || [];
    if (frutaIds.length > 0) {
      const q = Math.max(...frutaIds.map(id => flavorQty(type, subtype, ingMap[String(id)])));
      nonLiquidSum += distribute(frutaIds, q);
    }
    // Pastas / chocolate
    const pastasIds = selections.pastas || [];
    if (pastasIds.length > 0) {
      const q = Math.max(...pastasIds.map(id => flavorQty(type, subtype, ingMap[String(id)])));
      nonLiquidSum += distribute(pastasIds, q);
    }
    // Otros
    const otrosIds = selections.otros || [];
    if (otrosIds.length > 0) {
      const q = Math.max(...otrosIds.map(id => otrosQty(ingMap[String(id)])));
      nonLiquidSum += distribute(otrosIds, q);
    }

    // Reparto del liquido remanente entre los lacteos no-secos.
    const liquid = Math.max(0, 1000 - nonLiquidSum);
    if (liquidDairyIds.length > 0 && liquid > 0) {
      distribute(liquidDairyIds, liquid);
    }

    // Segunda pasada: emitir filas EN EL ORDEN DE LOS PASOS asi la receta
    // queda lacteos → azucar → fruta → pastas → otros → estabilizante.
    const ingredients = [];
    let position = 0;
    steps.forEach(s => {
      const ids = selections[s.role] || [];
      ids.forEach(id => {
        const qty = amountById.get(String(id));
        if (qty == null) return;
        ingredients.push({ ingredient_id: Number(id), qty_grams: qty, position: position++, addin: false });
      });
    });

    if (ingredients.length === 0) {
      showToast(t('wiz_no_ingredients'), 'error');
      return;
    }
    const created = recipeStore.create({
      name: name.trim(), type, subtype,
      proc_notes: '', overrun_pct: type === 'gelato' ? 25 : type === 'sorbete' ? 15 : 30,
      serving_temp: type === 'sorbete' ? 14 : type === 'gelato' ? 11 : 12,
      best_before_days: 90,
      ingredients,
    });
    track('recipe_wizard_created', { type, subtype, ingredients: ingredients.length });
    showToast(t('wiz_created'));
    onClose();
    navigate(`/recipes/${created.id}`);
  }

  // basics + N ingredient steps. Pasos del 0 al steps.length inclusive.
  const totalSteps = steps.length + 1;
  const progressPct = ((stepIdx + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="wizard-modal-title"
           className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="wizard-modal-title" className="font-display text-lg text-[var(--ink)]">🪄 {t('wiz_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">
              {stepIdx === 0 ? t('wiz_step_basics') : t(currentStep.tKey)}
              {' · '}
              {t('wiz_step_label', { current: stepIdx + 1, total: totalSteps })}
            </p>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>
        <div className="h-1 bg-[var(--cream2)]">
          <div className="h-full bg-[var(--mint)] transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stepIdx === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('wiz_recipe_name')} *</label>
                <input className="input w-full" value={name} onChange={e => setName(e.target.value)} placeholder={t('wiz_recipe_name_placeholder')} autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('wiz_type')} *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['helado','ice_cream'],['gelato','gelato'],['sorbete','sorbet']].map(([v, k]) => (
                    <button key={v} type="button"
                            className={`p-3 rounded-lg border text-sm font-semibold cursor-pointer transition-all
                              ${type === v ? 'border-[var(--mint)] bg-[var(--mint3)] text-[var(--mint)]' : 'border-black/10 bg-white text-[var(--ink2)] hover:border-[var(--mint2)]'}`}
                            onClick={() => { setType(v); setSelections({}); }}>
                      {t(k)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('wiz_subtype')}</label>
                <select className="select w-full" value={subtype} onChange={e => setSubtype(e.target.value)}>
                  <option value="base">{t('subtype_base')}</option>
                  <option value="fruit">{t('subtype_fruit')}</option>
                  <option value="chocolate_nuts">{t('subtype_chocolate_nuts')}</option>
                  <option value="alcohol">{t('subtype_alcohol')}</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[var(--ink2)] mb-2">
                {t(currentStep.tipKey)}
              </p>
              <div className="flex items-center justify-between mb-2 text-[11px] text-[var(--ink3)]">
                <span>{t('wiz_multi_hint')}</span>
                {(selections[currentStep.role]?.length || 0) > 0 && (
                  <button type="button"
                          className="text-[var(--coral)] hover:underline cursor-pointer bg-transparent border-none"
                          onClick={() => clearStep(currentStep.role)}>
                    {t('wiz_clear_step', { count: selections[currentStep.role].length })}
                  </button>
                )}
              </div>
              {stepOptions.length === 0 ? (
                <div className="rounded-lg bg-[var(--cream2)] text-[var(--ink3)] p-4 text-xs text-center">
                  {t('wiz_no_options')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {stepOptions.map(opt => {
                    const selected = (selections[currentStep.role] || []).some(v => String(v) === String(opt.id));
                    return (
                      <button key={opt.id} type="button"
                              className={`p-3 rounded-lg border text-left text-sm cursor-pointer transition-all relative
                                ${selected ? 'border-[var(--mint)] bg-[var(--mint3)] text-[var(--mint)] font-semibold' : 'border-black/10 bg-white text-[var(--ink2)] hover:border-[var(--mint2)]'}`}
                              onClick={() => toggleOption(currentStep.role, opt.id)}>
                        {selected && <span className="absolute top-1.5 right-2 text-xs">✓</span>}
                        <div className="pr-5">{tIng(opt.name)}</div>
                        <div className="text-[10px] text-[var(--ink3)] mt-0.5">
                          {(parseFloat(opt.fat_pct) || 0).toFixed(0)}% fat · {(parseFloat(opt.sugar_pct) || 0).toFixed(0)}% sugar
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-black/10 flex justify-between gap-2">
          <button className="btn-secondary text-xs" onClick={stepIdx === 0 ? onClose : back}>
            {stepIdx === 0 ? t('cancel') : t('wiz_back')}
          </button>
          {!isLastStep ? (
            <button className="btn-primary text-xs"
                    onClick={next}
                    disabled={stepIdx === 0 && !name.trim()}>
              {t('wiz_next')}
            </button>
          ) : (
            <button className="btn-primary text-xs" onClick={build}>
              ✨ {t('wiz_create')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
