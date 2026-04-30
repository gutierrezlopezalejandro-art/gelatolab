import { describe, it, expect, beforeEach } from 'vitest';
import { useSupplierStore } from './supplierStore';

describe('useSupplierStore', () => {
  beforeEach(() => {
    useSupplierStore.getState().clear();
  });

  describe('create', () => {
    it('creates a supplier with trimmed name and assigns sequential id', () => {
      const a = useSupplierStore.getState().create({ name: '  Lacteos Sur  ' });
      const b = useSupplierStore.getState().create({ name: 'Distribuidora Norte' });
      expect(a.name).toBe('Lacteos Sur');
      expect(b.id).toBe(a.id + 1);
    });

    it('returns null and does not persist when name is empty', () => {
      expect(useSupplierStore.getState().create({ name: '' })).toBeNull();
      expect(useSupplierStore.getState().create({ name: '   ' })).toBeNull();
      expect(useSupplierStore.getState().suppliers).toHaveLength(0);
    });

    it('captures created_at and optional fields', () => {
      const s = useSupplierStore.getState().create({
        name: 'Test',
        contact: 'Juan',
        phone: '+56 9 1111',
        email: 'juan@test.cl',
        lead_time_days: 5,
        notes: 'Entrega martes y jueves',
      });
      expect(s.contact).toBe('Juan');
      expect(s.phone).toBe('+56 9 1111');
      expect(s.email).toBe('juan@test.cl');
      expect(s.lead_time_days).toBe(5);
      expect(s.notes).toBe('Entrega martes y jueves');
      expect(typeof s.created_at).toBe('string');
    });

    it('coerces lead_time_days to a number', () => {
      const s = useSupplierStore.getState().create({ name: 'Test', lead_time_days: '7' });
      expect(s.lead_time_days).toBe(7);
    });

    it('keeps lead_time_days null when not provided', () => {
      const s = useSupplierStore.getState().create({ name: 'Test' });
      expect(s.lead_time_days).toBeNull();
    });
  });

  describe('list', () => {
    it('returns suppliers sorted alphabetically by name', () => {
      const store = useSupplierStore.getState();
      store.create({ name: 'Carlos' });
      store.create({ name: 'Ana' });
      store.create({ name: 'Beatriz' });
      const sorted = store.list().map(s => s.name);
      expect(sorted).toEqual(['Ana', 'Beatriz', 'Carlos']);
    });

    it('does not mutate the underlying array', () => {
      useSupplierStore.getState().create({ name: 'B' });
      useSupplierStore.getState().create({ name: 'A' });
      const sorted = useSupplierStore.getState().list();
      // Insertion order preserved in the raw store, sort applied only in list().
      expect(useSupplierStore.getState().suppliers.map(s => s.name)).toEqual(['B', 'A']);
      expect(sorted.map(s => s.name)).toEqual(['A', 'B']);
    });
  });

  describe('get', () => {
    it('returns the supplier by numeric id', () => {
      const a = useSupplierStore.getState().create({ name: 'Test' });
      expect(useSupplierStore.getState().get(a.id)).toEqual(a);
    });

    it('coerces string ids', () => {
      const a = useSupplierStore.getState().create({ name: 'Test' });
      expect(useSupplierStore.getState().get(String(a.id))).toEqual(a);
    });

    it('returns null for missing or null id', () => {
      expect(useSupplierStore.getState().get(null)).toBeNull();
      expect(useSupplierStore.getState().get(undefined)).toBeNull();
      expect(useSupplierStore.getState().get(9999)).toBeNull();
    });
  });

  describe('update', () => {
    it('updates fields without touching id/created_at', () => {
      const a = useSupplierStore.getState().create({ name: 'Test', phone: '111' });
      useSupplierStore.getState().update(a.id, { phone: '222', notes: 'cambio' });
      const fresh = useSupplierStore.getState().get(a.id);
      expect(fresh.phone).toBe('222');
      expect(fresh.notes).toBe('cambio');
      expect(fresh.id).toBe(a.id);
      expect(fresh.created_at).toBe(a.created_at);
    });

    it('does nothing for unknown id', () => {
      const a = useSupplierStore.getState().create({ name: 'Test' });
      useSupplierStore.getState().update(9999, { phone: 'x' });
      expect(useSupplierStore.getState().get(a.id).phone).not.toBe('x');
    });
  });

  describe('remove', () => {
    it('drops the supplier with the given id', () => {
      const a = useSupplierStore.getState().create({ name: 'A' });
      const b = useSupplierStore.getState().create({ name: 'B' });
      useSupplierStore.getState().remove(a.id);
      expect(useSupplierStore.getState().suppliers).toHaveLength(1);
      expect(useSupplierStore.getState().suppliers[0].id).toBe(b.id);
    });
  });

  describe('clear', () => {
    it('empties the list and resets nextId', () => {
      const store = useSupplierStore.getState();
      store.create({ name: 'A' });
      store.create({ name: 'B' });
      store.clear();
      expect(store.suppliers).toHaveLength(0);
      // El siguiente create debe usar id 1 otra vez
      const fresh = store.create({ name: 'New' });
      expect(fresh.id).toBe(1);
    });
  });
});
