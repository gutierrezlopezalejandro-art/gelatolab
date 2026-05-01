// Equipment catalog for GelatoLab.
//
// Originally only batch freezers (mantecadoras) were tracked. The catalog now
// also includes pasteurizers and combo machines (e.g. Bravo Trittico) and
// per-model recommendations by recipe type.
//
// Schema per entry:
//   id           - stable slug
//   name         - display name (manufacturer + model)
//   manufacturer - brand
//   kind         - 'batch_freezer' | 'pasteurizer' | 'combo'
//   type         - 'home' | 'commercial' (size class)
//   optimal/min/max  - liters of mix per cycle
//   recOverrides - optional, partial overrides on top of BASELINE_RECS
//
// If the recipe volume falls outside [min, max] of the selected machine,
// GelatoLab shows a warning because both under-fill and over-fill harm
// pasteurization (uneven heating) and churning (shear / overrun).

// ----------------------------------------------------------------------------
// Baseline recommendations by recipe type. Values mirror the generic guidance
// shown in ProcessTab.jsx; specific machines may override individual fields.
// All temperatures in °C unless noted.
// ----------------------------------------------------------------------------
export const BASELINE_RECS = {
  helado: {
    pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s' },
    cool:       { setpoint: 4,  time: '< 30 min' },
    aging:      { setpoint: 4,  time: '4-12 h' },
    churn:      { extract_temp: -6, time: '10-20 min', overrun: '60-100%' },
    harden:     { setpoint: -18, time: '2-4 h' },
  },
  gelato: {
    pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s' },
    cool:       { setpoint: 4,  time: '< 30 min' },
    aging:      { setpoint: 4,  time: '6-12 h' },
    churn:      { extract_temp: -7, time: '8-12 min', overrun: '20-35%' },
    harden:     { setpoint: -14, time: '2-4 h' },
  },
  sorbete: {
    pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min' },
    cool:       { setpoint: 4,  time: '< 30 min' },
    aging:      { setpoint: 4,  time: '4-8 h' },
    churn:      { extract_temp: -5, time: '10-15 min', overrun: '0-10%' },
    harden:     { setpoint: -18, time: '2-4 h' },
  },
};

// Stage relevance per equipment kind. Home batch freezers don't pasteurize.
const KIND_STAGES = {
  batch_freezer: ['churn', 'harden'],
  pasteurizer:   ['pasteurize', 'cool', 'aging'],
  combo:         ['pasteurize', 'cool', 'aging', 'churn', 'harden'],
};

export const MACHINES = [
  // ── Batch freezers — Home / semipro ──
  { id: 'whynter-icm-128',   name: 'Whynter ICM-128',         manufacturer: 'Whynter',   kind: 'batch_freezer', type: 'home',       optimal: 0.61, min: 0.51, max: 0.70 },
  { id: 'breville-smart',    name: 'Breville Smart Scoop',    manufacturer: 'Breville',  kind: 'batch_freezer', type: 'home',       optimal: 0.71, min: 0.61, max: 0.81 },
  { id: 'cuisinart-ice-100', name: 'Cuisinart ICE-100',       manufacturer: 'Cuisinart', kind: 'batch_freezer', type: 'home',       optimal: 0.71, min: 0.61, max: 0.81 },
  { id: 'cuisinart-ice-20',  name: 'Cuisinart ICE-20',        manufacturer: 'Cuisinart', kind: 'batch_freezer', type: 'home',       optimal: 0.71, min: 0.61, max: 0.81 },
  { id: 'lello-musso-4080',  name: 'Lello Musso 4080',        manufacturer: 'Lello',     kind: 'batch_freezer', type: 'home',       optimal: 0.71, min: 0.61, max: 0.81 },
  { id: 'cube-750',          name: 'Cube 750',                manufacturer: 'Cube',      kind: 'batch_freezer', type: 'home',       optimal: 0.75, min: 0.64, max: 0.86 },
  { id: 'nemox-gelatissimo', name: 'Nemox Gelatissimo',       manufacturer: 'Nemox',     kind: 'batch_freezer', type: 'home',       optimal: 0.85, min: 0.72, max: 0.98 },
  { id: 'cuisinart-ice-30',  name: 'Cuisinart ICE-30',        manufacturer: 'Cuisinart', kind: 'batch_freezer', type: 'home',       optimal: 0.95, min: 0.80, max: 1.09 },
  { id: 'cuisinart-ice-70',  name: 'Cuisinart ICE-70',        manufacturer: 'Cuisinart', kind: 'batch_freezer', type: 'home',       optimal: 0.95, min: 0.80, max: 1.09 },
  { id: 'kitchenaid-attach', name: 'KitchenAid Attachment',   manufacturer: 'KitchenAid', kind: 'batch_freezer', type: 'home',      optimal: 0.95, min: 0.80, max: 1.09 },
  { id: 'whynter-icm-200',   name: 'Whynter ICM-200',         manufacturer: 'Whynter',   kind: 'batch_freezer', type: 'home',       optimal: 1.00, min: 0.85, max: 1.15 },
  { id: 'lello-musso-5030',  name: 'Lello Musso 5030',        manufacturer: 'Lello',     kind: 'batch_freezer', type: 'home',       optimal: 1.10, min: 0.94, max: 1.27 },
  { id: 'generic-1qt',       name: 'Generica 1 qt/L',         manufacturer: 'Generic',   kind: 'batch_freezer', type: 'home',       optimal: 0.47, min: 0.41, max: 0.55 },
  { id: 'generic-1.5qt',     name: 'Generica 1.5 qt/L',       manufacturer: 'Generic',   kind: 'batch_freezer', type: 'home',       optimal: 0.71, min: 0.61, max: 0.81 },
  { id: 'generic-2qt',       name: 'Generica 2 qt/L',         manufacturer: 'Generic',   kind: 'batch_freezer', type: 'home',       optimal: 0.95, min: 0.80, max: 1.09 },

  // ── Batch freezers — Commercial ──
  { id: 'carpigiani-maestro-rtx',  name: 'Carpigiani Maestro RTX', manufacturer: 'Carpigiani', kind: 'batch_freezer', type: 'commercial', optimal: 3.0,  min: 1.5,  max: 4.0,
    recOverrides: {
      gelato: { churn: { extract_temp: -8, time: '8-10 min', overrun: '25-35%' } },
    },
  },
  { id: 'frigomat-m50',            name: 'Frigomat M50',           manufacturer: 'Frigomat',   kind: 'batch_freezer', type: 'commercial', optimal: 5.0,  min: 3.0,  max: 7.0 },
  { id: 'carpigiani-lb-502',       name: 'Carpigiani LB 502',      manufacturer: 'Carpigiani', kind: 'batch_freezer', type: 'commercial', optimal: 5.0,  min: 3.0,  max: 7.0,
    recOverrides: {
      gelato:  { churn: { extract_temp: -8, time: '8-12 min', overrun: '25-35%' } },
      sorbete: { churn: { extract_temp: -5, time: '10-13 min', overrun: '5-10%' } },
    },
  },
  { id: 'telme-petra-100',         name: 'Telme Petra 100',        manufacturer: 'Telme',      kind: 'batch_freezer', type: 'commercial', optimal: 10.0, min: 6.0,  max: 13.0 },

  // ── Pasteurizers — Commercial ──
  { id: 'bravo-pastomaster-30',  name: 'Bravo Pastomaster 30 RTL',  manufacturer: 'Bravo',      kind: 'pasteurizer', type: 'commercial', optimal: 25,  min: 10, max: 30,
    recOverrides: {
      helado: { pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo P85' } },
      gelato: { pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo P85' } },
    },
  },
  { id: 'bravo-pastomaster-60',  name: 'Bravo Pastomaster 60 RTL',  manufacturer: 'Bravo',      kind: 'pasteurizer', type: 'commercial', optimal: 50,  min: 25, max: 60,
    recOverrides: {
      helado: { pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo P85' } },
      gelato: { pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo P85' } },
    },
  },
  { id: 'bravo-pastomaster-120', name: 'Bravo Pastomaster 120 RTL', manufacturer: 'Bravo',      kind: 'pasteurizer', type: 'commercial', optimal: 100, min: 50, max: 120 },
  { id: 'carpigiani-pastomatic-60',  name: 'Carpigiani Pastomatic 60 RTX',  manufacturer: 'Carpigiani', kind: 'pasteurizer', type: 'commercial', optimal: 50,  min: 25, max: 60 },
  { id: 'carpigiani-pastomatic-120', name: 'Carpigiani Pastomatic 120 RTX', manufacturer: 'Carpigiani', kind: 'pasteurizer', type: 'commercial', optimal: 100, min: 50, max: 120 },
  { id: 'frigomat-tm30',  name: 'Frigomat TM 30',  manufacturer: 'Frigomat', kind: 'pasteurizer', type: 'commercial', optimal: 25, min: 10, max: 30 },
  { id: 'frigomat-tm60',  name: 'Frigomat TM 60',  manufacturer: 'Frigomat', kind: 'pasteurizer', type: 'commercial', optimal: 50, min: 25, max: 60 },
  { id: 'telme-ecogel-30', name: 'Telme Ecogel 30', manufacturer: 'Telme',   kind: 'pasteurizer', type: 'commercial', optimal: 25, min: 10, max: 30 },
  { id: 'telme-ecogel-60', name: 'Telme Ecogel 60', manufacturer: 'Telme',   kind: 'pasteurizer', type: 'commercial', optimal: 50, min: 25, max: 60 },
  { id: 'generic-past-10', name: 'Pasteurizador generico 10 L',  manufacturer: 'Generic', kind: 'pasteurizer', type: 'commercial', optimal: 8,  min: 4,  max: 10 },
  { id: 'generic-past-30', name: 'Pasteurizador generico 30 L',  manufacturer: 'Generic', kind: 'pasteurizer', type: 'commercial', optimal: 25, min: 10, max: 30 },

  // ── Batch freezers — ICEMEL (Chile, fabricacion local) ──
  // El numero del modelo indica produccion APROXIMADA en L/h, no en L/ciclo.
  // Capacidades por ciclo confirmadas por el fabricante / usuario.
  { id: 'icemel-15',   name: 'Icemel 15',   manufacturer: 'Icemel', kind: 'batch_freezer', type: 'commercial', optimal: 2,  min: 1,  max: 3 },
  { id: 'icemel-30',   name: 'Icemel 30',   manufacturer: 'Icemel', kind: 'batch_freezer', type: 'commercial', optimal: 4,  min: 3,  max: 5 },
  { id: 'icemel-60',   name: 'Icemel 60',   manufacturer: 'Icemel', kind: 'batch_freezer', type: 'commercial', optimal: 10, min: 9,  max: 11 },
  { id: 'icemel-90',   name: 'Icemel 90',   manufacturer: 'Icemel', kind: 'batch_freezer', type: 'commercial', optimal: 15, min: 14, max: 16 },

  // ── Pasteurizers — ICEMEL ──
  // En la linea P el numero del modelo = capacidad MAXIMA del tanque (L/ciclo).
  // P30 confirmada por usuario: 10-30 L por ciclo, ciclo de pasteurizacion
  // de 120 min (incluye calentamiento + sostenimiento + enfriamiento). P60/P120
  // y la linea PD aplican la misma proporcion 1:3 min:max y misma duracion.
  { id: 'icemel-p30',  name: 'Icemel P30',  manufacturer: 'Icemel', kind: 'pasteurizer', type: 'commercial', optimal: 25,  min: 10, max: 30,
    recOverrides: {
      helado:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      gelato:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      sorbete: { pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min · ciclo total 120 min' } },
    },
  },
  { id: 'icemel-p60',  name: 'Icemel P60',  manufacturer: 'Icemel', kind: 'pasteurizer', type: 'commercial', optimal: 50,  min: 20, max: 60,
    recOverrides: {
      helado:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      gelato:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      sorbete: { pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min · ciclo total 120 min' } },
    },
  },
  { id: 'icemel-p120', name: 'Icemel P120', manufacturer: 'Icemel', kind: 'pasteurizer', type: 'commercial', optimal: 100, min: 40, max: 120,
    recOverrides: {
      helado:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      gelato:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      sorbete: { pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min · ciclo total 120 min' } },
    },
  },
  { id: 'icemel-pd60',  name: 'Icemel PD60 (doble cuba)',  manufacturer: 'Icemel', kind: 'pasteurizer', type: 'commercial', optimal: 50,  min: 20, max: 60,
    recOverrides: {
      helado:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      gelato:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      sorbete: { pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min · ciclo total 120 min' } },
    },
  },
  { id: 'icemel-pd120', name: 'Icemel PD120 (doble cuba)', manufacturer: 'Icemel', kind: 'pasteurizer', type: 'commercial', optimal: 100, min: 40, max: 120,
    recOverrides: {
      helado:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      gelato:  { pasteurize: { mode: 'HTST',   setpoint: 85, hold: '15 s · ciclo total 120 min' } },
      sorbete: { pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min · ciclo total 120 min' } },
    },
  },

  // ── Combos (pasteurizer + batch freezer in one machine) ──
  { id: 'bravo-trittico-304',       name: 'Bravo Trittico Executive 304', manufacturer: 'Bravo', kind: 'combo', type: 'commercial', optimal: 6.0, min: 4.0, max: 8.0,
    recOverrides: {
      helado: {
        pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo HOT' },
        churn:      { extract_temp: -6, time: '8-12 min', overrun: '60-90%' },
      },
      gelato: {
        pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo HOT' },
        churn:      { extract_temp: -8, time: '8-12 min', overrun: '25-35%' },
      },
      sorbete: {
        pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min · ciclo COLD' },
        churn:      { extract_temp: -5, time: '10-13 min', overrun: '5-10%' },
      },
    },
  },
  { id: 'bravo-trittico-612',       name: 'Bravo Trittico Executive 612', manufacturer: 'Bravo', kind: 'combo', type: 'commercial', optimal: 12.0, min: 6.0, max: 14.0,
    recOverrides: {
      helado: { pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo HOT' } },
      gelato: { pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo HOT' },
                churn:      { extract_temp: -8, time: '8-12 min', overrun: '25-35%' } },
    },
  },
  { id: 'carpigiani-maestro-he',    name: 'Carpigiani Maestro HE',         manufacturer: 'Carpigiani', kind: 'combo', type: 'commercial', optimal: 6.0, min: 3.0, max: 8.0,
    recOverrides: {
      gelato: { churn: { extract_temp: -8, time: '8-10 min', overrun: '25-35%' } },
    },
  },

  // ── Combos ICEMEL ──
  // Linea C: ciclo integrado pasteurizacion + mantecacion en 10 min segun
  // fabricante. La capacidad por ciclo NO es igual al numero del modelo.
  // Convencion ICEMEL: el numero indica produccion en L/h (10 min ciclo, asi
  // que la capacidad por ciclo es ~1/6 del numero).
  // C15 confirmada por usuario en 1-3 L/ciclo (≈15 L/h).
  { id: 'icemel-c15', name: 'Icemel C15', manufacturer: 'Icemel', kind: 'combo', type: 'commercial', optimal: 2, min: 1, max: 3,
    recOverrides: {
      helado: {
        pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo integrado 10 min' },
        churn:      { extract_temp: -6, time: '~10 min ciclo C', overrun: '60-90%' },
      },
      gelato: {
        pasteurize: { mode: 'HTST', setpoint: 85, hold: '15 s · ciclo integrado 10 min' },
        churn:      { extract_temp: -8, time: '~10 min ciclo C', overrun: '25-35%' },
      },
      sorbete: {
        pasteurize: { mode: 'CUSTOM', setpoint: 65, hold: '10 min · ciclo S' },
        churn:      { extract_temp: -5, time: '~10 min ciclo C', overrun: '5-10%' },
      },
    },
  },
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function getMachine(id) {
  if (!id) return null;
  return MACHINES.find(m => m.id === id) || null;
}

export function getBatchFreezers() {
  return MACHINES.filter(m => m.kind === 'batch_freezer' || m.kind === 'combo');
}

export function getPasteurizers() {
  return MACHINES.filter(m => m.kind === 'pasteurizer' || m.kind === 'combo');
}

// Volume rating (under / ok / optimal / over) against a machine's capacity.
function rateVolume(liters, machine) {
  if (!machine || !liters) return null;
  if (liters < machine.min) return { state: 'under',   diff: machine.min - liters, machine };
  if (liters > machine.max) return { state: 'over',    diff: liters - machine.max, machine };
  if (liters >= machine.optimal * 0.95 && liters <= machine.optimal * 1.05) {
    return { state: 'optimal', diff: 0, machine };
  }
  return { state: 'ok', diff: 0, machine };
}

export function rateBatchVolume(liters, machineId) {
  const m = getMachine(machineId);
  if (!m || (m.kind !== 'batch_freezer' && m.kind !== 'combo')) return null;
  return rateVolume(liters, m);
}

export function ratePasteurizerVolume(liters, machineId) {
  const m = getMachine(machineId);
  if (!m || (m.kind !== 'pasteurizer' && m.kind !== 'combo')) return null;
  return rateVolume(liters, m);
}

// Aggregate rating against a list of machine IDs of the same kind.
//
// Returns the best fit: prefers a machine where the batch lands in the
// "optimal" sweet zone, falls back to "ok" (within range), and otherwise
// returns the machine closest to the volume (smallest under/over diff) so
// the warning can suggest the nearest option.
//
// Returns null if no machines of the requested kind are configured.
function rateMulti(liters, ids, allowedKinds) {
  if (!Array.isArray(ids) || ids.length === 0 || !liters) return null;
  const machines = ids.map(getMachine).filter(m => m && allowedKinds.includes(m.kind));
  if (machines.length === 0) return null;

  const ratings = machines.map(m => rateVolume(liters, m)).filter(Boolean);
  if (ratings.length === 0) return null;

  const optimal = ratings.find(r => r.state === 'optimal');
  if (optimal) return { ...optimal, alternatives: ratings.filter(r => r !== optimal) };

  const ok = ratings.find(r => r.state === 'ok');
  if (ok) return { ...ok, alternatives: ratings.filter(r => r !== ok) };

  // No machine fits — pick the one closest (smallest diff).
  const sorted = ratings.slice().sort((a, b) => a.diff - b.diff);
  return { ...sorted[0], alternatives: sorted.slice(1) };
}

export function rateBatchVolumeMulti(liters, ids) {
  return rateMulti(liters, ids, ['batch_freezer', 'combo']);
}

export function ratePasteurizerVolumeMulti(liters, ids) {
  return rateMulti(liters, ids, ['pasteurizer', 'combo']);
}

// Pick the best machine for a given volume from a candidate list. Returns
// the machine object (or null). Used by ProductionPlan to auto-assign
// equipment per batch when the user hasn't picked one explicitly.
export function pickBestFit(liters, ids, allowedKinds) {
  if (!Array.isArray(ids) || ids.length === 0 || !liters) return null;
  const machines = ids.map(getMachine).filter(m => m && allowedKinds.includes(m.kind));
  if (machines.length === 0) return null;
  // Preference order: optimal → ok → smallest diff to range.
  const tagged = machines.map(m => {
    const r = rateVolume(liters, m);
    return { machine: m, state: r?.state || 'unknown', diff: r?.diff ?? Infinity };
  });
  tagged.sort((a, b) => {
    const order = { optimal: 0, ok: 1, under: 2, over: 2 };
    const oa = order[a.state] ?? 3;
    const ob = order[b.state] ?? 3;
    if (oa !== ob) return oa - ob;
    return a.diff - b.diff;
  });
  return tagged[0].machine;
}

// Returns a flat object with the recommended stages for the given machine and
// recipe type. Missing fields fall back to BASELINE_RECS. Stages outside the
// machine's role are omitted (e.g. a batch freezer omits "pasteurize").
export function getEquipmentRecommendations(machineId, recipeType = 'helado') {
  const m = getMachine(machineId);
  if (!m) return null;
  const baseline = BASELINE_RECS[recipeType] || BASELINE_RECS.helado;
  const overrides = (m.recOverrides && m.recOverrides[recipeType]) || {};
  const stages = KIND_STAGES[m.kind] || [];
  const result = { machine: m, type: recipeType, stages: {} };
  for (const stage of stages) {
    result.stages[stage] = { ...baseline[stage], ...(overrides[stage] || {}) };
  }
  return result;
}
