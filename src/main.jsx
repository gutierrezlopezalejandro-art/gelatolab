import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './lib/errorLog';
import './index.css';

// Al desconectar Supabase desaparecieron las dos razones por las que este
// archivo tenia logica de arranque:
//   - la normalizacion del hash de OAuth, que chocaba con HashRouter;
//   - la espera de `authStorageReady`, que rehidrataba la sesion desde disco
//     antes de montar React para que el usuario no cayera al login.
// Sin cuentas no hay nada que esperar: la app monta de inmediato.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
