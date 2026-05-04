import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n';

// Detecta si el hash de la URL viene de un callback de OAuth (Google /
// Supabase). Por ejemplo: `#access_token=eyJ...&expires_in=3600&...`.
// Cuando es asi, HashRouter intenta resolver `access_token=...` como ruta,
// no la encuentra y monta NotFound un instante hasta que Supabase consume
// el hash via detectSessionInUrl. Ese flicker de 404 es el bug que
// reporta el usuario.
function isOAuthCallback() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hash || '';
  return /access_token=|provider_token=|refresh_token=/.test(h);
}

export function NotFound() {
  const t = useT();
  // Si arrancamos en medio de un callback OAuth, mostramos un loader
  // benigno en lugar del 404. Cuando Supabase termina de procesar la
  // sesion, App.jsx navega a /dashboard automaticamente y este componente
  // se desmonta — el usuario nunca ve "404".
  const [isAuth, setIsAuth] = useState(() => isOAuthCallback());

  useEffect(() => {
    if (!isAuth) return;
    // Polling corto: en cuanto Supabase limpia el hash (suele ser <500ms),
    // dejamos de mostrar el loader. Si despues de 8s sigue ahi, asumimos
    // que algo fallo y mostramos el 404 normal para que el usuario pueda
    // reintentar.
    const start = Date.now();
    const timer = setInterval(() => {
      if (!isOAuthCallback()) {
        clearInterval(timer);
        setIsAuth(false);
      } else if (Date.now() - start > 8000) {
        clearInterval(timer);
        setIsAuth(false);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [isAuth]);

  if (isAuth) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto mt-16" role="status" aria-live="polite">
        <div className="inline-block animate-spin text-5xl mb-5">🍦</div>
        <h1 className="font-display text-2xl text-[var(--ink)] mb-2">{t('auth_completing_title')}</h1>
        <p className="text-sm text-[var(--ink3)]">{t('auth_completing_sub')}</p>
      </div>
    );
  }

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
