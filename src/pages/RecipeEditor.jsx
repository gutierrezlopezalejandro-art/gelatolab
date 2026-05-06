import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { pushNow } from '../lib/cloudSync';
import { track } from '../lib/analytics';
import AnalysisPanel from '../components/AnalysisPanel';
import DiagnosticPanel from '../components/DiagnosticPanel';
import FreezingCurve from '../components/FreezingCurve';
import LabelingPanel from '../components/LabelingPanel';
import { BalancePanel } from '../components/BalancePanel';
import { AllergensEditor } from '../components/AllergensEditor';
import { RecipeHistory } from '../components/RecipeHistory';
import { TagInput } from '../components/TagInput';
import { PinPromptModal } from '../components/PinPromptModal';
import { isPinSet, isUnlocked } from '../lib/pinLock';
import ProcessTab from '../components/ProcessTab';
import GelatoParams from '../components/GelatoParams';
import AnalysisCharts from '../components/AnalysisCharts';
import SearchSelect from '../components/SearchSelect';
import { Spinner } from '../components/ui/index.jsx';
import { NumberInput } from '../components/NumberInput';
import { ProGate } from '../components/ProGate';
import { MobileDesktopHint } from '../components/MobileDesktopHint';
import { FEATURES } from '../lib/entitlement';
import { calcStats, calcDensity, calcServingTemp, getParams, resolveRecipeItems, applyEvaporation } from '../lib/icecreamCalc';
import { useT, useIngredientName, useCategoryName, useI18nStore } from '../lib/i18n';
import { analyzeRecipeAI } from '../lib/ai';
import { useAiStore } from '../store/aiStore';
import { AiKeyModal } from '../components/AiKeyModal';

const EMPTY_ROW = () => ({ _key: Date.now() + Math.random(), ingredient_id: '', recipe_id: '', qty_grams: 0, ingredient: null, addin: false });

export default function RecipeEditor() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const t = useT();
  const tIng = useIngredientName();
  const tCat = useCategoryName();

  const tabs = [
    ['formulacion', t('tab_formulation')],
    ['proceso', t('tab_process')],
    ['curva', t('tab_freezing_curve')],
    ['nutricion', t('tab_nutrition')],
    ['analisis', t('tab_analysis')],
  ];
  const recipeStore   = useRecipeStore();
  const allIngredients = useIngredientStore(s => s.ingredients);
  const isNew = !id;

  const [name,       setName]       = useState('');
  const [type,       setType]       = useState('helado');
  const [subtype,    setSubtype]    = useState('base');
  const [isSubRecipe, setIsSubRecipe] = useState(false);
  const [bestBeforeDays, setBestBeforeDays] = useState(90);
  const [evaporationPct, setEvaporationPct] = useState(0);
  // Moldes / paletas (popsicles): gramos por unidad. 0 = no es receta de molde.
  const [mouldG, setMouldG] = useState(0);
  // Etiquetas libres ('vegano', 'verano', 'premium'...) para filtrar listado.
  const [tags, setTags] = useState([]);
  const [allergenOverrides, setAllergenOverrides] = useState({});
  const [procNotes,  setProcNotes]  = useState('');
  const [overrunPct, setOverrunPct] = useState(30);
  const [servTemp,   setServTemp]   = useState(12);
  const [rows,       setRows]       = useState([EMPTY_ROW()]);
  const [dirty,      setDirty]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [activeTab,  setActiveTab]  = useState('formulacion');

  // En mobile (≤640px) las tabs secundarias estan ocultas. Forzamos
  // activeTab='formulacion' para que la pagina nunca quede en blanco
  // si el usuario estaba en otra tab y achica la ventana.
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    function sync() { if (mql.matches) setActiveTab('formulacion'); }
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);
  const [showBalance, setShowBalance] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  // Modo de la columna "%": 'total' (sobre el total de la mezcla) o 'bakers'
  // (relativo al ingrediente mas pesado = 100%, estilo panaderia).
  const [pctMode, setPctMode] = useState('total');
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showAiKeyModal, setShowAiKeyModal] = useState(false);
  const aiHasKey = !!useAiStore(s => s.apiKey);
  const lang = useI18nStore(s => s.lang);

  async function runAiAnalysis() {
    if (!stats) return;
    if (!aiHasKey) { setShowAiKeyModal(true); return; }
    setAiLoading(true); setAiError(''); setAiAdvice('');
    try {
      const out = await analyzeRecipeAI({
        stats,
        items: flattenedBase,
        type, subtype,
        params: getParams(type, subtype),
        language: lang,
      });
      setAiAdvice(out);
      track('ai_recipe_analyzed', { type, subtype });
    } catch (e) {
      setAiError(e.message === 'AI_KEY_MISSING' ? t('ai_key_missing') : (e.message || 'Error'));
    } finally {
      setAiLoading(false);
    }
  }

  const recipe = isNew ? null : recipeStore.get(id);

  const ingMap = Object.fromEntries(allIngredients.map(i => [String(i.id), i]));

  // Load recipe data into local state when editing an existing recipe
  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '');
      setType(recipe.type || 'helado');
      setSubtype(recipe.subtype || 'base');
      setIsSubRecipe(!!recipe.is_sub_recipe);
      setBestBeforeDays(recipe.best_before_days ?? 90);
      setEvaporationPct(recipe.evaporation_pct ?? 0);
      setMouldG(recipe.mould_g ?? 0);
      setTags(Array.isArray(recipe.tags) ? recipe.tags : []);
      setAllergenOverrides(recipe.allergen_overrides || {});
      setProcNotes(recipe.proc_notes || '');
      setOverrunPct(recipe.overrun_pct ?? 30);
      setServTemp(recipe.serving_temp ?? 12);
      if (recipe.ingredients?.length) {
        setRows(recipe.ingredients.map(ri => ({
          _key:          ri.id || Math.random(),
          ingredient_id: ri.ingredient_id ? String(ri.ingredient_id) : '',
          recipe_id:     ri.recipe_id ? String(ri.recipe_id) : '',
          qty_grams:     ri.qty_grams,
          ingredient:    ri.ingredient_id ? (ingMap[String(ri.ingredient_id)] || ri.ingredient || null) : null,
          addin:         !!ri.addin,
        })));
      }
    }
  }, [recipe?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mapa de recetas para resolver referencias anidadas (excluye la propia).
  // Para resolver: cualquier receta marcada como sub-receta + las ya referenciadas
  // por filas (asi sigue funcionando si se desmarca despues).
  const allRecipes = recipeStore.recipes;
  const referencedIds = new Set(rows.filter(r => r.recipe_id).map(r => String(r.recipe_id)));
  const recipeMap = Object.fromEntries(
    allRecipes
      .filter(r => String(r.id) !== String(id) && (r.is_sub_recipe || referencedIds.has(String(r.id))))
      .map(r => [String(r.id), r])
  );
  // Solo las marcadas como sub-receta aparecen en el selector para nuevas filas.
  const selectableSubRecipes = allRecipes.filter(r => r.is_sub_recipe && String(r.id) !== String(id));

  // Enrich rows with full ingredient data from the store
  const enrichedRows = rows.map(r => ({
    ...r,
    ingredient: r.ingredient_id ? (ingMap[r.ingredient_id] || r.ingredient) : null,
  }));

  // Una fila es valida si tiene ingrediente o sub-receta y un peso > 0.
  const validItems = enrichedRows.filter(r => (r.ingredient_id || r.recipe_id) && parseFloat(r.qty_grams) > 0);
  const baseItems  = validItems.filter(r => !r.addin);

  // Resuelve sub-recetas a una lista plana de {qty_grams, ingredient} antes de calcStats.
  const flattenedBase = resolveRecipeItems(baseItems, recipeMap, ingMap);
  const flattenedFull = resolveRecipeItems(validItems, recipeMap, ingMap);

  // Stats de la base (excluye inclusiones): rige balance, FPD, PAC y diagnostico.
  // Si hay evaporacion (cocción), se aplica antes para que las metricas reflejen
  // la mezcla concentrada real, no la pre-cocción.
  const rawStats = flattenedBase.length ? calcStats(flattenedBase) : null;
  const stats = rawStats ? applyEvaporation(rawStats, evaporationPct) : null;
  const rawStatsFull = flattenedFull.length ? calcStats(flattenedFull) : null;
  const statsFull = rawStatsFull ? applyEvaporation(rawStatsFull, evaporationPct) : null;
  const hasAddins = validItems.some(r => r.addin);

  const totalG = enrichedRows.reduce((s, r) => s + (parseFloat(r.qty_grams) || 0), 0);
  // Para bakers %: el ingrediente mas pesado entre los actualmente cargados
  // sirve de referencia (= 100%); el resto se expresa como % de el.
  const heaviestG = enrichedRows.reduce((m, r) => Math.max(m, parseFloat(r.qty_grams) || 0), 0);

  // ── Row operations ────────────────────────────────────────
  function updateRow(key, field, value) {
    setDirty(true);
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r;
      // El SearchSelect emite "R:<id>" para recetas anidadas. Cualquier otro
      // valor se trata como id de ingrediente atomico.
      if (field === 'ingredient_id' && typeof value === 'string' && value.startsWith('R:')) {
        return { ...r, ingredient_id: '', recipe_id: value.slice(2), ingredient: null };
      }
      const updated = { ...r, [field]: value };
      if (field === 'ingredient_id') {
        updated.recipe_id = '';
        updated.ingredient = ingMap[value] || null;
      }
      return updated;
    }));
  }

  function addRow()       { setDirty(true); setRows(prev => [...prev, EMPTY_ROW()]); }
  function removeRow(key) { setDirty(true); setRows(prev => prev.filter(r => r._key !== key)); }

  // ── Apply a single balance suggestion ─────────────────────
  function applyBalanceSuggestion(s) {
    setRows(prev => {
      const idx = prev.findIndex(r => String(r.ingredient_id) === String(s.ingredient_id));
      if (idx < 0) return prev;
      const next = [...prev];
      const newQty = Math.max(0, (parseFloat(next[idx].qty_grams) || 0) + s.delta_g);
      next[idx] = { ...next[idx], qty_grams: parseFloat(newQty.toFixed(1)) };
      return next;
    });
    setDirty(true);
  }

  // ── Apply a full auto-balance result (replaces all quantities) ─────
  function applyBalanceAll(adjustedItems) {
    setRows(prev => {
      const byId = new Map(adjustedItems.map(a => [String(a.ingredient_id), a]));
      return prev.map(r => {
        const a = byId.get(String(r.ingredient_id));
        if (!a) return r;
        return { ...r, qty_grams: parseFloat(a.qty_grams.toFixed(1)) };
      });
    });
    setDirty(true);
    track('balance_applied_all', { type });
    showToast(t('balance_applied_all'));
  }

  // ── Export as .txt ────────────────────────────────────────
  function handleExportPDF() {
    if (!recipe && isNew) return showToast(t('save_first'), 'error');
    const ts = servingTempDesired;
    const density = stats ? calcDensity(stats) : null;
    const lines = [
      `${t('recipe_label')}: ${name}`,
      `${t('type_label')}: ${type}`,
      `Overrun: ${overrunPct}%`,
      `${t('total_mix')}: ${stats ? Math.round(stats.T) + 'g' : '—'}`,
      density ? `${t('density_label')}: ${density.toFixed(4)} g/ml` : '',
      '',
      `${t('ingredients_label')}:`,
      ...enrichedRows.filter(r => r.ingredient_id && r.qty_grams > 0).map(
        r => `  ${tIng(r.ingredient?.name) || '?'}: ${r.qty_grams}g`
      ),
      '',
      stats ? `FPD: ${stats.fpd.toFixed(2)}°C` : '',
      ts    ? `${t('serving_temp')}: ${ts}°C`   : '',
      stats ? `PAC: ${(stats.pacPct * 10).toFixed(0)}` : '',
      stats ? `POD: ${(stats.podPct * 10).toFixed(0)}` : '',
      stats ? `${t('est_cost_label')}: $${Math.round(stats.cost).toLocaleString('es-CL')}` : '',
    ].filter(l => l !== '').join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `receta_${name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('recipe_saved'));
  }

  // ── Save ──────────────────────────────────────────────────
  // Local save is synchronous and never blocks on cloud. The cloud push is
  // fired in the background via pushNow (cancels any pending debounce so the
  // latest snapshot reaches Supabase immediately, but the UI never waits).
  function handleSave() {
    if (!name.trim()) return showToast(t('name_required'), 'error');
    // PIN gate: si hay PIN configurado y la sesion no esta desbloqueada, abre
    // el modal y aborta el guardado. Tras desbloquear el usuario re-pulsa.
    if (isPinSet() && !isUnlocked()) {
      setShowPinPrompt(true);
      return;
    }
    setSaving(true);
    try {
      const ingredients = enrichedRows
        .filter(r => (r.ingredient_id || r.recipe_id) && parseFloat(r.qty_grams) > 0)
        .map((r, i) => ({
          ingredient_id: r.ingredient_id ? Number(r.ingredient_id) : null,
          recipe_id:     r.recipe_id ? Number(r.recipe_id) : null,
          qty_grams:     Number(r.qty_grams),
          position:      i,
          addin:         !!r.addin,
        }));

      const payload = {
        name: name.trim(), type, subtype, is_sub_recipe: isSubRecipe, best_before_days: parseInt(bestBeforeDays) || 90,
        evaporation_pct: parseFloat(evaporationPct) || 0,
        mould_g: parseFloat(mouldG) || 0,
        tags,
        allergen_overrides: allergenOverrides, proc_notes: procNotes, overrun_pct: overrunPct, serving_temp: servTemp,
        ingredients,
      };

      // Captura una revision con metadatos derivados (FPD, costo) para que la
      // lista de historial sea informativa sin tener que re-calcular.
      const newRevision = {
        ts: new Date().toISOString(),
        name: name.trim(), type, subtype, is_sub_recipe: isSubRecipe,
        best_before_days: parseInt(bestBeforeDays) || 90,
        evaporation_pct: parseFloat(evaporationPct) || 0,
        mould_g: parseFloat(mouldG) || 0,
        tags,
        allergen_overrides: allergenOverrides,
        proc_notes: procNotes, overrun_pct: overrunPct, serving_temp: servTemp,
        ingredients,
        fpd:  stats?.fpd ?? null,
        cost: stats?.cost ?? null,
      };
      const prevRevisions = recipe?.revisions || [];
      const trimmedRevisions = [newRevision, ...prevRevisions].slice(0, 10);

      if (isNew) {
        const created = recipeStore.create({ ...payload, revisions: trimmedRevisions });
        flushRecipesToCloud();
        track('recipe_created', { type });
        showToast(t('recipe_created'));
        navigate(`/recipes/${created.id}`, { replace: true });
      } else {
        recipeStore.update(id, { ...payload, revisions: trimmedRevisions });
        flushRecipesToCloud();
        track('recipe_updated', { type });
        showToast(t('recipe_saved'));
        setDirty(false);
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Restaurar una revision al editor (no se persiste hasta que el usuario
  // pulsa Guardar). Asi puede comparar antes de comprometerse al rollback.
  function restoreRevision(rev) {
    setName(rev.name || '');
    setType(rev.type || 'helado');
    setSubtype(rev.subtype || 'base');
    setIsSubRecipe(!!rev.is_sub_recipe);
    setBestBeforeDays(rev.best_before_days ?? 90);
    setEvaporationPct(rev.evaporation_pct ?? 0);
    setMouldG(rev.mould_g ?? 0);
    setTags(Array.isArray(rev.tags) ? rev.tags : []);
    setAllergenOverrides(rev.allergen_overrides || {});
    setProcNotes(rev.proc_notes || '');
    setOverrunPct(rev.overrun_pct ?? 30);
    setServTemp(rev.serving_temp ?? 12);
    if (Array.isArray(rev.ingredients)) {
      setRows(rev.ingredients.map(ri => ({
        _key:          Math.random(),
        ingredient_id: ri.ingredient_id ? String(ri.ingredient_id) : '',
        recipe_id:     ri.recipe_id ? String(ri.recipe_id) : '',
        qty_grams:     ri.qty_grams,
        ingredient:    ri.ingredient_id ? (ingMap[String(ri.ingredient_id)] || null) : null,
        addin:         !!ri.addin,
      })));
    }
    setDirty(true);
    showToast(t('history_restored'));
  }

  // Background cloud push — bypasses the 2s debounce so the latest state hits
  // the server right away, but is fire-and-forget so the UI never waits on it.
  function flushRecipesToCloud() {
    const user = useAuthStore.getState().user;
    if (!user) return;
    pushNow(user.id, 'recipes', useRecipeStore.getState()).catch(() => { /* non-blocking */ });
  }

  // ── Column helper: per-ingredient breakdown ───────────────
  const COL = (ing, qty) => {
    const g = parseFloat(qty) || 0;
    const f = (pct) => ing ? (ing[pct] * g / 100).toFixed(1) : '—';
    // PAC/POD absoluto por ingrediente: g × pac (escala Corvitto)
    // La suma = stats.pac * 10 (fila negra total)
    // Normalizado por kg = stats.pacPct * 10 (fila verde acumulado)
    const fPAC = (attr) => ing ? (ing[attr] * g).toFixed(1) : '—';
    return {
      agua:   f('water_pct'),
      grasa:  f('fat_pct'),
      sng:    f('sng_pct'),
      azucar: f('sugar_pct'),
      otros:  f('others_pct'),
      pod:    fPAC('pod'),
      pac:    fPAC('pac'),
      costo:  ing ? `$${Math.round(g * ing.cost_per_kg / 1000).toLocaleString('es-CL')}` : '—',
    };
  };

  // ── Derived values for tabs ───────────────────────────────
  const servingTempDesired = servTemp ? -Math.abs(servTemp) : null;
  const servingTempCalc = stats ? calcServingTemp(stats) : null;

  return (
    <div>
      <MobileDesktopHint pageId="recipe-editor" />
      {/* h1 oculto: el nombre de la receta es un input editable, no un heading
          tradicional. Para landmarks/SEO/screen-readers necesitamos un h1
          presente en el DOM. Esta pantalla antes no tenía ningún h1. */}
      <h1 className="sr-only">{name || t('untitled_recipe')}</h1>
      {/* ═══════════════════ Header (2 filas) ═══════════════════ */}
      <div data-tour="recipe-header" className="card p-4 mb-6 space-y-3">
        {/* Fila 1: navegacion + nombre + acciones (Balancear, Historial, Guardar) */}
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn-secondary" onClick={() => navigate('/recipes')}>← {t('back_recipes')}</button>
          <label htmlFor="recipe-name-input" className="sr-only">{t('recipe_name')}</label>
          <input
            id="recipe-name-input"
            data-tour="recipe-name"
            aria-label={t('recipe_name')}
            className="border-none bg-transparent font-display text-2xl text-[var(--ink)]
                       outline-none flex-1 min-w-[180px] border-b-2 border-black/10
                       focus:border-[var(--mint2)] px-1 py-0.5 transition-colors"
            placeholder={t('recipe_name_placeholder')}
            value={name}
            onChange={e => { setName(e.target.value); setDirty(true); }}
          />
          {dirty && (
            <span className="text-xs text-[var(--gold)] font-medium px-1 flex-shrink-0">● {t('unsaved')}</span>
          )}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <button
              data-tour="recipe-balance-btn"
              className="text-xs px-3 py-2 rounded-lg border border-[var(--mint2)] text-[var(--mint)]
                         hover:bg-[var(--mint3)] transition-colors cursor-pointer bg-transparent font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowBalance(true)}
              disabled={!stats}
              title={t('balance_btn_tooltip')}
            >
              ⚖ {t('balance_btn')}
            </button>
            {!isNew && recipe?.revisions?.length > 0 && (
              <button
                className="text-xs px-3 py-2 rounded-lg border border-black/10 text-[var(--ink2)]
                           hover:bg-[var(--cream2)] transition-colors cursor-pointer bg-transparent font-semibold"
                onClick={() => setShowHistory(true)}
                title={t('history_btn_tooltip')}
              >
                🕘 {t('history_btn')}
              </button>
            )}
            <button
              data-tour="recipe-save-btn"
              className="btn-primary inline-flex items-center gap-1.5 min-w-[120px] justify-center"
              onClick={handleSave}
              disabled={saving}
            >
              <span>{saving ? '⏳' : '✓'}</span>
              <span>{saving ? t('saving') : t('save')}</span>
            </button>
          </div>
        </div>

        {/* Fila 2: propiedades de la receta (tipo, subtipo, T° servicio, vence, sub-receta) */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-black/5">
          <select
            data-tour="recipe-type"
            className="select max-w-[150px]"
            value={type}
            onChange={e => { setType(e.target.value); setDirty(true); }}
          >
            <option value="helado">{t('ice_cream')}</option>
            <option value="gelato">{t('gelato')}</option>
            <option value="sorbete">{t('sorbet')}</option>
          </select>
          <select
            data-tour="recipe-subtype"
            className="select max-w-[180px]"
            value={subtype}
            onChange={e => { setSubtype(e.target.value); setDirty(true); }}
            title={t('subtype_tooltip')}
          >
            <option value="base">{t('subtype_base')}</option>
            <option value="fruit">{t('subtype_fruit')}</option>
            <option value="chocolate_nuts">{t('subtype_chocolate_nuts')}</option>
            <option value="alcohol">{t('subtype_alcohol')}</option>
          </select>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-[var(--ink3)]">{t('serving_temp')}:</span>
            <div className="flex items-center border border-black/10 rounded-lg overflow-hidden">
              <span className="text-xs text-[var(--ink3)] px-1.5 bg-[var(--cream2)]">-</span>
              <NumberInput
                min="0" max="30" step="0.5"
                className="w-12 text-center text-sm font-semibold py-1 px-1 outline-none border-none"
                value={servTemp}
                onChange={v => { setServTemp(v); setDirty(true); }}
              />
              <span className="text-xs text-[var(--ink3)] px-1.5 bg-[var(--cream2)]">°C</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" title={t('best_before_tooltip')}>
            <span className="text-xs text-[var(--ink3)]">{t('best_before_label')}:</span>
            <div className="flex items-center border border-black/10 rounded-lg overflow-hidden">
              <NumberInput
                min="1" max="730" step="1"
                className="w-14 text-center text-sm font-semibold py-1 px-1 outline-none border-none"
                value={bestBeforeDays}
                onChange={v => { setBestBeforeDays(Math.round(v)); setDirty(true); }}
              />
              <span className="text-xs text-[var(--ink3)] px-1.5 bg-[var(--cream2)]">{t('days_short')}</span>
            </div>
          </div>
          <label
            data-tour="recipe-subrecipe-toggle"
            className={`flex items-center gap-1.5 text-[11px] cursor-pointer select-none rounded-lg px-2 py-1 transition-colors border
              ${isSubRecipe
                ? 'bg-[#f3e5f5] text-[#6a1b9a] border-[#ce93d8] font-semibold'
                : 'bg-transparent text-[var(--ink3)] border-black/10 hover:border-[#ce93d8]'}`}
            title={t('is_sub_recipe_tooltip')}
          >
            <input
              type="checkbox"
              checked={isSubRecipe}
              onChange={e => { setIsSubRecipe(e.target.checked); setDirty(true); }}
              className="cursor-pointer"
            />
            {t('is_sub_recipe_label')}
          </label>
          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <span className="text-xs text-[var(--ink3)] flex-shrink-0">🏷 {t('tags_label')}:</span>
            <div className="flex-1 min-w-[160px]">
              <TagInput
                tags={tags}
                suggestions={Array.from(new Set((recipeStore.recipes || []).flatMap(r => r.tags || [])))}
                onChange={(next) => { setTags(next); setDirty(true); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ Tabs ═══════════════════
          En mobile (≤640px) ocultamos las tabs secundarias y solo
          mostramos Formulación. Las tabs de análisis (curva, valores
          nutricionales, análisis IA) son densas en datos y no se ven
          bien en pantalla chica — el usuario ya recibe el aviso
          MobileDesktopHint sugiriendo usar desktop para ver todo. */}
      <div data-tour="recipe-tabs" className="hidden sm:flex border-b-2 border-black/10 mb-6">
        {tabs.map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`px-5 py-3 text-sm font-medium border-b-[2.5px] -mb-0.5 transition-all
              ${activeTab === k
                ? 'text-[var(--mint)] border-[var(--mint)] font-semibold'
                : 'text-[var(--ink3)] border-transparent hover:text-[var(--ink)]'}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ═══════════════════ TAB: FORMULACION ═══════════════════ */}
      {activeTab === 'formulacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Left: ingredients table + diagnostics ── */}
          <div data-tour="recipe-formulation" className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="font-display text-base text-[var(--ink)]">
                {t('tab_formulation')}
              </div>
              {/* Toggle vista de %: total vs bakers */}
              <div className="inline-flex items-center text-[10px] rounded-lg border border-black/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPctMode('total')}
                  className={`px-2.5 py-1 cursor-pointer border-none transition-colors ${pctMode === 'total' ? 'bg-[var(--mint3)] text-[var(--mint)] font-semibold' : 'bg-transparent text-[var(--ink3)] hover:bg-[var(--cream2)]'}`}
                  title={t('pct_mode_total_tooltip')}
                >
                  {t('pct_mode_total')}
                </button>
                <button
                  type="button"
                  onClick={() => setPctMode('bakers')}
                  className={`px-2.5 py-1 cursor-pointer border-none transition-colors border-l border-black/10 ${pctMode === 'bakers' ? 'bg-[var(--mint3)] text-[var(--mint)] font-semibold' : 'bg-transparent text-[var(--ink3)] hover:bg-[var(--cream2)]'}`}
                  title={t('pct_mode_bakers_tooltip')}
                >
                  {t('pct_mode_bakers')}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl text-xs">
                <thead>
                  <tr>
                    <th style={{ minWidth: 190, textAlign: 'center' }}>{t('ingredient')}</th>
                    <th style={{ textAlign: 'center' }}>{t('grams_col')}</th>
                    <th style={{ textAlign: 'center' }} title={pctMode === 'bakers' ? t('pct_mode_bakers_tooltip') : t('pct_mode_total_tooltip')}>
                      % <span className="text-[9px] text-[var(--ink3)]">({pctMode === 'bakers' ? t('pct_mode_bakers_short') : t('pct_mode_total_short')})</span>
                    </th>
                    <th style={{ textAlign: 'center' }}>{t('water_col')}</th>
                    <th style={{ textAlign: 'center' }}>{t('fat_col')}</th>
                    <th style={{ textAlign: 'center' }}>{t('sng_col')}</th>
                    <th style={{ textAlign: 'center' }}>{t('sugar_col')}</th>
                    <th style={{ textAlign: 'center' }}>{t('others_col')}</th>
                    <th style={{ textAlign: 'center' }} title={t('pod_tooltip')}>POD</th>
                    <th style={{ textAlign: 'center' }} title={t('pac_tooltip')}>PAC</th>
                    <th style={{ textAlign: 'center' }}>{t('cost_col')}</th>
                    <th style={{ textAlign: 'center' }} title={t('addin_col_tooltip')}>{t('addin_col')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedRows.map(row => {
                    const ing = row.ingredient;
                    const g   = parseFloat(row.qty_grams) || 0;
                    const pct = pctMode === 'bakers'
                      ? (heaviestG > 0 ? (g / heaviestG * 100).toFixed(1) : '—')
                      : (totalG > 0 ? (g / totalG * 100).toFixed(1) : '—');
                    // Sub-receta: resolver y mostrar agregados
                    let nestedC = null, nestedRecipe = null;
                    if (row.recipe_id && !ing) {
                      nestedRecipe = recipeMap[row.recipe_id];
                      if (nestedRecipe) {
                        const flat = resolveRecipeItems(
                          [{ recipe_id: row.recipe_id, qty_grams: g }],
                          recipeMap, ingMap
                        );
                        const ns = flat.length ? calcStats(flat) : null;
                        if (ns) {
                          nestedC = {
                            agua:  ns.agua.toFixed(1),
                            grasa: ns.grasa.toFixed(1),
                            sng:   ns.sng.toFixed(1),
                            azucar: ns.azucar.toFixed(1),
                            otros: ns.otros.toFixed(1),
                            pod:   (ns.pod * 10).toFixed(1),
                            pac:   (ns.pac * 10).toFixed(1),
                            costo: `$${Math.round(ns.cost).toLocaleString('es-CL')}`,
                          };
                        }
                      }
                    }
                    const c = nestedC || COL(ing, g);
                    const selectValue = row.recipe_id ? `R:${row.recipe_id}` : row.ingredient_id;
                    const ingredientOpts = allIngredients.map(i => ({
                      value: i.id,
                      label: tIng(i.name),
                      group: tCat(i.category),
                    }));
                    const recipeOpts = selectableSubRecipes.map(r => ({
                      value: `R:${r.id}`,
                      label: `📋 ${r.name}`,
                      group: t('nested_recipes_group'),
                    }));
                    return (
                      <tr key={row._key} className={row.addin ? 'opacity-70' : ''} style={row.addin ? { background: 'rgba(245, 200, 66, 0.06)' } : (row.recipe_id ? { background: 'rgba(106, 27, 154, 0.04)' } : undefined)}>
                        <td>
                          <SearchSelect
                            options={[...recipeOpts, ...ingredientOpts]}
                            value={selectValue}
                            onChange={val => updateRow(row._key, 'ingredient_id', val)}
                            placeholder={t('select_ingredient')}
                            className="w-full"
                          />
                        </td>
                        <td>
                          <input
                            type="number" min="0" step="1"
                            className="input-gold w-16 rounded-md py-1 px-2 text-xs"
                            value={row.qty_grams}
                            onChange={e => updateRow(row._key, 'qty_grams', e.target.value)}
                          />
                        </td>
                        <td>{pct}{pct !== '—' ? '%' : ''}</td>
                        <td>{c.agua}</td>
                        <td>{c.grasa}</td>
                        <td>{c.sng}</td>
                        <td>{c.azucar}</td>
                        <td>{c.otros}</td>
                        <td className="text-[#6a3d00]">{c.pod}</td>
                        <td className="text-[var(--teal)]">{c.pac}</td>
                        <td>{c.costo}</td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => updateRow(row._key, 'addin', !row.addin)}
                            className={`text-base leading-none px-1.5 py-0.5 rounded border-none cursor-pointer transition-colors
                              ${row.addin
                                ? 'bg-[#e8b920] text-[var(--ink)]'
                                : 'bg-transparent text-black/20 hover:text-[var(--gold)]'}`}
                            title={t('addin_toggle_tooltip')}
                            aria-pressed={row.addin}
                          >⊕</button>
                        </td>
                        <td>
                          <button
                            onClick={() => removeRow(row._key)}
                            className="text-black/20 hover:text-[var(--coral)] transition-colors px-1"
                          >✕</button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Total row (mezcla base, sin inclusiones) ── */}
                  {stats && (
                    <tr className="row-total text-xs">
                      <td>
                        <span className="font-bold">{hasAddins ? t('base_mix') : t('total_mix')}</span>
                      </td>
                      <td className="font-bold">{Math.round(stats.T)} g</td>
                      <td className="text-[var(--ink3)]">100%</td>
                      <td>{stats.agua.toFixed(1)} g</td>
                      <td>{stats.grasa.toFixed(1)} g</td>
                      <td>{stats.sng.toFixed(1)} g</td>
                      <td>{stats.azucar.toFixed(1)} g</td>
                      <td>{stats.otros.toFixed(1)} g</td>
                      <td className="text-[#6a3d00]">{(stats.pod * 10).toFixed(1)}</td>
                      <td className="text-[var(--teal)]">{(stats.pac * 10).toFixed(1)}</td>
                      <td>${Math.round(stats.cost).toLocaleString('es-CL')}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  )}

                  {/* ── Final mix row (incluye inclusiones) ── */}
                  {hasAddins && statsFull && (
                    <tr className="text-xs" style={{ background: '#fff8e1' }}>
                      <td>
                        <span className="font-bold text-[var(--ink2)]">{t('final_mix')}</span>
                      </td>
                      <td className="font-bold">{Math.round(statsFull.T)} g</td>
                      <td colSpan={8} className="text-[var(--ink3)] text-[10px]">
                        {t('final_mix_note')}
                      </td>
                      <td>${Math.round(statsFull.cost).toLocaleString('es-CL')}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  )}

                  {/* ── Percentage row ── */}
                  {stats && stats.T > 0 && (
                    <tr className="text-xs" style={{ background:'#f0f7f3' }}>
                      <td className="text-[var(--mint)] font-semibold text-[10px] uppercase tracking-wide">
                        {t('pct_of_total')}
                      </td>
                      <td></td>
                      <td></td>
                      <td>
                        <span className="font-semibold">{(stats.pAgua * 100).toFixed(1)}%</span>
                      </td>
                      <td>
                        <span className="font-semibold">{(stats.pGrasa * 100).toFixed(1)}%</span>
                      </td>
                      <td>
                        <span className="font-semibold">{(stats.pSng * 100).toFixed(1)}%</span>
                      </td>
                      <td>
                        <span className="font-semibold">{(stats.pAzucar * 100).toFixed(1)}%</span>
                      </td>
                      <td>
                        <span className="font-semibold">
                          {(stats.T > 0 ? stats.otros / stats.T * 100 : 0).toFixed(1)}%
                        </span>
                      </td>
                      <td colSpan={5} className="text-[var(--ink3)] text-[10px]">
                        {t('pct_over_total')}
                      </td>
                    </tr>
                  )}

                  {/* ── Cumulative PAC/POD row ── */}
                  {stats && stats.T > 0 && (
                    <tr className="text-xs" style={{ background:'#e8f5ed' }}>
                      <td className="text-[var(--ink3)] font-semibold text-[10px] uppercase tracking-wide">
                        {t('pac_pod_accumulated')}
                      </td>
                      <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                      <td className="text-[#6a3d00] font-bold">
                        {(stats.podPct * 10).toFixed(1)}
                        <span className="text-[9px] font-normal ml-0.5 text-[var(--ink3)]"> POD</span>
                      </td>
                      <td className="text-[var(--teal)] font-bold">
                        {(stats.pacPct * 10).toFixed(1)}
                        <span className="text-[9px] font-normal ml-0.5 text-[var(--ink3)]"> PAC</span>
                      </td>
                      <td colSpan={3} className="text-[var(--ink3)] text-[10px]">
                        FPD = {stats.fpd.toFixed(2)}°C
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add ingredient button */}
            <button
              onClick={addRow}
              className="mt-4 w-full border-2 border-dashed border-black/10 rounded-xl
                         py-2 text-sm text-[var(--ink3)] hover:border-[var(--mint2)]
                         hover:text-[var(--mint)] transition-colors cursor-pointer bg-transparent"
            >
              {t('add_ingredient')}
            </button>

            {/* Unit legend */}
            {(() => {
              const typeParams = getParams(type, subtype);
              const podParam = typeParams.find(p => p.k === 'podPct');
              const pacParam = typeParams.find(p => p.k === 'pacPct');
              return (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[var(--ink3)]">
                  <div className="bg-[var(--cream2)] rounded-lg p-2.5">
                    <strong className="text-[#6a3d00]">POD</strong> — {t('pod_legend')} <strong>{podParam ? podParam.rangeLbl : '150-180'}</strong>.
                  </div>
                  <div className="bg-[var(--cream2)] rounded-lg p-2.5">
                    <strong className="text-[var(--teal)]">PAC</strong> — {t('pac_legend')} <strong>{pacParam ? pacParam.rangeLbl : '240-300'}</strong>.
                  </div>
                </div>
              );
            })()}

            {/* Diagnostic panel */}
            {stats && (
              <div className="mt-4">
                <DiagnosticPanel
                  stats={stats}
                  type={type}
                  subtype={subtype}
                  overrunPct={overrunPct}
                />
              </div>
            )}
          </div>

          {/* ── Right: sticky AnalysisPanel sidebar ── */}
          <div className="sticky top-20">
            <AnalysisPanel
              items={flattenedBase}
              type={type}
              subtype={subtype}
              overrunPct={overrunPct}
              servingTemp={servingTempDesired}
              onExportPDF={handleExportPDF}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB: PROCESO ═══════════════════ */}
      {activeTab === 'proceso' && (
        <div>
          <ProcessTab
            recipe={{ type }}
            ingredients={enrichedRows.filter(r => r.ingredient_id).map(r => ({
              ...r,
              ingredient: r.ingredient,
              name: r.ingredient?.name || '',
            }))}
          />

          {/* Evaporacion + Moldes (paletas) en grid 2 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="card p-5">
              <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                <div className="font-display text-base text-[var(--ink)]">
                  💨 {t('evaporation_title')}
                </div>
                <div className="flex items-center gap-1">
                  <NumberInput
                    min="0" max="50" step="0.5"
                    className="w-16 text-right text-sm font-semibold border border-black/10 rounded-lg py-1 px-2 outline-none focus:border-[var(--mint2)]"
                    value={evaporationPct}
                    onChange={v => { setEvaporationPct(v); setDirty(true); }}
                  />
                  <span className="text-xs text-[var(--ink3)]">% {t('evaporation_of_water')}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--ink3)] leading-relaxed">
                {t('evaporation_desc')}
              </p>
              {evaporationPct > 0 && stats?.evaporated_g != null && (
                <div className="mt-3 text-xs rounded-lg p-2 bg-[var(--cream2)] text-[var(--ink2)]">
                  💧 {t('evaporation_summary', {
                    grams: stats.evaporated_g.toFixed(1),
                    finalWeight: Math.round(stats.T),
                  })}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                <div className="font-display text-base text-[var(--ink)]">
                  🍡 {t('mould_title')}
                </div>
                <div className="flex items-center gap-1">
                  <NumberInput
                    min="0" max="500" step="1"
                    className="w-16 text-right text-sm font-semibold border border-black/10 rounded-lg py-1 px-2 outline-none focus:border-[var(--mint2)]"
                    value={mouldG}
                    onChange={v => { setMouldG(v); setDirty(true); }}
                  />
                  <span className="text-xs text-[var(--ink3)]">g {t('mould_per_unit')}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--ink3)] leading-relaxed">
                {t('mould_desc')}
              </p>
              {mouldG > 0 && stats?.T > 0 && (
                <div className="mt-3 text-xs rounded-lg p-2 bg-[var(--cream2)] text-[var(--ink2)]">
                  🍡 {t('mould_summary', {
                    units: Math.floor(stats.T / mouldG),
                    each: mouldG,
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card p-5 mt-4">
            <div className="font-display text-base text-[var(--ink)] mb-2">
              {t('custom_process_notes')}
            </div>
            <p className="text-xs text-[var(--ink3)] mb-3">
              {t('proc_notes_desc')}
            </p>
            <textarea
              className="input min-h-[320px] resize-y leading-relaxed"
              placeholder={t('proc_notes_placeholder')}
              value={procNotes}
              onChange={e => { setProcNotes(e.target.value); setDirty(true); }}
              rows={14}
            />
            <button className="btn-primary mt-3" onClick={handleSave} disabled={saving}>
              {saving ? t('saving') : t('save_notes')}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB: CURVA DE CONGELAMIENTO ═══════════════════ */}
      {activeTab === 'curva' && (
        <div className="max-w-3xl">
          {stats ? (
            <>
              <FreezingCurve stats={stats} servingTemp={servingTempDesired} />
              <div className="card p-4 mt-4">
                <h3 className="font-display text-sm text-[var(--ink)] mb-3">{t('supplementary_data')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-[var(--ink3)] text-xs mb-1">FPD</div>
                    <div className="font-semibold">{stats.fpd.toFixed(2)}°C</div>
                  </div>
                  <div>
                    <div className="text-[var(--ink3)] text-xs mb-1">{t('ts_calculated')}</div>
                    <div className="font-semibold">{servingTempCalc != null ? `${servingTempCalc}°C` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[var(--ink3)] text-xs mb-1">{t('ts_desired')}</div>
                    <div className="font-semibold">{servingTempDesired != null ? `${servingTempDesired}°C` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[var(--ink3)] text-xs mb-1">{t('density')}</div>
                    <div className="font-semibold">{calcDensity(stats).toFixed(4)} g/ml</div>
                  </div>
                  <div>
                    <div className="text-[var(--ink3)] text-xs mb-1">Overrun</div>
                    <div className="font-semibold">{overrunPct}%</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-8 text-center text-[var(--ink3)]">
              {t('add_ing_for_curve')}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TAB: NUTRICION ═══════════════════ */}
      {activeTab === 'nutricion' && (
        <div className="max-w-3xl space-y-4">
          {statsFull ? (
            <>
              <ProGate feature={FEATURES.LABELS}>
                <LabelingPanel
                  stats={statsFull}
                  items={flattenedFull}
                  allergenOverrides={allergenOverrides}
                />
              </ProGate>
              <AllergensEditor
                items={flattenedFull}
                overrides={allergenOverrides}
                onChange={(next) => { setAllergenOverrides(next); setDirty(true); }}
              />
            </>
          ) : (
            <div className="card p-8 text-center text-[var(--ink3)]">
              {t('add_ing_for_nutrition')}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TAB: ANALISIS ═══════════════════ */}
      {activeTab === 'analisis' && (
        <div className="space-y-6">
          {stats ? (
            <>
              {/* Parametros del gelato */}
              <div className="max-w-2xl">
                <GelatoParams
                  stats={stats}
                  type={type}
                  subtype={subtype}
                  overrunPct={overrunPct}
                  servingTemp={servingTempCalc}
                />
              </div>

              {/* Graficas de analisis (sobre la mezcla base, sub-recetas resueltas) */}
              <AnalysisCharts
                stats={stats}
                items={flattenedBase}
                recipeName={name}
                type={type}
                overrunPct={overrunPct}
              />

              {/* AI holistic recipe analysis */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div>
                    <div className="font-display text-base text-[var(--ink)]">✨ {t('ai_recipe_analysis_title')}</div>
                    <div className="text-xs text-[var(--ink3)]">{t('ai_recipe_analysis_sub')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={runAiAnalysis}
                    disabled={aiLoading || !stats}
                    className="text-xs font-semibold px-4 py-2 rounded-lg text-white border-none cursor-pointer transition-colors disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6a1b9a, #ab47bc)' }}
                  >
                    {aiLoading ? t('ai_thinking') : (aiAdvice ? t('ai_regenerate') : t('ai_analyze'))}
                  </button>
                </div>
                {aiError && <p className="text-xs text-[var(--coral)]">⚠ {aiError}</p>}
                {aiAdvice && (
                  <div className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed bg-[var(--cream2)] rounded-xl p-4">
                    {aiAdvice}
                  </div>
                )}
                {!aiAdvice && !aiError && !aiLoading && (
                  <p className="text-xs text-[var(--ink3)]">{t('ai_analyze_hint')}</p>
                )}
              </div>
            </>
          ) : (
            <div className="card p-8 text-center text-[var(--ink3)]">
              {t('add_ing_for_analysis')}
            </div>
          )}
        </div>
      )}

      {/* Auto-balance assistant (sub-recetas resueltas, excluye inclusiones) */}
      {showBalance && stats && (
        <BalancePanel
          items={flattenedBase}
          type={type}
          subtype={subtype}
          stats={stats}
          servingTemp={servingTempDesired}
          onApply={applyBalanceSuggestion}
          onApplyAll={applyBalanceAll}
          onClose={() => setShowBalance(false)}
        />
      )}

      {/* AI key modal */}
      {showAiKeyModal && <AiKeyModal onClose={() => setShowAiKeyModal(false)} />}

      {/* Recipe history modal */}
      {showHistory && (
        <RecipeHistory
          revisions={recipe?.revisions || []}
          onRestore={restoreRevision}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* PIN prompt: aparece cuando se intenta guardar y hay PIN sin desbloquear */}
      {showPinPrompt && (
        <PinPromptModal
          onSuccess={() => { setShowPinPrompt(false); handleSave(); }}
          onCancel={() => setShowPinPrompt(false)}
        />
      )}
    </div>
  );
}
