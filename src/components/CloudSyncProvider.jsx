import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useProductionStore } from '../store/productionStore';
import { usePlanStore } from '../store/planStore';
import { useInventoryStore } from '../store/inventoryStore';
import { pullFromCloud, debouncedPush, subscribeToCloud, flushPendingPushes, hasPendingPushes, pushToCloud } from '../lib/cloudSync';

// localStorage keys to remember when each table was last modified locally.
// Used on login to avoid overwriting unsynced local changes with stale cloud state.
const LOCAL_TS_KEY = (table) => `gelatolab-localts-${table}`;
function markLocalChange(table) {
  try { localStorage.setItem(LOCAL_TS_KEY(table), new Date().toISOString()); } catch { /* ignore */ }
}
function getLocalChangeTs(table) {
  try { return localStorage.getItem(LOCAL_TS_KEY(table)); } catch { return null; }
}
import { logError } from '../lib/errorLog';

/**
 * Component that syncs the local Zustand stores with Supabase
 * whenever the user is logged in. Renders nothing.
 *
 * Strategy:
 *   - On login: pull cloud state and merge (cloud wins on conflict by updated_at)
 *   - On store change: push to cloud (debounced 2s)
 *   - Realtime: listen for remote changes and update local stores
 */
export function CloudSyncProvider() {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const mountedRef = useRef(false);
  const unsubRef = useRef(null);

  // Cloud sync is gated to Pro plans. Free users may sign in (so we know
  // their plan / show pricing) but their stores stay local-only.
  const plan = profile?.plan || 'free';
  const isPro = plan === 'pro' || plan === 'admin';

  useEffect(() => {
    if (!user || !isPro) {
      // Clean up realtime subscription on logout or downgrade.
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function syncOnLogin() {
      try {
        const cloud = await pullFromCloud(user.id);
        if (cancelled) return;

        // For each table: only overwrite local with cloud if cloud is newer
        // than our last recorded local change. Prevents stale-cloud overwrites
        // when a device made offline changes that didn't sync yet.
        function applyIfCloudNewer(table, setter) {
          const entry = cloud[table];
          if (!entry?.data) return false;
          const localTs = getLocalChangeTs(table);
          const cloudTs = entry.updated_at;
          if (!localTs || (cloudTs && cloudTs >= localTs)) {
            setter(entry.data);
            // Record cloud's timestamp as our new baseline so we don't push it back.
            if (cloudTs) localStorage.setItem(LOCAL_TS_KEY(table), cloudTs);
            return true;
          }
          return false;
        }

        const appliedRecipes     = applyIfCloudNewer('recipes',     (d) => useRecipeStore.setState(d));
        const appliedIngredients = applyIfCloudNewer('ingredients', (d) => useIngredientStore.setState(d));
        const appliedProductions = applyIfCloudNewer('productions', (d) => useProductionStore.setState(d));
        const appliedPlans       = applyIfCloudNewer('plans',       (d) => usePlanStore.setState(d));
        const appliedInventory   = applyIfCloudNewer('inventory',   (d) => useInventoryStore.setState(d));

        // If local was newer for a table, push it now so cloud catches up.
        if (!appliedRecipes)     pushToCloud(user.id, 'recipes',     useRecipeStore.getState());
        if (!appliedIngredients && cloud.ingredients) pushToCloud(user.id, 'ingredients', useIngredientStore.getState());
        if (!appliedProductions && cloud.productions) pushToCloud(user.id, 'productions', useProductionStore.getState());
        if (!appliedPlans       && cloud.plans)       pushToCloud(user.id, 'plans',       usePlanStore.getState());
        if (!appliedInventory   && cloud.inventory)   pushToCloud(user.id, 'inventory',   useInventoryStore.getState());

        // After merging, setup realtime
        unsubRef.current = subscribeToCloud(user.id, (table, data) => {
          if (!data) return;
          // Realtime updates are always from cloud — apply them and refresh baseline.
          switch (table) {
            case 'recipes':     useRecipeStore.setState(data); break;
            case 'ingredients': useIngredientStore.setState(data); break;
            case 'productions': useProductionStore.setState(data); break;
            case 'plans':       usePlanStore.setState(data); break;
            case 'inventory':   useInventoryStore.setState(data); break;
          }
          try { localStorage.setItem(LOCAL_TS_KEY(table), new Date().toISOString()); } catch { /* ignore */ }
        });

        // Flag: we are ready to push changes
        mountedRef.current = true;
      } catch (e) {
        logError(e, { source: 'CloudSyncProvider.syncOnLogin' });
      }
    }

    syncOnLogin();
    return () => { cancelled = true; };
  }, [user?.id, isPro]);

  // Push to cloud on any store change (debounced per-table)
  useEffect(() => {
    if (!user || !isPro) return;
    const unsubRecipes = useRecipeStore.subscribe((state) => {
      if (mountedRef.current) { markLocalChange('recipes'); debouncedPush(user.id, 'recipes', state); }
    });
    const unsubIngredients = useIngredientStore.subscribe((state) => {
      if (mountedRef.current) { markLocalChange('ingredients'); debouncedPush(user.id, 'ingredients', state); }
    });
    const unsubProductions = useProductionStore.subscribe((state) => {
      if (mountedRef.current) { markLocalChange('productions'); debouncedPush(user.id, 'productions', state); }
    });
    const unsubPlans = usePlanStore.subscribe((state) => {
      if (mountedRef.current) { markLocalChange('plans'); debouncedPush(user.id, 'plans', state); }
    });
    const unsubInventory = useInventoryStore.subscribe((state) => {
      if (mountedRef.current) { markLocalChange('inventory'); debouncedPush(user.id, 'inventory', state); }
    });
    return () => {
      unsubRecipes();
      unsubIngredients();
      unsubProductions();
      unsubPlans();
      unsubInventory();
    };
  }, [user?.id, isPro]);

  // Flush any pending debounced pushes when the tab is about to unload or
  // becomes hidden (mobile backgrounding). Prevents data loss when the user
  // closes the browser within the debounce window.
  useEffect(() => {
    if (!user || !isPro) return;
    const onBeforeUnload = (e) => {
      if (hasPendingPushes()) {
        flushPendingPushes();
        // Best-effort: some browsers show a prompt when returnValue is set.
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingPushes();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id, isPro]);

  return null;
}
