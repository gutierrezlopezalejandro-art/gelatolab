/**
 * Error logging layer.
 *
 * Local fallback always runs (last 50 errors stored in localStorage so the
 * user can copy them when reporting an issue). Sentry is dynamically imported
 * when VITE_SENTRY_DSN is set in production — keeps it out of the main bundle.
 * Dev builds never load Sentry at all.
 */
const LOCAL_LOG_KEY = 'gelatolab-error-log';
const MAX_LOCAL_LOGS = 50;

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
let sentryModule = null;
let sentryReady = null; // promise that resolves when Sentry is loaded+initialised, or null if disabled

if (SENTRY_DSN && !import.meta.env.DEV) {
  sentryReady = import('@sentry/react')
    .then(mod => {
      mod.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
        ignoreErrors: [
          'ResizeObserver loop',
          'Non-Error promise rejection',
          'Network request failed',
          'Failed to fetch',
        ],
      });
      sentryModule = mod;
    })
    .catch(e => { console.warn('Sentry init failed:', e); });
}

// Buffer of pending entries to flush once Sentry finishes loading.
const pendingForSentry = [];
function flushPending() {
  if (!sentryModule) return;
  while (pendingForSentry.length) {
    const { error, context } = pendingForSentry.shift();
    if (error instanceof Error) sentryModule.captureException(error, { extra: context });
    else sentryModule.captureMessage(String(error), { extra: context, level: 'error' });
  }
}
if (sentryReady) sentryReady.then(flushPending);

export function logError(error, context = {}) {
  const entry = {
    ts: new Date().toISOString(),
    message: String(error?.message || error),
    stack: error?.stack,
    context,
    url: typeof window !== 'undefined' ? window.location.href : '',
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  // Local fallback: store in localStorage for debugging
  try {
    const logs = JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || '[]');
    logs.push(entry);
    if (logs.length > MAX_LOCAL_LOGS) logs.shift();
    localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(logs));
  } catch {
    // Silently ignore if localStorage is full or unavailable
  }

  // Console in dev
  if (import.meta.env.DEV) {
    console.error('[GelatoLab]', error, context);
  }

  // Sentry in production: send if loaded; queue otherwise so we don't lose
  // errors that happen during the brief window before Sentry is ready.
  if (sentryReady) {
    if (sentryModule) {
      if (error instanceof Error) sentryModule.captureException(error, { extra: context });
      else sentryModule.captureMessage(String(error), { extra: context, level: 'error' });
    } else {
      pendingForSentry.push({ error, context });
    }
  }
}

/** Attach an arbitrary user identifier to subsequent error reports. */
export function setUserContext(user) {
  if (!sentryReady) return;
  sentryReady.then(() => {
    if (!sentryModule) return;
    if (user?.id) sentryModule.setUser({ id: user.id });
    else sentryModule.setUser(null);
  });
}

export function getErrorLog() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearErrorLog() {
  localStorage.removeItem(LOCAL_LOG_KEY);
}

// Global unhandled error catchers — fire even when no React error boundary
// catches the error (e.g. async/promise rejections).
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    logError(e.error || e.message, { type: 'window.error' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    logError(e.reason, { type: 'unhandledrejection' });
  });
}
