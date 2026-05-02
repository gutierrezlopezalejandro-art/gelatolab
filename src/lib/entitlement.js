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
  recipes: 10,
  equipment: 1, // 1 mantecador + 1 pasteurizador máximo
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

  const recipeCount = recipes.length;
  const recipeLimitReached = !isPro(effectivePlan) && recipeCount >= FREE_LIMITS.recipes;

  return {
    plan: effectivePlan,
    isPro: isPro(effectivePlan),
    isAdmin: effectivePlan === 'admin',
    isAnonymous: !user,
    expiresAt,
    recipeCount,
    recipeLimit: FREE_LIMITS.recipes,
    recipeLimitReached,
    can: (feature) => isFeatureAllowed(feature, effectivePlan),
  };
}
