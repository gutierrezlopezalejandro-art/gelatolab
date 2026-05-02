import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Logo } from '../components/Logo';
import { useT, useI18nStore, LANGUAGES } from '../lib/i18n';
import { useState } from 'react';
import { track } from '../lib/analytics';

const VISITED_KEY = 'gelatolab-visited';

// La pagina /download lista los instaladores con detección de OS, fetch a
// la API de GitHub para version+changelog, y links directos a cada bundle.
// Activamos los botones cuando ya hay un release publico (no draft) en
// /releases/latest del repo.
const RELEASES_AVAILABLE = false;

function detectOS() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  if (platform.includes('mac') || ua.includes('mac os')) return 'mac';
  if (platform.includes('win') || ua.includes('windows')) return 'win';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

export function markVisited() {
  try { localStorage.setItem(VISITED_KEY, '1'); } catch { /* tolerable */ }
}
export function hasVisited() {
  try { return localStorage.getItem(VISITED_KEY) === '1'; } catch { return false; }
}

function LangSwitch() {
  const { lang, setLang } = useI18nStore();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                   bg-black/5 hover:bg-black/10 text-[var(--ink2)] cursor-pointer border-none transition-colors"
      >
        🌐 {current.label} ▼
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[98]" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 top-full mt-1 z-[99] bg-white rounded-lg shadow-xl border border-black/10 overflow-hidden min-w-[140px]">
            {LANGUAGES.map(l => (
              <li key={l.code}>
                <button
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2
                             hover:bg-[var(--cream)] cursor-pointer border-none
                             ${l.code === lang ? 'bg-[var(--mint3)] text-[var(--mint)]' : 'bg-white text-[var(--ink)]'}`}
                >
                  <span className="font-bold text-[11px] w-5">{l.label}</span>
                  <span>{l.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function Landing() {
  const t = useT();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  // Si el usuario ya esta logueado, manda directo al dashboard sin ver
  // landing. Idem si vuelve y ya marco "visited".
  const shouldRedirect = user || hasVisited();
  useEffect(() => {
    if (shouldRedirect) navigate('/dashboard', { replace: true });
  }, [shouldRedirect, navigate]);
  // Mientras se ejecuta el navigate, no pintamos la landing para evitar el
  // flash de contenido.
  if (shouldRedirect) return null;

  function handleTryFree() {
    track('landing_cta_try_free');
    markVisited();
    navigate('/dashboard');
  }
  function handleSignIn() {
    track('landing_cta_signin');
    markVisited();
    navigate('/auth');
  }
  function handleDownload(platform) {
    track('landing_download_clicked', { platform });
    if (RELEASES_AVAILABLE) {
      navigate('/download');
    }
    // Si no hay release todavia, el boton queda en "proximamente" via disabled.
  }
  const detectedOS = useMemo(() => detectOS(), []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      {/* Top bar */}
      <header className="border-b border-black/10 bg-white/70 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <div>
              <div className="font-display text-xl leading-none">
                Gelato<em className="text-[var(--gold)] not-italic">Lab</em>
              </div>
              <div className="text-[10px] text-[var(--ink3)] tracking-wider mt-0.5">
                {t('brand_sub')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button onClick={handleSignIn}
                    className="text-sm font-semibold px-4 py-2 rounded-lg bg-transparent text-[var(--ink2)] hover:bg-black/5 cursor-pointer border-none">
              {t('landing_signin')}
            </button>
            <button onClick={handleTryFree}
                    className="text-sm font-bold px-5 py-2 rounded-lg bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 cursor-pointer border-none transition-opacity">
              {t('landing_try_free')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero — fondo con gradient calido italiano + emojis decorativos */}
      <section className="relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, var(--cream) 0%, #fff 45%, var(--mint3) 100%)' }}>
        {/* Decoraciones flotantes (gelati) */}
        <div className="hidden md:block absolute top-12 left-8 text-7xl opacity-15 select-none rotate-[-12deg]" aria-hidden="true">🍨</div>
        <div className="hidden md:block absolute bottom-16 right-12 text-7xl opacity-15 select-none rotate-[18deg]" aria-hidden="true">🍦</div>
        <div className="hidden lg:block absolute top-24 right-32 text-5xl opacity-10 select-none rotate-[8deg]" aria-hidden="true">🥄</div>
        <div className="hidden lg:block absolute bottom-32 left-20 text-5xl opacity-10 select-none rotate-[-6deg]" aria-hidden="true">🍋</div>

        <div className="max-w-[1100px] mx-auto px-5 py-20 md:py-28 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-white shadow-sm text-[var(--mint)] border border-[var(--mint2)] mb-6">
              <span className="text-base" aria-hidden="true">🇮🇹</span>
              {t('landing_hero_badge')}
            </div>
            <h1 className="font-display text-5xl md:text-7xl text-[var(--ink)] leading-[1.02] mb-6 tracking-tight">
              {t('landing_hero_title_1')}{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--gold) 0%, var(--coral) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {t('landing_hero_title_2')}
              </span>
            </h1>
            <p className="text-xl text-[var(--ink2)] leading-relaxed mb-10 max-w-2xl mx-auto">
              {t('landing_hero_sub')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={handleTryFree}
                      className="text-base font-bold px-8 py-3.5 rounded-xl bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 cursor-pointer border-none transition-all hover:scale-[1.02] shadow-md">
                {t('landing_cta_primary')} →
              </button>
              <button onClick={handleSignIn}
                      className="text-base font-semibold px-8 py-3.5 rounded-xl bg-white text-[var(--ink)] border-2 border-black/10 hover:border-[var(--mint2)] cursor-pointer transition-colors">
                {t('landing_cta_secondary')}
              </button>
            </div>
            <p className="text-sm text-[var(--ink3)] mt-5">{t('landing_no_card')}</p>

            {/* Strip de stats */}
            <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm bg-white/60 backdrop-blur rounded-2xl px-6 py-3 shadow-sm border border-black/5">
              <Stat n="50+" label={t('landing_stat_recipes')} />
              <span className="text-black/15 hidden md:inline">·</span>
              <Stat n="8" label={t('landing_stat_languages')} />
              <span className="text-black/15 hidden md:inline">·</span>
              <Stat n="3" label={t('landing_stat_countries')} />
              <span className="text-black/15 hidden md:inline">·</span>
              <Stat n="100%" label={t('landing_stat_offline')} />
            </div>
          </div>
        </div>
      </section>

      {/* "¿Te suena familiar?" — dolores reales del heladero, cada uno con
          la solucion que GelatoLab da. Inspirado en la estructura de gelatops
          pero adaptado al mercado LatAm. */}
      <section className="bg-white border-b border-black/10 py-20">
        <div className="max-w-[1100px] mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--coral2)] text-[var(--coral)] mb-4">
              {t('landing_pain_kicker')}
            </div>
            <h2 className="font-display text-4xl text-[var(--ink)]">{t('landing_pain_title')}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-[900px] mx-auto">
            <Pain
              dolor={t('landing_pain_1_pain')}
              solucion={t('landing_pain_1_sol')}
            />
            <Pain
              dolor={t('landing_pain_2_pain')}
              solucion={t('landing_pain_2_sol')}
            />
            <Pain
              dolor={t('landing_pain_3_pain')}
              solucion={t('landing_pain_3_sol')}
            />
            <Pain
              dolor={t('landing_pain_4_pain')}
              solucion={t('landing_pain_4_sol')}
            />
          </div>
        </div>
      </section>

      {/* Diferenciadores: 3 columnas con headers de color */}
      <section className="max-w-[1100px] mx-auto px-5 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            emoji="🧪"
            title={t('landing_diff_1_title')}
            body={t('landing_diff_1_body')}
            accent="mint"
          />
          <FeatureCard
            emoji="🏷️"
            title={t('landing_diff_2_title')}
            body={t('landing_diff_2_body')}
            accent="gold"
          />
          <FeatureCard
            emoji="📱"
            title={t('landing_diff_3_title')}
            body={t('landing_diff_3_body')}
            accent="coral"
          />
        </div>
      </section>

      {/* Como funciona: 4 pasos */}
      <section className="bg-white border-y border-black/10 py-20">
        <div className="max-w-[1100px] mx-auto px-5">
          <h2 className="font-display text-4xl text-center mb-4">{t('landing_how_title')}</h2>
          <p className="text-base text-[var(--ink2)] text-center mb-14 max-w-xl mx-auto">
            {t('landing_how_sub')}
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            <Step n="1" emoji="📝" title={t('landing_step_1_title')} body={t('landing_step_1_body')} />
            <Step n="2" emoji="📊" title={t('landing_step_2_title')} body={t('landing_step_2_body')} />
            <Step n="3" emoji="🍨" title={t('landing_step_3_title')} body={t('landing_step_3_body')} />
            <Step n="4" emoji="🖨️" title={t('landing_step_4_title')} body={t('landing_step_4_body')} />
          </div>
        </div>
      </section>

      {/* Equipos y proceso integrado — diferenciador clave introducido en
          v1.x: GelatoLab conoce el equipo concreto del usuario y adapta
          recomendaciones, avisos y registros HACCP a ese modelo. */}
      <section className="max-w-[1100px] mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl text-[var(--ink)] mb-3">{t('landing_equip_title')}</h2>
          <p className="text-base text-[var(--ink2)] max-w-2xl mx-auto">{t('landing_equip_sub')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            emoji="🛠"
            title={t('landing_equip_1_title')}
            body={t('landing_equip_1_body')}
            accent="mint"
          />
          <FeatureCard
            emoji="🇨🇱"
            title={t('landing_equip_2_title')}
            body={t('landing_equip_2_body')}
            accent="gold"
          />
          <FeatureCard
            emoji="🤖"
            title={t('landing_equip_3_title')}
            body={t('landing_equip_3_body')}
            accent="coral"
          />
        </div>
      </section>

      {/* Mockups visuales — 3 capturas estilizadas con numeros reales para
          mostrar tangiblemente lo que hace la app. No son screenshots porque
          requeririan montar dev server; son representaciones SVG/HTML. */}
      <section className="max-w-[1100px] mx-auto px-5 py-20">
        <h2 className="font-display text-4xl text-center mb-3">{t('landing_mock_title')}</h2>
        <p className="text-base text-[var(--ink2)] text-center mb-12 max-w-xl mx-auto">{t('landing_mock_sub')}</p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Mock 1: Balance con sus indicadores */}
          <MockCard title={t('landing_mock_1_title')} desc={t('landing_mock_1_desc')}>
            <div className="space-y-2 text-xs">
              <BalanceRow label="Grasa" value="9.8%" status="ok" range="6 - 12%" />
              <BalanceRow label="Azúcar" value="18.2%" status="ok" range="16 - 22%" />
              <BalanceRow label="MSNF" value="10.1%" status="ok" range="9 - 12%" />
              <BalanceRow label="Sólidos" value="38.4%" status="warn" range="36 - 44%" />
              <BalanceRow label="FPD" value="-2.7°C" status="ok" range="-2 a -3°C" />
              <BalanceRow label="PAC" value="194" status="ok" range="180 - 220" />
              <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mint3)] text-[var(--mint)] text-xs font-bold">✓</span>
                <span className="font-semibold text-[var(--mint)]">Balanceada</span>
              </div>
            </div>
          </MockCard>

          {/* Mock 2: Etiqueta chilena con sellos ALTO EN */}
          <MockCard title={t('landing_mock_2_title')} desc={t('landing_mock_2_desc')}>
            <div className="border-2 border-black rounded-md p-3 bg-white">
              <div className="text-center font-display text-base font-bold">Helado vainilla</div>
              <div className="text-center text-[10px] text-[var(--ink3)] mb-2">Lote LOTE-2026-0014</div>
              <div className="flex justify-center gap-1.5 mb-2">
                <Sello>ALTO EN<br/>AZÚCARES</Sello>
                <Sello>ALTO EN<br/>GRASAS<br/>SATURADAS</Sello>
              </div>
              <div className="text-[9px] text-[var(--ink3)] text-center font-mono">
                Min. de Salud · Ley 20.606
              </div>
              <div className="mt-2 pt-2 border-t border-black/10 text-[10px]">
                <div className="flex justify-between"><span>Energía</span><span className="font-mono">232 kcal</span></div>
                <div className="flex justify-between"><span>Azúcar total</span><span className="font-mono">19.4 g</span></div>
                <div className="flex justify-between"><span>Sodio</span><span className="font-mono">42 mg</span></div>
              </div>
            </div>
          </MockCard>

          {/* Mock 3: Comparación cross-recipes */}
          <MockCard title={t('landing_mock_3_title')} desc={t('landing_mock_3_desc')}>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left pb-1.5 font-semibold">Métrica</th>
                  <th className="text-right pb-1.5 font-semibold">Vainilla</th>
                  <th className="text-right pb-1.5 font-semibold">Light</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black/5">
                  <td className="py-1">Energía</td>
                  <td className="text-right py-1 tabular-nums" style={{ background: 'var(--coral2)', color: 'var(--coral)' }}>232</td>
                  <td className="text-right py-1 tabular-nums" style={{ background: 'var(--mint3)', color: 'var(--mint)', fontWeight: 700 }}>168</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-1">Azúcar</td>
                  <td className="text-right py-1 tabular-nums" style={{ background: 'var(--coral2)', color: 'var(--coral)' }}>19.4</td>
                  <td className="text-right py-1 tabular-nums" style={{ background: 'var(--mint3)', color: 'var(--mint)', fontWeight: 700 }}>11.2</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="py-1">Grasa sat.</td>
                  <td className="text-right py-1 tabular-nums" style={{ background: 'var(--coral2)', color: 'var(--coral)' }}>5.8</td>
                  <td className="text-right py-1 tabular-nums" style={{ background: 'var(--mint3)', color: 'var(--mint)', fontWeight: 700 }}>2.1</td>
                </tr>
                <tr>
                  <td className="py-1">Sodio</td>
                  <td className="text-right py-1 tabular-nums">42</td>
                  <td className="text-right py-1 tabular-nums">38</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--ink3)]">
              <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: 'var(--mint3)' }}></span>
              <span>Mejor</span>
              <span className="inline-block w-2.5 h-2.5 rounded ml-2" style={{ background: 'var(--coral2)' }}></span>
              <span>Peor</span>
            </div>
          </MockCard>
        </div>
      </section>

      {/* Features grid (6 cards) */}
      <section className="max-w-[1100px] mx-auto px-5 py-20">
        <h2 className="font-display text-4xl text-center mb-12">{t('landing_features_title')}</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <MiniCard emoji="⚖️" t1={t('landing_feat_1_t')} t2={t('landing_feat_1_b')} />
          <MiniCard emoji="❄️" t1={t('landing_feat_2_t')} t2={t('landing_feat_2_b')} />
          <MiniCard emoji="📦" t1={t('landing_feat_3_t')} t2={t('landing_feat_3_b')} />
          <MiniCard emoji="🧪" t1={t('landing_feat_4_t')} t2={t('landing_feat_4_b')} />
          <MiniCard emoji="🚚" t1={t('landing_feat_5_t')} t2={t('landing_feat_5_b')} />
          <MiniCard emoji="🖨️" t1={t('landing_feat_6_t')} t2={t('landing_feat_6_b')} />
        </div>
      </section>

      {/* Glosario rapido — explica las siglas tecnicas */}
      <section className="max-w-[900px] mx-auto px-5 pb-20">
        <div className="bg-white rounded-2xl border border-black/10 p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl" aria-hidden="true">📖</span>
            <h3 className="font-display text-2xl text-[var(--ink)]">{t('landing_glossary_title')}</h3>
          </div>
          <p className="text-sm text-[var(--ink3)] mb-5">{t('landing_glossary_sub')}</p>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <GlossaryItem term="FPD" def={t('landing_gloss_fpd')} />
            <GlossaryItem term="PAC" def={t('landing_gloss_pac')} />
            <GlossaryItem term="POD" def={t('landing_gloss_pod')} />
            <GlossaryItem term="MSNF" def={t('landing_gloss_msnf')} />
            <GlossaryItem term="FW" def={t('landing_gloss_fw')} />
            <GlossaryItem term="HACCP" def={t('landing_gloss_haccp')} />
          </div>
        </div>
      </section>

      {/* Descargas */}
      <section className="bg-[var(--cream2)]/60 border-y border-black/10 py-20">
        <div className="max-w-[900px] mx-auto px-5 text-center">
          <h2 className="font-display text-4xl mb-4">{t('landing_download_title')}</h2>
          <p className="text-base text-[var(--ink2)] mb-10 max-w-xl mx-auto">{t('landing_download_sub')}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <DownloadCard
              os="win"
              icon="🪟"
              title="Windows"
              sub=".exe / .msi"
              highlighted={detectedOS === 'win'}
              onClick={() => handleDownload('win')}
              disabled={!RELEASES_AVAILABLE}
              t={t}
            />
            <DownloadCard
              os="mac"
              icon="🍎"
              title="macOS"
              sub=".dmg (Intel + ARM)"
              highlighted={detectedOS === 'mac'}
              onClick={() => handleDownload('mac')}
              disabled={!RELEASES_AVAILABLE}
              t={t}
            />
            <DownloadCard
              os="linux"
              icon="🐧"
              title="Linux"
              sub=".AppImage / .deb"
              highlighted={detectedOS === 'linux'}
              onClick={() => handleDownload('linux')}
              disabled={!RELEASES_AVAILABLE}
              t={t}
            />
          </div>

          <p className="text-sm text-[var(--ink3)] mt-2">
            {t('landing_download_or')}{' '}
            <button onClick={handleTryFree}
                    className="text-[var(--mint)] hover:underline cursor-pointer bg-transparent border-none font-semibold">
              {t('landing_download_use_web')} →
            </button>
          </p>
        </div>
      </section>

      {/* Tecnologia — fondo oscuro con accent gold */}
      <section className="relative overflow-hidden py-20"
               style={{ background: 'linear-gradient(135deg, var(--ink) 0%, #2d2419 100%)' }}>
        <div className="absolute top-10 right-10 text-9xl opacity-5 select-none" aria-hidden="true">🇮🇹</div>
        <div className="max-w-[900px] mx-auto px-5 text-center relative">
          <h2 className="font-display text-4xl text-white mb-4">{t('landing_tech_title')}</h2>
          <p className="text-base text-white/75 leading-relaxed mb-8 max-w-xl mx-auto">
            {t('landing_tech_body')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <Chip>FPD · PAC · POD</Chip>
            <Chip>GelatoPassport</Chip>
            <Chip>Ley 20.606 (CL)</Chip>
            <Chip>RDC 429/2020 (BR)</Chip>
            <Chip>Reg. UE 1169/2011</Chip>
            <Chip>HACCP</Chip>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[820px] mx-auto px-5 py-20">
        <h2 className="font-display text-4xl text-center mb-10">{t('landing_faq_title')}</h2>
        <div className="space-y-3">
          <Faq q={t('landing_faq_1_q')} a={t('landing_faq_1_a')} />
          <Faq q={t('landing_faq_2_q')} a={t('landing_faq_2_a')} />
          <Faq q={t('landing_faq_3_q')} a={t('landing_faq_3_a')} />
          <Faq q={t('landing_faq_4_q')} a={t('landing_faq_4_a')} />
          <Faq q={t('landing_faq_5_q')} a={t('landing_faq_5_a')} />
        </div>
      </section>

      {/* CTA final con fondo de color */}
      <section className="relative overflow-hidden py-20"
               style={{ background: 'linear-gradient(135deg, var(--mint3) 0%, #fff 60%, var(--cream2) 100%)' }}>
        <div className="hidden md:block absolute top-8 left-12 text-6xl opacity-20 select-none rotate-[-10deg]" aria-hidden="true">🍦</div>
        <div className="hidden md:block absolute bottom-8 right-12 text-6xl opacity-20 select-none rotate-[12deg]" aria-hidden="true">🍨</div>
        <div className="max-w-[800px] mx-auto px-5 text-center relative">
          <h2 className="font-display text-4xl mb-4">{t('landing_final_title')}</h2>
          <p className="text-base text-[var(--ink2)] mb-8 max-w-xl mx-auto">{t('landing_final_body')}</p>
          <button onClick={handleTryFree}
                  className="text-base font-bold px-8 py-3.5 rounded-xl bg-[var(--mint)] text-white hover:opacity-90 cursor-pointer border-none transition-all hover:scale-[1.02] shadow-md">
            {t('landing_cta_primary')} →
          </button>
          <p className="text-sm text-[var(--ink3)] mt-4">{t('landing_no_card')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink3)]">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span>© {new Date().getFullYear()} GelatoLab</span>
          </div>
          <nav className="flex flex-wrap gap-6">
            <Link to="/help" className="hover:text-[var(--ink)] transition-colors">{t('help_title')}</Link>
            <Link to="/terms" className="hover:text-[var(--ink)] transition-colors">{t('legal_terms_title')}</Link>
            <Link to="/privacy" className="hover:text-[var(--ink)] transition-colors">{t('legal_privacy_title')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// Mapa de accents para FeatureCard. Cada uno aporta un acento de color
// diferente — verde (mint), dorado (gold) o coral — para romper la
// monotonia visual sin recargar.
const ACCENTS = {
  mint:  { bg: 'var(--mint3)',  fg: 'var(--mint)',  border: 'var(--mint2)' },
  gold:  { bg: '#fdf3d4',       fg: '#a87a00',      border: '#e8c870' },
  coral: { bg: 'var(--coral2)', fg: 'var(--coral)', border: '#f5a890' },
};

function FeatureCard({ emoji, title, body, accent = 'mint' }) {
  const a = ACCENTS[accent] || ACCENTS.mint;
  return (
    <div className="bg-white rounded-2xl p-7 border-2 border-black/5 hover:shadow-lg hover:-translate-y-1 transition-all"
         style={{ borderTopColor: a.border, borderTopWidth: '4px' }}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-3xl mb-4"
           style={{ background: a.bg }}>
        <span aria-hidden="true">{emoji}</span>
      </div>
      <h3 className="font-display text-2xl mb-3 text-[var(--ink)]">{title}</h3>
      <p className="text-base text-[var(--ink2)] leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, emoji, title, body }) {
  return (
    <div className="text-center">
      <div className="relative inline-flex flex-col items-center mb-4">
        <div className="text-5xl mb-2" aria-hidden="true">{emoji}</div>
        <div className="absolute -top-1 -right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#e8b920] text-[var(--ink)] font-bold text-sm shadow-sm">
          {n}
        </div>
      </div>
      <h3 className="font-display text-lg mb-2 text-[var(--ink)]">{title}</h3>
      <p className="text-sm text-[var(--ink2)] leading-relaxed">{body}</p>
    </div>
  );
}

function MiniCard({ emoji, t1, t2 }) {
  return (
    <div className="rounded-xl p-5 bg-white border border-black/10 hover:border-[var(--mint2)] hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <span className="text-3xl shrink-0" aria-hidden="true">{emoji}</span>
        <div>
          <div className="font-semibold text-base text-[var(--ink)] mb-1.5">{t1}</div>
          <p className="text-sm text-[var(--ink2)] leading-relaxed">{t2}</p>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 font-mono">
      {children}
    </span>
  );
}

function Stat({ n, label }) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <span className="font-display text-xl text-[var(--ink)] font-bold">{n}</span>
      <span className="text-[var(--ink3)]">{label}</span>
    </div>
  );
}

function GlossaryItem({ term, def }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-sm font-bold text-[var(--mint)] shrink-0 min-w-[3.5rem]">{term}</span>
      <span className="text-[var(--ink2)]">{def}</span>
    </div>
  );
}

function Pain({ dolor, solucion }) {
  return (
    <div className="bg-[var(--cream2)]/40 rounded-2xl p-6 border border-black/5">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl shrink-0" aria-hidden="true">😩</span>
        <p className="text-base text-[var(--ink2)] leading-relaxed italic">"{dolor}"</p>
      </div>
      <div className="flex items-start gap-3 pl-1 border-l-4 border-[var(--mint)]">
        <span className="text-2xl shrink-0 ml-2" aria-hidden="true">✨</span>
        <p className="text-base text-[var(--ink)] leading-relaxed font-medium">{solucion}</p>
      </div>
    </div>
  );
}

function MockCard({ title, desc, children }) {
  return (
    <div className="rounded-2xl p-5 bg-white border-2 border-black/5 shadow-sm">
      <div className="bg-[var(--cream2)]/40 rounded-lg p-4 mb-4 min-h-[180px]">
        {children}
      </div>
      <h4 className="font-display text-lg text-[var(--ink)] mb-1">{title}</h4>
      <p className="text-sm text-[var(--ink2)] leading-relaxed">{desc}</p>
    </div>
  );
}

function BalanceRow({ label, value, status, range }) {
  const colorMap = {
    ok:   { dot: 'var(--mint)',  bg: 'var(--mint3)' },
    warn: { dot: 'var(--gold)',  bg: '#fdf3d4' },
    bad:  { dot: 'var(--coral)', bg: 'var(--coral2)' },
  };
  const c = colorMap[status] || colorMap.ok;
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded" style={{ background: c.bg }}>
      <span className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: c.dot }} aria-hidden="true"></span>
        <span className="font-medium text-[var(--ink)]">{label}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[9px] text-[var(--ink3)] tabular-nums">{range}</span>
        <span className="font-mono font-bold text-[var(--ink)]">{value}</span>
      </span>
    </div>
  );
}

function Sello({ children }) {
  return (
    <div className="bg-black text-white text-[7px] font-bold leading-tight rounded-full w-12 h-12 flex items-center justify-center text-center px-1"
         aria-hidden="true">
      {children}
    </div>
  );
}

function DownloadCard({ icon, title, sub, highlighted, onClick, disabled, t }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${t('landing_download_btn')} ${title}`}
      className={`p-5 rounded-xl border-2 transition-all cursor-pointer text-left
        ${highlighted ? 'border-[var(--mint)] bg-white shadow-md' : 'border-black/10 bg-white hover:border-[var(--mint2)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed hover:border-black/10' : ''}`}
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl" aria-hidden="true">{icon}</span>
        <div>
          <div className="font-display text-lg text-[var(--ink)]">{title}</div>
          <div className="text-[10px] text-[var(--ink3)] font-mono uppercase tracking-wider">{sub}</div>
        </div>
        {highlighted && (
          <span className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--mint3)] text-[var(--mint)]">
            {t('landing_download_your_os')}
          </span>
        )}
      </div>
      <div className="text-xs text-[var(--ink2)] mt-2 font-semibold">
        {disabled ? `⏳ ${t('landing_download_coming_soon')}` : `↓ ${t('landing_download_btn')}`}
      </div>
    </button>
  );
}

function Faq({ q, a }) {
  return (
    <details className="rounded-lg border border-black/10 bg-white open:shadow-sm transition-shadow">
      <summary className="px-5 py-3 cursor-pointer font-semibold text-sm text-[var(--ink)] hover:bg-[var(--cream2)]/40 select-none flex items-center justify-between gap-3">
        <span>{q}</span>
        <span className="text-[var(--ink3)] text-xs flex-shrink-0">▾</span>
      </summary>
      <div className="px-5 pb-4 text-sm text-[var(--ink2)] leading-relaxed">
        {a}
      </div>
    </details>
  );
}
