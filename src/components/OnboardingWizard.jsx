import { useState } from 'react';
import { useT, useI18nStore, LANGUAGES } from '../lib/i18n';
import { COUNTRIES, getBusinessFields } from '../lib/countryRegulations';
import { useCountryStore } from '../store/countryStore';
import { useBusinessStore } from '../store/businessStore';
import { Flag } from './CountrySelector';

/**
 * Three-step modal that runs the first time the app loads or when a brand-new
 * account signs in. Captures language → country → business identity. The form
 * adapts the tax-ID label to the country chosen in step 2.
 *
 * Once completed (or skipped), the businessStore.completed flag is set true
 * so the wizard never reappears unless the user resets it from settings.
 */
export function OnboardingWizard() {
  const t = useT();
  const lang = useI18nStore(s => s.lang);
  const setLang = useI18nStore(s => s.setLang);
  const country = useCountryStore(s => s.country);
  const setCountry = useCountryStore(s => s.setCountry);
  const business = useBusinessStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fantasy_name: business.fantasy_name,
    legal_name:   business.legal_name,
    tax_id:       business.tax_id,
    sanitary_reg: business.sanitary_reg,
    address:      business.address,
  });

  const fields = getBusinessFields(country);

  function next() { setStep(s => Math.min(3, s + 1)); }
  function back() { setStep(s => Math.max(1, s - 1)); }

  function finish() {
    business.update({ ...form });
    business.complete();
  }

  function skip() {
    // Mark complete with whatever the user filled (may be empty)
    business.update({ ...form });
    business.complete();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with step indicator */}
        <div className="px-6 py-4 border-b border-black/10">
          <div className="flex items-center justify-between mb-2">
            <h2 id="onboarding-title" className="font-display text-lg text-[var(--ink)]">
              {t('onb_setup_title')}
            </h2>
            <button onClick={skip}
                    className="text-xs text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">
              {t('onb_skip')}
            </button>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex-1 h-1 rounded-full"
                   style={{ background: n <= step ? 'var(--mint)' : 'var(--cream2)' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div>
              <h3 className="font-display text-base text-[var(--ink)] mb-1">{t('onb_step1_title')}</h3>
              <p className="text-xs text-[var(--ink3)] mb-4">{t('onb_step1_sub')}</p>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`py-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors
                                ${lang === l.code
                                  ? 'bg-[var(--mint)] text-white border-[var(--mint)]'
                                  : 'bg-white border-black/10 hover:border-[var(--mint2)] text-[var(--ink)]'}`}
                  >
                    {l.label} — {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-display text-base text-[var(--ink)] mb-1">{t('onb_step2_title')}</h3>
              <p className="text-xs text-[var(--ink3)] mb-4">{t('onb_step2_sub')}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {COUNTRIES.map(c => (
                  <li key={c.code}>
                    <button
                      onClick={() => setCountry(c.code)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm cursor-pointer
                                  flex items-center gap-2 transition-colors
                                  ${country === c.code
                                    ? 'bg-[var(--mint3)] border-[var(--mint)] text-[var(--mint)] font-semibold'
                                    : 'bg-white border-black/10 hover:border-[var(--mint2)] text-[var(--ink)]'}`}
                    >
                      <Flag code={c.code} size={20} alt="" />
                      <span className="font-bold w-7">{c.code}</span>
                      <span className="flex-1">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-display text-base text-[var(--ink)] mb-1">{t('onb_step3_title')}</h3>
              <p className="text-xs text-[var(--ink3)] mb-4">{t('onb_step3_sub')}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
                    {t('onb_fantasy_name')} *
                  </label>
                  <input
                    className="input"
                    placeholder={t('onb_fantasy_placeholder')}
                    value={form.fantasy_name}
                    onChange={e => setForm({ ...form, fantasy_name: e.target.value })}
                    autoFocus
                  />
                  <p className="text-[10px] text-[var(--ink3)] mt-0.5">{t('onb_fantasy_hint')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
                    {t('onb_legal_name')}
                  </label>
                  <input
                    className="input"
                    placeholder={t('onb_legal_placeholder')}
                    value={form.legal_name}
                    onChange={e => setForm({ ...form, legal_name: e.target.value })}
                  />
                  <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_legal_name')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
                      {fields.tax_id_label}
                    </label>
                    <input
                      className="input"
                      value={form.tax_id}
                      onChange={e => setForm({ ...form, tax_id: e.target.value })}
                    />
                    <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_tax_id')}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
                      {fields.sanitary_label}
                    </label>
                    <input
                      className="input"
                      value={form.sanitary_reg}
                      onChange={e => setForm({ ...form, sanitary_reg: e.target.value })}
                    />
                    <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_sanitary_reg')}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
                    {t('onb_address')}
                  </label>
                  <input
                    className="input"
                    placeholder={t('onb_address_placeholder')}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                  <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_address')}</p>
                </div>
                <p className="text-[10px] text-[var(--ink3)] leading-relaxed">
                  {t('onb_data_note')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with nav buttons */}
        <div className="px-6 py-3 border-t border-black/10 flex items-center justify-between gap-2">
          <button
            onClick={back}
            disabled={step === 1}
            className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← {t('onb_back')}
          </button>
          {step < 3 ? (
            <button onClick={next} className="btn-primary">
              {t('onb_next')} →
            </button>
          ) : (
            <button onClick={finish} className="btn-primary"
                    disabled={!form.fantasy_name.trim()}>
              ✓ {t('onb_finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
