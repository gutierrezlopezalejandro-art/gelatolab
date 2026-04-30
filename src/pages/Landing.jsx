import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Logo } from '../components/Logo';
import { useT, useI18nStore, LANGUAGES } from '../lib/i18n';
import { useState } from 'react';
import { track } from '../lib/analytics';

const VISITED_KEY = 'gelatolab-visited';

// URL del Release de GitHub donde estan los instaladores. Si todavia no
// publicaste ninguno, los botones de descarga seran de "proximamente".
// Cuando publiques v1.0.0 reemplazar por:
//   https://github.com/<user>/<repo>/releases/latest
const RELEASES_URL = 'https://github.com/gelatolab/gelatolab/releases/latest';
const RELEASES_AVAILABLE = false; // poner true cuando haya un release publicado

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
      window.open(RELEASES_URL, '_blank', 'noopener,noreferrer');
    }
    // Si no hay release todavia, el boton queda en "proximamente" via disabled.
  }
  const detectedOS = useMemo(() => detectOS(), []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      {/* Top bar simple */}
      <header className="border-b border-black/10 bg-white/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <div>
              <div className="font-display text-lg leading-none">
                Gelato<em className="text-[var(--gold)] not-italic">Lab</em>
              </div>
              <div className="text-[9px] text-[var(--ink3)] tracking-wider mt-0.5">
                {t('brand_sub')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button onClick={handleSignIn}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-transparent text-[var(--ink2)] hover:bg-black/5 cursor-pointer border-none">
              {t('landing_signin')}
            </button>
            <button onClick={handleTryFree}
                    className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 cursor-pointer border-none transition-opacity">
              {t('landing_try_free')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1100px] mx-auto px-5 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--mint3)] text-[var(--mint)] mb-5">
            {t('landing_hero_badge')}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-[var(--ink)] leading-[1.05] mb-5">
            {t('landing_hero_title_1')}{' '}
            <span className="text-[var(--gold)]">{t('landing_hero_title_2')}</span>
          </h1>
          <p className="text-lg text-[var(--ink2)] leading-relaxed mb-8">
            {t('landing_hero_sub')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={handleTryFree}
                    className="text-sm font-bold px-7 py-3 rounded-lg bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 cursor-pointer border-none transition-opacity">
              {t('landing_cta_primary')} →
            </button>
            <button onClick={handleSignIn}
                    className="text-sm font-semibold px-7 py-3 rounded-lg bg-white text-[var(--ink)] border border-black/10 hover:border-[var(--mint2)] cursor-pointer transition-colors">
              {t('landing_cta_secondary')}
            </button>
          </div>
          <p className="text-[11px] text-[var(--ink3)] mt-4">{t('landing_no_card')}</p>
        </div>
      </section>

      {/* Diferenciadores: 3 columnas */}
      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            emoji="🧪"
            title={t('landing_diff_1_title')}
            body={t('landing_diff_1_body')}
          />
          <FeatureCard
            emoji="🇨🇱"
            title={t('landing_diff_2_title')}
            body={t('landing_diff_2_body')}
          />
          <FeatureCard
            emoji="📱"
            title={t('landing_diff_3_title')}
            body={t('landing_diff_3_body')}
          />
        </div>
      </section>

      {/* Como funciona: 4 pasos */}
      <section className="bg-white border-y border-black/10 py-16">
        <div className="max-w-[1100px] mx-auto px-5">
          <h2 className="font-display text-3xl text-center mb-3">{t('landing_how_title')}</h2>
          <p className="text-sm text-[var(--ink3)] text-center mb-10 max-w-xl mx-auto">
            {t('landing_how_sub')}
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <Step n="1" title={t('landing_step_1_title')} body={t('landing_step_1_body')} />
            <Step n="2" title={t('landing_step_2_title')} body={t('landing_step_2_body')} />
            <Step n="3" title={t('landing_step_3_title')} body={t('landing_step_3_body')} />
            <Step n="4" title={t('landing_step_4_title')} body={t('landing_step_4_body')} />
          </div>
        </div>
      </section>

      {/* Features grid (6 cards) */}
      <section className="max-w-[1100px] mx-auto px-5 py-16">
        <h2 className="font-display text-3xl text-center mb-10">{t('landing_features_title')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <MiniCard emoji="⚖️" t1={t('landing_feat_1_t')} t2={t('landing_feat_1_b')} />
          <MiniCard emoji="❄️" t1={t('landing_feat_2_t')} t2={t('landing_feat_2_b')} />
          <MiniCard emoji="📦" t1={t('landing_feat_3_t')} t2={t('landing_feat_3_b')} />
          <MiniCard emoji="🧪" t1={t('landing_feat_4_t')} t2={t('landing_feat_4_b')} />
          <MiniCard emoji="🚚" t1={t('landing_feat_5_t')} t2={t('landing_feat_5_b')} />
          <MiniCard emoji="🖨️" t1={t('landing_feat_6_t')} t2={t('landing_feat_6_b')} />
        </div>
      </section>

      {/* Descargas */}
      <section className="bg-[var(--cream2)]/40 border-y border-black/10 py-16">
        <div className="max-w-[900px] mx-auto px-5 text-center">
          <h2 className="font-display text-3xl mb-3">{t('landing_download_title')}</h2>
          <p className="text-sm text-[var(--ink2)] mb-8 max-w-xl mx-auto">{t('landing_download_sub')}</p>

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

          <p className="text-xs text-[var(--ink3)]">
            {t('landing_download_or')}{' '}
            <button onClick={handleTryFree}
                    className="text-[var(--mint)] hover:underline cursor-pointer bg-transparent border-none font-semibold">
              {t('landing_download_use_web')} →
            </button>
          </p>
        </div>
      </section>

      {/* Tecnologia */}
      <section className="bg-[var(--ink)] text-white py-16">
        <div className="max-w-[900px] mx-auto px-5 text-center">
          <h2 className="font-display text-3xl mb-4">{t('landing_tech_title')}</h2>
          <p className="text-sm text-white/70 leading-relaxed mb-6 max-w-xl mx-auto">
            {t('landing_tech_body')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-[11px]">
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
      <section className="max-w-[820px] mx-auto px-5 py-16">
        <h2 className="font-display text-3xl text-center mb-8">{t('landing_faq_title')}</h2>
        <div className="space-y-3">
          <Faq q={t('landing_faq_1_q')} a={t('landing_faq_1_a')} />
          <Faq q={t('landing_faq_2_q')} a={t('landing_faq_2_a')} />
          <Faq q={t('landing_faq_3_q')} a={t('landing_faq_3_a')} />
          <Faq q={t('landing_faq_4_q')} a={t('landing_faq_4_a')} />
          <Faq q={t('landing_faq_5_q')} a={t('landing_faq_5_a')} />
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-[800px] mx-auto px-5 py-16 text-center">
        <h2 className="font-display text-3xl mb-3">{t('landing_final_title')}</h2>
        <p className="text-[var(--ink2)] mb-7">{t('landing_final_body')}</p>
        <button onClick={handleTryFree}
                className="text-sm font-bold px-7 py-3 rounded-lg bg-[var(--mint)] text-white hover:opacity-90 cursor-pointer border-none transition-opacity">
          {t('landing_cta_primary')} →
        </button>
        <p className="text-[11px] text-[var(--ink3)] mt-3">{t('landing_no_card')}</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--ink3)]">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span>© {new Date().getFullYear()} GelatoLab</span>
          </div>
          <nav className="flex flex-wrap gap-5">
            <Link to="/help" className="hover:text-[var(--ink)] transition-colors">{t('help_title')}</Link>
            <Link to="/terms" className="hover:text-[var(--ink)] transition-colors">{t('legal_terms_title')}</Link>
            <Link to="/privacy" className="hover:text-[var(--ink)] transition-colors">{t('legal_privacy_title')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ emoji, title, body }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-[var(--mint2)] transition-colors">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-display text-xl mb-2 text-[var(--ink)]">{title}</h3>
      <p className="text-sm text-[var(--ink2)] leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--ink)] text-[var(--cream)] font-bold text-sm mb-3">
        {n}
      </div>
      <h3 className="font-semibold text-sm mb-1.5 text-[var(--ink)]">{title}</h3>
      <p className="text-xs text-[var(--ink3)] leading-relaxed">{body}</p>
    </div>
  );
}

function MiniCard({ emoji, t1, t2 }) {
  return (
    <div className="rounded-lg p-4 bg-white border border-black/5">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{emoji}</span>
        <div>
          <div className="font-semibold text-sm text-[var(--ink)] mb-1">{t1}</div>
          <p className="text-xs text-[var(--ink3)] leading-relaxed">{t2}</p>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/85 font-mono">
      {children}
    </span>
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
