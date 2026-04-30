import { useT } from '../lib/i18n';

export default function Terms() {
  const t = useT();
  const effective = '2026-04-19';

  return (
    <article className="max-w-3xl mx-auto">
      <div className="card p-8">
        <h1 className="font-display text-3xl text-[var(--ink)] mb-2">
          {t('legal_terms_title')}
        </h1>
        <p className="text-xs text-[var(--ink3)] mb-8">
          {t('legal_effective')}: {effective}
        </p>

        <section className="space-y-6 text-sm text-[var(--ink2)] leading-relaxed">
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">1. {t('legal_terms_s1_title')}</h2>
            <p>{t('legal_terms_s1_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">2. {t('legal_terms_s2_title')}</h2>
            <p>{t('legal_terms_s2_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">3. {t('legal_terms_s3_title')}</h2>
            <p>{t('legal_terms_s3_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">4. {t('legal_terms_s4_title')}</h2>
            <p>{t('legal_terms_s4_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">5. {t('legal_terms_s5_title')}</h2>
            <p>{t('legal_terms_s5_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">6. {t('legal_terms_s6_title')}</h2>
            <p>{t('legal_terms_s6_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">7. {t('legal_terms_s7_title')}</h2>
            <p>{t('legal_terms_s7_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">8. {t('legal_terms_s8_title')}</h2>
            <p>{t('legal_terms_s8_body')}</p>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-[var(--gold2)] text-[#5c3d00] text-xs">
            {t('legal_template_warning')}
          </div>
        </section>
      </div>
    </article>
  );
}
