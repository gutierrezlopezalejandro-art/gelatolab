import { useT } from '../lib/i18n';
import { useEntitlement } from '../lib/entitlement';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { track } from '../lib/analytics';
import { shouldHidePricingUI } from '../lib/platform';

/**
 * Pricing page. Lists Free vs Pro features and a CTA. The CTA is currently
 * a placeholder that shows a toast — Stripe wiring lands in the next phase.
 *
 * Apple App Store compliance: en iOS Capacitor (shouldHidePricingUI()=true)
 * NO mostramos precio ni botón "Suscribirse" — Apple Review Guidelines
 * 3.1.1/3.1.3 prohíben que la app iOS lleve al usuario a payments externos.
 * Estrategia adoptada (camino B): Pro management vía web. La app iOS muestra
 * solo info y le sugiere al usuario gestionar su plan desde gelatolab.app.
 */
export default function Pricing() {
  const t = useT();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const ent = useEntitlement();
  const hidePricing = shouldHidePricingUI();

  function handleSubscribe() {
    track('pricing_subscribe_clicked');
    showToast(t('pricing_coming_soon'));
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
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#e8b920] text-[var(--ink)] text-[10px] font-bold uppercase tracking-wider">
            {t('plan_pro_recommended')}
          </div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl text-[var(--ink)]">⭐ {t('plan_pro')}</h2>
            {/* En iOS no mostramos el precio — Apple Review Guidelines 3.1.1
                prohíben mostrar precios de suscripciones que se gestionan
                fuera del IAP de Apple. */}
            {!hidePricing && (
              <div className="text-right">
                <span className="font-display text-3xl text-[var(--ink)]">$9</span>
                <span className="text-xs text-[var(--ink3)] block">{t('plan_pro_per_month')}</span>
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
            <button onClick={handleSubscribe}
                    className="w-full font-bold px-4 py-3 rounded-lg bg-[#e8b920] text-[var(--ink)] hover:opacity-90 cursor-pointer border-none">
              {t('plan_pro_cta')}
            </button>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-[var(--ink3)] max-w-xl mx-auto leading-relaxed">
        {t('pricing_footnote')}
      </div>
    </div>
  );
}
