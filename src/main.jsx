import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './lib/errorLog';
import './index.css';
import { authStorageReady } from './lib/authStorage';

// Supabase sends OAuth results in the URL hash (#access_token=... or #error=...).
// With HashRouter the fragment collides with the route, so #error=access_denied
// becomes the "path" and renders 404. We only normalize pure error fragments:
// successful token fragments are consumed by Supabase's detectSessionInUrl, which
// clears the hash itself after reading it.
(function normalizeOAuthErrorHash() {
  const h = window.location.hash || '';
  if (/(^#|&)error=/.test(h) && !/access_token=/.test(h)) {
    history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
  }
})();

// CRITICO (bug 2026-05-15): Tauri WebView2 a veces limpia localStorage al
// auto-actualizar la app .exe. authStorage tiene un mecanismo de respaldo
// en archivo (via tauri-plugin-store) que rehidrata localStorage al boot.
// Pero esa hidratacion es ASYNC, y si Supabase llama getItem() antes de
// que termine, ve localStorage vacio y considera que no hay sesion ->
// usuario tirado al login en cada apertura de la app desktop.
//
// Por eso esperamos authStorageReady (resuelve inmediato en web/iOS,
// ~100-300ms en Tauri desktop) ANTES de montar React. Evita el flash de
// pantalla de login y mantiene la sesion entre updates.
//
// Fallback: si la promesa tarda mas de 2s (raro, pero defensive), montamos
// igual para no dejar al usuario sin app.
async function bootApp() {
  try {
    await Promise.race([
      authStorageReady,
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]);
  } catch { /* tolerable: la falta de hidratacion solo desloguea, no rompe la app */ }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
}

bootApp();
