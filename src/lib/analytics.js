/**
 * Lightweight, privacy-respecting analytics layer wrapping Plausible.
 *
 * Behaviour:
 *   - No-op in development.
 *   - No-op if VITE_PLAUSIBLE_DOMAIN is not configured.
 *   - No-op if the user rejected cookies via the CookieBanner.
 *   - Otherwise: lazy-loads Plausible's script on first track() call and
 *     forwards the event to window.plausible(name, { props }).
 *
 * Plausible is cookieless and aggregates anonymously, but we still gate it
 * behind explicit consent to be GDPR-safe and respect the user's choice.
 */
import { getCookieConsent } from '../components/CookieBanner';

const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
const SCRIPT_HOST = import.meta.env.VITE_PLAUSIBLE_HOST || 'https://plausible.io';
let scriptLoading = false;
let scriptLoaded = false;

function shouldTrack() {
  if (import.meta.env.DEV) return false;
  if (!DOMAIN) return false;
  if (getCookieConsent() === 'rejected') return false;
  return true;
}

function ensureScript() {
  if (scriptLoaded || scriptLoading) return;
  scriptLoading = true;
  const s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = DOMAIN;
  s.src = `${SCRIPT_HOST}/js/script.js`;
  s.onload = () => { scriptLoaded = true; };
  document.head.appendChild(s);
  // Plausible exposes window.plausible after the script is parsed; until
  // then, queue events on a stub so early calls don't get lost.
  if (!window.plausible) {
    window.plausible = function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  }
}

/**
 * Track a custom event. Props are arbitrary string→string|number mappings
 * (Plausible discards complex types). Failures never throw to the caller.
 */
export function track(eventName, props = undefined) {
  try {
    if (!shouldTrack()) return;
    ensureScript();
    if (window.plausible) {
      window.plausible(eventName, props ? { props } : undefined);
    }
  } catch {
    // analytics is non-critical
  }
}

/** Track a virtual page view (call from route changes if SPA needs it). */
export function trackPageview() {
  track('pageview');
}
