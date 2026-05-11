import { useT } from '../lib/i18n';

export default function Terms() {
  const t = useT();
  // Última revisión sustantiva 2026-05-11: agregada sección 12 con
  // diferencias Free vs Pro tras auditoría legal Sandra Fernández.
  const effective = '2026-05-11';

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

          {/* Cláusulas nuevas (2026-05-08) — Merchant of Record + Reembolsos
              + Cancelación. Necesarias antes de activar Lemonsqueezy en
              producción. Decisión completa en docs/decisiones.md. */}
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">9. {t('legal_terms_s9_title')}</h2>
            <p>{t('legal_terms_s9_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">10. {t('legal_terms_s10_title')}</h2>
            <p>{t('legal_terms_s10_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">11. {t('legal_terms_s11_title')}</h2>
            <p>{t('legal_terms_s11_body')}</p>
          </div>

          {/* Sección 12 — Diferencias por tier (Free vs Pro). Agregada
              2026-05-11 tras auditoría legal Sandra Fernández (Ley 21.719).
              Importante: aclarar que Pro mantiene custodia local de datos. */}
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">12. {t('legal_terms_s12_title')}</h2>
            <p>{t('legal_terms_s12_body')}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li><strong>{t('legal_terms_s12_free_title')}</strong> — {t('legal_terms_s12_free_body')}</li>
              <li><strong>{t('legal_terms_s12_pro_title')}</strong> — {t('legal_terms_s12_pro_body')}</li>
            </ul>
            <p className="mt-3 italic">{t('legal_terms_s12_note')}</p>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-[var(--gold2)] text-[#5c3d00] text-xs">
            {t('legal_template_warning')}
          </div>
        </section>
      </div>
    </article>
  );
}
