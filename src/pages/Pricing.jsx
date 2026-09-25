import { useState } from 'react';
import { useT } from '../lib/i18n';
import { useEntitlement } from '../lib/entitlement';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { track } from '../lib/analytics';
import { shouldHidePricingUI } from '../lib/platform';

/**
 * Pantalla de planes. Compara Free contra Pro.
 *
 * ESTADO: sin via de compra. El checkout de Lemonsqueezy se elimino porque
 * App Store y Play prohiben cobrar contenido digital fuera de su propio
 * sistema de compras. La compra in-app (StoreKit 2 / Play Billing) es la
 * Fase 2 del plan de transformacion; hasta entonces esta pantalla informa
 * pero no vende.
 *
 * PENDIENTE FASE 2: `shouldHidePricingUI()` implementa el viejo "camino B"
 * (ocultar precios en iOS porque el pago ocurria en la web). Esa estrategia
 * quedo derogada al decidir vender con compra in-app, asi que ese gate debe
 * removerse cuando se conecte la tienda.
 */
export default function Pricing() {
  const t = useT();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const ent = useEntitlement();
  const hidePricing = shouldHidePricingUI();
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  function handleSubscribe() {
    // La compra in-app llega en la Fase 2. No se deja un boton que simule
    // cobrar: se avisa el estado real.
    showToast(t('pricing_purchase_unavailable'));
  }

  function goBack() {
    navigate(-1);
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <button onClick={goBack}
              className="text-xs text-[var(--ink3)] hover:text-[var(--ink)] mb-4 cursor-pointer bg-transparent border-none">
        ← {t('back')}
      </button>

      <div className="text-center mb-10">
        <h1 className="font-display text-4xl text-[var(--ink)] mb-3">{t('pricing_title')}</h1>
        <p className="text-base text-[var(--ink2)] max-w-xl mx-auto">{t('pricing_sub')}</p>
      </div>

      {/* Toggle mensual / anual — solo en web (no iOS) */}
      {!hidePricing && (
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-[#e8b920] text-white'
                : 'bg-black/5 text-[var(--ink2)] hover:bg-black/10'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              billingPeriod === 'annual'
                ? 'bg-[#e8b920] text-white'
                : 'bg-black/5 text-[var(--ink2)] hover:bg-black/10'
            }`}
          >
            Anual · 2 meses gratis
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Free plan */}
        <div className="bg-white rounded-2xl border-2 border-black/10 p-7">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl text-[var(--ink)]">{t('plan_free')}</h2>
            <span className="font-display text-3xl text-[var(--ink)]">$0</span>
          </div>
          <p className="text-xs text-[var(--ink3)] mb-5">{t('plan_free_sub')}</p>
          <ul className="space-y-2 mb-6">
            {[
              'plan_free_f1', 'plan_free_f2', 'plan_free_f3', 'plan_free_f4', 'plan_free_f5',
            ].map(k => (
              <li key={k} className="flex items-start gap-2 text-sm text-[var(--ink2)]">
                <span className="text-[var(--mint)] shrink-0 mt-0.5">✓</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
          {ent.isPro ? null : (
            <div className="text-xs text-center font-semibold text-[var(--mint)] py-2 rounded-lg bg-[var(--mint3)]">
              {t('plan_free_current')}
            </div>
          )}
        </div>

        {/* Pro plan */}
        <div className="bg-white rounded-2xl border-2 border-[#e8b920] p-7 relative shadow-md">
          {/* Badge "RECOMENDADO" — antes era bg-[#e8b920] (gold saturado)
              que competía visualmente con el CTA "Solicitar acceso anticipado"
              que también usa gold filled. Ahora pasa al gold pastel (gold2)
              con texto oscuro — match con el patrón badge-acc del index.css
              y no duplica el peso visual del CTA principal del card. */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--gold2)] text-[#5c3d00] text-[10px] font-bold uppercase tracking-wider border border-[var(--gold)]/40">
            {t('plan_pro_recommended')}
          </div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl text-[var(--ink)]">⭐ {t('plan_pro')}</h2>
            {/* En iOS no mostramos el precio — Apple Review Guidelines 3.1.1
                prohíben mostrar precios de suscripciones que se gestionan
                fuera del IAP de Apple. */}
            {!hidePricing && (
              <div className="text-right">
                <span className="font-display text-3xl text-[var(--ink)]">{t('plan_pro_monthly_amount')}</span>
                <span className="text-xs text-[var(--ink3)] block">{t('plan_pro_per_month')}</span>
                <span className="text-[10px] text-[var(--ink3)] block mt-0.5">{t('plan_pro_yearly_label')}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-[var(--ink3)] mb-5">{t('plan_pro_sub')}</p>
          <ul className="space-y-2 mb-6">
            {[
              'plan_pro_f1', 'plan_pro_f2', 'plan_pro_f3', 'plan_pro_f4',
              'plan_pro_f5', 'plan_pro_f6', 'plan_pro_f7', 'plan_pro_f8',
            ].map(k => (
              <li key={k} className="flex items-start gap-2 text-sm text-[var(--ink2)]">
                <span className="text-[#a87a00] shrink-0 mt-0.5 font-bold">✓</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
          {ent.isPro ? (
            <div className="text-xs text-center font-semibold text-[#a87a00] py-2 rounded-lg bg-[#fdf3d4]">
              ⭐ {t('plan_pro_current')}
            </div>
          ) : hidePricing ? (
            // Apple compliance: en iOS no hay botón de upgrade — el usuario
            // tiene que gestionar Pro desde la web. NO incluimos URL ni
            // botón con link directo (Apple lo rechaza). Solo texto info.
            <div className="text-xs text-center text-[var(--ink2)] py-3 px-2 rounded-lg bg-black/5 leading-relaxed">
              {t('pricing_ios_manage_on_web')}
            </div>
          ) : (
            <>
              <button onClick={handleSubscribe}
                      className="w-full px-4 py-3 rounded-lg bg-[#e8b920] hover:bg-[#c9a018] text-white font-semibold text-sm transition-colors">
                {billingPeriod === 'annual'
                  ? `Suscribirse anual · $99/año`
                  : `Suscribirse · $11/mes`}
              </button>
              {/* La garantia de 30 dias y el enlace a /refund-policy se
                  eliminaron: con compra in-app el reembolso lo gestiona la
                  tienda segun sus propias reglas, no nosotros. La politica
                  definitiva se redacta en la Fase 2. */}
            </>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-[var(--ink3)] max-w-xl mx-auto leading-relaxed">
        {t('pricing_footnote')}
      </div>
    </div>
  );
}
