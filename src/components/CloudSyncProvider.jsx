import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useProductionStore } from '../store/productionStore';
import { usePlanStore } from '../store/planStore';
import { useInventoryStore } from '../store/inventoryStore';
import { pullFromCloud, debouncedPush, subscribeToCloud, flushPendingPushes, hasPendingPushes, hasPendingPushFor, pushToCloud } from '../lib/cloudSync';
import defaultRecipes from '../data/recipes.json';

// Bug v1.0.8: usuarios Pro solo veían 2 recetas (seed) tras login en vez de
// la biblioteca completa + sus propias. Causa: pullFromCloud reemplazaba
// useRecipeStore.setState() con el estado del cloud, que no incluye las
// recetas seed. Para usuarios que sincronizaron por primera vez (cuenta
// nueva), el cloud no tiene seeds → wipe de la biblioteca local.
//
// Fix: merge con seeds que falten en cloud. Si el cloud tiene una receta
// con el mismo id que un seed (porque el usuario la editó/customizó),
// gana la del cloud. Si no, traemos la seed default.
function mergeRecipesWithSeeds(cloudState) {
  if (!cloudState) return cloudState;
  const cloudRecipes = cloudState.recipes || [];
  const cloudIds = new Set(cloudRecipes.map(r => r.id));
  const missingSeeds = defaultRecipes.filter(s => !cloudIds.has(s.id));
  return {
    ...cloudState,
    recipes: [...missingSeeds, ...cloudRecipes],
  };
}

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

        const appliedRecipes     = applyIfCloudNewer('recipes',     (d) => useRecipeStore.setState(mergeRecipesWithSeeds(d)));
        const appliedIngredients = applyIfCloudNewer('ingredients', (d) => useIngredientStore.setState(d));
        const appliedProductions = applyIfCloudNewer('productions', (d) => useProductionStore.setState(d));
        const appliedPlans       = applyIfCloudNewer('plans',       (d) => usePlanStore.setState(d));
        const appliedInventory   = applyIfCloudNewer('inventory',   (d) => useInventoryStore.setState(d));

        // If local was newer (o si la tabla cloud aun no existe para este user),
        // push el estado local ahora. Asi se garantiza que la fila se crea en
        // el primer login Pro (antes habia un catch-22: el push solo ocurria
        // si cloud.X existia, pero cloud.X solo se creaba con un push).
        // Bug detectado 2026-05-10: usuario veia inventarios distintos en
        // desktop/web/iPhone porque user_ingredients y user_inventory nunca
        // se creaban en cloud (otras tablas si se creaban porque el subscribe
        // disparaba el primer push cuando el usuario tocaba el store).
        if (!appliedRecipes)     pushToCloud(user.id, 'recipes',     useRecipeStore.getState());
        if (!appliedIngredients) pushToCloud(user.id, 'ingredients', useIngredientStore.getState());
        if (!appliedProductions) pushToCloud(user.id, 'productions', useProductionStore.getState());
        if (!appliedPlans)       pushToCloud(user.id, 'plans',       usePlanStore.getState());
        if (!appliedInventory)   pushToCloud(user.id, 'inventory',   useInventoryStore.getState());

        // After merging, setup realtime.
        //
        // CRITICO (bug 2026-05-10): el realtime puede recibir un push de
        // OTRO device que tiene state mas viejo que el local. Si lo aplicamos
        // sin checks, sobrescribimos los cambios locales del usuario antes
        // de que el debouncedPush local fire (2s delay). El sintoma reportado
        // por usuario fue: "creo un ingrediente y desaparece" — porque el
        // realtime echo del web/desktop con sus 91 items llegaba al iPhone
        // antes de que el iPhone pudiera pushear sus 92.
        //
        // Solucion: skip si hay un push local pendiente para esa tabla
        // (los cambios locales son por definicion mas nuevos que cualquier
        // cosa que ya este en cloud), o si nuestro localTs es mayor que el
        // cloudTs del realtime payload (defense in depth).
        unsubRef.current = subscribeToCloud(user.id, (table, data, cloudTs) => {
          if (!data) return;

          // Skip 1: tenemos cambios locales pendientes de pushear.
          if (hasPendingPushFor(user.id, table)) {
            return;
          }

          // Skip 2: nuestro localTs es estrictamente mas nuevo que cloudTs
          // (caso raro: cambio local sin debouncedPush en flight, ej. se
          // perdio el subscribe en alguna race). No es exhaustivo pero
          // protege contra rollback con clocks decentes.
          const localTs = getLocalChangeTs(table);
          if (localTs && cloudTs && localTs > cloudTs) {
            return;
          }

          switch (table) {
            // Mismo merge que en syncOnLogin para cualquier update via realtime.
            case 'recipes':     useRecipeStore.setState(mergeRecipesWithSeeds(data)); break;
            case 'ingredients': useIngredientStore.setState(data); break;
            case 'productions': useProductionStore.setState(data); break;
            case 'plans':       usePlanStore.setState(data); break;
            case 'inventory':   useInventoryStore.setState(data); break;
          }
          // Refresh local baseline al timestamp cloud (no a now) — eso evita
          // que el subscribe local de Zustand gatille un re-push circular.
          try { localStorage.setItem(LOCAL_TS_KEY(table), cloudTs || new Date().toISOString()); } catch { /* ignore */ }
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
