import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import defaultIngredients from '../data/ingredients.json';

export const useIngredientStore = create(
  persist(
    (set, get) => ({
      ingredients: defaultIngredients,
      nextId: defaultIngredients.length + 1,

      list(filters = {}) {
        let items = get().ingredients;
        if (filters.category) items = items.filter(i => i.category === filters.category);
        if (filters.q) {
          const q = filters.q.toLowerCase();
          items = items.filter(i => i.name.toLowerCase().includes(q));
        }
        return items;
      },

      get(id) {
        return get().ingredients.find(i => i.id === Number(id));
      },

      categories() {
        return [...new Set(get().ingredients.map(i => i.category))].sort();
      },

      create(data) {
        const id = get().nextId;
        const ing = { ...data, id, is_custom: true };
        set(s => ({ ingredients: [...s.ingredients, ing], nextId: id + 1 }));
        return ing;
      },

      update(id, data) {
        set(s => ({
          ingredients: s.ingredients.map(i => i.id === Number(id) ? { ...i, ...data } : i),
        }));
      },

      remove(id) {
        set(s => ({
          ingredients: s.ingredients.filter(i => i.id !== Number(id)),
        }));
      },

      importBulk(rows) {
        set(s => {
          let nextId = s.nextId;
          const existing = new Map(s.ingredients.map(i => [i.name.toLowerCase(), i]));
          const updated = [...s.ingredients];

          for (const row of rows) {
            const key = row.name?.toLowerCase();
            if (!key) continue;
            if (existing.has(key)) {
              const idx = updated.findIndex(i => i.name.toLowerCase() === key);
              if (idx >= 0) updated[idx] = { ...updated[idx], ...row };
            } else {
              updated.push({ ...row, id: nextId++, is_custom: true });
            }
          }
          return { ingredients: updated, nextId };
        });
      },

      reset() {
        set({ ingredients: defaultIngredients, nextId: defaultIngredients.length + 1 });
      },
    }),
    { name: 'heladeria-ingredients', storage: createJSONStorage(() => idbStorage) }
  )
);
