import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useT } from '../lib/i18n';
import { Logo } from '../components/Logo';

export default function Auth() {
  const t = useT();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const { signIn, signUp, signInWithGoogle, resetPassword, hasCloud } = useAuthStore();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

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
        if (error) return showToast(error.message, 'error');
        showToast(t('auth_signed_in'));
        navigate('/dashboard');
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
        if (error) return showToast(error.message, 'error');
        showToast(t('auth_check_email'));
        setMode('login');
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email.trim());
        if (error) return showToast(error.message, 'error');
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
    if (error) showToast(error.message, 'error');
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="card p-8">
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
                required
                minLength={6}
              />
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
