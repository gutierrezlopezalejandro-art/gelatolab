import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

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
