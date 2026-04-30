import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

export const usePlanStore = create(
  persist(
    (set, get) => ({
      plans: {},

      get(date) {
        return get().plans[date] || null;
      },

      list() {
        return Object.entries(get().plans)
          .map(([date, plan]) => ({ ...plan, plan_date: date }))
          .sort((a, b) => b.plan_date.localeCompare(a.plan_date));
      },

      upsert(date, plan) {
        set(s => ({
          plans: { ...s.plans, [date]: { ...plan, plan_date: date, updated_at: new Date().toISOString() } },
        }));
      },

      remove(date) {
        set(s => {
          const { [date]: _, ...rest } = s.plans;
          return { plans: rest };
        });
      },
    }),
    { name: 'heladeria-plans', storage: createJSONStorage(() => idbStorage) }
  )
);
