import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { useAuthStore } from './store/authStore';
import { useIngredientStore } from './store/ingredientStore';
import { getLowStock, processDueInventoryDeductions } from './store/inventoryStore';
import { supabase } from './lib/supabase';
import { useI18nStore, useT, LANGUAGES } from './lib/i18n';
import { trackPageview } from './lib/analytics';
import { UserMenu } from './components/UserMenu';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useBusinessStore } from './store/businessStore';
import { CloudSyncProvider } from './components/CloudSyncProvider';
import { Spinner } from './components/ui/index.jsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFound } from './components/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Footer } from './components/Footer';
import { CookieBanner } from './components/CookieBanner';
import { HelpAssistant } from './components/HelpAssistant';
import { UIHighlightOverlay } from './components/UIHighlightOverlay';
import { Logo } from './components/Logo';
import { UpdateAvailableModal } from './components/UpdateAvailableModal';
import { checkForUpdate } from './lib/desktopUpdate';
import Toast           from './components/ui/Toast';
import ConfirmModal    from './components/ui/ConfirmModal';

const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Recipes        = lazy(() => import('./pages/Recipes'));
const RecipeEditor   = lazy(() => import('./pages/RecipeEditor'));
const BatchCalc      = lazy(() => import('./pages/BatchCalc'));
const ProductionPlan = lazy(() => import('./pages/ProductionPlan'));
const ProductionLog  = lazy(() => import('./pages/ProductionLog'));
const IngredientDB   = lazy(() => import('./pages/IngredientDB'));
const Auth           = lazy(() => import('./pages/Auth'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));
const Terms          = lazy(() => import('./pages/Terms'));
const Privacy        = lazy(() => import('./pages/Privacy'));
const Help           = lazy(() => import('./pages/Help'));
const Mobile         = lazy(() => import('./pages/Mobile'));
const Haccp          = lazy(() => import('./pages/Haccp'));
const Landing        = lazy(() => import('./pages/Landing'));
import { resetVisited } from './pages/Landing';
const Pricing        = lazy(() => import('./pages/Pricing'));
const Download       = lazy(() => import('./pages/Download'));

const NAV_KEYS = [
  { to: '/dashboard',   key: 'dashboard' },
  { to: '/recipes',     key: 'recipes' },
  // { to: '/batch',       key: 'batches' }, // Oculto temporalmente — la ruta sigue activa.
  { to: '/plan',        key: 'planning' },
  { to: '/production',  key: 'production' },
  { to: '/haccp',       key: 'haccp' },
  { to: '/ingredients', key: 'ingredients' },
];

function LangSelector() {
  const { lang, setLang } = useI18nStore();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Idioma: ${current.name}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold
                   bg-white/10 hover:bg-white/20 text-white/80 hover:text-white
                   transition-colors cursor-pointer border-none"
      >
        <span className="text-sm" aria-hidden="true">🌐</span>
        <span>{current.label}</span>
        <span className="text-[10px] opacity-50" aria-hidden="true">▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[98]" onClick={() => setOpen(false)} />
          <ul role="listbox" className="absolute right-0 top-full mt-1 z-[99] bg-white rounded-lg shadow-xl border border-black/10 overflow-hidden min-w-[140px]">
            {LANGUAGES.map(l => (
              <li key={l.code}>
                <button
                  role="option"
                  aria-selected={l.code === lang}
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2
                             hover:bg-[var(--cream)] transition-colors cursor-pointer border-none
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

export default function App() {
  const { toast, modal, resolveModal } = useAppStore();
  const initAuth = useAuthStore(s => s.init);
  const user = useAuthStore(s => s.user);
  const ingredients = useIngredientStore(s => s.ingredients);
  const navigate = useNavigate();
  const location = useLocation();
  // /mobile es una vista standalone fullscreen (uso desde iPhone en bodega)
  // — sin navbar ni footer ni onboarding. Atajo para evitar que el navbar
  // ocupe pantalla en una herramienta que se usa una mano caminando.
  const isMobileFullscreen = location.pathname.startsWith('/mobile');
  // Paginas publicas (marketing): traen su propio header/footer y no necesitan
  // el chrome de la app. Evita que un bot indexe el navbar como contenido.
  const isLanding = location.pathname === '/' || location.pathname === '/download';
  const t = useT();
  const lowStockCount = getLowStock(ingredients).length;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const businessCompleted = useBusinessStore(s => s.completed);
  const fantasyName = useBusinessStore(s => s.fantasy_name);

  useEffect(() => { initAuth(); }, [initAuth]);

  // Auto-update check (Tauri desktop only). Best-effort: si no hay red o
  // GitHub no responde, falla en silencio. Solo se pregunta una vez por
  // sesion — si el usuario dismiss-ea, no volvemos a molestar hasta proximo
  // boot.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const update = await checkForUpdate();
      if (!cancelled && update) setPendingUpdate(update);
    })();
    return () => { cancelled = true; };
  }, []);

  // Pageview tracking: cada cambio de pathname dispara un evento. Plausible
  // (si esta configurado y el usuario acepto cookies) lo registra como
  // virtual page hit. En dev no hace nada.
  useEffect(() => {
    trackPageview();
  }, [location.pathname]);

  // Auto-init de respaldo a carpeta:
  //   - En Tauri (app de escritorio): crea Documents/GelatoLab/ si no existe
  //     y activa auto-sync sin pedir permiso (silencioso, profesional).
  //   - En navegador con File System Access API: si habia una carpeta
  //     conectada en sesion previa con permiso vivo, reactiva el sync.
  useEffect(() => {
    (async () => {
      try {
        const fb = await import('./lib/folderBackup');
        if (!fb.isFolderBackupSupported()) return;
        if (fb.isTauri()) {
          // App nativa: garantizamos la carpeta default y arrancamos sync.
          let handle = await fb.getStoredFolderHandle();
          if (!handle || !handle.__tauri) {
            handle = await fb.pickBackupFolder(); // crea Documents/GelatoLab/
          }
          await fb.writeAllStoresToFolder(handle); // primera escritura inmediata
          fb.startFolderAutoSync();
          // Snapshot diario (idempotente: si ya se escribio hoy, no hace nada).
          fb.writeDailySnapshot(handle).catch(e =>
            console.warn('daily snapshot failed', e)
          );
          return;
        }
        // Web: respeta permiso previo, no abre prompts.
        const handle = await fb.getStoredFolderHandle();
        if (!handle) return;
        const ok = await fb.ensureFolderPermission(handle, { interactive: false });
        if (ok) {
          fb.startFolderAutoSync();
          fb.writeDailySnapshot(handle).catch(e =>
            console.warn('daily snapshot failed', e)
          );
        }
      } catch (e) { console.warn('folder backup boot failed', e); }
    })();
  }, []);

  // Apply any pending inventory deductions whose production date has arrived.
  // Runs once on app mount and again whenever the tab becomes visible (catches
  // the day-rollover case for users who leave the tab open overnight).
  useEffect(() => {
    processDueInventoryDeductions();
    const onVisible = () => {
      if (document.visibilityState === 'visible') processDueInventoryDeductions();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Redirect to reset-password form when the user arrives via the recovery email.
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password');
    });
    return () => sub.subscription?.unsubscribe?.();
  }, [navigate]);

  // Modo standalone: pinta SOLO la ruta sin navbar/footer/banners.
  if (isMobileFullscreen) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/mobile" element={<Mobile />} />
          </Routes>
        </Suspense>
        {toast && <Toast toast={toast} />}
        {modal && <ConfirmModal modal={modal} onResolve={resolveModal} />}
        <UpdateAvailableModal update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />
        <CloudSyncProvider />
      </ErrorBoundary>
    );
  }

  // Paginas publicas (Landing, Download): standalone (sin navbar app), pero
  // conservan el CookieBanner para cumplir GDPR si el visitante navega ahi
  // primero.
  if (isLanding) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/download" element={<Download />} />
          </Routes>
        </Suspense>
        {toast && <Toast toast={toast} />}
        {modal && <ConfirmModal modal={modal} onResolve={resolveModal} />}
        <UpdateAvailableModal update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />
        <CookieBanner />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-[var(--mint)] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        {t('skip_to_content')}
      </a>
      <nav className="sticky top-0 z-50 shadow-lg" style={{ background: 'var(--ink)' }} aria-label={t('main_nav')}>
        <div className="max-w-[1280px] mx-auto px-4 flex items-center">
          {/* Mobile: hamburger toggle */}
          <button
            onClick={() => setMobileNavOpen(o => !o)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg
                       text-[var(--cream)] hover:bg-white/10 transition-colors cursor-pointer
                       border-none bg-transparent mr-2"
            aria-label={t('main_nav')}
            aria-expanded={mobileNavOpen}
          >
            <span className="text-2xl leading-none">{mobileNavOpen ? '✕' : '☰'}</span>
            {!mobileNavOpen && lowStockCount > 0 && (
              <span className="absolute -mt-5 ml-5 text-[9px] font-bold px-1 rounded-full bg-[var(--coral)] text-white">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              // Si el usuario no esta logueado (modo "prueba"), volvemos a la
              // landing reseteando el flag visited para que se vea la pagina
              // publica. Si esta logueado, el logo no hace nada — el dashboard
              // es su pantalla principal.
              if (!user) {
                resetVisited();
                navigate('/');
              }
            }}
            disabled={!!user}
            className="flex items-center gap-2.5 py-3 pr-5 md:mr-4 md:border-r md:border-white/15 flex-shrink-0
                       bg-transparent border-none cursor-pointer disabled:cursor-default
                       hover:opacity-90 transition-opacity"
            aria-label={user ? 'GelatoLab' : t('back_to_landing')}
            title={user ? '' : t('back_to_landing')}
          >
            <Logo size={32} variant="dark" />
            <div className="text-left">
              <div className="font-display text-[var(--cream)] text-sm leading-tight">
                {fantasyName
                  ? <span title="GelatoLab">{fantasyName}</span>
                  : <>Gelato<em className="text-[var(--gold)] not-italic">Lab</em></>}
              </div>
              <div className="hidden md:block text-[9px] text-white/40 tracking-wider">
                {fantasyName ? 'GelatoLab · ' + t('brand_sub') : t('brand_sub')}
              </div>
            </div>
          </button>

          {/* Desktop nav (hidden on mobile) */}
          <div className="hidden md:flex gap-0 flex-1 overflow-x-auto">
            {NAV_KEYS.map(({ to, key }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                data-tour={`nav-${key}`}
                className={({ isActive }) =>
                  `px-4 py-4 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap inline-flex items-center gap-1.5 ` +
                  (isActive
                    ? 'text-[var(--gold)] border-[var(--gold)]'
                    : 'text-white/55 border-transparent hover:text-white hover:border-white/20')
                }
              >
                {t(key)}
                {key === 'ingredients' && lowStockCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--coral)] text-white"
                        title={t('low_stock_badge_tooltip', { count: lowStockCount })}>
                    {lowStockCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Help + User menu + Country + Language selectors */}
          <div className="ml-auto md:ml-3 flex-shrink-0 flex items-center gap-2">
            <NavLink
              to="/help"
              className={({ isActive }) =>
                `flex items-center justify-center w-8 h-8 rounded-lg text-base font-semibold cursor-pointer transition-colors border-none ` +
                (isActive
                  ? 'bg-[#e8b920] text-[var(--ink)]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white')
              }
              aria-label={t('help_title')}
              title={t('help_title')}
            >
              ?
            </NavLink>
            <UserMenu />
            <LangSelector />
          </div>
        </div>

        {/* Mobile: collapsible nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/10 bg-[var(--ink)]" role="menu">
            {NAV_KEYS.map(({ to, key }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-5 py-3 text-base font-medium border-b border-white/5 ` +
                  (isActive
                    ? 'text-[var(--gold)] bg-white/5'
                    : 'text-white/70 hover:text-white hover:bg-white/5')
                }
              >
                <span>{t(key)}</span>
                {key === 'ingredients' && lowStockCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--coral)] text-white">
                    {lowStockCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <main id="main-content" className="max-w-[1280px] mx-auto px-4 py-6" role="main">
        <ErrorBoundary>
          <Suspense fallback={<Spinner />}>
            <Routes>
              {/* "/" se maneja en el early-return de isLanding, arriba. */}
              <Route path="/dashboard"   element={<Dashboard />} />
              <Route path="/recipes"     element={<Recipes />} />
              <Route path="/recipes/new" element={<ProtectedRoute><RecipeEditor /></ProtectedRoute>} />
              <Route path="/recipes/:id" element={<ProtectedRoute><RecipeEditor /></ProtectedRoute>} />
              <Route path="/batch"       element={<BatchCalc />} />
              <Route path="/plan"        element={<ProtectedRoute><ProductionPlan /></ProtectedRoute>} />
              <Route path="/production"  element={<ProtectedRoute><ProductionLog /></ProtectedRoute>} />
              <Route path="/haccp"       element={<ProtectedRoute><Haccp /></ProtectedRoute>} />
              <Route path="/ingredients" element={<ProtectedRoute><IngredientDB /></ProtectedRoute>} />
              <Route path="/auth"        element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms"       element={<Terms />} />
              <Route path="/privacy"     element={<Privacy />} />
              <Route path="/help"        element={<Help />} />
              <Route path="/pricing"     element={<Pricing />} />
              <Route path="*"            element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />

      {toast && <Toast toast={toast} />}
      {modal && <ConfirmModal modal={modal} onResolve={resolveModal} />}
      {!businessCompleted && <OnboardingWizard />}
      <CloudSyncProvider />
      <CookieBanner />
      <HelpAssistant />
      <UIHighlightOverlay />
      <UpdateAvailableModal update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />
    </div>
  );
}
