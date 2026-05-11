import { useT } from '../lib/i18n';

export default function Privacy() {
  const t = useT();
  // Fecha de última revisión sustantiva. Se actualiza al cambiar contenido
  // material (no por typos). Próximo cambio recomendado: cuando se integre
  // Lemonsqueezy SDK con cobros reales o cuando se agregue cifrado E2E.
  const effective = '2026-05-11';

  return (
    <article className="max-w-3xl mx-auto">
      <div className="card p-8">
        <h1 className="font-display text-3xl text-[var(--ink)] mb-2">
          {t('legal_privacy_title')}
        </h1>
        <p className="text-xs text-[var(--ink3)] mb-8">
          {t('legal_effective')}: {effective}
        </p>

        <section className="space-y-6 text-sm text-[var(--ink2)] leading-relaxed">
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">1. {t('legal_privacy_s1_title')}</h2>
            <p>{t('legal_privacy_s1_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">2. {t('legal_privacy_s2_title')}</h2>
            <p>{t('legal_privacy_s2_body')}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t('legal_privacy_s2_li1')}</li>
              <li>{t('legal_privacy_s2_li2')}</li>
              <li>{t('legal_privacy_s2_li3')}</li>
              <li>{t('legal_privacy_s2_li4')}</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">3. {t('legal_privacy_s3_title')}</h2>
            <p>{t('legal_privacy_s3_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">4. {t('legal_privacy_s4_title')}</h2>
            <p>{t('legal_privacy_s4_body')}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Supabase</strong> — {t('legal_privacy_s4_supabase')}</li>
              <li><strong>Google OAuth</strong> — {t('legal_privacy_s4_google')}</li>
              <li><strong>Lemonsqueezy</strong> — {t('legal_privacy_s4_lemonsqueezy')}</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">5. {t('legal_privacy_s5_title')}</h2>
            <p>{t('legal_privacy_s5_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">6. {t('legal_privacy_s6_title')}</h2>
            <p>{t('legal_privacy_s6_body')}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t('legal_privacy_s6_li1')}</li>
              <li>{t('legal_privacy_s6_li2')}</li>
              <li>{t('legal_privacy_s6_li3')}</li>
              <li>{t('legal_privacy_s6_li4')}</li>
              <li>{t('legal_privacy_s6_li5')}</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">7. {t('legal_privacy_s7_title')}</h2>
            <p>{t('legal_privacy_s7_body')}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t('legal_privacy_s7_li1')}</li>
              <li>{t('legal_privacy_s7_li2')}</li>
              <li>{t('legal_privacy_s7_li3')}</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">8. {t('legal_privacy_s8_title')}</h2>
            <p>{t('legal_privacy_s8_body')}</p>
          </div>

          {/* Sección 9 — Compromiso de no uso de datos. Agregada 2026-05-11
              tras auditoría legal Sandra Fernández (Ley 21.719). Era una
              "trampa legal" no documentada explícitamente. */}
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">9. {t('legal_privacy_s9_title')}</h2>
            <p>{t('legal_privacy_s9_body')}</p>
          </div>

          {/* Sección 10 — Datos de proveedores ingresados por el usuario.
              Agregada 2026-05-11 tras auditoría legal. Aplica al módulo
              Inventario donde el usuario registra proveedores. */}
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">10. {t('legal_privacy_s10_title')}</h2>
            <p>{t('legal_privacy_s10_body')}</p>
          </div>

          {/* Sección 11 — Sincronización: aclaración explícita de que NO es
              peer-to-peer y los datos pasan por Supabase como intermediario.
              Agregada 2026-05-11 tras auditoría legal. */}
          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">11. {t('legal_privacy_s11_title')}</h2>
            <p>{t('legal_privacy_s11_body')}</p>
          </div>

          <div>
            <h2 className="font-display text-lg text-[var(--ink)] mb-2">12. {t('legal_privacy_s12_title')}</h2>
            <p>{t('legal_privacy_s12_body')}</p>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-[var(--gold2)] text-[#5c3d00] text-xs">
            {t('legal_template_warning')}
          </div>
        </section>
      </div>
    </article>
  );
}
