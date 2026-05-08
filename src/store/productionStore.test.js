import { describe, it, expect } from 'vitest';
import { dedupePlanOrders } from './productionStore';

/**
 * Regression tests para dedupePlanOrders().
 *
 * Bug histórico (reportado dos veces, fix definitivo en v1.0.13):
 * cuando el usuario re-confirma un plan que ya tenía lotes, las recetas
 * pre-existentes se duplicaban en el log de producción. Detalle completo
 * en docs/decisiones.md (entrada 2026-05-08 "REGRESIÓN: duplicación...").
 *
 * dedupePlanOrders() es la función pura que decide qué orders del plan
 * requieren crear lote nuevo y cuáles están "cubiertas" por lotes
 * existentes para esa fecha. Estos tests aseguran que la regresión no
 * se repita.
 */

describe('dedupePlanOrders', () => {
  it('caso 1: 1 order recipe A + 0 lotes existentes → crea 1', () => {
    const orders = [{ recipe_id: 1, liters: 5 }];
    const existing = [];
    const result = dedupePlanOrders(orders, existing);
    expect(result.newOrders).toHaveLength(1);
    expect(result.newOrders[0].recipe_id).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('caso 2: 1 order A + 1 lote A → crea 0 (re-confirm sin cambios)', () => {
    const orders = [{ recipe_id: 1, liters: 5 }];
    const existing = [{ recipe_id: 1, prod_date: '2026-05-08' }];
    const result = dedupePlanOrders(orders, existing);
    expect(result.newOrders).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('caso 3: 2 orders A + 1 lote A → crea 1 (usuario agrega 2do batch del mismo sabor)', () => {
    const orders = [
      { recipe_id: 1, liters: 5 },
      { recipe_id: 1, liters: 4 },
    ];
    const existing = [{ recipe_id: 1, prod_date: '2026-05-08' }];
    const result = dedupePlanOrders(orders, existing);
    expect(result.newOrders).toHaveLength(1);
    expect(result.skipped).toBe(1);
    // El segundo order de A es el que se crea (el primero está cubierto)
    expect(result.newOrders[0].liters).toBe(4);
  });

  it('caso 4: 1 order A + 1 order B + 1 lote A → crea solo B (caso del bug original)', () => {
    const orders = [
      { recipe_id: 1, liters: 5 },
      { recipe_id: 2, liters: 3 },
    ];
    const existing = [{ recipe_id: 1, prod_date: '2026-05-08' }];
    const result = dedupePlanOrders(orders, existing);
    expect(result.newOrders).toHaveLength(1);
    expect(result.newOrders[0].recipe_id).toBe(2);
    expect(result.skipped).toBe(1);
  });

  it('caso 5: orders vacíos → no crea nada', () => {
    const result = dedupePlanOrders([], []);
    expect(result.newOrders).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it('caso 6: 0 orders + 3 lotes existentes → no crea nada (orders manda)', () => {
    const orders = [];
    const existing = [
      { recipe_id: 1 },
      { recipe_id: 2 },
      { recipe_id: 3 },
    ];
    const result = dedupePlanOrders(orders, existing);
    expect(result.newOrders).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it('caso 7: order con recipe_id como string es coercido a Number', () => {
    const orders = [{ recipe_id: '1', liters: 5 }];
    const existing = [{ recipe_id: 1 }];
    const result = dedupePlanOrders(orders, existing);
    expect(result.newOrders).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('caso 8: 3 orders A + 2 orders B + 1 lote A + 1 lote B → crea 2 A + 1 B', () => {
    const orders = [
      { recipe_id: 1, liters: 5 },  // skipped
      { recipe_id: 1, liters: 4 },  // new
      { recipe_id: 1, liters: 3 },  // new
      { recipe_id: 2, liters: 6 },  // skipped
      { recipe_id: 2, liters: 5 },  // new
    ];
    const existing = [
      { recipe_id: 1 },
      { recipe_id: 2 },
    ];
    const result = dedupePlanOrders(orders, existing);
    expect(result.newOrders).toHaveLength(3);
    expect(result.skipped).toBe(2);
    // Order de "skipped" preserva el orden — los primeros encuentros consumen
    expect(result.newOrders.map(o => o.liters)).toEqual([4, 3, 5]);
  });
});
