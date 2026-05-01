import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

/**
 * Business / heladería profile. Captured during the first-run wizard, then
 * editable from settings. Shown in the navbar banner and on every printable
 * label (legal requirement in most LATAM countries).
 */
export const useBusinessStore = create(
  persist(
    (set) => ({
      completed:        false,   // wizard finished at least once
      fantasy_name:     '',      // commercial / brand name (e.g. "Heladería Huillín")
      legal_name:       '',      // razón social / razão social
      tax_id:           '',      // RUT / CUIT / RFC / CNPJ / RUC / NIT / etc.
      sanitary_reg:     '',      // INVIMA / DIGESA / SIF / etc. (optional)
      address:          '',      // street + city (optional)
      contact_phone:    '',      // optional
      contact_email:    '',      // optional
      // Equipment fleet. Arrays de ids para soportar mas de una mantecadora /
      // pasteurizador. Se mantiene `machine_id` y `pasteurizer_id` como
      // alias (siempre el primer elemento del array) para compatibilidad con
      // datos antiguos persistidos. La migracion ocurre en onRehydrateStorage.
      machine_ids:      [],     // ids de mantecadores y combos configurados
      pasteurizer_ids:  [],     // ids de pasteurizadores y combos configurados
      machine_id:       '',     // [DEPRECATED] alias = machine_ids[0]
      pasteurizer_id:   '',     // [DEPRECATED] alias = pasteurizer_ids[0]
      pin_hash:         '',     // PIN para gatear el guardado de recetas (vacio = sin proteccion)

      update: (patch) => set((s) => {
        const next = { ...s, ...patch };
        // Mantener alias legacy sincronizados con la primera entrada del array.
        if (patch.machine_ids != null)     next.machine_id     = patch.machine_ids[0]     || '';
        if (patch.pasteurizer_ids != null) next.pasteurizer_id = patch.pasteurizer_ids[0] || '';
        return next;
      }),
      complete: () => set({ completed: true }),
      reset: () => set({
        completed: false, fantasy_name: '', legal_name: '', tax_id: '',
        sanitary_reg: '', address: '', contact_phone: '', contact_email: '',
        machine_ids: [], pasteurizer_ids: [], machine_id: '', pasteurizer_id: '', pin_hash: '',
      }),
    }),
    {
      name: 'gelatolab-business',
      storage: createJSONStorage(() => idbStorage),
      // Migracion: si hay machine_id / pasteurizer_id (string) pero los arrays
      // estan vacios, los promovemos al array. Asi usuarios existentes no
      // pierden su seleccion al actualizar a multi-equipment.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if ((!state.machine_ids || state.machine_ids.length === 0) && state.machine_id) {
          state.machine_ids = [state.machine_id];
        }
        if ((!state.pasteurizer_ids || state.pasteurizer_ids.length === 0) && state.pasteurizer_id) {
          state.pasteurizer_ids = [state.pasteurizer_id];
        }
        if (!Array.isArray(state.machine_ids))     state.machine_ids = [];
        if (!Array.isArray(state.pasteurizer_ids)) state.pasteurizer_ids = [];
      },
    }
  )
);
