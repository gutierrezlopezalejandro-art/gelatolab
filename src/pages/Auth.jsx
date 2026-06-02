import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useT } from '../lib/i18n';
import { Logo } from '../components/Logo';
import { authStorage } from '../lib/authStorage';
import { isTauriDesktop } from '../lib/platform';

// "Recordarme" — solo guardamos el email para pre-rellenarlo. La contraseña
// NUNCA se persiste: hacerlo en localStorage equivalía a texto plano expuesto
// a XSS y extensiones del navegador, sin valor real (Supabase ya mantiene la
// sesión activa via refresh token).
const REMEMBER_KEY = 'gelatolab.remember_me';
const REMEMBER_EMAIL_KEY = 'gelatolab.saved_email';
// Limpieza one-shot de instalaciones previas que sí guardaban la contraseña.
const LEGACY_REMEMBER_PASS_KEY = 'gelatolab.saved_password';

// Lee el modo inicial del query string (?mode=signup|reset|login). Esto
// permite que botones externos (DesktopWelcome, links de marketing) abran
// directo en signup sin que el usuario tenga que cliquear "crear cuenta"
// dentro del form.
function readInitialMode(search) {
  try {
    const m = new URLSearchParams(search).get('mode');
    if (m === 'signup' || m === 'reset' || m === 'login') return m;
  } catch { /* tolerable */ }
  return 'login';
}

// Mapea errores crudos de Supabase a claves i18n con mensaje accionable en es.
// Supabase devuelve mensajes en inglés sin contexto ("Invalid login credentials")
// que para un heladero chileno no comunican qué hacer. Este mapper traduce y
// sugiere acción. Si no hay match, fallback genérico.
function authErrorKey(err) {
  const msg = (err?.message || '').toLowerCase();
  if (/invalid (login )?credentials|invalid email or password/.test(msg)) return 'auth_err_bad_credentials';
  if (/rate limit|too many/.test(msg)) return 'auth_err_too_many';
  if (/already registered|user exists/.test(msg)) return 'auth_err_email_exists';
  if (/invalid email/.test(msg)) return 'auth_err_email_invalid';
  if (/network|fetch/.test(msg)) return 'auth_err_network';
  return 'auth_err_generic';
}

export default function Auth() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useAppStore();
  const { signIn, signUp, signInWithGoogle, resetPassword, hasCloud } = useAuthStore();

  const [mode, setMode] = useState(() => readInitialMode(location.search)); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // On mount, hydrate the form from the saved "Recordarme" state. We only
  // pre-fill in login mode — sign-up should always start blank, and reset
  // doesn't need a password. La contraseña NO se hidrata aunque viniera
  // guardada de una versión vieja: la borramos para limpiar el rastro.
  useEffect(() => {
    // Limpieza one-shot de la clave legacy que sí guardaba la contraseña.
    // Cualquier dispositivo que quedó actualizado a esta versión va a perder
    // la contraseña guardada en localStorage en su próximo login (esto es
    // intencional, ese era exactamente el problema).
    authStorage.removeItem(LEGACY_REMEMBER_PASS_KEY).catch(() => {});

    if (mode !== 'login') return;
    const savedFlag = authStorage.getItem(REMEMBER_KEY);
    if (savedFlag !== '1') return;
    const savedEmail = authStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    if (savedEmail) setEmail(savedEmail);
    setRememberMe(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!hasCloud) {
      showToast(t('auth_cloud_disabled'), 'error');
      return;
    }
    if (!email.trim()) {
      showToast(t('auth_email_required'), 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) return showToast(t(authErrorKey(error)), 'error');
        // Persistimos solo la preferencia "Recordarme" + el email. La
        // contraseña no se guarda — Supabase ya maneja la sesión via
        // refresh token persistido por su SDK.
        if (rememberMe) {
          await authStorage.setItem(REMEMBER_KEY, '1');
          await authStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          await authStorage.removeItem(REMEMBER_KEY);
          await authStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        showToast(t('auth_signed_in'));
        navigate(location.state?.from || '/dashboard');
      } else if (mode === 'signup') {
        if (password.length < 6) {
          showToast(t('auth_password_short'), 'error');
          return;
        }
        if (password !== passwordConfirm) {
          showToast(t('auth_password_mismatch'), 'error');
          return;
        }
        if (!acceptTerms) {
          showToast(t('auth_must_accept_terms'), 'error');
          return;
        }
        const { error } = await signUp(email.trim(), password);
        if (error) return showToast(t(authErrorKey(error)), 'error');
        showToast(t('auth_check_email'));
        setMode('login');
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email.trim());
        if (error) return showToast(t(authErrorKey(error)), 'error');
        showToast(t('auth_reset_sent'));
        setMode('login');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!hasCloud) return showToast(t('auth_cloud_disabled'), 'error');
    const { error } = await signInWithGoogle();
    if (error) showToast(t(authErrorKey(error)), 'error');
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="card p-8 relative">
        {/* Boton "Volver" — visible solo en desktop Tauri. En web no tiene
            sentido porque la Landing es la entrada y desde el navbar siempre
            se puede volver. En desktop, /auth puede ser punto inicial (desde
            DesktopWelcome) y el usuario puede querer arrepentirse y volver
            a la pantalla de elegir login/signup. */}
        {isTauriDesktop() && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-3 left-3 text-xs font-semibold px-3 py-1.5 rounded-lg
                       bg-black/5 hover:bg-black/10 text-[var(--ink2)] transition-colors
                       cursor-pointer border-none"
            aria-label={t('auth_back')}
          >
            {t('auth_back')}
          </button>
        )}
        <div className="flex justify-center mb-4">
          <Logo size={56} variant="light" />
        </div>

        <h1 className="font-display text-2xl text-[var(--ink)] text-center mb-1">
          {mode === 'signup' ? t('auth_signup_title')
            : mode === 'reset' ? t('auth_reset_title')
            : t('auth_login_title')}
        </h1>
        <p className="text-xs text-[var(--ink3)] text-center mb-6">
          {mode === 'signup' ? t('auth_signup_sub')
            : mode === 'reset' ? t('auth_reset_sub')
            : t('auth_login_sub')}
        </p>

        {!hasCloud && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--gold2)] text-[#5c3d00] text-xs text-center">
            {t('auth_cloud_disabled')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="text-xs font-medium text-[var(--ink2)] block mb-1">
              {t('auth_email')}
            </label>
            <input
              id="auth-email"
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className="text-xs font-medium text-[var(--ink2)] block mb-1">
                {t('auth_password')}
              </label>
              <input
                id="auth-password"
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                aria-describedby={mode === 'signup' ? 'auth-password-hint' : undefined}
                required
                minLength={6}
              />
              {mode === 'signup' && (
                <p
                  id="auth-password-hint"
                  className={`text-[10px] mt-1 ${password.length >= 6 ? 'text-[var(--mint)]' : 'text-[var(--ink3)]'}`}
                >
                  {password.length >= 6 ? '✓ ' : ''}{t('auth_password_hint')}
                </p>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-password-confirm" className="text-xs font-medium text-[var(--ink2)] block mb-1">
                {t('auth_password_confirm')}
              </label>
              <input
                id="auth-password-confirm"
                type="password"
                className="input"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
              {passwordConfirm.length > 0 && password !== passwordConfirm && (
                <p className="text-[10px] text-[var(--coral)] mt-1">{t('auth_password_mismatch')}</p>
              )}
            </div>
          )}

          {mode === 'login' && (
            <label className="flex items-center gap-2 text-xs text-[var(--ink2)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="cursor-pointer"
              />
              <span>{t('auth_remember_me')}</span>
              <span
                className="text-[10px] text-[var(--ink3)]"
                title={t('auth_remember_me_warning')}
                aria-label={t('auth_remember_me_warning')}
              >
                ⓘ
              </span>
            </label>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-xs text-[var(--ink2)] cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-0.5 cursor-pointer"
                required
              />
              <span>
                {t('auth_accept_prefix')}{' '}
                <Link to="/terms" className="text-[var(--mint)] underline hover:text-[var(--mint2)]">
                  {t('legal_terms_title')}
                </Link>
                {' '}{t('auth_accept_and')}{' '}
                <Link to="/privacy" className="text-[var(--mint)] underline hover:text-[var(--mint2)]">
                  {t('legal_privacy_title')}
                </Link>
                .
              </span>
            </label>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || !hasCloud}
          >
            {loading ? t('saving')
              : mode === 'signup' ? t('auth_signup_btn')
              : mode === 'reset' ? t('auth_reset_btn')
              : t('auth_login_btn')}
          </button>
        </form>

        {mode === 'login' && hasCloud && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-black/10" />
              <span className="text-[10px] text-[var(--ink3)] uppercase tracking-widest">
                {t('auth_or')}
              </span>
              <div className="flex-1 h-px bg-black/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                         border border-black/10 text-sm font-medium bg-white
                         hover:bg-[var(--cream)] cursor-pointer transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.8 32.9 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.3l-6.2-5.2C29.2 35 26.7 36 24 36c-5.4 0-9.8-3.1-11.3-7.4l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.7 2.1-2.1 3.9-3.9 5.3l6.2 5.2c-.4.4 6.4-4.7 6.4-14.5 0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              {t('auth_google')}
            </button>
          </>
        )}

        <div className="mt-6 text-center text-xs">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-[var(--ink3)] hover:text-[var(--ink)] bg-transparent border-none cursor-pointer underline"
              >
                {t('auth_forgot')}
              </button>
              <div className="mt-2 text-[var(--ink3)]">
                {t('auth_no_account')}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[var(--mint)] font-semibold hover:underline bg-transparent border-none cursor-pointer"
                >
                  {t('auth_signup_btn')}
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-[var(--ink3)]">
              {t('auth_have_account')}{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[var(--mint)] font-semibold hover:underline bg-transparent border-none cursor-pointer"
              >
                {t('auth_login_btn')}
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-[var(--ink3)] hover:text-[var(--ink)] bg-transparent border-none cursor-pointer underline"
            >
              {t('auth_back_login')}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-[var(--ink3)] mt-4">
        {t('auth_no_login_hint')}
      </p>
    </div>
  );
}
