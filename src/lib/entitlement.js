// ===========================================================================
// Entitlement / gating system — Free vs Pro
//
// Single source of truth for which features require Pro.
//
// El plan sale de `entitlementStore` (local, alimentado por la compra
// in-app). Hasta la 1.1.0 salia de `profiles.plan` en Supabase; ese camino
// se elimino al desconectar el backend.
//
// Sin compra vigente el plan es 'free', asi que la experiencia local-first
// sigue funcionando entera.
//
// Adding a feature: add to FEATURES, decide PRO_FEATURES membership, then
// wrap the relevant UI with <ProGate feature="..."> or guard imperatively
// with `if (!isFeatureAllowed(feature, plan))`.
// ===========================================================================

import { useEntitlementStore } from '../store/entitlementStore';
import { useRecipeStore } from '../store/recipeStore';
import seedRecipes from '../data/recipes.json';

// IDs de las recetas que vienen pre-cargadas con la app (recipes.json).
// Las usamos para distinguir "biblioteca" (seed) vs recetas creadas por
// el usuario, y aplicar el cap de visibilidad sólo a las primeras.
const SEED_RECIPE_IDS = new Set(seedRecipes.map(r => r.id));
export function isSeedRecipe(recipe) {
  return recipe && SEED_RECIPE_IDS.has(recipe.id);
}

// IDs específicos visibles en plan Free. Elegidos para mostrar un ejemplo
// representativo de cada estilo (americano + italiano). Si se cambian las
// recetas en recipes.json hay que verificar que estos IDs sigan existiendo.
//   - 2  → Vainilla Clásica (helado americano)
//   - 24 → Gelato Pistachio di Bronte (gelato italiano)
export const FREE_VISIBLE_SEED_IDS = new Set([2, 24]);

// Feature keys — strings used everywhere in the app to identify gated
// features. Keep these stable; they are referenced from many components.
export const FEATURES = {
  // CLOUD_SYNC se elimino al desconectar Supabase: ya no hay nube que
  // sincronizar. Era una de las funciones que justificaban Pro, asi que el
  // paquete quedo con una menos — revisar el argumento de venta.
  MULTI_EQUIPMENT:   'multi_equipment',
  INVENTORY:         'inventory',
  COSTS:             'costs',
  HACCP_EXPORT:      'haccp_export',
  PRINT_PRODUCTION:  'print_production',
  RECIPE_COMPARE:    'recipe_compare',
  LABELS:            'labels',
  // FOLDER_BACKUP se elimino junto con folderBackup. La copia de
  // seguridad a la nube del usuario NO se gatea por plan: no se le
  // cobra a nadie por no perder sus datos.
  RECIPE_LIMIT:      'recipe_limit',
};

// Free tier limits (only relevant for non-Pro users).
export const FREE_LIMITS = {
  recipes: 10,           // cap de creación de recetas propias
  equipment: 1,          // 1 mantecador + 1 pasteurizador máximo
};

// All features that require Pro. Free users get everything else.
const PRO_ONLY = new Set([
  FEATURES.MULTI_EQUIPMENT,
  FEATURES.INVENTORY,
  FEATURES.COSTS,
  FEATURES.HACCP_EXPORT,
  FEATURES.PRINT_PRODUCTION,
  FEATURES.RECIPE_COMPARE,
  FEATURES.LABELS,
]);

// Plan check helper. Ya no existe el plan 'admin': el panel de
// administracion se elimino junto con Supabase.
export function isPro(plan) {
  return plan === 'pro';
}

export function isFeatureAllowed(feature, plan) {
  if (!PRO_ONLY.has(feature)) return true;
  return isPro(plan);
}

// React hook: returns the current entitlement snapshot.
export function useEntitlement() {
  const plan      = useEntitlementStore(s => s.plan);
  const storedExp = useEntitlementStore(s => s.expiresAt);
  const recipes   = useRecipeStore(s => s.recipes);

  const expiresAt = storedExp ? new Date(storedExp) : null;

  // Una suscripcion vencida vuelve a Free. La tienda es la que manda, pero
  // esta red de seguridad cubre el caso de no haber podido consultarla.
  const expired = expiresAt && expiresAt.getTime() < Date.now();
  const effectivePlan = expired && plan === 'pro' ? 'free' : plan;

  // El cap de creación cuenta SOLO recetas creadas por el usuario, no las
  // pre-cargadas. Si no, un free user llegaría al límite con sólo abrir la
  // app y nunca podría crear ninguna propia.
  const userCreatedCount = recipes.filter(r => !SEED_RECIPE_IDS.has(r.id)).length;
  const recipeCount = recipes.length;
  const recipeLimitReached = !isPro(effectivePlan) && userCreatedCount >= FREE_LIMITS.recipes;

  return {
    plan: effectivePlan,
    isPro: isPro(effectivePlan),
    expiresAt,
    recipeCount,
    userCreatedCount,
    recipeLimit: FREE_LIMITS.recipes,
    recipeLimitReached,
    can: (feature) => isFeatureAllowed(feature, effectivePlan),
  };
}
