import { describe, it, expect } from 'vitest';
import {
  calcStats,
  calcDensity,
  calcIceFraction,
  calcFrozenWaterPct,
  calcFreezingCurve,
  calcLactoseSaturation,
  calcStabiliserConc,
  calcNPAC,
  calcServingTemp,
  rateFpd,
  rateParam,
  getParams,
  getFpdRange,
  overallVerdict,
  calcNutritionalValues,
  calcChileanLabelSeals,
  calcRecipeAllergens,
  ingredientRole,
  analyzeRecipe,
  autoBalanceRecipe,
  ALLERGEN_IDS,
  resolveRecipeItems,
  applyEvaporation,
  tempForFrozenPct,
  calcOverrunByDensity,
  calcOverrunByWeight,
} from './icecreamCalc';

// Sample ingredients for a classic ice cream recipe (~1000g).
// Include the labeling fields (trans_fat, sodium_mg, sugars, satfat) and
// allergens so the new tests can exercise them.
const milk = {
  id: 1, name: 'Leche entera natural', category: 'Lacteo',
  water_pct: 87.5, fat_pct: 3.5, sng_pct: 9.0, sugar_pct: 0, others_pct: 0,
  pod: 0, pac: 0, cost_per_kg: 900, lactose: 4.6, msnf: 8.5, protein: 3.3,
  calories: 62, salt: 0.1, satfat: 2.1, trans_fat: 0, sodium_mg: 40, sugars: 4.6, totcarbo: 4.6,
  allergens: ['milk'],
};
const cream = {
  id: 2, name: 'Crema 35%', category: 'Lacteo',
  water_pct: 60, fat_pct: 35, sng_pct: 5.2, sugar_pct: 0, others_pct: 0,
  pod: 0, pac: 0, cost_per_kg: 4500, lactose: 3.0, msnf: 5.2, protein: 2.0,
  calories: 340, salt: 0.05, satfat: 22, trans_fat: 0.3, sodium_mg: 30, sugars: 3.0, totcarbo: 3.0,
  allergens: ['milk'],
};
const sugar = {
  id: 3, name: 'Sacarosa', category: 'Azucar',
  water_pct: 0, fat_pct: 0, sng_pct: 0, sugar_pct: 100, others_pct: 0,
  pod: 1.0, pac: 1.0, cost_per_kg: 1500, lactose: 0, msnf: 0, protein: 0,
  calories: 400, salt: 0, satfat: 0, trans_fat: 0, sodium_mg: 0, sugars: 100, totcarbo: 100,
  allergens: [],
};
const dextrose = {
  id: 4, name: 'Dextrosa', category: 'Azucar',
  water_pct: 0, fat_pct: 0, sng_pct: 0, sugar_pct: 100, others_pct: 0,
  pod: 0.7, pac: 1.9, cost_per_kg: 2200, lactose: 0, msnf: 0, protein: 0,
  calories: 400, salt: 0, satfat: 0, trans_fat: 0, sodium_mg: 0, sugars: 100, totcarbo: 100,
  allergens: [],
};
const eggYolk = {
  id: 5, name: 'Yema de huevo', category: 'Otro',
  water_pct: 50, fat_pct: 32, sng_pct: 18, sugar_pct: 0, others_pct: 0,
  pod: 0, pac: 0, cost_per_kg: 8000, protein: 16, calories: 322,
  salt: 0.15, satfat: 9.5, trans_fat: 0, sodium_mg: 60, sugars: 0, totcarbo: 0,
  allergens: ['egg'],
};
const hazelnutPaste = {
  id: 6, name: 'Pasta avellana', category: 'Pasta',
  water_pct: 2, fat_pct: 60, sng_pct: 0, sugar_pct: 5, others_pct: 33,
  pod: 0.05, pac: 0.05, cost_per_kg: 12000, protein: 15, calories: 650,
  salt: 0, satfat: 4.5, trans_fat: 0, sodium_mg: 5, sugars: 5, totcarbo: 16,
  allergens: ['tree_nuts'],
};
const skimMilkPowder = {
  id: 7, name: 'Leche en polvo descremada', category: 'Lacteo',
  water_pct: 4, fat_pct: 1, sng_pct: 95, sugar_pct: 0, others_pct: 0,
  pod: 0, pac: 0, cost_per_kg: 6000, lactose: 50, msnf: 95, protein: 36,
  calories: 360, salt: 1.2, satfat: 0.6, trans_fat: 0, sodium_mg: 480, sugars: 50, totcarbo: 52,
  allergens: ['milk'],
};
const stabilizer = {
  id: 8, name: 'Neutro', category: 'Estabilizante',
  water_pct: 8, fat_pct: 0.3, sng_pct: 0, sugar_pct: 4, others_pct: 87,
  pod: 0, pac: 0, cost_per_kg: 24000, protein: 1.4, calories: 411,
  satfat: 29, trans_fat: 0, sodium_mg: 2812, sugars: 4, totcarbo: 11,
  stabiliser: 100, allergens: [],
};

// ── calcStats: core calculations ─────────────────────────────────
describe('calcStats', () => {
  it('returns zeros for empty items', () => {
    const s = calcStats([]);
    expect(s.T).toBe(0);
    expect(s.fpd).toBe(0);
    expect(s.pacPct).toBe(0);
    expect(s.podPct).toBe(0);
  });

  it('ignores items without ingredient or zero qty', () => {
    const s = calcStats([
      { qty_grams: 100, ingredient: null },
      { qty_grams: 0, ingredient: milk },
      { qty_grams: -50, ingredient: milk },
    ]);
    expect(s.T).toBe(0);
  });

  it('sums total weight correctly', () => {
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    expect(s.T).toBe(1000);
  });

  it('calculates composition percentages', () => {
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    // Water: 600 * 0.875 + 200 * 0.60 + 200 * 0 = 525 + 120 = 645
    expect(s.agua).toBeCloseTo(645, 1);
    // Fat: 600 * 0.035 + 200 * 0.35 = 21 + 70 = 91
    expect(s.grasa).toBeCloseTo(91, 1);
    // Sugar: 200g
    expect(s.azucar).toBeCloseTo(200, 1);
  });

  it('computes FPD for a typical mix', () => {
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    // FPD should be negative (freezing point below 0)
    expect(s.fpd).toBeLessThan(0);
    // FPD should be within a reasonable range for ice cream (-1 to -5°C)
    expect(s.fpd).toBeGreaterThan(-5);
  });

  it('dextrose has higher PAC than sucrose (lowers FPD more)', () => {
    const withSucrose = calcStats([
      { qty_grams: 800, ingredient: milk },
      { qty_grams: 200, ingredient: sugar },
    ]);
    const withDextrose = calcStats([
      { qty_grams: 800, ingredient: milk },
      { qty_grams: 200, ingredient: dextrose },
    ]);
    // Dextrose PAC=1.9 vs sugar PAC=1.0 → more negative FPD
    expect(withDextrose.fpd).toBeLessThan(withSucrose.fpd);
  });

  it('pacPct scales to ~per-kg basis', () => {
    // 200g sugar (PAC=1.0) in 1000g mix: pacPct should be ~20
    const s = calcStats([
      { qty_grams: 800, ingredient: milk },
      { qty_grams: 200, ingredient: sugar },
    ]);
    expect(s.pacPct).toBeCloseTo(20, 0);
  });
});

// ── calcDensity: density in g/mL ─────────────────────────────────
describe('calcDensity', () => {
  it('returns 0 for empty stats', () => {
    expect(calcDensity(calcStats([]))).toBe(0);
  });

  it('density of pure water mix is close to 1.0', () => {
    const pureWater = {
      water_pct: 100, fat_pct: 0, sng_pct: 0, sugar_pct: 0, others_pct: 0,
      pod: 0, pac: 0, cost_per_kg: 0,
    };
    const s = calcStats([{ qty_grams: 1000, ingredient: pureWater }]);
    expect(calcDensity(s)).toBeCloseTo(1.0, 2);
  });

  it('density of a typical ice cream mix is > 1.0', () => {
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    const d = calcDensity(s);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });
});

// ── calcIceFraction / calcFrozenWaterPct ─────────────────────────
describe('calcIceFraction', () => {
  it('returns 0 when temperature is above FPD', () => {
    // waterFrac=0.65, fpd=-2.5, temp=-1 (warmer than FPD)
    expect(calcIceFraction(0.65, -2.5, -1)).toBe(0);
  });

  it('returns 0 when fpd is 0', () => {
    expect(calcIceFraction(0.65, 0, -10)).toBe(0);
  });

  it('increases as temperature drops below FPD', () => {
    const atMinus5 = calcIceFraction(0.65, -2.5, -5);
    const atMinus10 = calcIceFraction(0.65, -2.5, -10);
    expect(atMinus10).toBeGreaterThan(atMinus5);
  });

  it('frozen water % grows but stays under 100%', () => {
    const pct = calcFrozenWaterPct(0.65, -2.5, -18);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(110); // formula allows slight over-projection
  });
});

// ── calcFreezingCurve ──────────────────────────────────
describe('calcFreezingCurve', () => {
  it('returns empty array if no FPD', () => {
    expect(calcFreezingCurve({ fpd: 0, waterFrac: 0.6 })).toEqual([]);
  });

  it('returns count+1 points (default 28+1) for valid stats', () => {
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    const curve = calcFreezingCurve(s);
    expect(curve.length).toBeGreaterThanOrEqual(9);
    expect(curve[0].frozenPct).toBe(0); // at FPD, no ice yet
    // Cada punto trae las 4 metricas
    expect(curve[0]).toHaveProperty('icePct');
    expect(curve[0]).toHaveProperty('freeWaterPct');
  });

  it('produces a fixed-resolution curve aligned with ICC4 sampling', () => {
    // El builder ICC4 muestrea f ∈ {0, 2, ..., 90} (46 puntos). El parámetro
    // `count` quedó como no-op tras el realineamiento; lo aceptamos por
    // compatibilidad pero la curva siempre se devuelve con la grilla ICC4.
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    const curve = calcFreezingCurve(s, 8);
    expect(curve.length).toBe(46);
    expect(curve[0].frozenPct).toBe(0);
    expect(curve[curve.length - 1].frozenPct).toBe(90);
  });

  it('frozen % is monotonically increasing', () => {
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    const curve = calcFreezingCurve(s);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].frozenPct).toBeGreaterThanOrEqual(curve[i - 1].frozenPct);
    }
  });
});

// ── calcLactoseSaturation ───────────────────────────────────────
describe('calcLactoseSaturation', () => {
  it('returns 0 if no water', () => {
    expect(calcLactoseSaturation({ T: 0, agua: 0, lactose: 0 })).toBe(0);
  });

  it('calculates correct saturation %', () => {
    // 1000g mix with 50g lactose and 650g water
    // lacPct = 5, waterPct = 65, saturation = 5/65*100 = ~7.69%
    const sat = calcLactoseSaturation({ T: 1000, agua: 650, lactose: 50 });
    expect(sat).toBeCloseTo(7.69, 1);
  });
});

// ── calcNPAC ────────────────────────────────────────────────────
describe('calcNPAC', () => {
  it('returns 0 for empty stats', () => {
    expect(calcNPAC({ T: 0 })).toBe(0);
  });

  it('calculates NPAC correctly', () => {
    // T=1000, agua=650 → solidsPct=35%, waterPct=65%
    // pacPct=20 → pacDisplay=200
    // NPAC = 200 / 65 * 100 = ~307.69
    const n = calcNPAC({ T: 1000, agua: 650, pacPct: 20 });
    expect(n).toBeCloseTo(307.69, 1);
  });
});

// ── rateFpd & getFpdRange ───────────────────────────────────────
describe('rateFpd', () => {
  it('rates optimal FPD for ice cream', () => {
    expect(rateFpd(-2.5, 'helado')).toBe('opt');
  });

  it('rates out-of-range FPD', () => {
    expect(rateFpd(-10, 'helado')).toBe('bad');
    expect(rateFpd(0, 'helado')).toBe('bad');
  });

  it('returns acceptable for borderline FPD', () => {
    expect(rateFpd(-3.5, 'helado')).toBe('acc');
  });

  it('uses different ranges per type', () => {
    const iceRange = getFpdRange('helado');
    const sorbetRange = getFpdRange('sorbete');
    // Sorbet optimal range should be different from ice cream
    expect(sorbetRange.opt_lo).not.toBe(iceRange.opt_lo);
  });
});

// ── rateParam ───────────────────────────────────────────────────
describe('rateParam', () => {
  const p = { oLo: 0.06, oHi: 0.10, aLo: 0.04, aHi: 0.14 };

  it('classifies optimal values', () => {
    expect(rateParam(0.08, p)).toBe('opt');
  });

  it('classifies acceptable values', () => {
    expect(rateParam(0.05, p)).toBe('acc');
    expect(rateParam(0.12, p)).toBe('acc');
  });

  it('classifies out-of-range values', () => {
    expect(rateParam(0.02, p)).toBe('bad');
    expect(rateParam(0.20, p)).toBe('bad');
  });
});

// ── overallVerdict ──────────────────────────────────────────────
describe('overallVerdict', () => {
  it('returns bad when any rating is bad', () => {
    const s = calcStats([
      // Extremely fat-heavy mix
      { qty_grams: 200, ingredient: milk },
      { qty_grams: 800, ingredient: cream },
    ]);
    expect(overallVerdict(s, 'helado')).toBe('bad');
  });

  it('returns a valid verdict', () => {
    const s = calcStats([
      { qty_grams: 630, ingredient: milk },
      { qty_grams: 180, ingredient: cream },
      { qty_grams: 150, ingredient: sugar },
      { qty_grams: 40, ingredient: dextrose },
    ]);
    const v = overallVerdict(s, 'helado');
    expect(['opt', 'acc', 'bad']).toContain(v);
  });
});

// ── calcServingTemp ─────────────────────────────────────────────
describe('calcServingTemp', () => {
  it('returns a negative temperature', () => {
    const s = calcStats([
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ]);
    const ts = calcServingTemp(s);
    expect(ts).toBeLessThan(0);
  });
});

// ── getParams returns correct structure ─────────────────────────
describe('getParams', () => {
  it('returns 9 parameters for each type', () => {
    ['helado', 'gelato', 'sorbete'].forEach(type => {
      const params = getParams(type);
      expect(params).toHaveLength(9);
      params.forEach(p => {
        expect(p).toHaveProperty('k');
        expect(p).toHaveProperty('lbl');
        expect(p).toHaveProperty('oLo');
        expect(p).toHaveProperty('oHi');
      });
    });
  });

  it('falls back to helado for unknown type', () => {
    expect(getParams('unknown')).toEqual(getParams('helado'));
  });
});

// ── calcStats: new labeling fields ──────────────────────────────
describe('calcStats — labeling fields', () => {
  it('aggregates trans_fat and sodium_mg from ingredients', () => {
    // 200g cream (0.3g trans/100g, 30 mg Na/100g) + 800g milk (0 trans, 40 mg Na/100g)
    // trans_fat = 200 * 0.3 / 100 + 800 * 0 / 100 = 0.6 g
    // sodium_mg = 200 * 30 / 100 + 800 * 40 / 100 = 60 + 320 = 380
    const s = calcStats([
      { qty_grams: 800, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
    ]);
    expect(s.trans_fat).toBeCloseTo(0.6, 2);
    expect(s.sodium_mg).toBeCloseTo(380, 0);
  });

  it('handles ingredients missing trans_fat / sodium_mg as 0', () => {
    const noLabelFields = { ...sugar, trans_fat: undefined, sodium_mg: undefined };
    const s = calcStats([{ qty_grams: 100, ingredient: noLabelFields }]);
    expect(s.trans_fat).toBe(0);
    expect(s.sodium_mg).toBe(0);
  });
});

// ── calcNutritionalValues ───────────────────────────────────────
describe('calcNutritionalValues', () => {
  it('returns null for empty stats', () => {
    expect(calcNutritionalValues(null)).toBeNull();
    expect(calcNutritionalValues({ T: 0 })).toBeNull();
  });

  it('exposes per-100g values for trans fat and sodium', () => {
    // 1000g total → per100 = absolute / 10
    const s = calcStats([
      { qty_grams: 800, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
    ]);
    const nv = calcNutritionalValues(s);
    expect(nv.transFat).toBeCloseTo(0.06, 2);
    expect(nv.sodiumMg).toBeCloseTo(38, 0);
  });

  it('energy in kJ ~= kcal * 4.184', () => {
    const s = calcStats([{ qty_grams: 100, ingredient: sugar }]);
    const nv = calcNutritionalValues(s);
    expect(nv.energyKJ).toBeCloseTo(nv.energyKcal * 4.184, 2);
  });
});

// ── calcChileanLabelSeals (Ley 20.606) ──────────────────────────
describe('calcChileanLabelSeals', () => {
  it('returns no seals for a low-impact mix', () => {
    // 1L of mostly milk and a tiny bit of sugar — should not trigger any seal
    const s = calcStats([
      { qty_grams: 950, ingredient: milk },
      { qty_grams: 50,  ingredient: sugar },
    ]);
    const nv = calcNutritionalValues(s);
    const { count } = calcChileanLabelSeals(nv);
    expect(count).toBe(0);
  });

  it('triggers ALTO EN AZUCARES at >= 10g/100g', () => {
    // Force >10% sugars: 200g sugar in 1000g total
    const s = calcStats([
      { qty_grams: 800, ingredient: milk },
      { qty_grams: 200, ingredient: sugar },
    ]);
    const nv = calcNutritionalValues(s);
    const { seals } = calcChileanLabelSeals(nv);
    expect(seals.find(x => x.key === 'sugars')).toBeTruthy();
  });

  it('triggers ALTO EN GRASAS SATURADAS at >= 4g/100g', () => {
    // 500g cream (22g sat/100g): mix sat ≈ 11g/100g, well above 4
    const s = calcStats([
      { qty_grams: 500, ingredient: cream },
      { qty_grams: 500, ingredient: milk },
    ]);
    const nv = calcNutritionalValues(s);
    const { seals } = calcChileanLabelSeals(nv);
    expect(seals.find(x => x.key === 'satfat')).toBeTruthy();
  });

  it('triggers ALTO EN SODIO at >= 400 mg/100g', () => {
    // Stabilizer has 2812 mg Na/100g — even small amounts spike the mix
    const s = calcStats([
      { qty_grams: 800, ingredient: milk },
      { qty_grams: 200, ingredient: stabilizer },
    ]);
    const nv = calcNutritionalValues(s);
    const { seals } = calcChileanLabelSeals(nv);
    expect(seals.find(x => x.key === 'sodium')).toBeTruthy();
  });

  it('triggers ALTO EN ENERGIA at >= 275 kcal/100g', () => {
    // Mostly hazelnut paste (650 kcal/100g) → mix easily above 275
    const s = calcStats([
      { qty_grams: 600, ingredient: hazelnutPaste },
      { qty_grams: 400, ingredient: milk },
    ]);
    const nv = calcNutritionalValues(s);
    const { seals } = calcChileanLabelSeals(nv);
    expect(seals.find(x => x.key === 'energy')).toBeTruthy();
  });

  it('exposes the limits used for evaluation', () => {
    const nv = calcNutritionalValues(calcStats([{ qty_grams: 100, ingredient: milk }]));
    const { limits } = calcChileanLabelSeals(nv);
    expect(limits).toEqual({ energyKcal: 275, sugars: 10, saturatedFat: 4, sodiumMg: 400 });
  });
});

// ── calcRecipeAllergens ─────────────────────────────────────────
describe('calcRecipeAllergens', () => {
  it('returns an empty list when no ingredient has allergens', () => {
    expect(calcRecipeAllergens([{ qty_grams: 100, ingredient: sugar }])).toEqual([]);
  });

  it('aggregates and dedupes allergens across ingredients', () => {
    const allergens = calcRecipeAllergens([
      { qty_grams: 600, ingredient: milk },         // milk
      { qty_grams: 200, ingredient: cream },        // milk
      { qty_grams: 100, ingredient: eggYolk },      // egg
      { qty_grams: 100, ingredient: hazelnutPaste },// tree_nuts
    ]);
    expect(allergens).toEqual(expect.arrayContaining(['milk', 'egg', 'tree_nuts']));
    // Each allergen appears only once
    const unique = new Set(allergens);
    expect(unique.size).toBe(allergens.length);
  });

  it('respects the canonical sort order of ALLERGEN_IDS', () => {
    const allergens = calcRecipeAllergens([
      { qty_grams: 100, ingredient: hazelnutPaste }, // tree_nuts (later)
      { qty_grams: 100, ingredient: milk },          // milk (earlier)
    ]);
    const milkIdx = ALLERGEN_IDS.indexOf('milk');
    const treeIdx = ALLERGEN_IDS.indexOf('tree_nuts');
    expect(allergens.indexOf('milk')).toBeLessThan(allergens.indexOf('tree_nuts'));
    expect(milkIdx).toBeLessThan(treeIdx); // sanity
  });

  it('ignores items with zero or missing qty', () => {
    const allergens = calcRecipeAllergens([
      { qty_grams: 0, ingredient: milk },
      { qty_grams: null, ingredient: cream },
    ]);
    expect(allergens).toEqual([]);
  });

  it('ignores invalid allergen ids in the ingredient list', () => {
    const weird = { ...milk, allergens: ['milk', 'unknown_allergen', 'egg'] };
    const allergens = calcRecipeAllergens([{ qty_grams: 100, ingredient: weird }]);
    expect(allergens).toContain('milk');
    expect(allergens).toContain('egg');
    expect(allergens).not.toContain('unknown_allergen');
  });
});

// ── ingredientRole ──────────────────────────────────────────────
describe('ingredientRole', () => {
  it('classifies milk as a fat lever (cream-like) only when fat is high', () => {
    expect(ingredientRole(cream)).toBe('fat');
    // Whole milk has only 3.5% fat, classified as milk_whole
    expect(ingredientRole(milk)).toBe('milk_whole');
  });

  it('classifies sugar ingredients', () => {
    expect(ingredientRole(sugar)).toBe('sugar');
    expect(ingredientRole(dextrose)).toBe('sugar');
  });

  it('classifies skim milk powder as msnf', () => {
    expect(ingredientRole(skimMilkPowder)).toBe('msnf');
  });

  it('classifies water', () => {
    const water = { water_pct: 100, fat_pct: 0, sng_pct: 0, sugar_pct: 0, others_pct: 0 };
    expect(ingredientRole(water)).toBe('water');
  });

  it('classifies stabilizer by category or stabiliser field', () => {
    expect(ingredientRole(stabilizer)).toBe('stabilizer');
    const guar = { category: 'Estabilizante', water_pct: 12, fat_pct: 0, sng_pct: 0, sugar_pct: 0 };
    expect(ingredientRole(guar)).toBe('stabilizer');
  });

  it('returns "other" for things that have no clear lever role', () => {
    expect(ingredientRole(hazelnutPaste)).toBe('other');
    expect(ingredientRole(eggYolk)).toBe('other');
  });

  it('returns null for missing ingredient', () => {
    expect(ingredientRole(null)).toBeNull();
    expect(ingredientRole(undefined)).toBeNull();
  });
});

// ── analyzeRecipe ───────────────────────────────────────────────
describe('analyzeRecipe', () => {
  it('returns no suggestions for a balanced helado', () => {
    // Hand-tuned ratio that should land near optimum for helado
    const items = [
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 180, ingredient: cream },
      { qty_grams: 150, ingredient: sugar },
      { qty_grams: 40,  ingredient: dextrose },
      { qty_grams: 25,  ingredient: skimMilkPowder },
      { qty_grams: 5,   ingredient: stabilizer },
    ];
    const stats = calcStats(items);
    const out = analyzeRecipe(items, 'helado', stats);
    // Most parameters should be close to optimum; allow a couple of misses but
    // at least more than half should be in range.
    expect(out.length).toBeLessThan(getParams('helado').length / 2);
  });

  it('flags an obviously fat-heavy mix', () => {
    const items = [
      { qty_grams: 100, ingredient: milk },
      { qty_grams: 900, ingredient: cream },
    ];
    const stats = calcStats(items);
    const out = analyzeRecipe(items, 'helado', stats);
    // Among suggestions, fat (pGrasa) should be one of the worst-off.
    expect(out.some(s => s.paramKey === 'pGrasa')).toBe(true);
  });

  it('returns sorted by severity (most-out-of-range first)', () => {
    const items = [
      { qty_grams: 400, ingredient: cream },
      { qty_grams: 600, ingredient: sugar },
    ];
    const stats = calcStats(items);
    const out = analyzeRecipe(items, 'helado', stats);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].severity).toBeGreaterThanOrEqual(out[i].severity);
    }
  });

  it('returns empty array if items list is empty', () => {
    expect(analyzeRecipe([], 'helado', null)).toEqual([]);
  });

  it('each suggestion targets a real ingredient and has a non-zero delta', () => {
    const items = [
      { qty_grams: 200, ingredient: milk },
      { qty_grams: 800, ingredient: cream },
    ];
    const stats = calcStats(items);
    const out = analyzeRecipe(items, 'helado', stats);
    for (const s of out) {
      expect(s.ingredient_name).toBeTruthy();
      expect(Math.abs(s.delta_g)).toBeGreaterThanOrEqual(5);
      expect(['add', 'reduce']).toContain(s.direction);
    }
  });
});

// ── autoBalanceRecipe ───────────────────────────────────────────
describe('autoBalanceRecipe', () => {
  it('does not mutate the input array', () => {
    const items = [
      { qty_grams: 100, ingredient: milk },
      { qty_grams: 900, ingredient: cream },
    ];
    const snapshot = JSON.stringify(items);
    autoBalanceRecipe(items, 'helado');
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  it('reports iterations and converged flag', () => {
    const items = [
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ];
    const result = autoBalanceRecipe(items, 'helado');
    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(typeof result.converged).toBe('boolean');
    expect(Array.isArray(result.trace)).toBe(true);
  });

  it('respects the iteration cap', () => {
    const items = [
      { qty_grams: 100, ingredient: milk },
      { qty_grams: 900, ingredient: cream },
    ];
    const result = autoBalanceRecipe(items, 'helado', { maxIter: 3 });
    expect(result.iterations).toBeLessThanOrEqual(3);
  });

  it('reduces (or at least does not worsen) total severity vs the input', () => {
    const items = [
      { qty_grams: 200, ingredient: milk },
      { qty_grams: 800, ingredient: cream },
    ];
    const before = analyzeRecipe(items, 'helado', calcStats(items))
      .reduce((s, x) => s + x.severity, 0);
    const result = autoBalanceRecipe(items, 'helado');
    const after = result.remainingSuggestions.reduce((s, x) => s + x.severity, 0);
    expect(after).toBeLessThanOrEqual(before + 1e-6);
  });

  it('returns the same items shape as the input', () => {
    const items = [
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ];
    const result = autoBalanceRecipe(items, 'helado');
    expect(result.items).toHaveLength(items.length);
    result.items.forEach((it, i) => {
      expect(it.ingredient_id).toBe(items[i].ingredient_id ?? items[i].ingredient.id);
      expect(typeof it.qty_grams).toBe('number');
      expect(it.qty_grams).toBeGreaterThanOrEqual(0);
    });
  });

  it('provides finalStats based on the adjusted items', () => {
    const items = [
      { qty_grams: 600, ingredient: milk },
      { qty_grams: 200, ingredient: cream },
      { qty_grams: 200, ingredient: sugar },
    ];
    const result = autoBalanceRecipe(items, 'helado');
    const recomputed = calcStats(result.items);
    expect(result.finalStats.T).toBeCloseTo(recomputed.T, 2);
    expect(result.finalStats.fpd).toBeCloseTo(recomputed.fpd, 4);
  });
});

// ── resolveRecipeItems ──────────────────────────────────────────
describe('resolveRecipeItems', () => {
  const ingMap = { 1: milk, 2: cream, 3: sugar };
  const subBase = {
    id: 100,
    ingredients: [
      { ingredient_id: 1, qty_grams: 800 }, // milk
      { ingredient_id: 2, qty_grams: 200 }, // cream
    ],
  };
  const recipesMap = { 100: subBase };

  it('returns empty array for empty input', () => {
    expect(resolveRecipeItems([])).toEqual([]);
    expect(resolveRecipeItems(null)).toEqual([]);
  });

  it('passes through plain ingredient items', () => {
    const out = resolveRecipeItems([
      { qty_grams: 100, ingredient: sugar, ingredient_id: 3 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].ingredient).toBe(sugar);
    expect(out[0].qty_grams).toBe(100);
  });

  it('skips items with zero or negative qty', () => {
    const out = resolveRecipeItems([
      { qty_grams: 0, ingredient: sugar },
      { qty_grams: -10, ingredient: sugar },
    ]);
    expect(out).toEqual([]);
  });

  it('expands a sub-recipe scaled by ratio', () => {
    // Pedimos 500g de la subreceta (cuyo total es 1000g) → ratio = 0.5
    const out = resolveRecipeItems(
      [{ recipe_id: 100, qty_grams: 500 }],
      recipesMap, ingMap
    );
    expect(out).toHaveLength(2);
    expect(out[0].qty_grams).toBeCloseTo(400, 6); // 800 * 0.5
    expect(out[1].qty_grams).toBeCloseTo(100, 6); // 200 * 0.5
    // El total expandido respeta el peso pedido al padre
    const total = out.reduce((s, i) => s + i.qty_grams, 0);
    expect(total).toBeCloseTo(500, 6);
  });

  it('detects and skips cycles', () => {
    // Subreceta que se referencia a si misma → no debe loopear infinito
    const cyclic = {
      id: 200,
      ingredients: [
        { ingredient_id: 1, qty_grams: 500 },
        { recipe_id: 200, qty_grams: 500 },
      ],
    };
    const map = { 200: cyclic };
    const out = resolveRecipeItems(
      [{ recipe_id: 200, qty_grams: 1000 }],
      map, ingMap
    );
    // Solo el ingrediente real debe quedar
    expect(out.every(i => i.ingredient === milk)).toBe(true);
  });

  it('skips sub-recipe with empty ingredient list', () => {
    const empty = { id: 300, ingredients: [] };
    const out = resolveRecipeItems(
      [{ recipe_id: 300, qty_grams: 100 }],
      { 300: empty }, ingMap
    );
    expect(out).toEqual([]);
  });

  it('skips reference to missing recipe id', () => {
    const out = resolveRecipeItems(
      [{ recipe_id: 999, qty_grams: 100 }],
      {}, ingMap
    );
    expect(out).toEqual([]);
  });

  it('flattens nested sub-recipes recursively', () => {
    // Receta A usa receta B, B usa ingrediente. Debe expandir todo.
    const inner = { id: 10, ingredients: [{ ingredient_id: 3, qty_grams: 1000 }] };
    const outer = { id: 11, ingredients: [{ recipe_id: 10, qty_grams: 500 }] };
    const map = { 10: inner, 11: outer };
    const out = resolveRecipeItems(
      [{ recipe_id: 11, qty_grams: 100 }],
      map, ingMap
    );
    expect(out).toHaveLength(1);
    expect(out[0].ingredient).toBe(sugar);
    expect(out[0].qty_grams).toBeCloseTo(100, 6);
  });
});

// ── applyEvaporation ────────────────────────────────────────────
describe('applyEvaporation', () => {
  const baseStats = () => calcStats([
    { qty_grams: 600, ingredient: milk },
    { qty_grams: 200, ingredient: cream },
    { qty_grams: 200, ingredient: sugar },
  ]);

  it('returns stats unchanged when evaporationPct is 0', () => {
    const s = baseStats();
    expect(applyEvaporation(s, 0)).toBe(s);
  });

  it('returns stats unchanged when stats are empty', () => {
    expect(applyEvaporation({ T: 0, agua: 0 }, 10)).toEqual({ T: 0, agua: 0 });
  });

  it('reduces T and agua by the given % of water', () => {
    const s = baseStats();
    const after = applyEvaporation(s, 10);
    // 10% de 645g de agua = 64.5g
    expect(after.evaporated_g).toBeCloseTo(64.5, 1);
    expect(after.T).toBeCloseTo(s.T - 64.5, 1);
    expect(after.agua).toBeCloseTo(s.agua - 64.5, 1);
  });

  it('keeps non-water totals fixed (azucar, grasa, etc.)', () => {
    const s = baseStats();
    const after = applyEvaporation(s, 20);
    expect(after.azucar).toBeCloseTo(s.azucar, 6);
    expect(after.grasa).toBeCloseTo(s.grasa, 6);
  });

  it('recomputes percentages after evaporation', () => {
    const s = baseStats();
    const after = applyEvaporation(s, 25);
    expect(after.pAgua).toBeCloseTo(after.agua / after.T, 6);
    expect(after.pSolids).toBeCloseTo(1 - after.pAgua, 6);
  });

  it('clamps evaporationPct to [0, 100]', () => {
    const s = baseStats();
    const at100 = applyEvaporation(s, 100);
    // Toda el agua se evapora — pero el codigo retorna stats si newT <= 0;
    // con una mezcla 64.5% agua sigue habiendo solidos asi que newT > 0.
    expect(at100.agua).toBeCloseTo(0, 1);
    // Negativos se clampan a 0 (no producen evaporacion).
    const atNeg = applyEvaporation(s, -50);
    expect(atNeg.T).toBeCloseTo(s.T, 6);
    expect(atNeg.agua).toBeCloseTo(s.agua, 6);
    expect(atNeg.evaporated_g).toBe(0);
  });
});

// ── tempForFrozenPct ────────────────────────────────────────────
describe('tempForFrozenPct', () => {
  const s = calcStats([
    { qty_grams: 600, ingredient: milk },
    { qty_grams: 200, ingredient: cream },
    { qty_grams: 200, ingredient: sugar },
  ]);

  it('returns null when no curve is computable', () => {
    expect(tempForFrozenPct({ fpd: 0, waterFrac: 0 }, 75)).toBeNull();
  });

  it('returns a temperature for a typical target', () => {
    const t = tempForFrozenPct(s, 75);
    expect(t).toBeLessThan(0);
    expect(t).toBeGreaterThan(-30);
  });

  it('returns colder temp for higher frozen %', () => {
    const t60 = tempForFrozenPct(s, 60);
    const t80 = tempForFrozenPct(s, 80);
    expect(t80).toBeLessThan(t60);
  });

  it('returns null if target is not within the curve', () => {
    expect(tempForFrozenPct(s, 200)).toBeNull();
  });

  it('returns a value rounded to 2 decimals', () => {
    const t = tempForFrozenPct(s, 75);
    // Multiplicar por 100 y comparar contra el redondeo
    expect(Math.round(t * 100)).toBe(Math.round(t * 100));
    expect(t).toBe(parseFloat(t.toFixed(2)));
  });
});

// ── calcStabiliserConc ──────────────────────────────────────────
describe('calcStabiliserConc', () => {
  it('returns 0 if no water', () => {
    expect(calcStabiliserConc({ T: 0, agua: 0, stabiliser: 0 })).toBe(0);
  });

  it('returns 0 if no stabilizer', () => {
    expect(calcStabiliserConc({ T: 1000, agua: 650, stabiliser: 0 })).toBe(0);
  });

  it('calculates % of stabilizer concentration in water', () => {
    // T=1000, agua=650, stabiliser=5 → stabPct=0.5%, waterPct=65%, conc=0.5/65*100 = 0.769
    const c = calcStabiliserConc({ T: 1000, agua: 650, stabiliser: 5 });
    expect(c).toBeCloseTo(0.769, 2);
  });
});

// ── calcOverrunByDensity / calcOverrunByWeight ──────────────────
describe('calcOverrunByDensity', () => {
  it('returns null on missing inputs', () => {
    expect(calcOverrunByDensity(1.1, 0, 100)).toBeNull();
    expect(calcOverrunByDensity(1.1, 100, 0)).toBeNull();
  });

  it('returns positive overrun when density is higher than mass ratio', () => {
    // density=1.1, mIce=80, mWater=100 → ratio=0.8 → (1.1-0.8)/0.8*100 = 37.5
    expect(calcOverrunByDensity(1.1, 80, 100)).toBeCloseTo(37.5, 2);
  });
});

describe('calcOverrunByWeight', () => {
  it('returns null on missing inputs', () => {
    expect(calcOverrunByWeight(0, 100)).toBeNull();
    expect(calcOverrunByWeight(100, 0)).toBeNull();
  });

  it('returns 100% overrun when ice volume is doubled', () => {
    // wMix=100g (mezcla liquida llena 100mL). wIce=50g (helado en mismo volumen).
    // overrun = 100 * (100-50)/50 = 100%
    expect(calcOverrunByWeight(100, 50)).toBeCloseTo(100, 6);
  });

  it('returns 0% when wMix == wIce (no air)', () => {
    expect(calcOverrunByWeight(100, 100)).toBe(0);
  });
});
