import { useState } from 'react';
import { useInventoryStore, getCostStats } from '../store/inventoryStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useSupplierStore } from '../store/supplierStore';
import { useAppStore } from '../store/appStore';
import { useT, useIngredientName, useLocale } from '../lib/i18n';
import { getBarcodes, buildAddBarcodePatch, buildRemoveBarcodePatch } from '../lib/barcodeMap';
import { track } from '../lib/analytics';
import { useEscapeKey } from '../lib/hooks';

const TYPE_COLOR = { in: 'var(--mint)', out: 'var(--coral)', adjustment: 'var(--gold)' };

/**
 * Per-ingredient inventory modal: shows current stock, lets the user record
 * manual entries (in/out/adjustment) and lists the movement history.
 */
export function InventoryModal({ ingredient, onClose }) {
  const t = useT();
  const tIng = useIngredientName();
  const locale = useLocale();
  const { showToast } = useAppStore();
  useEscapeKey(onClose);

  const movements = useInventoryStore(s => s.list({ ingredient_id: ingredient.id }));
  const record = useInventoryStore(s => s.record);
  const updateIngredient = useIngredientStore(s => s.update);
  const suppliers = useSupplierStore(s => s.list());
  const createSupplier = useSupplierStore(s => s.create);
  // Re-read live to keep the modal in sync after each record() call.
  const live = useIngredientStore(s => s.get(ingredient.id)) || ingredient;
  const codes = getBarcodes(live);
  const supplierMap = new Map(suppliers.map(s => [s.id, s]));
  const costStats = getCostStats(live.id);

  const [newBarcode, setNewBarcode] = useState('');
  function addBarcodeManual() {
    const c = newBarcode.trim();
    if (!c) return;
    const patch = buildAddBarcodePatch(live, c);
    if (patch) {
      updateIngredient(live.id, patch);
      setNewBarcode('');
    } else {
      showToast(t('barcode_already_exists') || 'Codigo ya asignado', 'error');
    }
  }
  function removeCode(code) {
    const patch = buildRemoveBarcodePatch(live, code);
    if (patch) updateIngredient(live.id, patch);
  }

  const stock = parseFloat(live.stock_g) || 0;
  const minStock = parseFloat(live.min_stock_g) || 0;
  const lowStock = minStock > 0 && stock <= minStock;

  // Prefill por ingrediente: si este mismo ingrediente ya tuvo movimientos
  // antes, traemos el mas reciente (tipo/cantidad/notas) como default. Asi
  // si normalmente entra en sacos de 25kg con la nota "Proveedor X", se
  // prefilla solo. Si nunca tuvo movimiento, default 'in' y vacio.
  const lastForThis = movements[0]; // movements ya viene ordenado desc por fecha
  const initialType  = lastForThis?.type || 'in';
  const initialQty   = lastForThis ? String(lastForThis.qty_g) : '';
  const initialNotes = lastForThis?.notes || '';
  // Costo total y proveedor: prellenar con el ultimo 'in' que tenga datos.
  const lastInWithCost = movements.find(m => m.type === 'in' && Number.isFinite(m.unit_cost_per_kg));
  const initialCostTotal = lastInWithCost
    ? String(Math.round(lastInWithCost.unit_cost_per_kg * (lastInWithCost.qty_g / 1000)))
    : '';
  const initialSupplierName = lastInWithCost?.supplier_id != null
    ? (supplierMap.get(lastInWithCost.supplier_id)?.name || '')
    : '';

  const [type, setType]   = useState(initialType);
  const [qty, setQty]     = useState(initialQty);
  const [notes, setNotes] = useState(initialNotes);
  const [costTotal, setCostTotal] = useState(initialCostTotal);
  const [supplierName, setSupplierName] = useState(initialSupplierName);

  function resolveSupplierId(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const existing = suppliers.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const created = createSupplier({ name: trimmed });
    return created?.id || null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!q || q <= 0) return showToast(t('inv_qty_required'), 'error');
    const payload = { ingredient_id: ingredient.id, type, qty_g: q, notes };
    if (type === 'in') {
      const totalCost = parseFloat(costTotal);
      if (Number.isFinite(totalCost) && totalCost > 0 && q > 0) {
        // unit_cost_per_kg = total / kg
        payload.unit_cost_per_kg = totalCost / (q / 1000);
      }
      const supId = resolveSupplierId(supplierName);
      if (supId != null) payload.supplier_id = supId;
    }
    record(payload);
    track('inventory_movement', {
      type,
      with_cost: payload.unit_cost_per_kg != null,
      with_supplier: payload.supplier_id != null,
    });
    showToast(t('inv_movement_recorded'));
    // Mantiene los valores visibles para que el operador vea que se guardo
    // y pueda registrar otro movimiento identico (ej. dos sacos iguales) con
    // un solo click adicional al boton.
  }

  function clearForm() {
    setType('in');
    setQty('');
    setNotes('');
    setCostTotal('');
    setSupplierName('');
  }

  // Costo unitario calculado en vivo para feedback al operador.
  const liveQtyKg = (parseFloat(qty) || 0) / 1000;
  const liveTotal = parseFloat(costTotal);
  const liveCostPerKg = (Number.isFinite(liveTotal) && liveTotal > 0 && liveQtyKg > 0)
    ? liveTotal / liveQtyKg
    : null;

  const typeLbl = (tp) => ({
    in: t('inv_type_in'),
    out: t('inv_type_out'),
    adjustment: t('inv_type_adjustment'),
  }[tp] || tp);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="inventory-modal-title" className="font-display text-lg text-[var(--ink)]">{tIng(live.name)}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('inventory_modal_subtitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        {/* Stock summary */}
        <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-black/10">
          <div className={`rounded-xl p-3 text-center ${lowStock ? 'bg-[var(--coral2)]' : 'bg-[var(--cream2)]'}`}>
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink3)] mb-0.5">{t('inv_current_stock')}</div>
            <div className={`font-display text-2xl ${lowStock ? 'text-[var(--coral)]' : 'text-[var(--ink)]'}`}>
              {stock.toLocaleString(locale)} g
            </div>
            {lowStock && <div className="text-[10px] text-[var(--coral)] mt-0.5">⚠ {t('low_stock_badge')}</div>}
          </div>
          <div className="rounded-xl p-3 text-center bg-[var(--cream2)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink3)] mb-0.5">{t('inv_min_stock')}</div>
            <div className="font-display text-2xl text-[var(--ink)]">
              {minStock > 0 ? `${minStock.toLocaleString(locale)} g` : '—'}
            </div>
          </div>
        </div>

        {/* Codigos de barra (multi) */}
        <div className="px-6 py-3 border-b border-black/10">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-[10px] uppercase tracking-widest text-[var(--ink3)]">
              📷 {t('barcodes_section_title')}
            </h4>
            <span className="text-[10px] text-[var(--ink3)]">{codes.length} {codes.length === 1 ? t('barcodes_count_one') : t('barcodes_count_many')}</span>
          </div>
          {codes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {codes.map(c => (
                <span key={c} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-[var(--cream2)] text-[var(--ink2)] border border-black/10">
                  {c}
                  <button type="button" onClick={() => removeCode(c)}
                          className="text-[var(--coral)] hover:text-[var(--coral)] cursor-pointer bg-transparent border-none px-0.5"
                          title={t('barcodes_remove')}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1 text-xs font-mono"
              placeholder={t('barcodes_add_placeholder')}
              value={newBarcode}
              onChange={e => setNewBarcode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBarcodeManual(); } }}
            />
            <button type="button" onClick={addBarcodeManual}
                    className="btn-primary text-xs"
                    disabled={!newBarcode.trim()}>
              + {t('barcodes_add')}
            </button>
          </div>
          <p className="text-[10px] text-[var(--ink3)] mt-1">{t('barcodes_help')}</p>
        </div>

        {/* New movement form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-black/10">
          <div className="grid grid-cols-1 md:grid-cols-[120px_120px_1fr_auto] gap-3 items-end">
            <div>
              <label htmlFor="inv-type" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('inv_movement_type')}</label>
              <select id="inv-type" className="select" value={type} onChange={e => setType(e.target.value)}>
                <option value="in">{t('inv_type_in')}</option>
                <option value="out">{t('inv_type_out')}</option>
                <option value="adjustment">{t('inv_type_adjustment')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="inv-qty" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">
                {type === 'adjustment' ? t('inv_new_balance') : t('inv_qty_g')}
              </label>
              <input
                id="inv-qty"
                type="number" min="0" step="any"
                className="input text-right"
                value={qty}
                onChange={e => setQty(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="inv-notes" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('inv_notes')}</label>
              <input
                id="inv-notes"
                type="text"
                className="input"
                placeholder={t('inv_notes_placeholder')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">+ {t('inv_record')}</button>
          </div>

          {/* Campos extra solo para entradas (compras): precio + proveedor.
              Opcionales — si quedan vacios se guarda el movimiento sin
              datos de costo ni proveedor. */}
          {type === 'in' && (
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3 mt-3">
              <div>
                <label htmlFor="inv-cost" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">
                  {t('inv_total_cost')} <span className="opacity-60 normal-case">({t('inv_optional')})</span>
                </label>
                <input
                  id="inv-cost"
                  type="number" min="0" step="any"
                  className="input text-right"
                  placeholder="0"
                  value={costTotal}
                  onChange={e => setCostTotal(e.target.value)}
                />
                {liveCostPerKg && (
                  <p className="text-[10px] text-[var(--ink3)] mt-0.5">
                    = {liveCostPerKg.toLocaleString(locale, { maximumFractionDigits: 0 })} / kg
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="inv-supplier" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">
                  {t('inv_supplier')} <span className="opacity-60 normal-case">({t('inv_optional')})</span>
                </label>
                <input
                  id="inv-supplier"
                  type="text"
                  list="supplier-suggestions"
                  className="input"
                  placeholder={t('inv_supplier_placeholder')}
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                />
                <datalist id="supplier-suggestions">
                  {suppliers.map(s => <option key={s.id} value={s.name} />)}
                </datalist>
                <p className="text-[10px] text-[var(--ink3)] mt-0.5">{t('inv_supplier_help')}</p>
              </div>
            </div>
          )}

          {lastForThis && (
            <div className="mt-2 text-[10px] text-[var(--ink3)] flex items-center justify-between">
              <span>💡 {t('inv_prefilled_from_last')}</span>
              <button type="button" onClick={clearForm}
                      className="text-[var(--coral)] hover:underline cursor-pointer bg-transparent border-none">
                {t('inv_clear_prefill')}
              </button>
            </div>
          )}
        </form>

        {/* Estadisticas de costo: solo si hay datos historicos. */}
        {costStats && (
          <div className="px-6 py-3 border-b border-black/10 bg-[var(--cream2)]/40">
            <h4 className="text-[10px] uppercase tracking-widest text-[var(--ink3)] mb-2">
              💰 {t('inv_cost_stats_title')}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-[10px] text-[var(--ink3)]">{t('inv_cost_latest')}</div>
                <div className="font-semibold tabular-nums">
                  {costStats.latest.toLocaleString(locale, { maximumFractionDigits: 0 })} / kg
                </div>
                <div className="text-[10px] text-[var(--ink3)]">{costStats.latest_date}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ink3)]">{t('inv_cost_avg')}</div>
                <div className="font-semibold tabular-nums">
                  {costStats.avg_weighted != null
                    ? `${costStats.avg_weighted.toLocaleString(locale, { maximumFractionDigits: 0 })} / kg`
                    : '—'}
                </div>
                <div className="text-[10px] text-[var(--ink3)]">{costStats.samples} {t('inv_cost_samples')}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ink3)]">{t('inv_cost_min_max')}</div>
                <div className="font-semibold tabular-nums">
                  {costStats.min.toLocaleString(locale, { maximumFractionDigits: 0 })}
                  {' / '}
                  {costStats.max.toLocaleString(locale, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ink3)]">{t('inv_cost_total_invested')}</div>
                <div className="font-semibold tabular-nums">
                  {costStats.total_invested.toLocaleString(locale, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-[var(--ink3)]">
                  {costStats.total_kg_received.toLocaleString(locale, { maximumFractionDigits: 1 })} kg
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-xs font-semibold text-[var(--ink2)] mb-2 uppercase tracking-widest">
            {t('inv_history')}
          </h3>
          {movements.length === 0 ? (
            <p className="text-xs text-[var(--ink3)] text-center py-6">{t('inv_no_movements')}</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left py-1.5 font-semibold">{t('date_label')}</th>
                  <th className="text-left py-1.5 font-semibold">{t('inv_movement_type')}</th>
                  <th className="text-right py-1.5 font-semibold">{t('inv_qty_g')}</th>
                  <th className="text-right py-1.5 font-semibold">{t('inv_balance_after')}</th>
                  <th className="text-right py-1.5 font-semibold">{t('inv_cost_per_kg')}</th>
                  <th className="text-left py-1.5 font-semibold">{t('inv_supplier')}</th>
                  <th className="text-left py-1.5 font-semibold">{t('inv_notes')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} className="border-b border-black/5">
                    <td className="py-1.5">{m.date}</td>
                    <td className="py-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded text-white"
                            style={{ background: TYPE_COLOR[m.type] || '#888' }}>
                        {typeLbl(m.type)}
                      </span>
                    </td>
                    <td className="text-right py-1.5 tabular-nums">
                      {m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''}
                      {(parseFloat(m.qty_g) || 0).toLocaleString(locale)} g
                    </td>
                    <td className="text-right py-1.5 font-semibold tabular-nums">
                      {(parseFloat(m.balance_after) || 0).toLocaleString(locale)} g
                    </td>
                    <td className="text-right py-1.5 tabular-nums">
                      {Number.isFinite(m.unit_cost_per_kg)
                        ? m.unit_cost_per_kg.toLocaleString(locale, { maximumFractionDigits: 0 })
                        : '—'}
                    </td>
                    <td className="py-1.5 text-[var(--ink3)]">
                      {m.supplier_id != null ? (supplierMap.get(m.supplier_id)?.name || '—') : '—'}
                    </td>
                    <td className="py-1.5 text-[var(--ink3)]">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
