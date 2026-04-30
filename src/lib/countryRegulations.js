/**
 * Front-of-package labeling regulations for LATAM, ice cream context.
 *
 * Each country defines:
 *   - system     : 'octagon' | 'traffic_light' | 'none'
 *   - text       : prefix used on each seal ('ALTO EN', 'EXCESO EN', etc.)
 *   - law        : human-readable law/regulation reference
 *   - flag       : emoji
 *   - evaluate(nv) : (octagon only) returns array of { key, value, limit, unit, note }
 *   - evaluateLights(nv) : (traffic_light only) returns { sugar: 'low'|'med'|'high', ... }
 *
 * `nv` is the output of calcNutritionalValues(): per-100g values for energy,
 * sugars, saturated fat, trans fat, sodium, etc.
 *
 * Notes on thresholds:
 *   - Chile / Perú / Colombia use ABSOLUTE thresholds (g/mg per 100g).
 *   - México / Argentina / Uruguay use the PAHO model (% of total kcal).
 *   - Ecuador uses traffic lights on 3 nutrients (sugar, fat, salt).
 *   - Brasil is excluded by user request (uses different "lupa" system).
 *   - Venezuela / Paraguay / Bolivia have no current mandatory FOP regulation.
 *
 * For the PAHO countries, "added sugar" data isn't tracked in our app, so
 * total sugar is used as a conservative proxy (will trigger seals slightly
 * earlier than reality for products with naturally occurring sugars).
 */

const KCAL_PER_G_FAT = 9;
const KCAL_PER_G_CARB = 4;

// Octagon: Chile — Ley 20.606 (vigente desde 2019, etapa final)
function evalChile(nv) {
  const seals = [];
  if (nv.energyKcal   >= 275) seals.push({ key: 'energy', value: nv.energyKcal,   limit: 275, unit: 'kcal' });
  if (nv.sugars       >= 10)  seals.push({ key: 'sugars', value: nv.sugars,       limit: 10,  unit: 'g' });
  if (nv.saturatedFat >= 4)   seals.push({ key: 'satfat', value: nv.saturatedFat, limit: 4,   unit: 'g' });
  if (nv.sodiumMg     >= 400) seals.push({ key: 'sodium', value: nv.sodiumMg,     limit: 400, unit: 'mg' });
  return seals;
}

// Octagon: Perú — Ley 30021 / DS 012-2018-SA. Misma estructura que Chile + grasa trans.
function evalPeru(nv) {
  const seals = [];
  if (nv.energyKcal   >= 275) seals.push({ key: 'energy',   value: nv.energyKcal,   limit: 275, unit: 'kcal' });
  if (nv.sugars       >= 10)  seals.push({ key: 'sugars',   value: nv.sugars,       limit: 10,  unit: 'g' });
  if (nv.saturatedFat >= 4)   seals.push({ key: 'satfat',   value: nv.saturatedFat, limit: 4,   unit: 'g' });
  if (nv.transFat     >= 0.2) seals.push({ key: 'transfat', value: nv.transFat,     limit: 0.2, unit: 'g' });
  if (nv.sodiumMg     >= 400) seals.push({ key: 'sodium',   value: nv.sodiumMg,     limit: 400, unit: 'mg' });
  return seals;
}

// Octagon: México — NOM-051 (Fase 3, vigente 2026).
// Sodio por 100g, los demás como % de calorías totales (modelo OPS adaptado).
function evalMexico(nv) {
  const seals = [];
  const kcal = nv.energyKcal;
  if (kcal >= 275) seals.push({ key: 'energy', value: kcal, limit: 275, unit: 'kcal' });
  if (kcal > 0) {
    const sugarsPctKcal = (nv.sugars * KCAL_PER_G_CARB / kcal) * 100;
    const satPctKcal    = (nv.saturatedFat * KCAL_PER_G_FAT / kcal) * 100;
    const transPctKcal  = (nv.transFat * KCAL_PER_G_FAT / kcal) * 100;
    if (sugarsPctKcal >= 10) seals.push({ key: 'sugars',   value: sugarsPctKcal, limit: 10, unit: '% kcal' });
    if (satPctKcal    >= 10) seals.push({ key: 'satfat',   value: satPctKcal,    limit: 10, unit: '% kcal' });
    if (transPctKcal  >= 1)  seals.push({ key: 'transfat', value: transPctKcal,  limit: 1,  unit: '% kcal' });
  }
  if (nv.sodiumMg >= 300) seals.push({ key: 'sodium', value: nv.sodiumMg, limit: 300, unit: 'mg' });
  return seals;
}

// Octagon: Argentina — Ley 27.642 + Decreto 151/22 (perfil OPS). 5 sellos.
function evalArgentina(nv) {
  const seals = [];
  const kcal = nv.energyKcal;
  if (kcal >= 275) seals.push({ key: 'energy', value: kcal, limit: 275, unit: 'kcal' });
  if (kcal > 0) {
    const sugarsPctKcal = (nv.sugars * KCAL_PER_G_CARB / kcal) * 100;
    const satPctKcal    = (nv.saturatedFat * KCAL_PER_G_FAT / kcal) * 100;
    const totalFatPctKcal = (nv.totalFat * KCAL_PER_G_FAT / kcal) * 100;
    if (sugarsPctKcal   >= 10) seals.push({ key: 'sugars',   value: sugarsPctKcal,   limit: 10, unit: '% kcal' });
    if (satPctKcal      >= 10) seals.push({ key: 'satfat',   value: satPctKcal,      limit: 10, unit: '% kcal' });
    if (totalFatPctKcal >= 30) seals.push({ key: 'totalfat', value: totalFatPctKcal, limit: 30, unit: '% kcal' });
  }
  // Sodio: el mayor de 1 mg/kcal o 300 mg/100g
  const naLimitMgPer100g = Math.max(kcal * 1, 300);
  if (nv.sodiumMg >= naLimitMgPer100g) {
    seals.push({ key: 'sodium', value: nv.sodiumMg, limit: Math.round(naLimitMgPer100g), unit: 'mg' });
  }
  return seals;
}

// Octagon: Uruguay — Decreto 246/020 (perfil OPS). 4 sellos.
function evalUruguay(nv) {
  const seals = [];
  const kcal = nv.energyKcal;
  if (kcal > 0) {
    const sugarsPctKcal = (nv.sugars * KCAL_PER_G_CARB / kcal) * 100;
    const satPctKcal    = (nv.saturatedFat * KCAL_PER_G_FAT / kcal) * 100;
    const totalFatPctKcal = (nv.totalFat * KCAL_PER_G_FAT / kcal) * 100;
    if (sugarsPctKcal   >= 10) seals.push({ key: 'sugars',   value: sugarsPctKcal,   limit: 10, unit: '% kcal' });
    if (satPctKcal      >= 10) seals.push({ key: 'satfat',   value: satPctKcal,      limit: 10, unit: '% kcal' });
    if (totalFatPctKcal >= 30) seals.push({ key: 'totalfat', value: totalFatPctKcal, limit: 30, unit: '% kcal' });
  }
  const naLimitMgPer100g = Math.max(kcal * 1, 300);
  if (nv.sodiumMg >= naLimitMgPer100g) {
    seals.push({ key: 'sodium', value: nv.sodiumMg, limit: Math.round(naLimitMgPer100g), unit: 'mg' });
  }
  return seals;
}

// Octagon: Colombia — Resolución 810/2021 modificada por Res. 2492/2022.
// Aplica perfil OPS (similar a Argentina/Uruguay) pero con texto "ALTO EN".
function evalColombia(nv) {
  return evalUruguay(nv); // misma lógica, distinto texto del sello
}

// Magnifying glass: Canada — Health Canada FOP Nutrition Symbol (mandatory
// since Jan 1, 2026). Bilingual symbol "High in / Élevé en" + nutrient.
// Thresholds expressed as 15% Daily Value per reference amount. For ice
// cream the reference amount is ~125 mL (~65g), which translated to per-100g
// gives the values below (approximate but legally reasonable).
function evalCanada(nv) {
  const seals = [];
  if (nv.saturatedFat >= 5)   seals.push({ key: 'satfat', value: nv.saturatedFat, limit: 5,   unit: 'g' });
  if (nv.sodiumMg     >= 530) seals.push({ key: 'sodium', value: nv.sodiumMg,     limit: 530, unit: 'mg' });
  if (nv.sugars       >= 23)  seals.push({ key: 'sugars', value: nv.sugars,       limit: 23,  unit: 'g' });
  return seals;
}

// Magnifying glass: Brasil — RDC 429/2020 + IN 75/2020 ANVISA.
// 3 nutrientes (açúcares adicionados, grasas saturadas, sodio). Umbrales por
// 100g sólido. Usa addedSugars del ingrediente (no total) como exige ANVISA.
function evalBrasil(nv) {
  const seals = [];
  const added = nv.addedSugars != null ? nv.addedSugars : nv.sugars;
  if (added >= 15)            seals.push({ key: 'sugars', value: added,           limit: 15,  unit: 'g',  note: 'adicionados' });
  if (nv.saturatedFat >= 6)   seals.push({ key: 'satfat', value: nv.saturatedFat, limit: 6,   unit: 'g' });
  if (nv.sodiumMg     >= 600) seals.push({ key: 'sodium', value: nv.sodiumMg,     limit: 600, unit: 'mg' });
  return seals;
}

// Traffic light: Ecuador — Reglamento de Etiquetado Sustitutivo (RTE INEN 022).
// Tres semáforos: azúcares, grasa total, sal. Verde / amarillo / rojo.
function evalEcuadorLights(nv) {
  const sugarLevel  = nv.sugars > 15        ? 'high' : nv.sugars > 5   ? 'med' : 'low';
  const fatLevel    = nv.totalFat > 20      ? 'high' : nv.totalFat > 3 ? 'med' : 'low';
  const saltMg      = nv.sodiumMg * 2.5;     // sodio mg → sal mg (factor ~2.54)
  const saltLevel   = saltMg > 600          ? 'high' : saltMg > 120   ? 'med' : 'low';
  return { sugar: sugarLevel, fat: fatLevel, salt: saltLevel };
}

export const COUNTRIES = [
  {
    code: 'CL', name: 'Chile', flag: '🇨🇱', system: 'octagon',
    text: 'ALTO EN', law: 'Ley 20.606 / MINSAL',
    evaluate: evalChile,
  },
  {
    code: 'PE', name: 'Perú', flag: '🇵🇪', system: 'octagon',
    text: 'ALTO EN', law: 'Ley 30021 / DS 012-2018-SA',
    evaluate: evalPeru,
  },
  {
    code: 'MX', name: 'México', flag: '🇲🇽', system: 'octagon',
    text: 'EXCESO', law: 'NOM-051 (Fase 3)',
    evaluate: evalMexico,
  },
  {
    code: 'AR', name: 'Argentina', flag: '🇦🇷', system: 'octagon',
    text: 'EXCESO EN', law: 'Ley 27.642 / Dec 151/22',
    evaluate: evalArgentina,
  },
  {
    code: 'UY', name: 'Uruguay', flag: '🇺🇾', system: 'octagon',
    text: 'EXCESO EN', law: 'Decreto 246/020',
    evaluate: evalUruguay,
  },
  {
    code: 'CO', name: 'Colombia', flag: '🇨🇴', system: 'octagon',
    text: 'ALTO EN', law: 'Res. 810/2021 + 2492/2022',
    evaluate: evalColombia,
  },
  {
    code: 'BR', name: 'Brasil', flag: '🇧🇷', system: 'magnifying_glass',
    text: 'ALTO EM', law: 'RDC 429/2020 — ANVISA',
    evaluate: evalBrasil,
  },
  {
    code: 'CA', name: 'Canadá', flag: '🇨🇦', system: 'magnifying_glass',
    text: 'HIGH IN', law: 'Health Canada FOP (Jan 2026)',
    evaluate: evalCanada,
  },
  {
    code: 'US', name: 'Estados Unidos', flag: '🇺🇸', system: 'none',
    law: 'FDA Nutrition Facts (sin sellos FOP federales)',
  },
  {
    code: 'EC', name: 'Ecuador', flag: '🇪🇨', system: 'traffic_light',
    text: 'Semáforo', law: 'RTE INEN 022 (sustitutivo)',
    evaluateLights: evalEcuadorLights,
  },
  { code: 'VE', name: 'Venezuela',          flag: '🇻🇪', system: 'none', law: null },
  { code: 'PY', name: 'Paraguay',           flag: '🇵🇾', system: 'none', law: null },
  { code: 'BO', name: 'Bolivia',            flag: '🇧🇴', system: 'none', law: null },
  { code: 'CR', name: 'Costa Rica',         flag: '🇨🇷', system: 'none', law: null },
  { code: 'PA', name: 'Panamá',             flag: '🇵🇦', system: 'none', law: null },
  { code: 'DO', name: 'Rep. Dominicana',    flag: '🇩🇴', system: 'none', law: null },
  { code: 'SV', name: 'El Salvador',        flag: '🇸🇻', system: 'none', law: null },
  { code: 'GT', name: 'Guatemala',          flag: '🇬🇹', system: 'none', law: null },
  { code: 'HN', name: 'Honduras',           flag: '🇭🇳', system: 'none', law: null },
  { code: 'NI', name: 'Nicaragua',          flag: '🇳🇮', system: 'none', law: null },
  { code: 'CU', name: 'Cuba',               flag: '🇨🇺', system: 'none', law: null },
  { code: 'PR', name: 'Puerto Rico',        flag: '🇵🇷', system: 'none', law: 'Aplica FDA (USA)' },
];

/**
 * Per-country tax-ID and sanitary-registration field labels. Used by the
 * onboarding wizard and the settings modal so the form asks for the
 * specific identifier the user's jurisdiction expects (RUT vs CUIT vs RFC).
 *
 * Falls back to generic "ID tributario" / "Registro sanitario" when the
 * country isn't mapped here.
 */
const BUSINESS_FIELDS = {
  CL: { tax_id_label: 'RUT',                    sanitary_label: 'Razón social — sin reg. obligatorio' },
  PE: { tax_id_label: 'RUC',                    sanitary_label: 'Reg. Sanitario DIGESA' },
  MX: { tax_id_label: 'RFC',                    sanitary_label: 'Aviso COFEPRIS (si aplica)' },
  AR: { tax_id_label: 'CUIT',                   sanitary_label: 'RNE / RNPA' },
  UY: { tax_id_label: 'RUT',                    sanitary_label: 'Habilitación bromatológica' },
  CO: { tax_id_label: 'NIT',                    sanitary_label: 'INVIMA' },
  BR: { tax_id_label: 'CNPJ',                   sanitary_label: 'Registro ANVISA / SIF' },
  EC: { tax_id_label: 'RUC',                    sanitary_label: 'ARCSA' },
  VE: { tax_id_label: 'RIF',                    sanitary_label: 'INHRR' },
  PY: { tax_id_label: 'RUC',                    sanitary_label: 'INAN' },
  BO: { tax_id_label: 'NIT',                    sanitary_label: 'SENASAG' },
  CR: { tax_id_label: 'Cédula Jurídica',        sanitary_label: 'Registro Sanitario MS' },
  PA: { tax_id_label: 'RUC',                    sanitary_label: 'AUPSA' },
  DO: { tax_id_label: 'RNC',                    sanitary_label: 'Pro-Consumidor' },
  SV: { tax_id_label: 'NIT',                    sanitary_label: 'MINSAL' },
  GT: { tax_id_label: 'NIT',                    sanitary_label: 'DRACES MSPAS' },
  HN: { tax_id_label: 'RTN',                    sanitary_label: 'ARSA' },
  NI: { tax_id_label: 'RUC',                    sanitary_label: 'MINSA' },
  CU: { tax_id_label: 'NIT',                    sanitary_label: '— ' },
  PR: { tax_id_label: 'EIN',                    sanitary_label: 'FDA Registration' },
  US: { tax_id_label: 'EIN',                    sanitary_label: 'FDA Registration' },
  CA: { tax_id_label: 'GST/HST Business #',     sanitary_label: 'CFIA Registration' },
};

export function getBusinessFields(code) {
  return BUSINESS_FIELDS[code] || { tax_id_label: 'ID tributario', sanitary_label: 'Registro sanitario' };
}

/** Lookup helper. Falls back to Chile if the code isn't recognised. */
export function getCountry(code) {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
}

/**
 * Generic seal calculator: dispatches to the country's evaluator.
 * For non-octagon systems returns an empty list (caller checks the system field).
 */
export function calcLabelSeals(nv, countryCode) {
  if (!nv) return { country: getCountry(countryCode), seals: [], lights: null };
  const country = getCountry(countryCode);
  if (country.system === 'octagon' || country.system === 'magnifying_glass') {
    return { country, seals: country.evaluate(nv), lights: null };
  }
  if (country.system === 'traffic_light') {
    return { country, seals: [], lights: country.evaluateLights(nv) };
  }
  return { country, seals: [], lights: null };
}
