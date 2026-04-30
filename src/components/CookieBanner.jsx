import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n';

const STORAGE_KEY = 'gelatolab-cookie-consent';

/**
 * Reads current consent. Returns 'accepted', 'rejected', or null if not set.
 */
export function getCookieConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * GDPR-compliant cookie banner. Shows on first visit until user chooses.
 * - Accept: allows optional cookies (analytics, etc. when we add them)
 * - Reject: strictly necessary only (essential for the app to work)
 * Auth and sync cookies are essential and not blocked by this banner.
 */
export function CookieBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  function save(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[100]
                 bg-white shadow-2xl rounded-xl border border-black/10 p-5"
    >
      <h2 id="cookie-banner-title" className="font-display text-base text-[var(--ink)] mb-2">
        {t('cookie_title')}
      </h2>
      <p className="text-xs text-[var(--ink2)] leading-relaxed mb-4">
        {t('cookie_body')}{' '}
        <Link to="/privacy" className="text-[var(--mint)] underline hover:text-[var(--mint2)]">
          {t('legal_privacy_title')}
        </Link>
        .
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => save('rejected')}
          className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-black/15
                     text-[var(--ink2)] hover:bg-[var(--cream)] transition-colors cursor-pointer"
        >
          {t('cookie_reject')}
        </button>
        <button
          onClick={() => save('accepted')}
          className="btn-primary flex-1 text-xs"
        >
          {t('cookie_accept')}
        </button>
      </div>
    </div>
  );
}
