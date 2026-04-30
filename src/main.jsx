import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './lib/errorLog';
import './index.css';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
