import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useT } from '../lib/i18n';

// Layout del panel admin: sidebar con tabs (Dashboard / Usuarios / Audit) +
// area principal donde renderiza el child route via <Outlet />.
//
// El gateo de role='admin' lo hace ProtectedRoute en el padre — este componente
// asume que ya estamos autorizados.
export function AdminLayout() {
  const t = useT();
  const location = useLocation();

  const tabs = [
    { to: '/admin',          label: t('admin_tab_dashboard'), end: true },
    { to: '/admin/users',    label: t('admin_tab_users') },
    { to: '/admin/audit',    label: t('admin_tab_audit') },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-6">
      <header className="mb-6 pb-4 border-b border-black/10">
        <h1 className="font-display text-3xl text-[var(--ink)]">{t('admin_title')}</h1>
        <p className="text-sm text-[var(--ink3)] mt-1">{t('admin_subtitle')}</p>
      </header>

      <nav className="flex gap-1 mb-6 border-b border-black/10 -mb-px">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${isActive
                ? 'border-[var(--mint)] text-[var(--mint)]'
                : 'border-transparent text-[var(--ink3)] hover:text-[var(--ink)] hover:border-black/20'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet key={location.pathname} />
    </div>
  );
}
