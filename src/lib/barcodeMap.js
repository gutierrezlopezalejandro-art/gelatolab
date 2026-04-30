// Helpers para manejar multiples codigos de barra por ingrediente.
// El modelo viejo usaba `ingredient.barcode: string` (un solo codigo). El
// modelo nuevo usa `ingredient.barcodes: string[]` para soportar marcas
// distintas del mismo producto (ej. sacarosa marca A y marca B = mismo
// ingrediente). Estos helpers leen ambos formatos transparentemente y
// mantienen sincronizado el legacy `barcode` con el primer elemento del
// array para compatibilidad backward.

// Devuelve la lista efectiva de codigos asociados a un ingrediente,
// fusionando el array nuevo con el campo legacy (si existe y no esta
// duplicado).
export function getBarcodes(ingredient) {
  if (!ingredient) return [];
  const list = Array.isArray(ingredient.barcodes) ? [...ingredient.barcodes] : [];
  const legacy = (ingredient.barcode || '').trim();
  if (legacy && !list.includes(legacy)) list.push(legacy);
  return list.filter(Boolean);
}

// Busca en una lista de ingredientes el primero que tenga el codigo asignado.
export function findIngredientByBarcode(ingredients, code) {
  if (!code) return null;
  const c = String(code).trim();
  return ingredients.find(i => getBarcodes(i).includes(c)) || null;
}

// Devuelve un patch para `store.update(id, patch)` que agrega un codigo nuevo
// al ingrediente sin duplicar y sin pisar los existentes. Si el codigo ya
// estaba (en cualquier campo), devuelve null indicando que no hay que
// actualizar.
export function buildAddBarcodePatch(ingredient, code) {
  const c = String(code || '').trim();
  if (!c) return null;
  const current = getBarcodes(ingredient);
  if (current.includes(c)) return null;
  const next = [...current, c];
  return {
    barcodes: next,
    barcode: next[0], // mantenemos el legacy con el primero, por compat
  };
}

// Devuelve un patch para quitar un codigo de un ingrediente.
export function buildRemoveBarcodePatch(ingredient, code) {
  const c = String(code || '').trim();
  if (!c) return null;
  const current = getBarcodes(ingredient);
  if (!current.includes(c)) return null;
  const next = current.filter(x => x !== c);
  return {
    barcodes: next,
    barcode: next[0] || '',
  };
}
