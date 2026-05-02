import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useT, useI18nStore, LANGUAGES } from '../lib/i18n';
import { track } from '../lib/analytics';

// API publica de GitHub. CORS habilitado, rate limit 60/h sin token.
// Para no quemar el limit, cacheamos la respuesta en sessionStorage por
// 1 hora. Si el limit se quema, mostramos fallback a la pagina de releases.
const RELEASES_API = 'https://api.github.com/repos/gutierrezlopezalejandro-art/gelatolab/releases/latest';
const RELEASES_PAGE = 'https://github.com/gutierrezlopezalejandro-art/gelatolab/releases/latest';
const CACHE_KEY = 'gelatolab-latest-release';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

function detectOS() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  if (platform.includes('mac') || ua.includes('mac os')) return 'mac';
  if (platform.includes('win') || ua.includes('windows')) return 'win';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

function detectArch() {
  // Best-effort: navigator.userAgentData solo existe en Chrome/Edge modernos.
  // Para macOS, distinguir Intel vs Apple Silicon es importante para descargar
  // el bundle correcto. Si no podemos detectar, devolvemos 'universal' que
  // matchea el .dmg universal de tauri-action.
  if (typeof navigator === 'undefined') return 'universal';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('arm64') || ua.includes('aarch64')) return 'arm64';
  if (ua.includes('x86_64') || ua.includes('x64') || ua.includes('wow64')) return 'x64';
  return 'universal';
}

// Heuristicas para clasificar assets de tauri-action por OS. Filtramos `.sig`
// (firmas Ed25519 del updater, no descargables manualmente) y `latest.json`.
function classifyAsset(name) {
  if (name.endsWith('.sig') || name === 'latest.json') return null;
  const lower = name.toLowerCase();
  if (lower.endsWith('.exe') || lower.endsWith('.msi')) {
    const ext = lower.endsWith('.exe') ? 'exe' : 'msi';
    return { os: 'win', ext, primary: ext === 'exe' };
  }
  if (lower.endsWith('.dmg')) {
    let arch = 'universal';
    if (lower.includes('aarch64') || lower.includes('arm64') || lower.includes('apple-silicon')) arch = 'arm64';
    else if (lower.includes('x64') || lower.includes('x86_64') || lower.includes('intel')) arch = 'x64';
    else if (lower.includes('universal')) arch = 'universal';
    return { os: 'mac', ext: 'dmg', arch, primary: true };
  }
  if (lower.endsWith('.appimage')) return { os: 'linux', ext: 'appimage', primary: true };
  if (lower.endsWith('.deb'))      return { os: 'linux', ext: 'deb', primary: false };
  if (lower.endsWith('.rpm'))      return { os: 'linux', ext: 'rpm', primary: false };
  return null;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL_MS) return null;
    return cached.data;
  } catch { return null; }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* tolerable */ }
}

async function fetchLatestRelease() {
  const cached = readCache();
  if (cached) return cached;
  const r = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  const json = await r.json();
  const data = {
    version: json.tag_name?.replace(/^v/, '') || '',
    name: json.name || '',
    publishedAt: json.published_at || '',
    notes: json.body || '',
    htmlUrl: json.html_url || RELEASES_PAGE,
    assets: (json.assets || []).map(a => {
      const cls = classifyAsset(a.name);
      if (!cls) return null;
      return {
        name: a.name,
        url: a.browser_download_url,
        size: a.size,
        ...cls,
      };
    }).filter(Boolean),
  };
  writeCache(data);
  return data;
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

export default function Download() {
  const t = useT();
  const navigate = useNavigate();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const detectedOS = useMemo(() => detectOS(), []);
  const detectedArch = useMemo(() => detectArch(), []);

  useEffect(() => {
    let cancelled = false;
    fetchLatestRelease()
      .then(data => { if (!cancelled) { setRelease(data); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Agrupar assets por OS para presentar 3 cards.
  const grouped = useMemo(() => {
    if (!release) return { win: [], mac: [], linux: [] };
    const out = { win: [], mac: [], linux: [] };
    for (const a of release.assets) out[a.os]?.push(a);
    return out;
  }, [release]);

  function handleAssetClick(asset) {
    track('download_clicked', { os: asset.os, ext: asset.ext, version: release?.version });
  }

  function handleTryWeb() {
    track('download_use_web');
    navigate('/auth');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header className="border-b border-black/10 bg-white/70 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <Logo size={36} />
            <div>
              <div className="font-display text-xl leading-none text-[var(--ink)]">
                Gelato<em className="text-[var(--gold)] not-italic">Lab</em>
              </div>
              <div className="text-[10px] text-[var(--ink3)] tracking-wider mt-0.5">
                {t('brand_sub')}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button
              onClick={handleTryWeb}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 cursor-pointer border-none"
            >
              {t('download_use_web_short')}
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, var(--cream) 0%, #fff 45%, var(--mint3) 100%)' }}>
        <div className="max-w-[1100px] mx-auto px-5 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-white shadow-sm text-[var(--mint)] border border-[var(--mint2)] mb-5">
            <span className="text-base" aria-hidden="true">⬇️</span>
            {t('download_kicker')}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-[var(--ink)] leading-[1.05] mb-4 tracking-tight">
            {t('download_title')}
          </h1>
          <p className="text-lg text-[var(--ink2)] leading-relaxed max-w-2xl mx-auto">
            {t('download_sub')}
          </p>
          {release && (
            <div className="mt-5 inline-flex items-center gap-3 text-xs text-[var(--ink3)]">
              <span className="font-mono font-bold">v{release.version}</span>
              {release.publishedAt && (
                <>
                  <span>·</span>
                  <span>{new Date(release.publishedAt).toLocaleDateString()}</span>
                </>
              )}
              <span>·</span>
              <a
                href={release.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--mint)] hover:underline"
              >
                {t('download_changelog')}
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1100px] mx-auto px-5">
          {loading && (
            <div className="text-center text-[var(--ink3)] py-10">{t('download_loading')}</div>
          )}

          {error && (
            <div className="max-w-xl mx-auto bg-[var(--coral2)] border border-[var(--coral)] rounded-2xl p-6 text-center">
              <div className="text-2xl mb-2" aria-hidden="true">⚠️</div>
              <p className="text-sm text-[var(--ink)] mb-3">{t('download_error')}</p>
              <a
                href={RELEASES_PAGE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-bold px-5 py-2 rounded-lg bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 no-underline"
              >
                {t('download_open_releases_page')} →
              </a>
            </div>
          )}

          {release && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <PlatformCard
                  os="win"
                  icon="🪟"
                  title="Windows"
                  highlighted={detectedOS === 'win'}
                  assets={grouped.win}
                  onAssetClick={handleAssetClick}
                  detectedArch={detectedArch}
                  t={t}
                />
                <PlatformCard
                  os="mac"
                  icon="🍎"
                  title="macOS"
                  highlighted={detectedOS === 'mac'}
                  assets={grouped.mac}
                  onAssetClick={handleAssetClick}
                  detectedArch={detectedArch}
                  t={t}
                />
                <PlatformCard
                  os="linux"
                  icon="🐧"
                  title="Linux"
                  highlighted={detectedOS === 'linux'}
                  assets={grouped.linux}
                  onAssetClick={handleAssetClick}
                  detectedArch={detectedArch}
                  t={t}
                />
              </div>

              {release.notes && (
                <details className="max-w-3xl mx-auto bg-white rounded-2xl border border-black/10 p-6">
                  <summary className="cursor-pointer font-semibold text-[var(--ink)] select-none">
                    {t('download_release_notes')} (v{release.version})
                  </summary>
                  <div className="mt-4 text-sm text-[var(--ink2)] leading-relaxed whitespace-pre-wrap">
                    {release.notes}
                  </div>
                </details>
              )}
            </>
          )}

          <div className="text-center mt-10 text-sm text-[var(--ink3)]">
            {t('download_or_use_web')}{' '}
            <button
              onClick={handleTryWeb}
              className="text-[var(--mint)] hover:underline cursor-pointer bg-transparent border-none font-semibold"
            >
              {t('download_use_web_link')} →
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[var(--cream2)]/60 border-t border-black/10 py-12">
        <div className="max-w-[900px] mx-auto px-5 grid md:grid-cols-3 gap-6 text-sm">
          <InfoBlock
            icon="🔄"
            title={t('download_info_updates_title')}
            body={t('download_info_updates_body')}
          />
          <InfoBlock
            icon="🔒"
            title={t('download_info_signing_title')}
            body={t('download_info_signing_body')}
          />
          <InfoBlock
            icon="💾"
            title={t('download_info_offline_title')}
            body={t('download_info_offline_body')}
          />
        </div>
      </section>

      <footer className="border-t border-black/10 py-8 text-center text-xs text-[var(--ink3)]">
        <Link to="/" className="hover:underline mr-4">← {t('download_back_home')}</Link>
        <Link to="/terms" className="hover:underline mr-4">{t('legal_terms_title')}</Link>
        <Link to="/privacy" className="hover:underline">{t('legal_privacy_title')}</Link>
      </footer>
    </div>
  );
}

function PlatformCard({ os, icon, title, highlighted, assets, onAssetClick, detectedArch, t }) {
  if (assets.length === 0) {
    return (
      <div className="rounded-2xl p-6 bg-white border-2 border-black/10 opacity-60">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl" aria-hidden="true">{icon}</span>
          <h3 className="font-display text-xl text-[var(--ink)]">{title}</h3>
        </div>
        <p className="text-sm text-[var(--ink3)]">{t('download_platform_unavailable')}</p>
      </div>
    );
  }

  // Ordenar: primary antes que secundarios. Para mac, priorizar el arch
  // detectado del navegador (universal siempre cubre al usuario, ARM64 + x64
  // son mas chicos pero requieren match).
  const sorted = [...assets].sort((a, b) => {
    if (os === 'mac') {
      // Universal primero (siempre funciona). Luego match de arch detectado.
      const score = (x) => {
        if (x.arch === 'universal') return 3;
        if (x.arch === detectedArch) return 2;
        return 1;
      };
      return score(b) - score(a);
    }
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return 0;
  });

  const primary = sorted[0];
  const others = sorted.slice(1);

  return (
    <div
      className={`rounded-2xl p-6 bg-white border-2 transition-all
        ${highlighted ? 'border-[var(--mint)] shadow-lg ring-2 ring-[var(--mint)]/20' : 'border-black/10 hover:border-[var(--mint2)]'}`}
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl" aria-hidden="true">{icon}</span>
        <h3 className="font-display text-xl text-[var(--ink)]">{title}</h3>
        {highlighted && (
          <span className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--mint3)] text-[var(--mint)]">
            {t('download_your_os')}
          </span>
        )}
      </div>

      <a
        href={primary.url}
        onClick={() => onAssetClick(primary)}
        className="block mt-4 text-center font-bold px-5 py-3 rounded-xl bg-[var(--ink)] text-[var(--cream)] hover:opacity-90 no-underline transition-opacity"
      >
        ↓ {t('download_btn')} {primary.ext.toUpperCase()}
      </a>
      <div className="text-[10px] text-[var(--ink3)] text-center mt-1.5 font-mono">
        {primary.name} · {formatBytes(primary.size)}
      </div>

      {others.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/5">
          <div className="text-[10px] text-[var(--ink3)] uppercase tracking-wider mb-2 font-semibold">
            {t('download_other_formats')}
          </div>
          <ul className="space-y-1.5">
            {others.map(a => (
              <li key={a.name}>
                <a
                  href={a.url}
                  onClick={() => onAssetClick(a)}
                  className="flex items-center justify-between gap-2 text-xs text-[var(--ink2)] hover:text-[var(--mint)] no-underline"
                >
                  <span className="font-mono truncate">.{a.ext}{a.arch ? ` (${a.arch})` : ''}</span>
                  <span className="text-[10px] text-[var(--ink3)] flex-shrink-0">{formatBytes(a.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon, title, body }) {
  return (
    <div>
      <div className="text-2xl mb-2" aria-hidden="true">{icon}</div>
      <div className="font-semibold text-[var(--ink)] mb-1">{title}</div>
      <p className="text-[var(--ink2)] leading-relaxed">{body}</p>
    </div>
  );
}
