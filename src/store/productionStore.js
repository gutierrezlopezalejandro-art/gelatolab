import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

/**
 * Dedupe por COUNT (no por presencia) entre `orders` (lo que el usuario
 * tiene en el plan) y `existingEntries` (lotes ya creados para esa fecha).
 *
 * Devuelve `{ newOrders, skipped }` donde:
 *   - `newOrders` es el subconjunto de `orders` que requieren crear lote nuevo
 *   - `skipped` es cuántas orders ya están "cubiertas" por lotes existentes
 *
 * Ejemplo: 2 orders de receta A + 1 lote A existente → newOrders tiene 1
 * order de A (la 2da), skipped = 1.
 *
 * Esto cubre todos los casos del re-confirmar plan:
 *   - Sin cambios:                    skipped = N, newOrders = []
 *   - Agregar receta nueva:           skipped = N-1, newOrders = [nueva]
 *   - Agregar 2do batch del mismo sabor: skipped = N-1, newOrders = [batch nuevo]
 *
 * Bug histórico (regresión 2026-05-08, ver docs/decisiones.md):
 *   v1: addEntries siempre agregaba todo → duplicaba al re-confirmar
 *   v2: dedupe por presencia (Set de recipe_ids) → bloqueaba 2do batch
 *   v3 (actual): dedupe por count → cubre todos los casos correctamente
 *
 * Tests en productionStore.test.js validan los 4 escenarios.
 */
export function dedupePlanOrders(orders, existingEntries) {
  const remaining = {};
  for (const e of existingEntries) {
    const rid = Number(e.recipe_id);
    remaining[rid] = (remaining[rid] || 0) + 1;
  }
  const newOrders = [];
  for (const o of orders) {
    const rid = Number(o.recipe_id);
    if ((remaining[rid] || 0) > 0) {
      remaining[rid] -= 1;
    } else {
      newOrders.push(o);
    }
  }
  return { newOrders, skipped: orders.length - newOrders.length };
}

export const useProductionStore = create(
  persist(
    (set, get) => ({
      log: [],
      nextId: 1,
      nextLote: 1,

      list(filters = {}) {
        let items = get().log;
        if (filters.from) items = items.filter(e => e.prod_date >= filters.from);
        if (filters.to)   items = items.filter(e => e.prod_date <= filters.to);
        return items.sort((a, b) => b.prod_date.localeCompare(a.prod_date) || b.lote_num - a.lote_num);
      },

      // ⚠ INVARIANTE IMPORTANTE: el caller es responsable de NO pasar entries
      // que dupliquen (recipe_id, prod_date) ya existentes en el log.
      // addEntries() NO deduplica — siempre crea entries nuevas con nuevo
      // id/lote_num. Si el caller pasa la misma combinación 2 veces,
      // crea 2 lotes distintos.
      //
      // Bug histórico (regresión 2026-05-08): ProductionPlan.handleConfirm
      // no chequeaba duplicados. Si el plan ya estaba confirmado y el user
      // agregaba 1 receta nueva, al confirmar se duplicaban TODAS las
      // recetas pre-existentes del plan. Fix: en handleConfirm filtrar
      // enriched contra el log para esa fecha antes de mapear a entries.
      // Si modifican esta función o sus callers, MANTENER el dedupe en el
      // caller, no acá adentro (esto es un agregador puro).
      addEntries(entries) {
        set(s => {
          let nextId = s.nextId;
          let nextLote = s.nextLote;
          const newEntries = entries.map(e => {
            const id = nextId++;
            const lote_num = nextLote++;
            const year = new Date().getFullYear();
            const lote_str = `${year}-HEL-${String(lote_num).padStart(4, '0')}`;
            // inventory_deducted_at: null until prod_date arrives and the
            // scheduled deduction runs. See processDueInventoryDeductions.
            return { ...e, id, lote_num, lote_str, inventory_deducted_at: null, created_at: new Date().toISOString() };
          });
          return { log: [...s.log, ...newEntries], nextId, nextLote };
        });
      },

      markDeducted(id, when = new Date().toISOString()) {
        set(s => ({
          log: s.log.map(e => e.id === Number(id) ? { ...e, inventory_deducted_at: when } : e),
        }));
      },

      update(id, data) {
        set(s => ({
          log: s.log.map(e => e.id === Number(id) ? { ...e, ...data } : e),
        }));
      },

      remove(id) {
        set(s => ({ log: s.log.filter(e => e.id !== Number(id)) }));
      },

      // Compare dates by their YYYY-MM-DD prefix only — some legacy entries
      // may have stored ISO datetimes (e.g. "2026-04-26T12:00:00") and a
      // strict === comparison would miss them.
      removeByDate(date) {
        const target = String(date).slice(0, 10);
        const removed = get().log.filter(e => String(e.prod_date).slice(0, 10) === target).length;
        set(s => ({ log: s.log.filter(e => String(e.prod_date).slice(0, 10) !== target) }));
        return removed;
      },

      getByDate(date) {
        const target = String(date).slice(0, 10);
        return get().log.filter(e => String(e.prod_date).slice(0, 10) === target);
      },

      monthlyStats(yearMonth) {
        const entries = get().log.filter(e => e.prod_date.startsWith(yearMonth));
        return {
          count: entries.length,
          liters: entries.reduce((s, e) => s + (e.liters || 0), 0),
          cost: entries.reduce((s, e) => s + (e.cost || 0), 0),
        };
      },
    }),
    { name: 'heladeria-production', storage: createJSONStorage(() => idbStorage) }
  )
);
