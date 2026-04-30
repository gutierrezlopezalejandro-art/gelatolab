import { useAuthStore } from '../store/authStore';
import { Spinner } from './ui/index.jsx';
import { useT } from '../lib/i18n';
import { useNavigate } from 'react-router-dom';

/**
 * Wraps a route element so it only renders for logged-in users.
 * If cloud is not configured, falls through (anonymous local mode is allowed).
 * If not logged in, shows a message with a link to /auth.
 * Admin-only routes: pass `requireAdmin`.
 */
export function ProtectedRoute({ children, requireAdmin = false }) {
  const t = useT();
  const navigate = useNavigate();
  const { user, profile, loading, hasCloud } = useAuthStore();

  if (!hasCloud) return children;
  if (loading) return <Spinner />;

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden="true">🔒</div>
          <h2 className="font-display text-xl text-[var(--ink)] mb-2">
            {t('auth_required_title')}
          </h2>
          <p className="text-sm text-[var(--ink3)] mb-5">
            {t('auth_required_sub')}
          </p>
          <button onClick={() => navigate('/auth')} className="btn-primary">
            {t('auth_login_btn')}
          </button>
        </div>
      </div>
    );
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden="true">⛔</div>
          <h2 className="font-display text-xl text-[var(--ink)] mb-2">
            {t('auth_admin_only_title')}
          </h2>
          <p className="text-sm text-[var(--ink3)]">
            {t('auth_admin_only_sub')}
          </p>
        </div>
      </div>
    );
  }

  return children;
}
