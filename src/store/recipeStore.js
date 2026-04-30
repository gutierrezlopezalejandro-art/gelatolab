import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import defaultRecipes from '../data/recipes.json';

export const useRecipeStore = create(
  persist(
    (set, get) => ({
      recipes: defaultRecipes,
      nextId: defaultRecipes.length + 1,

      list(filters = {}) {
        let items = get().recipes;
        if (filters.type) items = items.filter(r => r.type === filters.type);
        if (filters.q) {
          const q = filters.q.toLowerCase();
          items = items.filter(r => r.name.toLowerCase().includes(q));
        }
        return items;
      },

      get(id) {
        return get().recipes.find(r => r.id === Number(id));
      },

      create(payload) {
        const id = get().nextId;
        const recipe = {
          ...payload,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set(s => ({ recipes: [...s.recipes, recipe], nextId: id + 1 }));
        return recipe;
      },

      update(id, payload) {
        set(s => ({
          recipes: s.recipes.map(r =>
            r.id === Number(id)
              ? { ...r, ...payload, updated_at: new Date().toISOString() }
              : r
          ),
        }));
      },

      remove(id) {
        set(s => ({ recipes: s.recipes.filter(r => r.id !== Number(id)) }));
      },

      duplicate(id) {
        const orig = get().get(id);
        if (!orig) return null;
        const { id: _, created_at, updated_at, ...rest } = orig;
        return get().create({ ...rest, name: `${orig.name} (copia)` });
      },
    }),
    {
      name: 'heladeria-recipes',
      storage: createJSONStorage(() => idbStorage),
      merge: (persisted, current) => {
        // Si localStorage tiene recetas, usarlas; si está vacío, cargar las default
        if (persisted && persisted.recipes && persisted.recipes.length > 0) {
          return { ...current, ...persisted };
        }
        return current; // usa defaultRecipes
      },
    }
  )
);
