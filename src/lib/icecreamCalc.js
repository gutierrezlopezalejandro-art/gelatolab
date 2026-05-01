// ============================================================
// icecreamCalc.js — Motor de calculo para formulacion de helados
//
// Formulas del Demo GelatoPassport (polinomial FPD) combinadas
// con el sistema de rating de Heladeria (Corvitto/escuela italiana)
// ============================================================

// ── Composicion de blends (sub-ingredientes) ────────────────
// Calcula los macros de un ingrediente compuesto como suma ponderada de sus
// componentes. components: [{ ingredient_id, pct }]. ingredientsMap: lookup
// por id. La suma de pct deberia ser 100 (si no, igual normaliza).
//
// Campos derivados: todos los porcentuales (water_pct, fat_pct, etc.), PAC,
// POD, calorias, micronutrientes y sobre todo allergens (union de los de
// los componentes).
const BLEND_PCT_FIELDS = [
  'water_pct', 'fat_pct', 'sng_pct', 'sugar_pct', 'others_pct',
  'protein', 'satfat', 'trans_fat', 'sugars', 'added_sugars',
  'lactose', 'fibers', 'polyols', 'totcarbo', 'salt', 'msnf', 'stabiliser',
];
const BLEND_PER100_FIELDS = ['calories', 'sodium_mg', 'cholesterol_mg', 'vitamind_mcg', 'calcium_mg', 'iron_mg', 'potassium_mg'];
const BLEND_CORVITTO_FIELDS = ['pod', 'pac'];

export function computeBlendMacros(components, ingredientsMap) {
  if (!components?.length) return null;
  const totalPct = components.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
  if (totalPct <= 0) return null;
  const out = {};
  for (const f of [...BLEND_PCT_FIELDS, ...BLEND_PER100_FIELDS, ...BLEND_CORVITTO_FIELDS]) out[f] = 0;
  out.cost_per_kg = 0;

  const allergens = new Set();
  for (const c of components) {
    const ing = ingredientsMap[String(c.ingredient_id)];
    if (!ing) continue;
    const w = (parseFloat(c.pct) || 0) / totalPct;
    for (const f of [...BLEND_PCT_FIELDS, ...BLEND_PER100_FIELDS, ...BLEND_CORVITTO_FIELDS]) {
      out[f] += (parseFloat(ing[f]) || 0) * w;
    }
    out.cost_per_kg += (parseFloat(ing.cost_per_kg) || 0) * w;
    (Array.isArray(ing.allergens) ? ing.allergens : []).forEach(a => allergens.add(a));
  }
  // Redondeo cosmetico
  for (const k of Object.keys(out)) {
    out[k] = Math.round((out[k] || 0) * 1000) / 1000;
  }
  out.allergens = Array.from(allergens);
  return out;
}

// ── Evaporacion por coccion ─────────────────────────────────
// Cuando cocinas la mezcla (custards, bases pasteurizadas largas, reducciones)
// pierdes agua. Esta helper toma stats ya calculadas y devuelve unas nuevas
// con esa fraccion de agua removida — peso total baja, concentraciones suben,
// FPD se vuelve mas frio. Solo afecta agua; grasa/azucar/MSNF se conservan.
export function applyEvaporation(stats, evaporationPct = 0) {
  if (!stats || !evaporationPct || stats.T === 0) return stats;
  const pct = Math.max(0, Math.min(100, evaporationPct)) / 100;
  const evap = stats.agua * pct;
  const newT = stats.T - evap;
  if (newT <= 0) return stats;
  const newAgua = stats.agua - evap;
  const waterFrac = newAgua / newT;
  const waterPct  = waterFrac * 100;
  const pacPct = (stats.pac / newT) * 1000;
  const podPct = (stats.pod / newT) * 1000;
  const pacConc = waterFrac > 0 ? pacPct / waterFrac : 0;
  const msnfPct = (stats.msnf / newT) * 100;
  let fpd = 0;
  if (pacConc > 0 && waterPct > 0) {
    fpd = (-9e-5) * Math.pow(pacConc, 2)
        - 0.0612 * pacConc
        + msnfPct * (-2.37) / waterPct;
  }
  return {
    ...stats,
    T: newT,
    agua: newAgua,
    pGrasa:  stats.grasa  / newT,
    pAzucar: stats.azucar / newT,
    pSng:    stats.sng    / newT,
    pAgua:   waterFrac,
    pSolids: 1 - waterFrac,
    pProtein:stats.protein/ newT,
    pStab:   stats.stabiliser / newT,
    pacPct, podPct, pacConc, fpd,
    msnfPct, waterPct, waterFrac,
    evaporated_g: evap,
    evaporation_applied_pct: evaporationPct,
  };
}

// ── Resolver recetas anidadas a una lista plana de ingredientes ──
// Una fila con `recipe_id` se expande a sus ingredientes escalados al peso
// del padre. Detecta ciclos via `visited`.
export function resolveRecipeItems(items, recipesMap = {}, ingredientsMap = {}, visited = new Set()) {
  const out = [];
  for (const it of items || []) {
    const qty = parseFloat(it.qty_grams) || 0;
    if (qty <= 0) continue;
    if (it.recipe_id) {
      const rid = String(it.recipe_id);
      if (visited.has(rid)) continue; // ciclo: ignora
      const r = recipesMap[rid];
      if (!r || !r.ingredients?.length) continue;
      // Computa el peso total interno de la sub-receta para calcular la razón.
      const innerTotal = r.ingredients.reduce((s, ri) => s + (parseFloat(ri.qty_grams) || 0), 0);
      if (innerTotal <= 0) continue;
      const ratio = qty / innerTotal;
      // Recursión sobre la sub-receta enriquecida.
      const innerEnriched = r.ingredients.map(ri => ({
        qty_grams: (parseFloat(ri.qty_grams) || 0) * ratio,
        ingredient_id: ri.ingredient_id,
        recipe_id: ri.recipe_id,
        ingredient: ri.ingredient_id ? ingredientsMap[String(ri.ingredient_id)] : null,
      }));
      const nextVisited = new Set(visited); nextVisited.add(rid);
      out.push(...resolveRecipeItems(innerEnriched, recipesMap, ingredientsMap, nextVisited));
    } else if (it.ingredient) {
      out.push({
        qty_grams: qty,
        ingredient: it.ingredient,
        ingredient_id: it.ingredient_id || it.ingredient.id,
        addin: !!it.addin,
      });
    }
  }
  return out;
}

// ── Calcular estadisticas de la receta ─────────────────────
export function calcStats(items) {
  let T = 0, agua = 0, grasa = 0, azucar = 0, sng = 0, otros = 0;
  let pod = 0, pac = 0, cost = 0;
  let msnf = 0, lactose = 0, fibers = 0, polyols = 0;
  let totcarbo = 0, satfat = 0, salt = 0, sugars = 0;
  let stabiliser = 0, calories = 0, protein = 0;
  let trans_fat = 0, sodium_mg = 0, added_sugars = 0;
  let cholesterol_mg = 0, vitamind_mcg = 0, calcium_mg = 0, iron_mg = 0, potassium_mg = 0;

  for (const { qty_grams, ingredient } of items) {
    if (!ingredient || !qty_grams || qty_grams <= 0) continue;
    const g = parseFloat(qty_grams);
    T += g;

    agua      += g * (parseFloat(ingredient.water_pct)  || 0) / 100;
    grasa     += g * (parseFloat(ingredient.fat_pct)    || 0) / 100;
    azucar    += g * (parseFloat(ingredient.sugar_pct)  || 0) / 100;
    sng       += g * (parseFloat(ingredient.sng_pct)    || 0) / 100;
    otros     += g * (parseFloat(ingredient.others_pct) || 0) / 100;
    protein   += g * (parseFloat(ingredient.protein)    || 0) / 100;

    // PAC/POD: escala relativa (sacarosa=1.0)
    // Para formulas Demo necesitamos acumular como: g * pac / 10
    pac  += g * (parseFloat(ingredient.pac) || 0) / 10;
    pod  += g * (parseFloat(ingredient.pod) || 0) / 10;

    cost      += g * (parseFloat(ingredient.cost_per_kg) || 0) / 1000;
    msnf      += g * (parseFloat(ingredient.msnf)        || 0) / 100;
    lactose   += g * (parseFloat(ingredient.lactose)     || 0) / 100;
    fibers    += g * (parseFloat(ingredient.fibers)      || 0) / 100;
    polyols   += g * (parseFloat(ingredient.polyols)     || 0) / 100;
    totcarbo  += g * (parseFloat(ingredient.totcarbo)    || 0) / 100;
    satfat    += g * (parseFloat(ingredient.satfat)      || 0) / 100;
    salt      += g * (parseFloat(ingredient.salt)        || 0) / 100;
    sugars    += g * (parseFloat(ingredient.sugars)      || 0) / 100;
    stabiliser+= g * (parseFloat(ingredient.stabiliser)  || 0) / 100;
    calories  += g * (parseFloat(ingredient.calories)    || 0) / 100;
    // Chilean labeling extras (per-100g values)
    trans_fat += g * (parseFloat(ingredient.trans_fat)   || 0) / 100;
    sodium_mg += g * (parseFloat(ingredient.sodium_mg)   || 0) / 100;
    // Added sugars (Brazilian RDC 429/2020 distinguishes added vs natural)
    added_sugars += g * (parseFloat(ingredient.added_sugars) || 0) / 100;
    // Micronutrientes (per-100g a peso real). Para campos en mg/mcg ya estan
    // en mg/mcg por 100g, asi que (g/100) * valor.
    cholesterol_mg += g * (parseFloat(ingredient.cholesterol_mg) || 0) / 100;
    vitamind_mcg   += g * (parseFloat(ingredient.vitamind_mcg)   || 0) / 100;
    calcium_mg     += g * (parseFloat(ingredient.calcium_mg)     || 0) / 100;
    iron_mg        += g * (parseFloat(ingredient.iron_mg)        || 0) / 100;
    potassium_mg   += g * (parseFloat(ingredient.potassium_mg)   || 0) / 100;
  }

  const pGrasa   = T > 0 ? grasa   / T : 0;
  const pAzucar  = T > 0 ? azucar  / T : 0;
  const pAgua    = T > 0 ? agua    / T : 0;
  const pSng     = T > 0 ? sng     / T : 0;
  const pSolids  = T > 0 ? (T - agua) / T : 0;
  const pProtein = T > 0 ? protein / T : 0;
  const pStab    = T > 0 ? stabiliser / T : 0;

  // FPD — Formula polinomial del Demo GelatoPassport
  //
  // Demo original acumula PAC asi:  getSumPAC() = Σ (peso × pac_csv / 100)
  //   donde pac_csv usa escala: sacarosa=100, dextrosa=190, leche=5
  // Nuestro JSON usa escala /100:  sacarosa=1.0, dextrosa=1.9, leche=0.05
  //   y acumulamos: pac += g * ingredient.pac / 10
  //   Entonces pac_acum = getSumPAC_demo / 10
  //
  // Demo formula FPD:
  //   PAC_conc = (getSumPAC()/getSum()*100) / (getSumAcqua()/getSum())
  //            = (sumPAC/T * 100) / waterFrac
  //   En nuestros terminos: (pac_acum*10 / T * 100) / waterFrac
  //                       = (pac / T * 1000) / waterFrac
  //                       = pacPct / waterFrac
  //
  const waterPct = T > 0 ? (agua / T) * 100 : 0;
  const waterFrac = T > 0 ? agua / T : 0;
  const pacPct = T > 0 ? (pac / T) * 1000 : 0; // = getSumPAC()/getSum()*1000 del Demo
  const podPct = T > 0 ? (pod / T) * 1000 : 0;
  const msnfPct = T > 0 ? (msnf / T) * 100 : 0;

  // pacConc = (getSumPAC()/getSum()*100) / waterFrac = pacPct / waterFrac
  // Porque: pacPct = pac_acum/T*1000 = getSumPAC_demo/T*100
  const pacConc = waterFrac > 0 ? pacPct / waterFrac : 0;

  let fpd = 0;
  if (pacConc > 0 && waterPct > 0) {
    fpd = (-9e-5) * Math.pow(pacConc, 2)
        - 0.0612 * pacConc
        + msnfPct * (-2.37) / waterPct;
  }

  return {
    T, agua, grasa, azucar, sng, otros, protein,
    pod, pac, cost, fpd,
    pGrasa, pAzucar, pAgua, pSng, pSolids, pProtein, pStab,
    pacPct, podPct, pacConc,
    msnf, lactose, fibers, polyols, totcarbo,
    satfat, salt, sugars, stabiliser, calories,
    trans_fat, sodium_mg, added_sugars,
    cholesterol_mg, vitamind_mcg, calcium_mg, iron_mg, potassium_mg,
    msnfPct, waterPct, waterFrac,
    costPer100g: T > 0 ? (cost / T) * 100 : 0,
  };
}

// ── Fraccion de hielo a una temperatura ─────────────────────
// Formula Demo: IF = (1.105*waterFrac) / (1 + 0.8765/ln(offset+1))
// offset = |temp| - |FPD|  (cuantos grados por debajo del FPD)
export function calcIceFraction(waterFrac, fpd, tempC) {
  if (!fpd || fpd === 0 || !waterFrac) return 0;
  const offset = Math.abs(tempC) - Math.abs(fpd);
  if (offset <= 0) return 0;
  const lnVal = Math.log(offset + 1);
  if (lnVal === 0) return 0;
  return (1.105 * waterFrac) / (1 + 0.8765 / lnVal);
}

// ── % de agua congelada ─────────────────────────────────────
export function calcFrozenWaterPct(waterFrac, fpd, tempC) {
  if (!waterFrac || waterFrac === 0) return 0;
  const iceFrac = calcIceFraction(waterFrac, fpd, tempC);
  return (iceFrac / waterFrac) * 100;
}

// ── Curva de congelamiento ────────────────────────────────
// Devuelve por cada punto: temp, frozenPct (% del agua congelada),
// icePct (% de masa total que es hielo) y freeWaterPct (% de masa total que
// es agua liquida remanente). Inspirado en IceCreamCalc 4: %FW/HF, Ice%, FreeW%.
export function calcFreezingCurve(stats, count = 28) {
  if (!stats || !stats.fpd || stats.fpd === 0) return [];
  const points = [];
  for (let n = 0; n <= count; n++) {
    const temp = stats.fpd - n;
    const iceFrac = n === 0 ? 0 : calcIceFraction(stats.waterFrac, stats.fpd, temp);
    const frozenPct = n === 0 ? 0 : (iceFrac / stats.waterFrac) * 100;
    const icePct = iceFrac * 100;
    const freeWaterPct = Math.max(0, (stats.waterFrac - iceFrac)) * 100;
    points.push({
      temp:           parseFloat(temp.toFixed(2)),
      frozenPct:      parseFloat(frozenPct.toFixed(2)),
      icePct:         parseFloat(icePct.toFixed(2)),
      freeWaterPct:   parseFloat(freeWaterPct.toFixed(2)),
    });
  }
  return points;
}

// ── Temperatura para alcanzar un %FW objetivo ───────────────
// Dado un % de agua congelada (HF) deseado, devuelve la temperatura en °C
// interpolando linealmente la curva de congelamiento.
export function tempForFrozenPct(stats, targetFwPct) {
  const curve = calcFreezingCurve(stats, 60);
  if (!curve.length) return null;
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1];
    if (a.frozenPct <= targetFwPct && b.frozenPct >= targetFwPct) {
      const r = (targetFwPct - a.frozenPct) / (b.frozenPct - a.frozenPct || 1);
      return parseFloat((a.temp + (b.temp - a.temp) * r).toFixed(2));
    }
  }
  return null;
}

// Targets tipicos para los marcadores de la curva (inspirado en ICC4).
export const FREEZING_TARGETS = {
  extraction: { pct: 50, label: 'Extraccion',  color: '#f9a825' },
  gelato:     { pct: 69, label: 'Servicio gelato', color: '#c0392b' },
  iceCream:   { pct: 75, label: 'Servicio helado', color: '#2e7d32' },
};

// ── Densidad (a 1-10 C) ─────────────────────────────────────
// D = 100 / (fat%/0.93 + (solids%-fat%)/1.58 + (100-solids%))
export function calcDensity(stats) {
  if (!stats || stats.T === 0) return 0;
  const fatPct = stats.pGrasa * 100;
  const solidsPct = stats.T > 0
    ? ((stats.T - stats.agua) / stats.T) * 100
    : 0;
  const denom = fatPct / 0.93 + (solidsPct - fatPct) / 1.58 + (100 - solidsPct);
  return denom > 0 ? 100 / denom : 0;
}

// ── Saturacion de lactosa ───────────────────────────────────
export function calcLactoseSaturation(stats) {
  if (!stats || stats.agua === 0) return 0;
  const lacPct = stats.T > 0 ? (stats.lactose / stats.T) * 100 : 0;
  const waterPct = stats.T > 0 ? (stats.agua / stats.T) * 100 : 0;
  return waterPct > 0 ? (lacPct / waterPct) * 100 : 0;
}

// ── NPAC (PAC/Agua) ─────────────────────────────────────────
// Demo: (getSumPAC()/getSum()*1000) / (100 - solidsPct) * 100
// getSumPAC/T*1000 = pac_acum*10/T*1000 = pacPct * 10
export function calcNPAC(stats) {
  if (!stats || stats.T === 0) return 0;
  const solidsPct = ((stats.T - stats.agua) / stats.T) * 100;
  const pacDisplay = stats.pacPct * 10; // = getSumPAC_demo / T * 1000
  return (100 - solidsPct) > 0 ? (pacDisplay / (100 - solidsPct)) * 100 : 0;
}

// ── Concentracion de estabilizantes en agua ─────────────────
export function calcStabiliserConc(stats) {
  if (!stats || stats.agua === 0) return 0;
  const stabPct = stats.T > 0 ? (stats.stabiliser / stats.T) * 100 : 0;
  const waterPct = stats.T > 0 ? (stats.agua / stats.T) * 100 : 0;
  return waterPct > 0 ? (stabPct / waterPct) * 100 : 0;
}

// ── Overrun por densidad ────────────────────────────────────
export function calcOverrunByDensity(density, mIce, mWater) {
  if (!mIce || !mWater || mWater === 0) return null;
  const ratio = mIce / mWater;
  return ratio > 0 ? ((density - ratio) / ratio) * 100 : null;
}

// ── Overrun por peso ────────────────────────────────────────
export function calcOverrunByWeight(wMix, wIce) {
  if (!wMix || !wIce || wIce === 0) return null;
  return 100 * (wMix - wIce) / wIce;
}

// ── Valores nutricionales por 100g ──────────────────────────
export function calcNutritionalValues(stats) {
  if (!stats || stats.T === 0) return null;
  const per100 = (v) => (v / stats.T) * 100;
  const kcal = per100(stats.calories);
  return {
    energyKJ:    kcal * 4.184,
    energyKcal:  kcal,
    totalFat:    per100(stats.grasa),
    saturatedFat:per100(stats.satfat),
    transFat:    per100(stats.trans_fat || 0),
    carbs:       per100(stats.totcarbo),
    carbsEU:     per100(stats.totcarbo) - per100(stats.fibers),
    sugars:      per100(stats.sugars),
    addedSugars: per100(stats.added_sugars || 0),
    polyols:     per100(stats.polyols),
    fibers:      per100(stats.fibers),
    protein:     per100(stats.protein),
    salt:        per100(stats.salt),
    sodiumMg:    per100(stats.sodium_mg || 0),
    cholesterolMg: per100(stats.cholesterol_mg || 0),
    vitaminDMcg:   per100(stats.vitamind_mcg || 0),
    calciumMg:     per100(stats.calcium_mg || 0),
    ironMg:        per100(stats.iron_mg || 0),
    potassiumMg:   per100(stats.potassium_mg || 0),
    energyFromProtein: kcal > 0 ? (per100(stats.protein) * 4 / kcal) * 100 : 0,
    energyFromFat:     kcal > 0 ? (per100(stats.grasa) * 4 / kcal) * 100 : 0,
  };
}

// ── Sellos ALTO EN — Ley 20.606 / MINSAL Chile ─────────────
// Umbrales por 100 g (alimento sólido), etapa final vigente jun-2019.
// Helados se evaluan como sólidos.
const CHILE_LIMITS_SOLID = {
  energyKcal: 275,
  sugars:     10,
  saturatedFat: 4,
  sodiumMg:   400,
};

// ── Allergens ───────────────────────────────────────────────
// Subset of EU Reg. 1169/2011 / Codex relevant to ice cream / gelato.
// The key is the canonical id; the UI translates via i18n keys allergen_*.
export const ALLERGEN_IDS = ['milk', 'egg', 'gluten', 'soy', 'tree_nuts', 'peanut', 'sesame', 'sulfites'];

/**
 * Aggregate the set of allergens present in a recipe's ingredient list.
 * Returns a sorted array of allergen ids that appear at least once.
 */
export function calcRecipeAllergens(items) {
  const set = new Set();
  for (const { qty_grams, ingredient } of items) {
    if (!ingredient || !qty_grams || qty_grams <= 0) continue;
    const list = Array.isArray(ingredient.allergens) ? ingredient.allergens : [];
    list.forEach(a => { if (ALLERGEN_IDS.includes(a)) set.add(a); });
  }
  return ALLERGEN_IDS.filter(a => set.has(a));
}

/**
 * Allergen declaration with 3 states (EU Reg 1169 / Codex Alimentarius):
 *   - 'contains': must declare ("Contiene: ...")
 *   - 'trace': may contain traces from cross-contamination ("Puede contener trazas de: ...")
 *   - 'other': legacy/local categorization (not commonly used in EU/LATAM)
 *   - 'none': do not declare
 *
 * `overrides` is a partial map { allergen_id: state } that overrides the
 * auto-detected default ("contains" if the ingredient list contains it,
 * "none" otherwise). Lets the user declare trazas for allergens not present
 * in the formula but possibly handled in the same kitchen.
 */
export function calcRecipeAllergensDetailed(items, overrides = {}) {
  const detected = new Set(calcRecipeAllergens(items));
  const out = { contains: [], trace: [], other: [] };
  for (const id of ALLERGEN_IDS) {
    const auto = detected.has(id) ? 'contains' : 'none';
    const state = overrides[id] || auto;
    if (state === 'contains') out.contains.push(id);
    else if (state === 'trace') out.trace.push(id);
    else if (state === 'other') out.other.push(id);
    // 'none' → not declared
  }
  return out;
}

// ── Auto-balance assistant ──────────────────────────────────
// Classifies an ingredient by its primary "role" so the balancer can pick
// the right lever to adjust a given parameter. Heuristic, conservative.
export function ingredientRole(ing) {
  if (!ing) return null;
  const cat = (ing.category || '').toLowerCase();
  const water = parseFloat(ing.water_pct) || 0;
  const fat   = parseFloat(ing.fat_pct)   || 0;
  const sng   = parseFloat(ing.sng_pct)   || 0;
  const sugar = parseFloat(ing.sugar_pct) || 0;
  const stab  = parseFloat(ing.stabiliser) || 0;
  if (cat === 'estabilizante' || stab > 50) return 'stabilizer';
  if (water > 90) return 'water';
  // Only treat as a fat lever if it's a dairy product. Otherwise (pasta de
  // avellana, pasta de pistacho, etc.) the balancer would suggest increasing
  // a flavor paste to fix fat, which distorts the recipe.
  if (cat === 'lacteo' && fat > 25 && sng < 15) return 'fat';        // crema, mantequilla
  if (sng > 60 && fat < 10) return 'msnf';                            // leche en polvo descremada
  if (sugar > 80 && fat < 5) return 'sugar';                          // azúcares puros
  if (cat === 'lacteo' && fat > 0) return 'milk_whole';
  return 'other';
}

// Pick the most impactful candidate from a list for a given role.
function bestLever(items, role) {
  const scored = items
    .filter(i => i.ingredient && ingredientRole(i.ingredient) === role)
    .map(i => {
      const ing = i.ingredient;
      const score = role === 'fat'        ? (parseFloat(ing.fat_pct)   || 0)
                  : role === 'sugar'      ? (parseFloat(ing.sugar_pct) || 0)
                  : role === 'msnf'       ? (parseFloat(ing.sng_pct)   || 0)
                  : role === 'water'      ? (parseFloat(ing.water_pct) || 0)
                  : role === 'stabilizer' ? 1
                  : 0;
      return { item: i, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.item || null;
}

/**
 * Inspect a recipe and return concrete suggestions (which ingredient to
 * adjust by how many grams) to push out-of-range parameters back into the
 * optimal band defined by `getParams(type)`.
 *
 * Each suggestion has shape:
 *   { paramKey, paramLabel, current, target_low, target_high,
 *     ingredient_id, ingredient_name, delta_g, direction }
 *
 * Suggestions are sorted by severity (worst-off first). The user applies
 * them one by one; the recipe is recomputed after each application.
 */
export function analyzeRecipe(items, type, stats, opts = {}) {
  if (!items?.length || !stats || stats.T === 0) return [];
  const baseParams = getParams(type, opts.subtype || 'base');

  // Si el usuario fijo una T° de servicio, sustituimos el rango estatico de
  // PAC por una banda estrecha alrededor del PAC que produce esa temperatura
  // (±10 PAC display ≈ ±0.5°C). Asi el balanceador se rige por la T° elegida
  // y no por el rango por defecto que puede chocar con ella.
  const params = baseParams.map(p => {
    if (p.k !== 'pacPct' || opts.servingTemp == null) return p;
    const targetPac = tempToPacDisplay(opts.servingTemp);
    if (targetPac == null) return p;
    const oLo = Math.max(0, (targetPac - 10) / 10);
    const oHi = (targetPac + 10) / 10;
    return { ...p, oLo, oHi, aLo: Math.max(0, oLo - 0.005), aHi: oHi + 0.005 };
  });

  const suggestions = [];

  // Map stats key -> primary lever role for adjustment.
  const LEVERS = {
    pAzucar:  'sugar',
    pGrasa:   'fat',
    pSng:     'msnf',
    pAgua:    'water',
    pStab:    'stabilizer',
  };
  // For total solids and POD/PAC we adjust water and sugar respectively.
  const SECONDARY = {
    pSolids: 'water',  // less water = more solids
    podPct:  'sugar',  // POD scales with total sugars
    pacPct:  'sugar',  // PAC also scales with total sugars (rough approximation)
  };

  for (const p of params) {
    const cur = stats[p.k];
    if (cur == null) continue;
    if (cur >= p.oLo && cur <= p.oHi) continue; // already in range

    const role = LEVERS[p.k] || SECONDARY[p.k];
    if (!role) continue;
    const lever = bestLever(items, role);
    if (!lever) continue;

    // Compute approximate delta needed. For solids parameters we estimate by
    // how much the lever's contribution must change to move the percentage.
    // Linear approximation: delta_g ≈ (target_mid - cur) * T / contribution_per_g
    const targetMid = (p.oLo + p.oHi) / 2;
    const T = stats.T;

    // Sensitivity: how much the parameter changes per gram of the lever.
    let sensitivity = 0;
    if (p.k === 'pSolids') sensitivity = -1 / T; // adding water reduces solids fraction
    else if (p.k === 'pAgua') sensitivity = 1 / T;
    else {
      // For composition fractions (sugar, fat, sng): sens = (lever_pct/100) / T
      const fieldByRole = {
        sugar:      'sugar_pct',
        fat:        'fat_pct',
        msnf:       'sng_pct',
        water:      'water_pct',
        stabilizer: 'stabiliser',
      };
      const f = fieldByRole[role];
      const pct = (parseFloat(lever.ingredient[f]) || 0) / 100;
      sensitivity = pct / T;
    }
    if (Math.abs(sensitivity) < 1e-9) continue;

    let delta_g = (targetMid - cur) / sensitivity;
    // Special handling for POD/PAC where we treat scale-of-sugars as the lever:
    if (p.k === 'podPct' || p.k === 'pacPct') {
      // current = stats[k] = (sum / T) * 1000; we want target = (sum + dx*lever_pac) / T * 1000
      // dx = (target - current) * T / (1000 * lever_field)
      const field = p.k === 'podPct' ? 'pod' : 'pac';
      const leverVal = parseFloat(lever.ingredient[field]) || 0;
      if (leverVal === 0) continue;
      delta_g = (targetMid - cur) * T / (1000 * leverVal);
    }

    // Round to a sensible step (5g) and bound to ±25% of current quantity
    // (smaller cap reduces side effects on other parameters).
    const rounded = Math.round(delta_g / 5) * 5;
    const cap = Math.max(20, lever.qty_grams * 0.25);
    const bounded = Math.max(-cap, Math.min(cap, rounded));
    if (Math.abs(bounded) < 5) continue;

    suggestions.push({
      paramKey:        p.k,
      paramLabel:      p.lbl,
      current:         cur,
      target_low:      p.oLo,
      target_high:     p.oHi,
      ingredient_id:   lever.ingredient_id || lever.ingredient.id,
      ingredient_name: lever.ingredient.name,
      delta_g:         bounded,
      direction:       bounded > 0 ? 'add' : 'reduce',
      severity:        Math.abs((cur - targetMid) / Math.max(targetMid, 1e-6)),
    });
  }

  return suggestions.sort((a, b) => b.severity - a.severity);
}

/**
 * Iteratively run analyzeRecipe + apply highest-severity suggestion until
 * either every parameter is in its optimal band, no further improvement is
 * possible, or the iteration cap is hit. Pure: returns a new items list and
 * a summary; does NOT mutate the caller's data.
 *
 * The damping factor (default 0.5) shrinks each step so the linear
 * approximation in analyzeRecipe doesn't overshoot. Smaller = safer, slower.
 */
export function autoBalanceRecipe(items, type, { maxIter = 20, damping = 0.6, servingTemp = null, subtype = 'base' } = {}) {
  const next = items.map(i => ({
    qty_grams: parseFloat(i.qty_grams) || 0,
    ingredient_id: i.ingredient_id || i.ingredient?.id,
    ingredient: i.ingredient,
  }));

  const initialStats = calcStats(next);
  let stats = initialStats;
  const trace = [];
  let iterations = 0;
  let converged = false;

  for (let it = 0; it < maxIter; it++) {
    iterations = it + 1;
    const suggestions = analyzeRecipe(next, type, stats, { servingTemp, subtype });
    if (suggestions.length === 0) { converged = true; break; }

    const top = suggestions[0];
    const idx = next.findIndex(r => String(r.ingredient_id) === String(top.ingredient_id));
    if (idx < 0) break;

    const dampedDelta = top.delta_g * damping;
    const newQty = Math.max(0, next[idx].qty_grams + dampedDelta);
    const previousQty = next[idx].qty_grams;
    next[idx] = { ...next[idx], qty_grams: parseFloat(newQty.toFixed(2)) };
    trace.push({
      iteration: iterations,
      param: top.paramKey,
      ingredient: top.ingredient_name,
      from: previousQty,
      to: next[idx].qty_grams,
      delta: parseFloat(dampedDelta.toFixed(2)),
    });

    stats = calcStats(next);
    // Bail out if the change had negligible effect (avoids tight loops).
    if (Math.abs(dampedDelta) < 0.5) { break; }
  }

  return {
    items: next,
    initialStats,
    finalStats: stats,
    iterations,
    converged,
    trace,
    remainingSuggestions: analyzeRecipe(next, type, stats, { servingTemp, subtype }),
  };
}

export function calcChileanLabelSeals(nv) {
  if (!nv) return { seals: [], count: 0 };
  const seals = [];
  if (nv.energyKcal   >= CHILE_LIMITS_SOLID.energyKcal)   seals.push({ key: 'energy',  value: nv.energyKcal,   limit: CHILE_LIMITS_SOLID.energyKcal,   unit: 'kcal' });
  if (nv.sugars       >= CHILE_LIMITS_SOLID.sugars)       seals.push({ key: 'sugars',  value: nv.sugars,       limit: CHILE_LIMITS_SOLID.sugars,       unit: 'g' });
  if (nv.saturatedFat >= CHILE_LIMITS_SOLID.saturatedFat) seals.push({ key: 'satfat',  value: nv.saturatedFat, limit: CHILE_LIMITS_SOLID.saturatedFat, unit: 'g' });
  if (nv.sodiumMg     >= CHILE_LIMITS_SOLID.sodiumMg)     seals.push({ key: 'sodium',  value: nv.sodiumMg,     limit: CHILE_LIMITS_SOLID.sodiumMg,     unit: 'mg' });
  return { seals, count: seals.length, limits: CHILE_LIMITS_SOLID };
}

// ── Temperatura de servicio ─────────────────────────────────
// Tabla PAC objetivo → Temperatura de servicio (sistema Corvitto)
// PAC display = pacPct * 10 (escala donde sacarosa ~ 1000)
//
// Valores de "Los Secretos del Helado" (Angelo Corvitto). La tabla
// previa estaba 1 C mas caliente en cada fila (e.g. PAC 240 → -10) lo
// que generaba T servicio engaosamente templadas y rompia el balance
// inverso (tempToPacDisplay). Corregido a la referencia industrial.
const PAC_TEMP_TABLE = [
  { pac: 200, temp: -8  },
  { pac: 220, temp: -10 },
  { pac: 240, temp: -11 },
  { pac: 260, temp: -12 },
  { pac: 280, temp: -13 },
  { pac: 300, temp: -14 },
  { pac: 320, temp: -15 },
  { pac: 340, temp: -16 },
  { pac: 360, temp: -17 },
  { pac: 380, temp: -18 },
];

// Interpola la T° de servicio a partir del PAC total acumulado
// pacPct = stats.pacPct (valor interno), PAC display = pacPct * 10
export function calcServingTemp(stats) {
  if (!stats || !stats.pacPct) return null;
  const pacDisplay = stats.pacPct * 10;
  if (pacDisplay <= 0) return null;

  // Si esta fuera de la tabla, extrapolar linealmente
  const table = PAC_TEMP_TABLE;
  if (pacDisplay <= table[0].pac) {
    // Extrapolacion por debajo: ~1°C por cada 20 PAC
    const diff = (table[0].pac - pacDisplay) / 20;
    return parseFloat((table[0].temp + diff).toFixed(1));
  }
  if (pacDisplay >= table[table.length - 1].pac) {
    const last = table[table.length - 1];
    const prev = table[table.length - 2];
    const slope = (last.temp - prev.temp) / (last.pac - prev.pac);
    return parseFloat((last.temp + slope * (pacDisplay - last.pac)).toFixed(1));
  }

  // Interpolacion lineal entre los dos puntos mas cercanos
  for (let i = 0; i < table.length - 1; i++) {
    if (pacDisplay >= table[i].pac && pacDisplay <= table[i + 1].pac) {
      const t = (pacDisplay - table[i].pac) / (table[i + 1].pac - table[i].pac);
      const temp = table[i].temp + t * (table[i + 1].temp - table[i].temp);
      return parseFloat(temp.toFixed(1));
    }
  }
  return null;
}

export { PAC_TEMP_TABLE };

// Inversa: dada una temperatura de servicio, devuelve el PAC display objetivo
// (para que la receta alcance esa temperatura). Usado por el balanceador para
// que respete la T° elegida por el usuario en lugar del rango estatico.
export function tempToPacDisplay(temp) {
  if (temp == null) return null;
  const table = PAC_TEMP_TABLE;
  for (let i = 0; i < table.length - 1; i++) {
    const t1 = table[i].temp, t2 = table[i + 1].temp;
    const lo = Math.min(t1, t2), hi = Math.max(t1, t2);
    if (temp >= lo && temp <= hi) {
      if (t2 === t1) return table[i].pac;
      const r = (temp - t1) / (t2 - t1);
      return table[i].pac + r * (table[i + 1].pac - table[i].pac);
    }
  }
  if (temp > table[0].temp) return Math.max(0, table[0].pac - (temp - table[0].temp) * 20);
  const last = table[table.length - 1], prev = table[table.length - 2];
  const slope = (last.pac - prev.pac) / (last.temp - prev.temp);
  return last.pac + slope * (temp - last.temp);
}

// ── Rangos de temperatura de servicio ────────────────────────
export const SERVING_RANGE = {
  helado:  { lo: -16, hi: -8,  opt_lo: -14, opt_hi: -10 },
  gelato:  { lo: -16, hi: -8,  opt_lo: -14, opt_hi: -11 },
  sorbete: { lo: -17, hi: -9,  opt_lo: -15, opt_hi: -12 },
};

export function rateServingTemp(ts, type = 'helado') {
  if (ts == null) return 'na';
  const r = SERVING_RANGE[type] || SERVING_RANGE.helado;
  if (ts >= r.opt_lo && ts <= r.opt_hi) return 'opt';
  if (ts >= r.lo     && ts <= r.hi)     return 'acc';
  return 'bad';
}

// ── Parametros tecnicos por tipo ────────────────────────────
// Rangos basados en referencia de formulacion artesanal
const pct = v => (v*100).toFixed(1)+'%';
const f2  = v => v.toFixed(2);

// PAC display = pacPct * 10 (escala Corvitto, sacarosa=1000)
// Se calcula aparte porque necesita transformacion
const podDisp = v => (v * 10).toFixed(0);
const pacDisp = v => (v * 10).toFixed(0);

const PARAMS_BY_TYPE = {
  helado: [
    { k:'pAgua',     lbl:'param_water',               fmt:pct,     rangeLbl:'55-65%',       oLo:.55, oHi:.65, aLo:.50, aHi:.70, max:.80 },
    { k:'pSolids',   lbl:'param_solids',     fmt:pct,     rangeLbl:'36-42%',       oLo:.36, oHi:.42, aLo:.30, aHi:.48, max:.55 },
    { k:'pAzucar',   lbl:'param_sugar',    fmt:pct,     rangeLbl:'16-22%',       oLo:.16, oHi:.22, aLo:.14, aHi:.26, max:.35 },
    { k:'pGrasa',    lbl:'param_fat',               fmt:pct,     rangeLbl:'6-10%',        oLo:.06, oHi:.10, aLo:.04, aHi:.14, max:.20 },
    { k:'pSng',      lbl:'param_sng',          fmt:pct,     rangeLbl:'7-11%',        oLo:.07, oHi:.11, aLo:.05, aHi:.13, max:.18 },
    { k:'pProtein',  lbl:'param_protein',           fmt:pct,     rangeLbl:'3-5%',         oLo:.03, oHi:.05, aLo:.02, aHi:.07, max:.10 },
    { k:'podPct',    lbl:'param_pod',        fmt:podDisp, rangeLbl:'150-180',      oLo:15,  oHi:18,  aLo:12,  aHi:22,  max:30 },
    { k:'pacPct',    lbl:'param_pac',fmt:pacDisp, rangeLbl:'240-300',      oLo:24,  oHi:30,  aLo:20,  aHi:36,  max:45 },
    { k:'pStab',     lbl:'param_stab',fmt:pct,     rangeLbl:'0.3-0.7%',     oLo:.003,oHi:.007,aLo:.002,aHi:.010,max:.015 },
  ],
  gelato: [
    { k:'pAgua',     lbl:'param_water',               fmt:pct,     rangeLbl:'58-65%',       oLo:.58, oHi:.65, aLo:.55, aHi:.70, max:.80 },
    { k:'pSolids',   lbl:'param_solids',     fmt:pct,     rangeLbl:'35-40%',       oLo:.35, oHi:.40, aLo:.30, aHi:.45, max:.55 },
    { k:'pAzucar',   lbl:'param_sugar',    fmt:pct,     rangeLbl:'16-22%',       oLo:.16, oHi:.22, aLo:.14, aHi:.26, max:.35 },
    { k:'pGrasa',    lbl:'param_fat',               fmt:pct,     rangeLbl:'4-9%',         oLo:.04, oHi:.09, aLo:.03, aHi:.12, max:.15 },
    { k:'pSng',      lbl:'param_sng',          fmt:pct,     rangeLbl:'9-12%',        oLo:.09, oHi:.12, aLo:.07, aHi:.14, max:.18 },
    { k:'pProtein',  lbl:'param_protein',           fmt:pct,     rangeLbl:'3.5-5%',       oLo:.035,oHi:.05, aLo:.025,aHi:.07, max:.10 },
    { k:'podPct',    lbl:'param_pod',        fmt:podDisp, rangeLbl:'150-180',      oLo:15,  oHi:18,  aLo:12,  aHi:22,  max:30 },
    { k:'pacPct',    lbl:'param_pac',fmt:pacDisp, rangeLbl:'260-280',      oLo:26,  oHi:28,  aLo:22,  aHi:32,  max:45 },
    { k:'pStab',     lbl:'param_stab',fmt:pct,     rangeLbl:'0.3-0.6%',     oLo:.003,oHi:.006,aLo:.002,aHi:.008,max:.012 },
  ],
  sorbete: [
    { k:'pAgua',     lbl:'param_water',               fmt:pct,     rangeLbl:'60-72%',       oLo:.60, oHi:.72, aLo:.55, aHi:.78, max:.85 },
    { k:'pSolids',   lbl:'param_solids',     fmt:pct,     rangeLbl:'28-40%',       oLo:.28, oHi:.40, aLo:.22, aHi:.45, max:.55 },
    { k:'pAzucar',   lbl:'param_sugar',    fmt:pct,     rangeLbl:'22-32%',       oLo:.22, oHi:.32, aLo:.18, aHi:.36, max:.42 },
    { k:'pGrasa',    lbl:'param_fat',               fmt:pct,     rangeLbl:'0-1%',         oLo:0,   oHi:.01, aLo:0,   aHi:.03, max:.05 },
    { k:'pSng',      lbl:'param_sng',          fmt:pct,     rangeLbl:'0-1%',         oLo:0,   oHi:.01, aLo:0,   aHi:.03, max:.05 },
    { k:'pProtein',  lbl:'param_protein',           fmt:pct,     rangeLbl:'0-1%',         oLo:0,   oHi:.01, aLo:0,   aHi:.02, max:.05 },
    { k:'podPct',    lbl:'param_pod',        fmt:podDisp, rangeLbl:'220-280',      oLo:22,  oHi:28,  aLo:18,  aHi:32,  max:40 },
    { k:'pacPct',    lbl:'param_pac',fmt:pacDisp, rangeLbl:'280-320',      oLo:28,  oHi:32,  aLo:24,  aHi:36,  max:45 },
    { k:'pStab',     lbl:'param_stab',fmt:pct, rangeLbl:'0.3-0.5%',  oLo:.003,oHi:.005,aLo:.002,aHi:.007,max:.010 },
  ],
};

// ── Subtipos por tipo ───────────────────────────────────────
// Inspirado en los charts de IceCreamCalc 4: una receta de fruta, una con
// chocolate/frutos secos o una con alcohol no se rige por los mismos rangos
// que la base. Los overrides se aplican por encima de PARAMS_BY_TYPE[type].
// 'base' = sin override.
const SUBTYPE_OVERRIDES = {
  helado: {
    base: {},
    fruit: {
      pGrasa: { oLo: .04, oHi: .08, aLo: .03, aHi: .12 },
    },
    chocolate_nuts: {
      pGrasa:  { oLo: .07, oHi: .14, aLo: .05, aHi: .18 },
      pSolids: { oLo: .40, oHi: .47, aLo: .35, aHi: .50 },
      pAgua:   { oLo: .53, oHi: .60, aLo: .50, aHi: .65 },
      podPct:  { oLo: 17,  oHi: 19,  aLo: 14,  aHi: 22 },
    },
    alcohol: {
      podPct: { oLo: 14, oHi: 17, aLo: 12, aHi: 20 },
    },
  },
  gelato: {
    base: {},
    fruit: {
      pGrasa: { oLo: .03, oHi: .07, aLo: .02, aHi: .10 },
    },
    chocolate_nuts: {
      pGrasa:  { oLo: .05, oHi: .12, aLo: .04, aHi: .15 },
      pSolids: { oLo: .35, oHi: .44, aLo: .30, aHi: .48 },
      pAgua:   { oLo: .56, oHi: .65, aLo: .52, aHi: .70 },
    },
    alcohol: {
      podPct: { oLo: 14, oHi: 16, aLo: 11, aHi: 19 },
    },
  },
  sorbete: {
    base: {},
    fruit: {},
    chocolate_nuts: {
      pGrasa:  { oLo: .02, oHi: .08, aLo: .01, aHi: .12 },
      pSolids: { oLo: .30, oHi: .42, aLo: .25, aHi: .48 },
    },
    alcohol: {
      podPct: { oLo: 8, oHi: 14, aLo: 6, aHi: 18 },
    },
  },
};

export const SUBTYPES = ['base', 'fruit', 'chocolate_nuts', 'alcohol'];

export function getParams(type = 'helado', subtype = 'base') {
  const base = PARAMS_BY_TYPE[type] || PARAMS_BY_TYPE.helado;
  const overrides = (SUBTYPE_OVERRIDES[type] && SUBTYPE_OVERRIDES[type][subtype]) || {};
  if (Object.keys(overrides).length === 0) return base;
  return base.map(p => {
    const o = overrides[p.k];
    if (!o) return p;
    return { ...p, ...o, rangeLbl: formatRange(p, { ...p, ...o }) };
  });
}

function formatRange(orig, merged) {
  // Re-format the human-readable range label after override.
  if (orig.k === 'podPct' || orig.k === 'pacPct') {
    return `${(merged.oLo * 10).toFixed(0)}-${(merged.oHi * 10).toFixed(0)}`;
  }
  return `${(merged.oLo * 100).toFixed(merged.oLo < 0.05 ? 1 : 0)}-${(merged.oHi * 100).toFixed(merged.oHi < 0.05 ? 1 : 0)}%`;
}

export function rateParam(value, p) {
  if (value >= p.oLo && value <= p.oHi) return 'opt';
  if (value >= p.aLo && value <= p.aHi) return 'acc';
  return 'bad';
}

// ── FPD rangos ──────────────────────────────────────────────
const FPD_RANGES = {
  helado:  { opt_lo: -3.0, opt_hi: -2.0, acc_lo: -4.0, acc_hi: -1.0 },
  gelato:  { opt_lo: -4.0, opt_hi: -2.0, acc_lo: -5.0, acc_hi: -1.0 },
  sorbete: { opt_lo: -2.5, opt_hi: -1.5, acc_lo: -3.5, acc_hi: -0.5 },
};

export function rateFpd(fpd, type = 'helado') {
  const r = FPD_RANGES[type] || FPD_RANGES.helado;
  if (fpd >= r.opt_lo && fpd <= r.opt_hi) return 'opt';
  if (fpd >= r.acc_lo && fpd <= r.acc_hi) return 'acc';
  return 'bad';
}

export function getFpdRange(type = 'helado') {
  return FPD_RANGES[type] || FPD_RANGES.helado;
}

// ── Veredicto general ───────────────────────────────────────
export function overallVerdict(stats, type = 'helado', subtype = 'base') {
  const params  = getParams(type, subtype);
  const fpdRate = rateFpd(stats.fpd, type);
  const ratings = [...params.map(p => rateParam(stats[p.k], p)), fpdRate];
  if (ratings.some(r => r === 'bad')) return 'bad';
  if (ratings.some(r => r === 'acc')) return 'acc';
  return 'opt';
}
