import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore, getLatestCost, getCostHistory, getCostStats, getLowStock } from './inventoryStore';
import { useIngredientStore } from './ingredientStore';

// Helper: replace ingredients with a controlled fixture so tests are stable.
function seedIngredients(rows) {
  useIngredientStore.setState({
    ingredients: rows,
    nextId: Math.max(...rows.map(r => r.id), 0) + 1,
  });
}

describe('inventoryStore.record (entry with cost + supplier)', () => {
  beforeEach(() => {
    seedIngredients([
      { id: 1, name: 'Sacarosa', stock_g: 0 },
      { id: 2, name: 'Leche', stock_g: 0 },
    ]);
    useInventoryStore.getState().clear();
  });

  it('records a basic in/out/adjustment', () => {
    const m = useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000,
    });
    expect(m.qty_g).toBe(1000);
    expect(m.type).toBe('in');
    expect(m.balance_after).toBe(1000);
    expect(useIngredientStore.getState().get(1).stock_g).toBe(1000);
  });

  it('out subtracts from current stock', () => {
    useInventoryStore.getState().record({ ingredient_id: 1, type: 'in', qty_g: 1000 });
    const m = useInventoryStore.getState().record({ ingredient_id: 1, type: 'out', qty_g: 300 });
    expect(m.balance_after).toBe(700);
  });

  it('adjustment sets the absolute balance', () => {
    useInventoryStore.getState().record({ ingredient_id: 1, type: 'in', qty_g: 1000 });
    const m = useInventoryStore.getState().record({ ingredient_id: 1, type: 'adjustment', qty_g: 250 });
    expect(m.balance_after).toBe(250);
    expect(m.type).toBe('adjustment');
  });

  it('returns null for unknown ingredient', () => {
    expect(useInventoryStore.getState().record({
      ingredient_id: 9999, type: 'in', qty_g: 100,
    })).toBeNull();
  });

  it('returns null for zero qty', () => {
    expect(useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 0,
    })).toBeNull();
  });

  it('captures unit_cost_per_kg and supplier_id only on in', () => {
    const inMov = useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 2000, supplier_id: 5,
    });
    expect(inMov.unit_cost_per_kg).toBe(2000);
    expect(inMov.supplier_id).toBe(5);

    const outMov = useInventoryStore.getState().record({
      ingredient_id: 1, type: 'out', qty_g: 100, unit_cost_per_kg: 999, supplier_id: 5,
    });
    // Cost/supplier solo se guardan en 'in'
    expect(outMov.unit_cost_per_kg).toBeUndefined();
    expect(outMov.supplier_id).toBeUndefined();
  });

  it('ignores invalid cost values', () => {
    const m = useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 0,
    });
    expect(m.unit_cost_per_kg).toBeUndefined();

    const m2 = useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: -50,
    });
    expect(m2.unit_cost_per_kg).toBeUndefined();
  });

  it('coerces supplier_id to a number', () => {
    const m = useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 100, supplier_id: '7',
    });
    expect(m.supplier_id).toBe(7);
  });
});

describe('getLatestCost', () => {
  beforeEach(() => {
    seedIngredients([{ id: 1, name: 'Sacarosa', stock_g: 0 }, { id: 2, name: 'Leche', stock_g: 0 }]);
    useInventoryStore.getState().clear();
  });

  it('returns null when no movements have cost', () => {
    useInventoryStore.getState().record({ ingredient_id: 1, type: 'in', qty_g: 100 });
    expect(getLatestCost(1)).toBeNull();
  });

  it('returns null when no in-movements exist for this ingredient', () => {
    useInventoryStore.getState().record({
      ingredient_id: 2, type: 'in', qty_g: 100, unit_cost_per_kg: 999,
    });
    expect(getLatestCost(1)).toBeNull();
  });

  it('returns the most recent in-movement with cost', () => {
    const store = useInventoryStore.getState();
    store.record({ ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 2000 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 500,  unit_cost_per_kg: 2200 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 250,  unit_cost_per_kg: 2400 });
    const r = getLatestCost(1);
    expect(r.unit_cost_per_kg).toBe(2400);
    expect(typeof r.movement_id).toBe('number');
  });

  it('coerces string id', () => {
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 2000,
    });
    expect(getLatestCost('1').unit_cost_per_kg).toBe(2000);
  });
});

describe('getCostHistory', () => {
  beforeEach(() => {
    seedIngredients([{ id: 1, name: 'Sacarosa', stock_g: 0 }]);
    useInventoryStore.getState().clear();
  });

  it('returns empty array when no costed movements', () => {
    expect(getCostHistory(1)).toEqual([]);
  });

  it('returns chronologically ordered entries (oldest first)', () => {
    const store = useInventoryStore.getState();
    store.record({ ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 1000 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 500,  unit_cost_per_kg: 1100 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 250,  unit_cost_per_kg: 1200 });
    const hist = getCostHistory(1);
    expect(hist).toHaveLength(3);
    expect(hist.map(h => h.unit_cost_per_kg)).toEqual([1000, 1100, 1200]);
    expect(hist[0]).toHaveProperty('date');
    expect(hist[0]).toHaveProperty('qty_g', 1000);
  });

  it('excludes movements without cost', () => {
    const store = useInventoryStore.getState();
    store.record({ ingredient_id: 1, type: 'in', qty_g: 1000 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 500, unit_cost_per_kg: 1500 });
    expect(getCostHistory(1)).toHaveLength(1);
  });

  it('excludes out and adjustment movements', () => {
    const store = useInventoryStore.getState();
    store.record({ ingredient_id: 1, type: 'in',  qty_g: 1000, unit_cost_per_kg: 1000 });
    store.record({ ingredient_id: 1, type: 'out', qty_g: 100 });
    store.record({ ingredient_id: 1, type: 'adjustment', qty_g: 800 });
    expect(getCostHistory(1)).toHaveLength(1);
  });
});

describe('getCostStats', () => {
  beforeEach(() => {
    seedIngredients([{ id: 1, name: 'Sacarosa', stock_g: 0 }]);
    useInventoryStore.getState().clear();
  });

  it('returns null when no costed history', () => {
    expect(getCostStats(1)).toBeNull();
  });

  it('reports latest, first, min, max', () => {
    const store = useInventoryStore.getState();
    store.record({ ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 1500 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 1200 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 1800 });
    const s = getCostStats(1);
    expect(s.first).toBe(1500);
    expect(s.latest).toBe(1800);
    expect(s.min).toBe(1200);
    expect(s.max).toBe(1800);
    expect(s.samples).toBe(3);
  });

  it('weighted average is correctly weighted by quantity', () => {
    // Compra 1: 1kg a $1000/kg = $1000 (peso=1kg)
    // Compra 2: 4kg a $2000/kg = $8000 (peso=4kg)
    // Promedio simple: 1500. Ponderado: (1000+8000)/(1+4) = 9000/5 = 1800.
    const store = useInventoryStore.getState();
    store.record({ ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 1000 });
    store.record({ ingredient_id: 1, type: 'in', qty_g: 4000, unit_cost_per_kg: 2000 });
    const s = getCostStats(1);
    expect(s.avg_weighted).toBeCloseTo(1800, 6);
  });

  it('total invested = sum of (cost * kg)', () => {
    const store = useInventoryStore.getState();
    store.record({ ingredient_id: 1, type: 'in', qty_g: 2000, unit_cost_per_kg: 1500 }); // 3000
    store.record({ ingredient_id: 1, type: 'in', qty_g: 500,  unit_cost_per_kg: 2000 }); // 1000
    const s = getCostStats(1);
    expect(s.total_invested).toBeCloseTo(4000, 6);
    expect(s.total_kg_received).toBeCloseTo(2.5, 6);
  });
});

describe('getLowStock', () => {
  it('returns ingredients where stock <= min and min > 0', () => {
    const ings = [
      { id: 1, name: 'A', stock_g: 100, min_stock_g: 200 }, // low
      { id: 2, name: 'B', stock_g: 500, min_stock_g: 200 }, // ok
      { id: 3, name: 'C', stock_g: 200, min_stock_g: 200 }, // exactly at min → low
      { id: 4, name: 'D', stock_g: 0,   min_stock_g: 0 },   // no min → ignored
      { id: 5, name: 'E', stock_g: 0 },                     // no min → ignored
    ];
    const out = getLowStock(ings);
    expect(out.map(i => i.id).sort()).toEqual([1, 3]);
  });
});
