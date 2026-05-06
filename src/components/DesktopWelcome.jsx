import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useT } from '../lib/i18n';
import { Logo } from './Logo';
import { markVisited } from '../pages/Landing';
import { track } from '../lib/analytics';

/**
 * Pantalla de bienvenida para la app de escritorio (Tauri) cuando no hay
 * sesión activa. Reemplaza la landing pública (que es de marketing y no
 * tiene sentido mostrar dentro de una app ya instalada).
 *
 * Usuarios logueados van directo al dashboard via Landing.jsx, sin ver
 * esto. La logica de routing vive en Landing.jsx.
 */
export function DesktopWelcome() {
  const t = useT();
  const navigate = useNavigate();
  const fantasyName = useBusinessStore(s => s.fantasy_name);
  const businessCompleted = useBusinessStore(s => s.completed);

  function handleSignIn() {
    track('desktop_welcome_signin');
    markVisited();
    navigate('/auth');
  }
  function handleSignUp() {
    track('desktop_welcome_signup');
    markVisited();
    // /auth lee ?mode= y abre directo en signup, sin que el usuario tenga
    // que cliquear "Crear cuenta" otra vez dentro del form.
    navigate('/auth?mode=signup');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6"
         style={{ background: 'linear-gradient(135deg, var(--cream) 0%, #fff 50%, var(--mint3) 100%)' }}>
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl shadow-xl mb-6"
             style={{ background: 'var(--ink)' }}>
          <Logo size={64} variant="dark" />
        </div>

        <h1 className="font-display text-4xl text-[var(--ink)] mb-2 leading-tight">
          {fantasyName
            ? <>{t('welcome_to')} <span className="text-[var(--mint)]">{fantasyName}</span></>
            : <>Gelato<em className="text-[var(--gold)] not-italic">Lab</em></>}
        </h1>
        {businessCompleted && fantasyName ? (
          <p className="text-base text-[var(--ink2)] mb-10">
            {t('desktop_welcome_sub_named')}
          </p>
        ) : (
          <p className="text-base text-[var(--ink2)] mb-10">
            {t('desktop_welcome_sub')}
          </p>
        )}

        <div className="space-y-3">
          <button onClick={handleSignIn}
                  className="w-full text-base font-bold px-6 py-3.5 rounded-xl bg-[var(--ink)] text-[var(--cream)]
                             hover:opacity-90 cursor-pointer border-none transition-all shadow-md">
            {t('desktop_welcome_signin')}
          </button>
          <button onClick={handleSignUp}
                  className="w-full text-base font-semibold px-6 py-3 rounded-xl bg-white text-[var(--ink)]
                             border-2 border-black/10 hover:border-[var(--mint2)] cursor-pointer transition-colors">
            {t('desktop_welcome_signup')}
          </button>
        </div>

        <p className="text-[10px] text-[var(--ink3)] mt-8">
          {t('desktop_welcome_footer')}
        </p>
      </div>
    </div>
  );
}
