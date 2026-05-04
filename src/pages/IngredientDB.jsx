import { useState, useEffect } from 'react';
import { useIngredientStore } from '../store/ingredientStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useAppStore } from '../store/appStore';
import { useT, useIngredientName, useCategoryName } from '../lib/i18n';
import { EmptyState } from '../components/ui/index.jsx';
import { InventoryModal } from '../components/InventoryModal';
import { isBarcodeAvailable, isCapacitorNative, scanBarcode } from '../lib/barcode';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { getBarcodes, findIngredientByBarcode, buildAddBarcodePatch, buildRemoveBarcodePatch } from '../lib/barcodeMap';
import { track } from '../lib/analytics';
import { generateIngredientNutrition } from '../lib/ai';
import { computeBlendMacros } from '../lib/icecreamCalc';
import { useAiStore } from '../store/aiStore';
import { AiKeyModal } from '../components/AiKeyModal';
import { NumberInput } from '../components/NumberInput';
import { ProGate, ProBadge } from '../components/ProGate';
import { FEATURES, useEntitlement } from '../lib/entitlement';
import { UpgradeModal } from '../components/UpgradeModal';
import { StocktakeModal } from '../components/StocktakeModal';
import { SuppliersModal } from '../components/SuppliersModal';

const CAT_COLORS = {
  'Lacteo': '#1a5c3a', 'Azucar': '#b8860b', 'Fruta': '#2e7d52',
  'Saborizante': '#6a1b9a', 'Estabilizante': '#1565c0', 'Emulsionante': '#00695c',
  'Acido/Sabor': '#e65100', 'Dulce': '#b71c1c', 'Coco': '#2e7b5c',
  'Fruto seco': '#6d4c41', 'Bebida/Licor': '#283593', 'Colorante nat.': '#424242', 'Base': '#607d8b',
};

const EMPTY_FORM = {
  name: '', category: '', cost_per_kg: 0,
  water_pct: 0, fat_pct: 0, sng_pct: 0, sugar_pct: 0, others_pct: 0, pod: 0, pac: 0,
  calories: 0, protein: 0, satfat: 0, trans_fat: 0, sodium_mg: 0, sugars: 0, added_sugars: 0,
  cholesterol_mg: 0, vitamind_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
  subingredients: [], // [{ ingredient_id, pct }] — si esta poblado, los macros se calculan
  source: '',
};

const NUM_FIELDS_KEYS = [
  // Formulation (default view)
  { key: 'water_pct',   labelKey: 'water_col',  suffix: '%', step: 0.1,   decimals: 1, group: 'formulation' },
  { key: 'fat_pct',     labelKey: 'fat_col',    suffix: '%', step: 0.1,   decimals: 1, group: 'formulation' },
  { key: 'sng_pct',     labelKey: 'sng_col',    suffix: '%', step: 0.1,   decimals: 1, group: 'formulation' },
  { key: 'sugar_pct',   labelKey: 'sugar_col',  suffix: '%', step: 0.1,   decimals: 1, group: 'formulation' },
  { key: 'others_pct',  labelKey: 'others_col', suffix: '%', step: 0.1,   decimals: 1, group: 'formulation' },
  { key: 'pac',         labelKey: null, label: 'PAC',        step: 0.001, decimals: 3, group: 'formulation' },
  { key: 'pod',         labelKey: null, label: 'POD',        step: 0.001, decimals: 3, group: 'formulation' },
  { key: 'cost_per_kg', labelKey: null, label: '$/kg',       step: 10,    decimals: 0, group: 'formulation' },
  // Nutrition / Chilean labeling (per 100g)
  { key: 'calories',    labelKey: null, label: 'kcal/100g',  step: 1,     decimals: 0, group: 'nutrition' },
  { key: 'protein',     labelKey: null, label: 'Prot g',     step: 0.1,   decimals: 1, group: 'nutrition' },
  { key: 'satfat',      labelKey: null, label: 'Sat g',      step: 0.1,   decimals: 1, group: 'nutrition' },
  { key: 'trans_fat',   labelKey: null, label: 'Trans g',    step: 0.01,  decimals: 2, group: 'nutrition' },
  { key: 'sugars',      labelKey: null, label: 'Az tot g',   step: 0.1,   decimals: 1, group: 'nutrition' },
  { key: 'added_sugars',labelKey: null, label: 'Az añ g',    step: 0.1,   decimals: 1, group: 'nutrition' },
  { key: 'sodium_mg',   labelKey: null, label: 'Na mg',      step: 1,     decimals: 0, group: 'nutrition' },
  // Inventory
  { key: 'stock_g',     labelKey: 'stock_col',     step: 10, decimals: 0, group: 'inventory' },
  { key: 'min_stock_g', labelKey: 'min_stock_col', step: 10, decimals: 0, group: 'inventory' },
];

const VIEW_TABS = [
  { id: 'formulation', labelKey: 'view_formulation' },
  { id: 'nutrition',   labelKey: 'view_nutrition' },
  { id: 'inventory',   labelKey: 'view_inventory' },
];

export default function IngredientDB() {
  const t = useT();
  const tIng = useIngredientName();
  const tCat = useCategoryName();
  const { showToast, confirm } = useAppStore();

  const [view, setView] = useState('formulation'); // which column group is visible

  const NUM_FIELDS = NUM_FIELDS_KEYS
    .filter(f => f.group === view)
    .map(f => ({
      ...f,
      label: f.labelKey ? t(f.labelKey) + (f.suffix || '') : f.label,
    }));
  const store = useIngredientStore();

  const [q, setQ] = useState('');
  const [catFilter, setCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [invIngredient, setInvIngredient] = useState(null); // ingredient being viewed in inventory modal
  const [showInvUpgrade, setShowInvUpgrade] = useState(false);
  const [showCostUpgrade, setShowCostUpgrade] = useState(false);
  const ent = useEntitlement();
  const [pendingBarcode, setPendingBarcode] = useState(null); // shown when scan didn't match an ingredient
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null); // { confidence, rationale }
  const [showAiKeyModal, setShowAiKeyModal] = useState(false);
  const [showStocktake, setShowStocktake] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showWebScanner, setShowWebScanner] = useState(false);
  const aiHasKey = !!useAiStore(s => s.apiKey);

  // Helpers de blend (subingredientes). Las funciones se definen aqui pero
  // ingMap depende de allIngredients (que se calcula mas abajo); por eso lo
  // recalculamos dentro de cada uso o lo derivamos despues.
  const isBlend = (form.subingredients || []).length > 0;
  const blendTotalPct = (form.subingredients || []).reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
  function addBlendComponent(id) {
    if (!id) return;
    if ((form.subingredients || []).some(c => String(c.ingredient_id) === String(id))) return;
    const remaining = Math.max(0, 100 - blendTotalPct);
    setForm(f => ({ ...f, subingredients: [...(f.subingredients || []), { ingredient_id: Number(id), pct: remaining }] }));
  }
  function updateBlendPct(id, pct) {
    setForm(f => ({ ...f, subingredients: (f.subingredients || []).map(c => String(c.ingredient_id) === String(id) ? { ...c, pct } : c) }));
  }
  function removeBlendComponent(id) {
    setForm(f => ({ ...f, subingredients: (f.subingredients || []).filter(c => String(c.ingredient_id) !== String(id)) }));
  }

  async function handleAiAutofill() {
    if (!form.name.trim()) { setAiError(t('name_required_ing')); return; }
    if (!aiHasKey) { setShowAiKeyModal(true); return; }
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const partial = {};
      ['water_pct','fat_pct','sng_pct','sugar_pct','others_pct','pod','pac','calories','protein','satfat','trans_fat','sodium_mg','sugars','added_sugars']
        .forEach(k => { if (form[k]) partial[k] = form[k]; });
      const out = await generateIngredientNutrition({ name: form.name, partialNutrition: partial, comment: form.source || '' });
      setForm(f => ({
        ...f,
        water_pct:    out.water_pct    ?? f.water_pct,
        fat_pct:      out.fat_pct      ?? f.fat_pct,
        sng_pct:      out.sng_pct      ?? f.sng_pct,
        sugar_pct:    out.sugar_pct    ?? f.sugar_pct,
        others_pct:   out.others_pct   ?? f.others_pct,
        pod:          out.pod          ?? f.pod,
        pac:          out.pac          ?? f.pac,
        calories:     out.calories     ?? f.calories,
        protein:      out.protein      ?? f.protein,
        satfat:       out.satfat       ?? f.satfat,
        trans_fat:    out.trans_fat    ?? f.trans_fat,
        sodium_mg:    out.sodium_mg    ?? f.sodium_mg,
        sugars:       out.sugars       ?? out.sugar_pct ?? f.sugars,
        added_sugars: out.added_sugars ?? f.added_sugars,
        cholesterol_mg: out.cholesterol_mg ?? f.cholesterol_mg,
        vitamind_mcg:   out.vitamind_mcg   ?? f.vitamind_mcg,
        calcium_mg:     out.calcium_mg     ?? f.calcium_mg,
        iron_mg:        out.iron_mg        ?? f.iron_mg,
        potassium_mg:   out.potassium_mg   ?? f.potassium_mg,
      }));
      setAiResult({ confidence: out.confidence, rationale: out.rationale });
      track('ai_ingredient_generated', { confidence: out.confidence });
    } catch (e) {
      setAiError(e.message === 'AI_KEY_MISSING' ? t('ai_key_missing') : (e.message || 'Error'));
    } finally {
      setAiLoading(false);
    }
  }

  // Inline editing state for numeric fields
  const [editing, setEditing] = useState(null);
  // Inline editing state for text fields (name, category)
  const [editingText, setEditingText] = useState(null);

  const ingredients = store.list({ q: q || undefined, category: catFilter || undefined });
  const allIngredients = store.list();
  const categories = store.categories();

  // Lookup map para resolver subingredientes del blend.
  const ingMap = Object.fromEntries(allIngredients.map(i => [String(i.id), i]));

  // Si el ingrediente que se esta editando es un blend, recalcula sus macros
  // automaticamente cuando cambian los componentes. La key del effect es la
  // forma serializada de subingredients para evitar loops.
  useEffect(() => {
    if (!form.subingredients?.length) return;
    const macros = computeBlendMacros(form.subingredients, ingMap);
    if (!macros) return;
    setForm(f => ({ ...f, ...macros }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form.subingredients)]);

  // ── Barcode scan ──────────────────────────────────────────
  // Si estamos en Capacitor nativo (iOS), usa MLKit. En cualquier otro
  // contexto con camara (web/Tauri/iOS Safari), abre el modal con ZXing.
  async function handleScan() {
    if (isCapacitorNative()) {
      try {
        const code = await scanBarcode();
        handleScannedCode(code);
      } catch (e) {
        if (e.code === 'NOT_AVAILABLE') showToast(t('barcode_native_only'), 'error');
        else if (e.code === 'PERMISSION_DENIED') showToast(t('barcode_permission_denied'), 'error');
        else if (e.code !== 'CANCELLED') showToast(e.message || 'Error', 'error');
      }
    } else {
      setShowWebScanner(true);
    }
  }

  function handleScannedCode(code) {
    track('barcode_scanned');
    const match = findIngredientByBarcode(allIngredients, code);
    if (match) {
      setInvIngredient(match);
      showToast(t('barcode_match', { name: match.name }));
    } else {
      setPendingBarcode(code);
    }
  }

  // Assign the pending barcode to a chosen ingredient (custom or default).
  // ADD el codigo al array existente — no reemplaza, asi un mismo ingrediente
  // puede tener N codigos (multiples marcas del mismo producto).
  function assignBarcode(ingredientId) {
    const ing = store.get(ingredientId);
    const patch = buildAddBarcodePatch(ing, pendingBarcode);
    if (patch) store.update(ingredientId, patch);
    setPendingBarcode(null);
    setInvIngredient(store.get(ingredientId));
    showToast(t('barcode_assigned', { name: ing?.name || '' }));
  }

  // Remueve un codigo especifico de un ingrediente.
  function removeBarcode(ingredientId, code) {
    const ing = store.get(ingredientId);
    const patch = buildRemoveBarcodePatch(ing, code);
    if (patch) store.update(ingredientId, patch);
  }

  // ── Create ────────────────────────────────────────────────
  function handleCreate() {
    if (!form.name.trim()) return showToast(t('name_required_ing'), 'error');
    if (!form.category) return showToast(t('select_category'), 'error');
    store.create(form);
    showToast(t('ingredient_created'));
    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  // ── Delete ────────────────────────────────────────────────
  async function handleDelete(ingredient) {
    if (!ingredient.is_custom) return showToast(t('only_custom_delete'), 'error');
    if (await confirm(`${t('delete')} "${ingredient.name}"?`)) {
      store.remove(ingredient.id);
      showToast(t('ingredient_deleted'));
    }
  }

  // ── Commit helpers ────────────────────────────────────────
  function commitNum(ingredient) {
    if (!editing || editing.id !== ingredient.id) return;
    store.update(ingredient.id, { [editing.field]: editing.value });
    showToast(t('saved'));
    setEditing(null);
  }

  function commitText(ingredient) {
    if (!editingText || editingText.id !== ingredient.id) return;
    if (!editingText.value?.trim()) {
      showToast(t('field_required'), 'error');
      setEditingText(null);
      return;
    }
    store.update(ingredient.id, { [editingText.field]: editingText.value.trim() });
    showToast(t('saved'));
    setEditingText(null);
  }

  // ── Export XLSX (lazy-loads xlsx — 424KB chunk) ───────────
  async function exportXLSX() {
    const XLSX = await import('xlsx');
    const data = [
      ['Nombre', 'Categoria', 'Agua%', 'Grasa%', 'SNG%', 'Azucar%', 'Otros%', 'POD', 'PAC', '$/kg'],
      ...allIngredients.map(i => [
        i.name, i.category,
        parseFloat(i.water_pct), parseFloat(i.fat_pct), parseFloat(i.sng_pct),
        parseFloat(i.sugar_pct), parseFloat(i.others_pct),
        parseFloat(i.pod), parseFloat(i.pac), parseFloat(i.cost_per_kg),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 35 }, { wch: 16 }, { wch: 8 }, { wch: 8 },
      { wch: 8 },  { wch: 9 },  { wch: 8 }, { wch: 8 },
      { wch: 8 },  { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ingredientes');
    XLSX.writeFile(wb, `ingredientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast(t('export_excel'));
  }

  // ── Import XLSX (lazy-loads xlsx) ─────────────────────────
  async function importXLSX(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (rows.length < 2) return showToast(t('file_empty'), 'error');

    const header = rows[0].map(h => String(h || '').toLowerCase().trim());
    const idx = (keyword) => header.findIndex(h => h.includes(keyword));

    const iNombre = idx('nombre');
    const iCat = idx('categor');
    const iAgua = idx('agua');
    const iGrasa = idx('grasa');
    const iSng = idx('sng');
    const iAzucar = idx('az');
    const iOtros = idx('otros');
    const iPod = idx('pod');
    const iPac = idx('pac');
    const iCosto = idx('kg') !== -1 ? idx('kg') : idx('costo');

    const parsed = [];
    for (const row of rows.slice(1)) {
      const name = String(row[iNombre] || '').trim();
      if (!name) continue;
      parsed.push({
        name,
        category: String(row[iCat] || 'Base').trim(),
        water_pct: parseFloat(row[iAgua]) || 0,
        fat_pct: parseFloat(row[iGrasa]) || 0,
        sng_pct: parseFloat(row[iSng]) || 0,
        sugar_pct: parseFloat(row[iAzucar]) || 0,
        others_pct: parseFloat(row[iOtros]) || 0,
        pod: parseFloat(row[iPod]) || 0,
        pac: parseFloat(row[iPac]) || 0,
        cost_per_kg: parseFloat(row[iCosto]) || 0,
      });
    }

    store.importBulk(parsed);
    showToast(`${parsed.length} ${t('ingredients_imported')}`);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl text-[var(--ink)]">{t('ingredient_database')}</h1>
          <p className="text-sm text-[var(--ink3)] mt-1">
            {t('ing_subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isBarcodeAvailable() && (
            <button
              onClick={handleScan}
              className="btn-primary"
              title={t('barcode_scan_tooltip')}
            >
              📷 {t('barcode_scan_btn')}
            </button>
          )}
          <button data-tour="ingredient-add-btn" className="btn-primary" onClick={() => setShowModal(true)}>
            {t('add_ingredient_btn')}
          </button>
          <button className="btn-primary" onClick={() => setShowStocktake(true)}
                  title={t('stk_btn_tooltip')}>
            🧮 {t('stk_btn')}
          </button>
          <button className="btn-primary" onClick={() => setShowSuppliers(true)}
                  title={t('suppliers_btn_tooltip')}>
            🚚 {t('suppliers_btn')}
          </button>
          <button
            onClick={exportXLSX}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white border-none cursor-pointer"
            style={{ background: '#0d5c6e' }}
          >
            {t('export_excel')}
          </button>
          <label
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ background: '#b8860b' }}
          >
            {t('import_excel')}
            <input type="file" accept=".xlsx,.xls" onChange={importXLSX} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div data-tour="ingredients-search" className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <input
          className="input max-w-[220px]"
          placeholder={t('search_ingredients')}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat('')}
            className={'text-xs px-3 py-1 rounded-full border transition-all ' +
              (!catFilter
                ? 'bg-[var(--mint)] text-white border-[var(--mint)]'
                : 'bg-white border-black/10 text-[var(--ink2)] hover:border-[var(--mint2)]')}
          >
            {t('all_categories')}
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCat(c === catFilter ? '' : c)}
              className={'text-xs px-3 py-1 rounded-full border transition-all ' +
                (catFilter === c
                  ? 'bg-[var(--mint)] text-white border-[var(--mint)]'
                  : 'bg-white border-black/10 text-[var(--ink2)] hover:border-[var(--mint2)]')}
            >
              {tCat(c)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[var(--ink3)]">
          {t('edit_instruction')}
          &nbsp;·&nbsp;
          <kbd className="bg-black/8 px-1 rounded">Enter</kbd> {t('enter_save')}
          &nbsp;·&nbsp;
          <kbd className="bg-black/8 px-1 rounded">Esc</kbd> {t('esc_cancel')}
        </span>
      </div>

      {/* View tabs (which column group to show) */}
      <div className="flex gap-1 mb-3 flex-wrap" role="tablist">
        {VIEW_TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={'text-xs px-4 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ' +
              (view === tab.id
                ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                : 'bg-white border-black/10 text-[var(--ink2)] hover:border-[var(--ink2)]')}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Table */}
      {ingredients.length === 0 ? (
        <EmptyState
          title={t('no_results')}
          description={t('no_results_desc')}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">{t('name')}</th>
                <th>{t('category')}</th>
                {NUM_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                <th>{t('allergens_col')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map(ingredient => {
                const color = CAT_COLORS[ingredient.category] || '#607d8b';
                const minStock = parseFloat(ingredient.min_stock_g) || 0;
                const stock = parseFloat(ingredient.stock_g) || 0;
                const lowStock = minStock > 0 && stock <= minStock;

                return (
                  <tr key={ingredient.id} style={lowStock ? { background: '#fff5f5' } : {}}>
                    {/* Name */}
                    <td>
                      {editingText?.id === ingredient.id && editingText.field === 'name' ? (
                        <input
                          autoFocus
                          className="input text-xs py-1 px-2 rounded w-full min-w-[150px]"
                          value={editingText.value}
                          onChange={e => setEditingText({ ...editingText, value: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitText(ingredient);
                            if (e.key === 'Escape') setEditingText(null);
                          }}
                          onBlur={() => commitText(ingredient)}
                        />
                      ) : (
                        <span
                          className={`flex items-center gap-2 ${ingredient.is_custom ? 'cursor-pointer group' : ''}`}
                          onClick={() => ingredient.is_custom && setEditingText({
                            id: ingredient.id, field: 'name', value: ingredient.name,
                          })}
                          title={ingredient.is_custom ? t('click_edit_name') : ''}
                        >
                          <span className={ingredient.is_custom ? 'group-hover:text-[var(--mint)] transition-colors' : ''}>
                            {tIng(ingredient.name)}
                          </span>
                          {ingredient.is_custom && (
                            <span className="text-[10px] bg-[var(--gold2)] text-[#5c3d00] px-1.5 py-0.5 rounded font-semibold">
                              custom
                            </span>
                          )}
                          {lowStock && (
                            <span className="text-[10px] bg-[var(--coral)] text-white px-1.5 py-0.5 rounded font-semibold"
                                  title={t('low_stock_tooltip', { stock, min: minStock })}>
                              ⚠ {t('low_stock_badge')}
                            </span>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td>
                      {editingText?.id === ingredient.id && editingText.field === 'category' ? (
                        <select
                          autoFocus
                          className="select text-xs py-0.5 px-1 rounded"
                          value={editingText.value}
                          onChange={e => setEditingText({ ...editingText, value: e.target.value })}
                          onBlur={() => commitText(ingredient)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitText(ingredient);
                            if (e.key === 'Escape') setEditingText(null);
                          }}
                        >
                          {categories.map(c => <option key={c} value={c}>{tCat(c)}</option>)}
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded text-white transition-opacity
                            ${ingredient.is_custom ? 'cursor-pointer hover:opacity-75' : ''}`}
                          style={{ background: color }}
                          onClick={() => ingredient.is_custom && setEditingText({
                            id: ingredient.id, field: 'category', value: ingredient.category,
                          })}
                          title={ingredient.is_custom ? t('click_edit_category') : ''}
                        >
                          {tCat(ingredient.category)}
                        </span>
                      )}
                    </td>

                    {/* Numeric fields */}
                    {NUM_FIELDS.map(({ key, step, decimals }) => {
                      const isEd = editing?.id === ingredient.id && editing.field === key;
                      const isPrice = key === 'cost_per_kg';

                      return (
                        <td key={key}>
                          {isEd ? (
                            <NumberInput
                              autoFocus
                              min="0"
                              step={step}
                              className={`${isPrice ? 'input-gold' : 'input'} w-24 text-xs py-1 px-2 rounded`}
                              value={editing.value}
                              onChange={v => setEditing({ ...editing, value: v })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitNum(ingredient);
                                if (e.key === 'Escape') setEditing(null);
                              }}
                              onBlur={() => commitNum(ingredient)}
                            />
                          ) : (
                            <button
                              className="font-semibold text-[var(--ink)] hover:text-[var(--mint)]
                                         hover:underline transition-colors cursor-pointer bg-transparent
                                         border-none text-xs"
                              onClick={() => setEditing({
                                id: ingredient.id, field: key, value: parseFloat(ingredient[key]) || 0,
                              })}
                              title={t('click_edit_field', { field: key })}
                            >
                              {isPrice
                                ? `$${Math.round(parseFloat(ingredient[key]) || 0).toLocaleString('es-CL')}`
                                : (parseFloat(ingredient[key]) || 0).toFixed(decimals)
                              }
                            </button>
                          )}
                        </td>
                      );
                    })}

                    {/* Allergens (read-only chips) */}
                    <td>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(ingredient.allergens || []).map(a => (
                          <span key={a}
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-white"
                                style={{ background: '#c0392b' }}
                                title={t('allergen_' + a)}>
                            {t('allergen_' + a)}
                          </span>
                        ))}
                        {(!ingredient.allergens || ingredient.allergens.length === 0) && (
                          <span className="text-[9px] text-[var(--ink3)]">—</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="text-[10px] px-2 py-0.5 rounded border border-[var(--mint2)]
                                     text-[var(--mint)] hover:bg-[var(--mint3)] transition-colors cursor-pointer bg-transparent"
                          onClick={() => setInvIngredient(ingredient)}
                          title={t('inventory_btn_tooltip')}
                        >
                          {t('inventory_btn')}
                        </button>
                        {ingredient.is_custom && (
                          <button
                            className="text-black/20 hover:text-[var(--coral)] transition-colors text-xs ml-1"
                            onClick={() => handleDelete(ingredient)}
                          >
                            x
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New ingredient modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-[600px] w-[95%] shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-[var(--ink)] mb-6">{t('new_ingredient_title')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('name')} *</label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={handleAiAutofill}
                    disabled={aiLoading || !form.name.trim()}
                    className="text-xs font-semibold px-3 rounded-lg text-white border-none cursor-pointer transition-colors disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6a1b9a, #ab47bc)' }}
                    title={t('ai_autofill_tooltip')}
                  >
                    {aiLoading ? '…' : '✨ ' + t('ai_autofill')}
                  </button>
                </div>
                {aiError && <p className="text-[11px] text-[var(--coral)] mt-1">⚠ {aiError}</p>}
                {aiResult && (
                  <div className="mt-2 p-2 rounded-lg text-[11px]"
                       style={{ background: aiResult.confidence === 'high' ? '#e8f5ed' : aiResult.confidence === 'medium' ? '#fff8e1' : '#fdecea' }}>
                    <span className="font-bold">{t('ai_confidence')}: {aiResult.confidence}</span>
                    <span className="text-[var(--ink2)]"> — {aiResult.rationale}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('category')} *</label>
                <select
                  className="select"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="">{t('select_option')}</option>
                  {categories.map(c => <option key={c} value={c}>{tCat(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--ink2)] block mb-1">$/kg *</label>
                <NumberInput
                  min="0"
                  className="input-gold w-full rounded-lg"
                  value={form.cost_per_kg}
                  onChange={v => setForm(f => ({ ...f, cost_per_kg: v }))}
                />
              </div>
              <div className="col-span-2 bg-[var(--cream2)] rounded-xl p-3 text-xs text-[var(--ink3)]">
                {t('values_per_100g')}
              </div>
              {[
                ['water_pct', 'water_col', '%'], ['fat_pct', 'fat_col', '%'], ['sng_pct', 'sng_col', '%'],
                ['sugar_pct', 'sugar_col', '%'], ['others_pct', 'others_col', '%'], ['pod', null], ['pac', null],
              ].map(([field, labelKey, suffix]) => (
                <div key={field}>
                  <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
                    {labelKey ? `${t(labelKey)} ${suffix || ''}` : field.toUpperCase()}
                  </label>
                  <NumberInput
                    min="0"
                    max="100"
                    step="0.1"
                    className="input"
                    value={form[field]}
                    onChange={v => setForm(f => ({ ...f, [field]: v }))}
                  />
                </div>
              ))}

              {/* Micronutrientes (opcionales, FDA 2020 + Codex) */}
              <div className="col-span-2 bg-[var(--cream2)] rounded-xl p-3 text-xs text-[var(--ink3)]">
                {t('micronutrients_section')}
              </div>
              {[
                ['cholesterol_mg', 'micro_cholesterol', 'mg'],
                ['vitamind_mcg',   'micro_vitamind',    'µg'],
                ['calcium_mg',     'micro_calcium',     'mg'],
                ['iron_mg',        'micro_iron',        'mg'],
                ['potassium_mg',   'micro_potassium',   'mg'],
              ].map(([field, labelKey, suffix]) => (
                <div key={field}>
                  <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
                    {t(labelKey)} <span className="text-[10px] text-[var(--ink3)]">({suffix}/100g)</span>
                  </label>
                  <NumberInput
                    min="0"
                    step="0.01"
                    className="input"
                    value={form[field]}
                    onChange={v => setForm(f => ({ ...f, [field]: v }))}
                    disabled={isBlend}
                    title={isBlend ? t('blend_macros_locked') : ''}
                  />
                </div>
              ))}
            </div>

            {/* Composicion de blend (subingredientes) */}
            <div className="mt-6 border-t border-black/10 pt-4">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">🧪 {t('blend_section_title')}</h3>
                  <p className="text-[11px] text-[var(--ink3)]">{t('blend_section_sub')}</p>
                </div>
                {isBlend && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${Math.abs(blendTotalPct - 100) < 0.5 ? 'bg-[var(--mint3)] text-[var(--mint)]' : 'bg-[#fdecea] text-[var(--coral)]'}`}>
                    {t('blend_total', { pct: blendTotalPct.toFixed(1) })}
                  </span>
                )}
              </div>

              {(form.subingredients || []).length > 0 && (
                <table className="tbl text-xs w-full mb-2">
                  <thead>
                    <tr>
                      <th className="text-left">{t('ingredient')}</th>
                      <th className="text-right" style={{ width: 80 }}>%</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.subingredients.map(c => {
                      const ing = ingMap[String(c.ingredient_id)];
                      return (
                        <tr key={c.ingredient_id}>
                          <td>{ing ? tIng(ing.name) : '?'}</td>
                          <td className="text-right">
                            <NumberInput
                              min="0" max="100" step="0.5"
                              className="w-16 text-right border border-black/10 rounded px-1.5 py-0.5 text-xs"
                              value={c.pct}
                              onChange={v => updateBlendPct(c.ingredient_id, v)}
                            />
                          </td>
                          <td>
                            <button type="button" onClick={() => removeBlendComponent(c.ingredient_id)}
                                    className="text-[var(--coral)] hover:text-[var(--coral)] text-base bg-transparent border-none cursor-pointer px-1">×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <select className="select w-full"
                      value=""
                      onChange={e => { addBlendComponent(e.target.value); e.target.value = ''; }}>
                <option value="">{t('blend_add_placeholder')}</option>
                {allIngredients
                  .filter(i => !(form.subingredients || []).some(c => String(c.ingredient_id) === String(i.id)))
                  .sort((a, b) => tIng(a.name).localeCompare(tIng(b.name)))
                  .map(i => (
                    <option key={i.id} value={i.id}>{tIng(i.name)} ({tCat(i.category)})</option>
                  ))}
              </select>

              {isBlend && (
                <p className="text-[11px] text-[var(--ink3)] mt-2">
                  ℹ {t('blend_macros_locked')}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={handleCreate}>
                {t('save_ingredient')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory movements modal */}
      {invIngredient && (
        <InventoryModal
          ingredient={invIngredient}
          onClose={() => setInvIngredient(null)}
        />
      )}

      {/* AI key modal */}
      {showAiKeyModal && <AiKeyModal onClose={() => setShowAiKeyModal(false)} />}
      {showStocktake && <StocktakeModal onClose={() => setShowStocktake(false)} />}
      {showSuppliers && <SuppliersModal onClose={() => setShowSuppliers(false)} />}
      {showWebScanner && (
        <BarcodeScannerModal
          onDetected={(code) => { setShowWebScanner(false); handleScannedCode(code); }}
          onClose={() => setShowWebScanner(false)}
        />
      )}

      {/* Assign-barcode modal: shown when a scan didn't match any ingredient */}
      {pendingBarcode && (
        <div
          className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm"
          onClick={() => setPendingBarcode(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
              <div>
                <h2 className="font-display text-lg text-[var(--ink)]">
                  {t('barcode_assign_title')}
                </h2>
                <p className="text-xs text-[var(--ink3)]">
                  <span className="font-mono">{pendingBarcode}</span> · {t('barcode_assign_sub')}
                </p>
              </div>
              <button onClick={() => setPendingBarcode(null)}
                      className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <input
                className="input mb-3"
                placeholder={t('search_ingredients')}
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <ul className="divide-y divide-black/5">
                {ingredients.slice(0, 50).map(i => (
                  <li key={i.id}>
                    <button
                      onClick={() => assignBarcode(i.id)}
                      className="w-full text-left py-2 px-2 hover:bg-[var(--cream)] transition-colors
                                 cursor-pointer bg-transparent border-none flex justify-between items-center"
                    >
                      <span className="text-sm text-[var(--ink)]">{tIng(i.name)}</span>
                      <span className="text-[10px] text-[var(--ink3)]">{tCat(i.category)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
