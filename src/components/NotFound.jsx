import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n';

export function NotFound() {
  const t = useT();
  return (
    <div className="card p-8 text-center max-w-md mx-auto mt-12" role="alert">
      <div className="text-6xl mb-4 opacity-50">🍦</div>
      <h1 className="font-display text-4xl text-[var(--ink)] mb-2">404</h1>
      <p className="text-sm text-[var(--ink3)] mb-6">
        {t('not_found_desc')}
      </p>
      <Link to="/" className="btn-primary inline-block">
        {t('back_home')}
      </Link>
    </div>
  );
}
