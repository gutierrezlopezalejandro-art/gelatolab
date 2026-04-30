import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useT } from '../lib/i18n';
import { BusinessSettingsModal } from './BusinessSettingsModal';

export function UserMenu() {
  const t = useT();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const { user, signOut, hasCloud } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [showBiz, setShowBiz] = useState(false);

  // When cloud auth isn't configured we still want the user to be able to
  // edit the heladería profile. Render a stand-alone gear button.
  if (!hasCloud) {
    return (
      <>
        <button
          onClick={() => setShowBiz(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white/80 hover:text-white
                     hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent"
          aria-label={t('business_settings_title')}
          title={t('business_settings_title')}
        >
          ⚙
        </button>
        {showBiz && <BusinessSettingsModal onClose={() => setShowBiz(false)} />}
      </>
    );
  }

  async function handleSignOut() {
    await signOut();
    setOpen(false);
    showToast(t('auth_signed_out'));
    // Volvemos al dashboard (con sus datos locales). La landing se mostraria
    // solo si limpiaron localStorage; tras logout normal el usuario sigue
    // viendo su workspace.
    navigate('/dashboard');
  }

  if (!user) {
    return (
      <button
        onClick={() => navigate('/auth')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold
                   bg-white/10 hover:bg-white/20 text-white/80 hover:text-white
                   transition-colors cursor-pointer border-none"
        aria-label={t('auth_login_btn')}
      >
        <span aria-hidden="true">👤</span>
        <span>{t('auth_login_btn')}</span>
      </button>
    );
  }

  const initial = (user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('account')}: ${user.email}`}
        className="w-8 h-8 rounded-full bg-[var(--gold)] text-white font-bold text-sm
                   hover:ring-2 hover:ring-white/30 transition-all cursor-pointer border-none flex items-center justify-center"
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[98]" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full mt-1 z-[99] bg-white rounded-lg shadow-xl border border-black/10 overflow-hidden min-w-[200px]">
            <div className="px-3 py-2 border-b border-black/10">
              <div className="text-[10px] text-[var(--ink3)] uppercase tracking-widest">
                {t('account')}
              </div>
              <div className="text-xs text-[var(--ink)] truncate">{user.email}</div>
            </div>
            <button
              role="menuitem"
              onClick={() => { setShowBiz(true); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-medium
                         hover:bg-[var(--cream)] transition-colors cursor-pointer border-none
                         bg-white text-[var(--ink)]"
            >
              ⚙ {t('business_settings_title')}
            </button>
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-xs font-medium
                         hover:bg-[var(--cream)] transition-colors cursor-pointer border-none
                         bg-white text-[var(--coral)]"
            >
              {t('auth_signout')}
            </button>
          </div>
        </>
      )}
      {showBiz && <BusinessSettingsModal onClose={() => setShowBiz(false)} />}
    </div>
  );
}
