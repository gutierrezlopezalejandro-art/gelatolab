import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import { useIngredientStore } from './ingredientStore';
import { useProductionStore } from './productionStore';

/**
 * Inventory movements log + helpers to mutate ingredient stock atomically.
 *
 * Each movement is { id, ingredient_id, type, qty_g, balance_after, date, notes, created_at }.
 *   - type 'in'         : entrada de stock (compra, ajuste positivo)
 *   - type 'out'        : salida de stock (uso en producción, merma)
 *   - type 'adjustment' : corrección manual del saldo
 *
 * `qty_g` is always positive; the `type` determines the sign.
 */
export const useInventoryStore = create(
  persist(
    (set, get) => ({
      movements: [],
      nextId: 1,
      // Historial de conteos fisicos (stocktakes). Cada entry guarda el
      // snapshot completo con lo esperado vs contado por ingrediente, asi
      // queda auditoria aunque despues los stocks cambien.
      stocktakes: [],
      nextStockId: 1,

      list(filter = {}) {
        let items = get().movements;
        if (filter.ingredient_id != null) {
          items = items.filter(m => m.ingredient_id === Number(filter.ingredient_id));
        }
        return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      },

      // Records a movement and updates the corresponding ingredient stock.
      // Returns the created movement (with new balance).
      // Para movimientos 'in' se pueden capturar `unit_cost_per_kg` (precio
      // unitario en la moneda local) y `supplier_id` para historial de costos
      // y trazabilidad de proveedor. Solo se guardan si type==='in'.
      record({ ingredient_id, type, qty_g, notes = '', date = null, unit_cost_per_kg = null, supplier_id = null }) {
        const ing = useIngredientStore.getState().get(ingredient_id);
        if (!ing) return null;
        const q = Math.abs(parseFloat(qty_g) || 0);
        if (q === 0) return null;

        const currentStock = parseFloat(ing.stock_g) || 0;
        let nextStock;
        if (type === 'in') nextStock = currentStock + q;
        else if (type === 'out') nextStock = currentStock - q;
        else nextStock = q; // adjustment: q is the new absolute balance

        useIngredientStore.getState().update(ingredient_id, { stock_g: nextStock });

        const now = new Date();
        const movement = {
          id: get().nextId,
          ingredient_id: Number(ingredient_id),
          type,
          qty_g: q,
          balance_after: nextStock,
          date: date || now.toISOString().slice(0, 10),
          notes,
          created_at: now.toISOString(),
        };
        if (type === 'in') {
          const cost = parseFloat(unit_cost_per_kg);
          if (Number.isFinite(cost) && cost > 0) movement.unit_cost_per_kg = cost;
          if (supplier_id != null && supplier_id !== '') {
            movement.supplier_id = Number(supplier_id);
          }
        }
        set(s => ({ movements: [...s.movements, movement], nextId: s.nextId + 1 }));
        return movement;
      },

      // Bulk record multiple outputs (used when confirming production).
      // All movements share the same date and notes (e.g. lote ref).
      recordBatch(outputs, { date, notes } = {}) {
        for (const { ingredient_id, qty_g } of outputs) {
          if (!ingredient_id || !qty_g) continue;
          get().record({ ingredient_id, type: 'out', qty_g, date, notes });
        }
      },

      // Remove all movements that reference the given lote string in notes.
      // Used when a production batch is deleted, to roll back the stock.
      removeByLoteRef(loteStr) {
        const toUndo = get().movements.filter(m => m.notes?.includes(loteStr));
        // Reverse each (reapply opposite sign)
        for (const m of toUndo) {
          const ing = useIngredientStore.getState().get(m.ingredient_id);
          if (!ing) continue;
          const currentStock = parseFloat(ing.stock_g) || 0;
          const restored = m.type === 'out' ? currentStock + m.qty_g
                         : m.type === 'in'  ? currentStock - m.qty_g
                         : currentStock;
          useIngredientStore.getState().update(m.ingredient_id, { stock_g: restored });
        }
        set(s => ({ movements: s.movements.filter(m => !m.notes?.includes(loteStr)) }));
        return toUndo.length;
      },

      // Guarda un conteo fisico y aplica un 'adjustment' por cada linea con
      // diferencia. lines: [{ ingredient_id, expected_g, counted_g }].
      recordStocktake({ date = null, lines = [], notes = '' } = {}) {
        const today = date || new Date().toISOString().slice(0, 10);
        const id = get().nextStockId;
        const ref = `STK-${String(id).padStart(4, '0')}`;
        const persistedLines = [];
        for (const line of lines) {
          const counted = parseFloat(line.counted_g);
          if (!Number.isFinite(counted) || counted < 0) continue;
          const expected = parseFloat(line.expected_g) || 0;
          const diff = counted - expected;
          persistedLines.push({
            ingredient_id: Number(line.ingredient_id),
            expected_g: expected,
            counted_g: counted,
            diff_g: diff,
          });
          if (Math.abs(diff) > 0.01) {
            // Ajusta a la cantidad real contada.
            get().record({
              ingredient_id: line.ingredient_id,
              type: 'adjustment',
              qty_g: counted,
              date: today,
              notes: `${ref}${notes ? ' — ' + notes : ''}`,
            });
          }
        }
        const stocktake = {
          id, ref, date: today, notes,
          lines: persistedLines,
          created_at: new Date().toISOString(),
        };
        set(s => ({ stocktakes: [stocktake, ...s.stocktakes], nextStockId: s.nextStockId + 1 }));
        return stocktake;
      },

      clear() {
        set({ movements: [], nextId: 1, stocktakes: [], nextStockId: 1 });
      },
    }),
    { name: 'gelatolab-inventory', storage: createJSONStorage(() => idbStorage) }
  )
);

/**
 * Apply inventory deductions for any production entry whose date has arrived
 * (prod_date <= today) and that hasn't been deducted yet.
 *
 * Idempotent: marking an entry as deducted prevents re-processing on later
 * runs, even if the helper is invoked many times per session.
 *
 * Returns the number of entries processed (useful for toasts).
 */
export function processDueInventoryDeductions() {
  const today = new Date().toISOString().slice(0, 10);
  const entries = useProductionStore.getState().log
    .filter(e => !e.inventory_deducted_at && String(e.prod_date).slice(0, 10) <= today);
  if (entries.length === 0) return 0;

  const record = useInventoryStore.getState().record;
  const markDeducted = useProductionStore.getState().markDeducted;

  for (const e of entries) {
    const outputs = (e.ingredients_snapshot || [])
      .filter(i => i.ingredient_id && i.batch_g > 0)
      .map(i => ({ ingredient_id: i.ingredient_id, qty_g: i.batch_g }));
    for (const o of outputs) {
      record({ ingredient_id: o.ingredient_id, type: 'out', qty_g: o.qty_g, date: e.prod_date, notes: e.lote_str });
    }
    markDeducted(e.id);
  }
  return entries.length;
}

/**
 * Devuelve el ultimo movimiento 'in' con unit_cost_per_kg para el ingrediente.
 * Si no hay registros con costo, devuelve null. Util para mostrar el precio
 * actual en la lista de ingredientes.
 */
export function getLatestCost(ingredient_id) {
  const movs = useInventoryStore.getState().movements;
  const ingId = Number(ingredient_id);
  // movements esta acumulado por nextId asc. El mas reciente es el ultimo.
  for (let i = movs.length - 1; i >= 0; i--) {
    const m = movs[i];
    if (m.ingredient_id === ingId && m.type === 'in' && Number.isFinite(m.unit_cost_per_kg)) {
      return { unit_cost_per_kg: m.unit_cost_per_kg, date: m.date, movement_id: m.id };
    }
  }
  return null;
}

/**
 * Historial de costos para un ingrediente: array {date, cost, qty_g} ordenado
 * cronologicamente (mas viejo primero) para graficar evolucion de precio.
 */
export function getCostHistory(ingredient_id) {
  const movs = useInventoryStore.getState().movements;
  const ingId = Number(ingredient_id);
  return movs
    .filter(m => m.ingredient_id === ingId && m.type === 'in' && Number.isFinite(m.unit_cost_per_kg))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(m => ({
      date: m.date,
      unit_cost_per_kg: m.unit_cost_per_kg,
      qty_g: m.qty_g,
      supplier_id: m.supplier_id || null,
    }));
}

/**
 * Estadisticas de costo para un ingrediente: ultimo, minimo, maximo, promedio
 * ponderado por cantidad. Devuelve null si no hay datos de costo.
 */
export function getCostStats(ingredient_id) {
  const hist = getCostHistory(ingredient_id);
  if (hist.length === 0) return null;
  let totalCost = 0;
  let totalKg = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const h of hist) {
    const kg = h.qty_g / 1000;
    totalCost += h.unit_cost_per_kg * kg;
    totalKg += kg;
    if (h.unit_cost_per_kg < min) min = h.unit_cost_per_kg;
    if (h.unit_cost_per_kg > max) max = h.unit_cost_per_kg;
  }
  const last = hist[hist.length - 1];
  const first = hist[0];
  return {
    latest: last.unit_cost_per_kg,
    latest_date: last.date,
    first: first.unit_cost_per_kg,
    first_date: first.date,
    min,
    max,
    avg_weighted: totalKg > 0 ? totalCost / totalKg : null,
    samples: hist.length,
    total_invested: totalCost,
    total_kg_received: totalKg,
  };
}

/**
 * Returns the list of ingredients with stock_g <= min_stock_g (and min > 0).
 * Used by the Dashboard alert and the nav badge.
 */
export function getLowStock(ingredients) {
  return ingredients.filter(i => {
    const min = parseFloat(i.min_stock_g) || 0;
    if (min <= 0) return false;
    const stock = parseFloat(i.stock_g) || 0;
    return stock <= min;
  });
}
