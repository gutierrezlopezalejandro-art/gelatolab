import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Logo } from '../components/Logo';
import { DesktopWelcome } from '../components/DesktopWelcome';
import { useT, useI18nStore, LANGUAGES } from '../lib/i18n';
import { useState } from 'react';
import { track } from '../lib/analytics';

// Detecta contexto Tauri (app de escritorio). En desktop la landing publica
// es ruido — el usuario ya descargo e instalo, no necesita marketing — asi
// que renderizamos una pantalla A2 con login/registro/sin-cuenta en su lugar.
//
// Para testing sin compilar Tauri: forzar con ?simulate=tauri en la URL
// o `sessionStorage.setItem('__simulate_tauri', '1')`. Persiste el reload.
function isTauriDesktop() {
  if (typeof window === 'undefined') return false;
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) return true;
  try {
    if (new URLSearchParams(window.location.search).get('simulate') === 'tauri') return true;
    if (sessionStorage.getItem('__simulate_tauri') === '1') return true;
  } catch { /* tolerable */ }
  return false;
}

const VISITED_KEY = 'gelatolab-visited';

// La pagina /download lista los instaladores con detección de OS, fetch a
// la API de GitHub para version+changelog, y links directos a cada bundle.
// Activamos los botones cuando ya hay un release publico (no draft) en
// /releases/latest del repo.
const RELEASES_AVAILABLE = true;

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
export function resetVisited() {
  try { localStorage.removeItem(VISITED_KEY); } catch { /* tolerable */ }
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

  // IMPORTANTE: todos los hooks deben ir ANTES del early return de
  // shouldRedirect, sino React tira "rendered fewer hooks" (#300) cuando
  // la sesión cambia (login/logout) y hace re-render.
  const detectedOS = useMemo(() => detectOS(), []);
  const isTauri = useMemo(() => isTauriDesktop(), []);

  // Si el usuario ya esta logueado, manda directo al dashboard sin ver
  // landing. Idem si vuelve y ya marco "visited" (web only — en Tauri
  // siempre mostramos algo: dashboard si logueado, welcome A2 si no).
  const shouldRedirect = user || (!isTauri && hasVisited());
  useEffect(() => {
    if (shouldRedirect) navigate('/dashboard', { replace: true });
  }, [shouldRedirect, navigate]);
  // Mientras se ejecuta el navigate, no pintamos la landing para evitar el
  // flash de contenido.
  if (shouldRedirect) return null;

  // En Tauri sin sesion: mostramos pantalla de bienvenida simple en vez
  // de la landing publica de marketing.
  if (isTauri) return <DesktopWelcome />;

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

      {/* Hero — fondo con foto difuminada de gelato. Sin emojis flotantes
          (se vian infantiles). Padding reducido para que entre todo en un
          viewport de 1080p sin scroll. */}
      <section className="relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, var(--cream) 0%, #fff 45%, var(--mint3) 100%)' }}>
        {/* Foto de fondo — blur leve para que se note la imagen pero el texto
            quede legible con el velo blanco encima. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(./photos/gelato-display.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(4px) saturate(1.15)',
            transform: 'scale(1.05)',
            opacity: 0.55,
          }}
          aria-hidden="true"
        />
        {/* Velo blanco con gradiente suave: texto centro perfectamente
            legible, esquinas mas transparentes para que se note el fondo. */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 70%, rgba(255,255,255,0.35) 100%)' }}
             aria-hidden="true" />

        <div className="max-w-[1100px] mx-auto px-5 py-12 md:py-16 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-white shadow-sm text-[var(--mint)] border border-[var(--mint2)] mb-5">
              {t('landing_hero_badge')}
            </div>
            <h1 className="font-display text-4xl md:text-6xl text-[var(--ink)] leading-[1.05] mb-5 tracking-tight">
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
            <p className="text-base md:text-lg text-[var(--ink2)] leading-relaxed mb-7 max-w-2xl mx-auto">
              {t('landing_hero_sub')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={handleTryFree}
                      className="text-base font-bold px-7 py-3 rounded-xl bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 cursor-pointer border-none transition-all hover:scale-[1.02] shadow-md">
                {t('landing_cta_primary')} →
              </button>
              <button onClick={handleSignIn}
                      className="text-base font-semibold px-7 py-3 rounded-xl bg-white text-[var(--ink)] border-2 border-black/10 hover:border-[var(--mint2)] cursor-pointer transition-colors">
                {t('landing_cta_secondary')}
              </button>
            </div>
            {/* Link a /pricing — para visitantes que quieren ver planes y
                precios sin pasar por la landing completa. Decisión 2026-05-08.
                Color gold (asociado a Pro en el resto de la app) + tamaño
                base + emoji 💎 + subrayado solido para que destaque sin
                competir con los 2 CTA principales del hero. */}
            <div className="mt-5">
              <Link to="/pricing"
                    onClick={() => track('landing_view_pricing')}
                    className="inline-flex items-center gap-1.5 text-base font-semibold text-[#a87a00] hover:text-[#5c3d00] underline underline-offset-4 decoration-2 decoration-[#a87a00]/40 hover:decoration-[#a87a00] transition-colors">
                💎 {t('landing_view_pricing')} →
              </Link>
            </div>

            {/* Strip de stats */}
            <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm bg-white/70 backdrop-blur rounded-2xl px-5 py-2.5 shadow-sm border border-black/5">
              <Stat n="50+" label={t('landing_stat_recipes')} />
              <span className="text-black/15 hidden md:inline">·</span>
              <Stat n="6" label={t('landing_stat_languages')} />
              <span className="text-black/15 hidden md:inline">·</span>
              <Stat n="11" label={t('landing_stat_countries')} />
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
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            <Step n="1" emoji="📝" title={t('landing_step_1_title')} body={t('landing_step_1_body')} />
            <Step n="2" emoji="📦" title={t('landing_step_2_title')} body={t('landing_step_2_body')} />
            <Step n="3" emoji="📊" title={t('landing_step_3_title')} body={t('landing_step_3_body')} />
            <Step n="4" emoji="🍨" title={t('landing_step_4_title')} body={t('landing_step_4_body')} />
            <Step n="5" emoji="🖨️" title={t('landing_step_5_title')} body={t('landing_step_5_body')} />
          </div>
        </div>
      </section>

      {/* Conoce a Marco — ficha del asistente IA que acompaña dentro de la
          app. Avatar + 3 ejemplos de pregunta-respuesta + lista de capacidades.
          Diferenciador clave: GelatoLab no es solo formulación, también es
          un maestro virtual que responde en lenguaje natural. */}
      <section className="bg-gradient-to-br from-[var(--cream)] to-[var(--mint3)] py-20">
        <div className="max-w-[1100px] mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white text-[var(--mint)] border border-[var(--mint2)] mb-4">
                {t('landing_marco_kicker')}
              </div>
              <h2 className="font-display text-5xl text-[var(--ink)] mb-4 leading-tight">{t('landing_marco_title')}</h2>
              <p className="text-base text-[var(--ink2)] leading-relaxed mb-6 max-w-md">{t('landing_marco_sub')}</p>
              <div className="bg-white/60 rounded-2xl p-5 border border-[var(--mint2)]/40 backdrop-blur-sm">
                <h3 className="font-semibold text-sm text-[var(--ink)] mb-3 uppercase tracking-wider">{t('landing_marco_features_title')}</h3>
                <ul className="space-y-2 text-sm text-[var(--ink2)]">
                  <li className="flex gap-2"><span className="text-[var(--mint)] flex-shrink-0">✓</span><span>{t('landing_marco_f1')}</span></li>
                  <li className="flex gap-2"><span className="text-[var(--mint)] flex-shrink-0">✓</span><span>{t('landing_marco_f2')}</span></li>
                  <li className="flex gap-2"><span className="text-[var(--mint)] flex-shrink-0">✓</span><span>{t('landing_marco_f3')}</span></li>
                  <li className="flex gap-2"><span className="text-[var(--mint)] flex-shrink-0">✓</span><span>{t('landing_marco_f4')}</span></li>
                </ul>
              </div>
            </div>

            <div className="relative">
              {/* Card chat con Marco — tres burbujas estilizadas alternando
                  pregunta del usuario y respuesta de Marco. */}
              <div className="bg-white rounded-3xl shadow-2xl p-6 border-2 border-[var(--mint)]/20">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/5">
                  <img src="./marco-avatar.webp" alt="Marco" className="w-14 h-14 rounded-full object-cover border-2 border-[var(--mint2)]" />
                  <div>
                    <div className="font-display text-lg text-[var(--ink)]">Marco</div>
                    <div className="text-xs text-[var(--mint)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--mint)] inline-block" />
                      Disponible 24/7
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <ChatBubble role="user" text={t('landing_marco_q1_q')} />
                  <ChatBubble role="marco" text={t('landing_marco_q1_a')} />
                  <ChatBubble role="user" text={t('landing_marco_q2_q')} />
                  <ChatBubble role="marco" text={t('landing_marco_q2_a')} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Galeria de sabores — foto centrada de gelatos en cups + 4 chips
          de estilos abajo (Helado / Gelato / Sorbete / Paleta). Sin tiles
          de gradiente que se veian infantiles. */}
      <section className="bg-white border-y border-black/10 py-20">
        <div className="max-w-[1100px] mx-auto px-5">
          <div className="text-center mb-10">
            <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--coral2)] text-[var(--coral)] mb-4">
              {t('landing_flavors_kicker')}
            </div>
            <h2 className="font-display text-4xl text-[var(--ink)] mb-3">{t('landing_flavors_title')}</h2>
            <p className="text-base text-[var(--ink2)] max-w-2xl mx-auto">{t('landing_flavors_sub')}</p>
          </div>

          {/* Foto centrada — tamaño grande para que sea el hero visual */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl max-w-[900px] mx-auto aspect-[16/9] mb-10">
            <img
              src="./photos/gelato-flavors.jpg"
              alt="Variedad de gelatos artesanales servidos en copas de vidrio: pistacho, chocolate, frutilla, mango, vainilla y avellana"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Chips de estilos: tipografia limpia, sin gradientes infantiles */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <StyleChip emoji="🍦" name={t('landing_flavor_style_helado')} />
            <StyleChip emoji="🍨" name={t('landing_flavor_style_gelato')} />
            <StyleChip emoji="🍋" name={t('landing_flavor_style_sorbete')} />
            <StyleChip emoji="🍡" name="Paleta" />
          </div>

          <p className="text-center text-sm text-[var(--ink3)] italic max-w-xl mx-auto">
            {t('landing_flavors_footnote')}
          </p>
        </div>
      </section>

      {/* Comunidad — seccion "patagonia". Layout 2 columnas: foto del lago
          Llanquihue + volcan Osorno a la izquierda, mensaje a la derecha.
          Sin foto de fondo, contraste limpio. */}
      <section className="py-20"
               style={{ background: 'linear-gradient(135deg, var(--ink) 0%, #1a2e1a 100%)' }}>
        <div className="max-w-[1100px] mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
              <img src="./photos/lifestyle-couple.jpg"
                   alt="Pareja disfrutando gelato artesanal frente al lago Llanquihue con el volcán Osorno de fondo"
                   className="w-full h-full object-cover"
                   loading="lazy" />
            </div>
            <div className="text-white">
              <div className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-[var(--gold)] border border-[var(--gold)]/40 mb-5">
                {t('landing_community_kicker')}
              </div>
              <h2 className="font-display text-3xl md:text-4xl mb-5 leading-tight">
                {t('landing_community_title')}
              </h2>
              <p className="text-base leading-relaxed text-white/85">
                {t('landing_community_body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Equipos y proceso integrado — diferenciador clave introducido en
          v1.x: GelatoLab conoce el equipo concreto del usuario y adapta
          recomendaciones, avisos y registros HACCP a ese modelo. */}
      <section className="max-w-[1100px] mx-auto px-5 py-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-4xl text-[var(--ink)] mb-3">{t('landing_equip_title')}</h2>
          <p className="text-base text-[var(--ink2)] max-w-2xl mx-auto">{t('landing_equip_sub')}</p>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl mb-10 max-w-[900px] mx-auto aspect-[16/9]">
          <img src="./photos/conos.png"
               alt="Cuatro conos de gelato artesanal en una heladería profesional"
               className="w-full h-full object-cover"
               loading="lazy" />
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-[900px] mx-auto">
          <FeatureCard
            emoji="🛠"
            title={t('landing_equip_1_title')}
            body={t('landing_equip_1_body')}
            accent="mint"
          />
          <FeatureCard
            emoji="🤖"
            title={t('landing_equip_3_title')}
            body={t('landing_equip_3_body')}
            accent="coral"
          />
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

      {/* CTA final con foto de vitrina GelatoLab + texto + boton */}
      <section className="py-20"
               style={{ background: 'linear-gradient(135deg, var(--mint3) 0%, #fff 60%, var(--cream2) 100%)' }}>
        <div className="max-w-[1100px] mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
              <img src="./photos/helados.png"
                   alt="Vitrina de helados artesanales con cartel GelatoLab"
                   className="w-full h-full object-cover"
                   loading="lazy" />
            </div>
            <div>
              <h2 className="font-display text-3xl md:text-4xl mb-4">{t('landing_final_title')}</h2>
              <p className="text-base text-[var(--ink2)] mb-8 max-w-md">{t('landing_final_body')}</p>
              <button onClick={handleTryFree}
                      className="text-base font-bold px-8 py-3.5 rounded-xl bg-[var(--mint)] text-white hover:opacity-90 cursor-pointer border-none transition-all hover:scale-[1.02] shadow-md">
                {t('landing_cta_primary')} →
              </button>
              {/* Garantía de 30 días — refuerza confianza junto al CTA
                  final. Decisión 2026-05-08 (ver docs/decisiones.md). */}
              <div className="mt-4 flex items-start gap-2.5 max-w-md">
                <span className="text-base shrink-0" aria-hidden="true">✓</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">{t('landing_guarantee_title')}</p>
                  <p className="text-xs text-[var(--ink3)] leading-relaxed mt-0.5">
                    {t('landing_guarantee_body')}{' '}
                    <Link to="/refund-policy" className="underline hover:text-[var(--ink)]">
                      {t('pricing_refund_link')}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-5 py-8 text-sm text-[var(--ink3)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span>© {new Date().getFullYear()} GelatoLab</span>
            </div>
            <nav className="flex flex-wrap gap-6">
              <a href="mailto:contacto@gelatolab.app" className="hover:text-[var(--ink)] transition-colors">contacto@gelatolab.app</a>
              <Link to="/help" className="hover:text-[var(--ink)] transition-colors">{t('help_title')}</Link>
              <Link to="/terms" className="hover:text-[var(--ink)] transition-colors">{t('legal_terms_title')}</Link>
              <Link to="/privacy" className="hover:text-[var(--ink)] transition-colors">{t('legal_privacy_title')}</Link>
              <Link to="/refund-policy" className="hover:text-[var(--ink)] transition-colors">{t('legal_refund_title')}</Link>
            </nav>
          </div>
          <div className="mt-6 pt-6 border-t border-black/5 text-center text-xs text-[var(--ink3)]">
            Desarrollado y soportado por <span className="font-semibold text-[var(--ink2)]">Llanquihue Tech SpA</span> · Patagonia, Chile
          </div>
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

function StyleChip({ emoji, name }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--cream)] border border-black/10 text-sm font-medium text-[var(--ink)] shadow-sm">
      <span aria-hidden="true">{emoji}</span>
      {name}
    </span>
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

function FlavorTile({ emoji, name, style, gradFrom, gradTo }) {
  // Tile cuadrado con gradiente que representa un sabor de helado/gelato.
  // El emoji y el nombre van encima del gradiente. Diseño pensado para
  // sobrevivir sin assets propios (sin fotos) y reemplazarse por <img>
  // cuando el equipo capture fotos profesionales.
  const isDark = ['#3b2417', '#2e1a0d', '#7a4628', '#3b2370', '#d94a5e'].includes(gradFrom);
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md aspect-square flex flex-col items-center justify-center p-4 text-center transition-transform hover:scale-[1.03]"
      style={{
        background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`,
        color: isDark ? '#fff' : 'var(--ink)',
      }}
    >
      <div className="text-5xl mb-3 drop-shadow-sm" aria-hidden="true">{emoji}</div>
      <div className="font-display text-base leading-tight mb-1.5">{name}</div>
      <div className="text-[10px] uppercase tracking-widest opacity-80 font-mono">{style}</div>
    </div>
  );
}

function ChatBubble({ role, text }) {
  // Burbuja de chat estilo iMessage/WhatsApp para la sección Marco.
  // role: 'user' (alineada a la derecha, fondo gris claro) o 'marco' (a
  // la izquierda, fondo verde mint con borde — color de marca).
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[var(--cream2)] px-4 py-2.5 text-sm text-[var(--ink)] leading-relaxed">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[var(--mint3)] border border-[var(--mint2)] px-4 py-2.5 text-sm text-[var(--ink)] leading-relaxed">
        {text}
      </div>
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
