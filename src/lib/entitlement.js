// ===========================================================================
// Entitlement / gating system — Free vs Pro
//
// Single source of truth for which features require Pro. The user's plan
// lives on `profiles.plan` ('free' | 'pro' | 'admin') in Supabase. The
// `useEntitlement()` hook reads it via the existing authStore profile and
// exposes helpers to gate UI.
//
// Anonymous users (no Supabase configured, or not signed in) are treated
// as 'free' so the local-first experience still works.
//
// Adding a feature: add to FEATURES, decide PRO_FEATURES membership, then
// wrap the relevant UI with <ProGate feature="..."> or guard imperatively
// with `if (!isFeatureAllowed(feature, plan))`.
// ===========================================================================

import { useAuthStore } from '../store/authStore';
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
  CLOUD_SYNC:        'cloud_sync',
  MULTI_EQUIPMENT:   'multi_equipment',
  INVENTORY:         'inventory',
  COSTS:             'costs',
  HACCP_EXPORT:      'haccp_export',
  PRINT_PRODUCTION:  'print_production',
  RECIPE_COMPARE:    'recipe_compare',
  LABELS:            'labels',
  FOLDER_BACKUP:     'folder_backup',
  RECIPE_LIMIT:      'recipe_limit',
};

// Free tier limits (only relevant for non-Pro users).
export const FREE_LIMITS = {
  recipes: 10,           // cap de creación de recetas propias
  equipment: 1,          // 1 mantecador + 1 pasteurizador máximo
};

// All features that require Pro. Free users get everything else.
const PRO_ONLY = new Set([
  FEATURES.CLOUD_SYNC,
  FEATURES.MULTI_EQUIPMENT,
  FEATURES.INVENTORY,
  FEATURES.COSTS,
  FEATURES.HACCP_EXPORT,
  FEATURES.PRINT_PRODUCTION,
  FEATURES.RECIPE_COMPARE,
  FEATURES.LABELS,
  FEATURES.FOLDER_BACKUP,
]);

// Plan check helpers. Admin === Pro for entitlement purposes.
export function isPro(plan) {
  return plan === 'pro' || plan === 'admin';
}

export function isFeatureAllowed(feature, plan) {
  if (!PRO_ONLY.has(feature)) return true;
  return isPro(plan);
}

// React hook: returns the current entitlement snapshot.
export function useEntitlement() {
  const profile = useAuthStore(s => s.profile);
  const user    = useAuthStore(s => s.user);
  const recipes = useRecipeStore(s => s.recipes);

  const plan = profile?.plan || 'free';
  const expiresAt = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at)
    : null;

  // If the stored plan is 'pro' but expiration has passed, treat as free.
  // Backend webhooks should keep this clean; this is a safety net.
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
    isAdmin: effectivePlan === 'admin',
    isAnonymous: !user,
    expiresAt,
    recipeCount,
    userCreatedCount,
    recipeLimit: FREE_LIMITS.recipes,
    recipeLimitReached,
    can: (feature) => isFeatureAllowed(feature, effectivePlan),
  };
}
