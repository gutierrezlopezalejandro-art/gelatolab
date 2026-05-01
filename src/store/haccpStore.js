import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

/**
 * Registro HACCP (Hazard Analysis Critical Control Points). Bitacora de
 * chequeos sanitarios diarios: temperaturas de camaras y mantenedoras,
 * pasteurizacion, recepcion de materias primas, limpieza. Cada entry queda
 * sellada con timestamp + operador para auditoria.
 *
 * Forma de cada entry:
 *   { id, date, time, type, location, value, unit, status, operator, notes, created_at }
 * type: 'cold_storage' | 'freezer' | 'pasteurization' | 'churning' | 'reception' | 'cleaning' | 'other'
 * status: 'ok' | 'warn' | 'fail'  (auto-derivado de thresholds segun type+value)
 */

// Umbrales tipicos para heladeria/gelateria. Si valor cae fuera, status='fail';
// si esta cerca del limite, 'warn'; si esta en zona segura, 'ok'. Para cleaning
// y reception no hay numeros: el operador setea status manualmente.
const THRESHOLDS = {
  cold_storage: { unit: '°C', okMax: 4, warnMax: 7, direction: 'lower_better' },
  freezer:      { unit: '°C', okMax: -18, warnMax: -15, direction: 'lower_better' },
  // Pasteurizacion: en LTLT minimo 65°C, HTST minimo 80°C. Usamos 65°C como
  // threshold conservador; el operador puede registrar el modo en notas.
  pasteurization: { unit: '°C', okMin: 65, warnMin: 60, direction: 'higher_better' },
  // Mantecacion (churning): temperatura de extraccion del producto. Tiene que
  // salir suficientemente frio para evitar fundido y pasaje por la "zona de
  // peligro" (>0 C). Limite practico: <= -5 C ok, -5 a -3 warn, > -3 fail.
  churning: { unit: '°C', okMax: -5, warnMax: -3, direction: 'lower_better' },
  // Recepcion: temperaturas tipicas. Pero como hay refrigerado y congelado,
  // dejamos al operador setear status. Solo guardamos valor referencial.
  reception: { unit: '°C' },
  cleaning:  { unit: '' },
  other:     { unit: '' },
};

export function deriveStatus(type, value) {
  const t = THRESHOLDS[type];
  if (!t) return 'ok';
  if (t.direction === 'lower_better') {
    if (value <= t.okMax) return 'ok';
    if (value <= t.warnMax) return 'warn';
    return 'fail';
  }
  if (t.direction === 'higher_better') {
    if (value >= t.okMin) return 'ok';
    if (value >= t.warnMin) return 'warn';
    return 'fail';
  }
  return 'ok'; // sin auto-threshold (cleaning, reception, other)
}

export function getDefaultUnit(type) {
  return THRESHOLDS[type]?.unit ?? '';
}

export const useHaccpStore = create(
  persist(
    (set, get) => ({
      entries: [],
      nextId: 1,

      list({ from = null, to = null, type = null } = {}) {
        let items = get().entries;
        if (type) items = items.filter(e => e.type === type);
        if (from) items = items.filter(e => e.date >= from);
        if (to) items = items.filter(e => e.date <= to);
        return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      },

      add(data) {
        const id = get().nextId;
        const now = new Date();
        const date = data.date || now.toISOString().slice(0, 10);
        const time = data.time || now.toTimeString().slice(0, 5);
        const value = data.value != null && data.value !== ''
          ? parseFloat(data.value)
          : null;
        // Status: si llega explicit lo respetamos; si hay value numerico,
        // auto-derivamos; sino 'ok'.
        let status = data.status;
        if (!status) {
          status = Number.isFinite(value)
            ? deriveStatus(data.type, value)
            : 'ok';
        }
        const entry = {
          id,
          date,
          time,
          type: data.type || 'other',
          location: (data.location || '').trim(),
          value: Number.isFinite(value) ? value : null,
          unit: data.unit || getDefaultUnit(data.type),
          status,
          operator: (data.operator || '').trim(),
          notes: (data.notes || '').trim(),
          created_at: now.toISOString(),
        };
        set(s => ({ entries: [...s.entries, entry], nextId: id + 1 }));
        return entry;
      },

      remove(id) {
        set(s => ({ entries: s.entries.filter(e => e.id !== Number(id)) }));
      },

      clear() {
        set({ entries: [], nextId: 1 });
      },
    }),
    { name: 'gelatolab-haccp', storage: createJSONStorage(() => idbStorage) }
  )
);

/**
 * Resumen del dia: cuantos checks ok/warn/fail tuvo. Para mostrar en
 * dashboard o el header de la pagina HACCP.
 */
export function getDailySummary(date) {
  const entries = useHaccpStore.getState().entries.filter(e => e.date === date);
  const total = entries.length;
  const ok = entries.filter(e => e.status === 'ok').length;
  const warn = entries.filter(e => e.status === 'warn').length;
  const fail = entries.filter(e => e.status === 'fail').length;
  return { total, ok, warn, fail };
}
