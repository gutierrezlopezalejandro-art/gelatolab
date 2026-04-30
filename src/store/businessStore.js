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
      machine_id:       '',      // mantecadora preferida (warning si batch fuera de rango)
      pin_hash:         '',      // PIN para gatear el guardado de recetas (vacio = sin proteccion)

      update: (patch) => set((s) => ({ ...s, ...patch })),
      complete: () => set({ completed: true }),
      reset: () => set({
        completed: false, fantasy_name: '', legal_name: '', tax_id: '',
        sanitary_reg: '', address: '', contact_phone: '', contact_email: '', machine_id: '', pin_hash: '',
      }),
    }),
    { name: 'gelatolab-business', storage: createJSONStorage(() => idbStorage) }
  )
);
