import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n';

export function Footer() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-black/10 bg-white/40" role="contentinfo">
      <div className="max-w-[1280px] mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--ink3)]">
          © {year} GelatoLab. {t('footer_rights')}
        </p>
        <nav className="flex gap-4 text-[11px]" aria-label={t('footer_legal')}>
          <Link to="/terms" className="text-[var(--ink3)] hover:text-[var(--ink)] transition-colors">
            {t('legal_terms_title')}
          </Link>
          <Link to="/privacy" className="text-[var(--ink3)] hover:text-[var(--ink)] transition-colors">
            {t('legal_privacy_title')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
