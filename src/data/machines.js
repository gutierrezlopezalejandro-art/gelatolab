// Base de mantecadoras / heladeras con tamano optimo / minimo / maximo de cuba
// (litros de mezcla). Incluye 15 maquinas hogareñas y semipro extraidas del
// catalogo de IceCreamCalc 4, mas 5 industriales típicas de gelaterías
// comerciales (Carpigiani, Bravo, Frigomat, Telme).
//
// Si la receta excede el max o queda bajo el min, GelatoLab muestra un aviso
// porque tanto sub-llenado como sobre-llenado afectan la mantecación.

export const MACHINES = [
  // ── Hogar / semipro ──
  { id: 'whynter-icm-128',   name: 'Whynter ICM-128',         optimal: 0.61, min: 0.51, max: 0.70, type: 'home' },
  { id: 'breville-smart',    name: 'Breville Smart Scoop',    optimal: 0.71, min: 0.61, max: 0.81, type: 'home' },
  { id: 'cuisinart-ice-100', name: 'Cuisinart ICE-100',       optimal: 0.71, min: 0.61, max: 0.81, type: 'home' },
  { id: 'cuisinart-ice-20',  name: 'Cuisinart ICE-20',        optimal: 0.71, min: 0.61, max: 0.81, type: 'home' },
  { id: 'lello-musso-4080',  name: 'Lello Musso 4080',        optimal: 0.71, min: 0.61, max: 0.81, type: 'home' },
  { id: 'cube-750',          name: 'Cube 750',                optimal: 0.75, min: 0.64, max: 0.86, type: 'home' },
  { id: 'nemox-gelatissimo', name: 'Nemox Gelatissimo',       optimal: 0.85, min: 0.72, max: 0.98, type: 'home' },
  { id: 'cuisinart-ice-30',  name: 'Cuisinart ICE-30',        optimal: 0.95, min: 0.80, max: 1.09, type: 'home' },
  { id: 'cuisinart-ice-70',  name: 'Cuisinart ICE-70',        optimal: 0.95, min: 0.80, max: 1.09, type: 'home' },
  { id: 'kitchenaid-attach', name: 'KitchenAid Attachment',   optimal: 0.95, min: 0.80, max: 1.09, type: 'home' },
  { id: 'whynter-icm-200',   name: 'Whynter ICM-200',         optimal: 1.00, min: 0.85, max: 1.15, type: 'home' },
  { id: 'lello-musso-5030',  name: 'Lello Musso 5030',        optimal: 1.10, min: 0.94, max: 1.27, type: 'home' },
  { id: 'generic-1qt',       name: 'Generica 1 qt/L',         optimal: 0.47, min: 0.41, max: 0.55, type: 'home' },
  { id: 'generic-1.5qt',     name: 'Generica 1.5 qt/L',       optimal: 0.71, min: 0.61, max: 0.81, type: 'home' },
  { id: 'generic-2qt',       name: 'Generica 2 qt/L',         optimal: 0.95, min: 0.80, max: 1.09, type: 'home' },

  // ── Comerciales / industriales ──
  { id: 'carpigiani-maestro-rtx',  name: 'Carpigiani Maestro RTX', optimal: 3.0,  min: 1.5,  max: 4.0,  type: 'commercial' },
  { id: 'frigomat-m50',            name: 'Frigomat M50',           optimal: 5.0,  min: 3.0,  max: 7.0,  type: 'commercial' },
  { id: 'carpigiani-lb-502',       name: 'Carpigiani LB 502',      optimal: 5.0,  min: 3.0,  max: 7.0,  type: 'commercial' },
  { id: 'bravo-trittico-304',      name: 'Bravo Trittico Executive 304', optimal: 6.0, min: 4.0, max: 8.0, type: 'commercial' },
  { id: 'telme-petra-100',         name: 'Telme Petra 100',        optimal: 10.0, min: 6.0,  max: 13.0, type: 'commercial' },
];

export function getMachine(id) {
  if (!id) return null;
  return MACHINES.find(m => m.id === id) || null;
}

export function rateBatchVolume(liters, machineId) {
  const m = getMachine(machineId);
  if (!m || !liters) return null;
  if (liters < m.min) return { state: 'under', diff: m.min - liters, machine: m };
  if (liters > m.max) return { state: 'over',  diff: liters - m.max, machine: m };
  if (liters >= m.optimal * 0.95 && liters <= m.optimal * 1.05) return { state: 'optimal', diff: 0, machine: m };
  return { state: 'ok', diff: 0, machine: m };
}
