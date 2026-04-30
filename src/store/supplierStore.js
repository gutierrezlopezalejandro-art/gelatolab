import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

/**
 * Catalogo global de proveedores. Reusables entre ingredientes para no repetir
 * datos de contacto. Cada movimiento de inventario tipo 'in' puede referenciar
 * un supplier_id, y cada ingrediente puede tener un default_supplier_id.
 *
 * Forma: { id, name, contact, phone, email, lead_time_days, notes, created_at }.
 */
export const useSupplierStore = create(
  persist(
    (set, get) => ({
      suppliers: [],
      nextId: 1,

      list() {
        return [...get().suppliers].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
      },

      get(id) {
        if (id == null) return null;
        return get().suppliers.find(s => s.id === Number(id)) || null;
      },

      create(data) {
        const id = get().nextId;
        const supplier = {
          id,
          name: (data.name || '').trim(),
          contact: data.contact || '',
          phone: data.phone || '',
          email: data.email || '',
          lead_time_days: data.lead_time_days != null ? Number(data.lead_time_days) : null,
          notes: data.notes || '',
          created_at: new Date().toISOString(),
        };
        if (!supplier.name) return null;
        set(s => ({ suppliers: [...s.suppliers, supplier], nextId: id + 1 }));
        return supplier;
      },

      update(id, patch) {
        set(s => ({
          suppliers: s.suppliers.map(sup =>
            sup.id === Number(id) ? { ...sup, ...patch } : sup
          ),
        }));
      },

      remove(id) {
        set(s => ({ suppliers: s.suppliers.filter(sup => sup.id !== Number(id)) }));
      },

      clear() {
        set({ suppliers: [], nextId: 1 });
      },
    }),
    { name: 'gelatolab-suppliers', storage: createJSONStorage(() => idbStorage) }
  )
);
