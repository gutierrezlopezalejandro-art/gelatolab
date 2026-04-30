import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useT } from '../lib/i18n';
import { Logo } from '../components/Logo';

export default function ResetPassword() {
  const t = useT();
  const navigate = useNavigate();
  const { showToast } = useAppStore();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // The user arrives here via the recovery email. Supabase emits a
  // PASSWORD_RECOVERY event after consuming the token from the URL.
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Fallback: if we already have a session (token already consumed), allow the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription?.unsubscribe?.();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      showToast(t('auth_cloud_disabled'), 'error');
      return;
    }
    if (password.length < 6) {
      showToast(t('auth_password_short'), 'error');
      return;
    }
    if (password !== confirm) {
      showToast(t('auth_password_mismatch'), 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return showToast(error.message, 'error');
      showToast(t('auth_password_updated'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="card p-8">
        <div className="flex justify-center mb-4">
          <Logo size={56} variant="light" />
        </div>

        <h1 className="font-display text-2xl text-[var(--ink)] text-center mb-1">
          {t('auth_reset_new_title')}
        </h1>
        <p className="text-xs text-[var(--ink3)] text-center mb-6">
          {t('auth_reset_new_sub')}
        </p>

        {!ready && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--gold2)] text-[#5c3d00] text-xs text-center">
            {t('auth_reset_link_invalid')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
              {t('auth_new_password')}
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={!ready}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">
              {t('auth_confirm_password')}
            </label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={!ready}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || !ready}
          >
            {loading ? t('saving') : t('auth_reset_new_btn')}
          </button>
        </form>
      </div>
    </div>
  );
}
