import { describe, it, expect, beforeEach } from 'vitest';
import { useHaccpStore, deriveStatus, getDefaultUnit, getDailySummary } from './haccpStore';

describe('deriveStatus', () => {
  it('cold_storage: ≤4 → ok, 4-7 → warn, >7 → fail', () => {
    expect(deriveStatus('cold_storage', 2)).toBe('ok');
    expect(deriveStatus('cold_storage', 4)).toBe('ok');
    expect(deriveStatus('cold_storage', 5)).toBe('warn');
    expect(deriveStatus('cold_storage', 7)).toBe('warn');
    expect(deriveStatus('cold_storage', 9)).toBe('fail');
  });

  it('freezer: ≤-18 → ok, -18 to -15 → warn, >-15 → fail', () => {
    expect(deriveStatus('freezer', -22)).toBe('ok');
    expect(deriveStatus('freezer', -18)).toBe('ok');
    expect(deriveStatus('freezer', -16)).toBe('warn');
    expect(deriveStatus('freezer', -15)).toBe('warn');
    expect(deriveStatus('freezer', -10)).toBe('fail');
  });

  it('pasteurization: ≥65 → ok, 60-65 → warn, <60 → fail', () => {
    expect(deriveStatus('pasteurization', 80)).toBe('ok');
    expect(deriveStatus('pasteurization', 65)).toBe('ok');
    expect(deriveStatus('pasteurization', 62)).toBe('warn');
    expect(deriveStatus('pasteurization', 60)).toBe('warn');
    expect(deriveStatus('pasteurization', 50)).toBe('fail');
  });

  it('returns ok for types without thresholds (cleaning, reception, other)', () => {
    expect(deriveStatus('cleaning', 0)).toBe('ok');
    expect(deriveStatus('reception', 5)).toBe('ok');
    expect(deriveStatus('other', 999)).toBe('ok');
  });

  it('returns ok for unknown type', () => {
    expect(deriveStatus('foo', 10)).toBe('ok');
  });
});

describe('getDefaultUnit', () => {
  it('returns °C for temperature types', () => {
    expect(getDefaultUnit('cold_storage')).toBe('°C');
    expect(getDefaultUnit('freezer')).toBe('°C');
    expect(getDefaultUnit('pasteurization')).toBe('°C');
    expect(getDefaultUnit('reception')).toBe('°C');
  });

  it('returns empty string for unitless types', () => {
    expect(getDefaultUnit('cleaning')).toBe('');
    expect(getDefaultUnit('other')).toBe('');
  });

  it('returns empty string for unknown type', () => {
    expect(getDefaultUnit('foo')).toBe('');
  });
});

describe('useHaccpStore.add', () => {
  beforeEach(() => {
    useHaccpStore.getState().clear();
  });

  it('creates an entry with auto-derived status from value', () => {
    const e = useHaccpStore.getState().add({
      type: 'cold_storage', value: '3', operator: 'Ana',
    });
    expect(e.status).toBe('ok');
    expect(e.value).toBe(3);
    expect(e.unit).toBe('°C');
    expect(e.type).toBe('cold_storage');
    expect(e.operator).toBe('Ana');
  });

  it('auto-fails high cold-storage temp', () => {
    const e = useHaccpStore.getState().add({
      type: 'cold_storage', value: '10', operator: 'Ana',
    });
    expect(e.status).toBe('fail');
  });

  it('respects explicit status override', () => {
    const e = useHaccpStore.getState().add({
      type: 'cold_storage', value: '2', operator: 'Ana', status: 'fail',
    });
    expect(e.status).toBe('fail'); // overridden, even though 2°C would auto-derive ok
  });

  it('uses ok status when no value and no override', () => {
    const e = useHaccpStore.getState().add({
      type: 'cleaning', operator: 'Ana', notes: 'Mesas y utensilios',
    });
    expect(e.status).toBe('ok');
    expect(e.value).toBeNull();
  });

  it('assigns sequential ids', () => {
    const a = useHaccpStore.getState().add({ type: 'cleaning', operator: 'A' });
    const b = useHaccpStore.getState().add({ type: 'cleaning', operator: 'A' });
    const c = useHaccpStore.getState().add({ type: 'cleaning', operator: 'A' });
    expect(b.id).toBe(a.id + 1);
    expect(c.id).toBe(b.id + 1);
  });

  it('captures created_at timestamp', () => {
    const before = new Date().toISOString();
    const e = useHaccpStore.getState().add({ type: 'cleaning', operator: 'A' });
    expect(e.created_at >= before).toBe(true);
  });

  it('uses today as default date and HH:mm as default time', () => {
    const e = useHaccpStore.getState().add({ type: 'cleaning', operator: 'A' });
    expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(e.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('respects explicit date/time', () => {
    const e = useHaccpStore.getState().add({
      type: 'cleaning', operator: 'A', date: '2024-01-15', time: '08:30',
    });
    expect(e.date).toBe('2024-01-15');
    expect(e.time).toBe('08:30');
  });

  it('trims operator/location/notes', () => {
    const e = useHaccpStore.getState().add({
      type: 'other', operator: '  Ana  ', location: '  Camara 1  ', notes: '  test  ',
    });
    expect(e.operator).toBe('Ana');
    expect(e.location).toBe('Camara 1');
    expect(e.notes).toBe('test');
  });
});

describe('useHaccpStore.list', () => {
  beforeEach(() => {
    const store = useHaccpStore.getState();
    store.clear();
    store.add({ type: 'cold_storage', value: 3, operator: 'A', date: '2024-01-15' });
    store.add({ type: 'freezer', value: -20, operator: 'A', date: '2024-01-15' });
    store.add({ type: 'cold_storage', value: 5, operator: 'A', date: '2024-01-16' });
  });

  it('returns all entries when no filters', () => {
    expect(useHaccpStore.getState().list()).toHaveLength(3);
  });

  it('filters by type', () => {
    const out = useHaccpStore.getState().list({ type: 'cold_storage' });
    expect(out).toHaveLength(2);
    expect(out.every(e => e.type === 'cold_storage')).toBe(true);
  });

  it('filters by date range (inclusive)', () => {
    const out = useHaccpStore.getState().list({ from: '2024-01-15', to: '2024-01-15' });
    expect(out).toHaveLength(2);
  });

  it('sorts by created_at desc (newest first)', () => {
    const out = useHaccpStore.getState().list();
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].created_at >= out[i].created_at).toBe(true);
    }
  });
});

describe('useHaccpStore.remove', () => {
  it('removes entry by id', () => {
    useHaccpStore.getState().clear();
    const e = useHaccpStore.getState().add({ type: 'cleaning', operator: 'A' });
    expect(useHaccpStore.getState().entries).toHaveLength(1);
    useHaccpStore.getState().remove(e.id);
    expect(useHaccpStore.getState().entries).toHaveLength(0);
  });
});

describe('getDailySummary', () => {
  beforeEach(() => {
    const store = useHaccpStore.getState();
    store.clear();
    // 3 ok, 1 warn, 2 fail on 2024-01-15
    store.add({ type: 'cold_storage', value: 2,  operator: 'A', date: '2024-01-15' }); // ok
    store.add({ type: 'cold_storage', value: 3,  operator: 'A', date: '2024-01-15' }); // ok
    store.add({ type: 'freezer',      value: -22, operator: 'A', date: '2024-01-15' }); // ok
    store.add({ type: 'cold_storage', value: 5,  operator: 'A', date: '2024-01-15' }); // warn
    store.add({ type: 'cold_storage', value: 10, operator: 'A', date: '2024-01-15' }); // fail
    store.add({ type: 'pasteurization', value: 50, operator: 'A', date: '2024-01-15' }); // fail
    // 1 entry on a different day
    store.add({ type: 'cleaning', operator: 'A', date: '2024-01-16' }); // ok
  });

  it('counts entries by status for the given date', () => {
    const sum = getDailySummary('2024-01-15');
    expect(sum.total).toBe(6);
    expect(sum.ok).toBe(3);
    expect(sum.warn).toBe(1);
    expect(sum.fail).toBe(2);
  });

  it('returns zeros for a date with no entries', () => {
    const sum = getDailySummary('2024-01-01');
    expect(sum).toEqual({ total: 0, ok: 0, warn: 0, fail: 0 });
  });

  it('does not include entries from other dates', () => {
    const sum = getDailySummary('2024-01-16');
    expect(sum.total).toBe(1);
    expect(sum.ok).toBe(1);
  });
});
