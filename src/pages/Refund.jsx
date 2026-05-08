import { useT } from '../lib/i18n';

/**
 * Refund Policy page (`/refund-policy`).
 *
 * Política pública de reembolsos. Ofrece la garantía de satisfacción
 * de 30 días + casos despues de 30 días + cancelación + cómo se procesa
 * + identificación del cargo + contacto.
 *
 * Decisión de negocio en `docs/decisiones.md` (2026-05-08, sección
 * "Política de garantía de satisfacción y reembolsos").
 *
 * Estructura paralela a Terms.jsx y Privacy.jsx para consistencia visual.
 */
export default function Refund() {
  const t = useT();
  const effective = '2026-05-08';

  return (
    <article className="max-w-3xl mx-auto">
      <div className="card p-8">
        <h1 className="font-display text-3xl text-[var(--ink)] mb-2">
          {t('legal_refund_title')}
        </h1>
        <p className="text-xs text-[var(--ink3)] mb-6">
          {t('legal_effective')}: {effective}
        </p>

        <p className="text-sm text-[var(--ink2)] leading-relaxed mb-8">
          {t('legal_refund_intro')}
        </p>

        <section className="space-y-6 text-sm text-[var(--ink2)] leading-relaxed">
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">
              1. {t('legal_refund_s1_title')}
            </h2>
            <p>{t('legal_refund_s1_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">
              2. {t('legal_refund_s2_title')}
            </h2>
            <p>{t('legal_refund_s2_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">
              3. {t('legal_refund_s3_title')}
            </h2>
            <p>{t('legal_refund_s3_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">
              4. {t('legal_refund_s4_title')}
            </h2>
            <p>{t('legal_refund_s4_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">
              5. {t('legal_refund_s5_title')}
            </h2>
            <p>{t('legal_refund_s5_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">
              6. {t('legal_refund_s6_title')}
            </h2>
            <p>{t('legal_refund_s6_body')}</p>
          </div>
        </section>
      </div>
    </article>
  );
}
