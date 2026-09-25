import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from '../lib/appStorage';

// ===========================================================================
// entitlementStore — de donde sale el plan del usuario.
//
// Hasta la 1.1.0 el plan vivia en `profiles.plan` en Supabase y lo leia
// `authStore`. Al desconectar el backend, el plan pasa a ser un estado local
// del dispositivo, alimentado por la compra in-app.
//
// FASE 0 (esto): el store existe y siempre responde 'free', salvo que algo
// lo active explicitamente. Sirve para que `useEntitlement()` deje de
// depender de la sesion sin cambiar el comportamiento del gating.
//
// FASE 2 (pendiente): StoreKit 2 / Play Billing escriben aca al comprar y al
// restaurar. `source` distingue el origen para poder diagnosticar un reclamo
// de "pague y no se activo".
//
// NOTA DE HONESTIDAD: al no haber servidor, este valor es local y un usuario
// tecnico podria alterarlo. Es el compromiso aceptado al eliminar el backend:
// se protege el ingreso del 99% de los compradores, no de un atacante. La
// validacion real la hace la tienda al restaurar en un dispositivo nuevo.
// ===========================================================================

export const PLAN_FREE = 'free';
export const PLAN_PRO  = 'pro';

export const useEntitlementStore = create(
  persist(
    (set) => ({
      plan: PLAN_FREE,
      /** 'none' | 'iap' | 'promo' — de donde salio el plan vigente. */
      source: 'none',
      /** ISO string o null. Las suscripciones vencen; un desbloqueo no. */
      expiresAt: null,
      /** Ultima vez que se contrasto contra la tienda (ISO). */
      checkedAt: null,

      /** Lo llama la capa de compras al comprar, restaurar o refrescar. */
      setEntitlement: ({ plan, source = 'iap', expiresAt = null }) =>
        set({
          plan: plan === PLAN_PRO ? PLAN_PRO : PLAN_FREE,
          source,
          expiresAt,
          checkedAt: new Date().toISOString(),
        }),

      /** Vuelve a Free. Se usa cuando la tienda informa suscripcion vencida. */
      clearEntitlement: () =>
        set({ plan: PLAN_FREE, source: 'none', expiresAt: null, checkedAt: new Date().toISOString() }),
    }),
    { name: 'gelatolab-entitlement', storage: createJSONStorage(() => appStorage) }
  )
);

/**
 * Plan efectivo, ya resuelto el vencimiento. Se expone como funcion aparte
 * para poder consultarlo fuera de React (ej. al decidir si exportar).
 */
export function getEffectivePlan() {
  const { plan, expiresAt } = useEntitlementStore.getState();
  if (plan !== PLAN_PRO) return PLAN_FREE;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return PLAN_FREE;
  return PLAN_PRO;
}
