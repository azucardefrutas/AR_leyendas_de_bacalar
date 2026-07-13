import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import StatusBadge from '../../shared/status/StatusBadge.jsx';
import AppIcon from './AppIcon.jsx';
import Button from './Button.jsx';
import Picture from './Picture.jsx';
import LoadingState from './LoadingState.jsx';

// Sidebar icons use Material Symbols names (rendered via AppIcon).
export const adminNavItems = [
  { label: 'Dashboard', to: '/admin', icon: 'dashboard', end: true },
  { label: 'Usuarios', to: '/admin/users', icon: 'group' },
  { label: 'Registro creador', to: '/admin/creator-applications', icon: 'how_to_reg' },
  { label: 'Autores', to: '/admin/authors', icon: 'draw' },
  { label: 'Leyendas', to: '/admin/legends', icon: 'auto_stories' },
  { label: 'Revisiones', to: '/admin/reviews', icon: 'rate_review' },
  { label: 'Recursos', to: '/admin/assets', icon: 'perm_media' },
  { label: 'Entregas de codigos', to: '/admin/codes', icon: 'confirmation_number' },
  { label: 'Lotes de codigos', to: '/admin/code-batches', icon: 'qr_code_2' },
  { label: 'Compras', to: '/admin/purchases', icon: 'shopping_bag' },
  { label: 'Suscripciones', to: '/admin/subscriptions', icon: 'workspace_premium' },
  { label: 'Actividad', to: '/admin/activity', icon: 'monitoring' },
  { label: 'Configuracion', to: '/admin/settings', icon: 'settings' },
];

const materialIconNames = {
  dashboard: 'space_dashboard',
  users: 'groups',
  application: 'assignment_ind',
  author: 'edit_document',
  book: 'menu_book',
  review: 'fact_check',
  asset: 'photo_library',
  request: 'local_activity',
  codes: 'qr_code_2',
  orders: 'shopping_bag',
  subscription: 'credit_card',
  activity: 'analytics',
  settings: 'settings',
  bell: 'notifications',
  calendar: 'calendar_month',
  location: 'location_on',
  logout: 'logout',
  profile: 'account_circle',
};

export function AdminIcon({ name, className = '' }) {
  return (
    <span className={`material-symbols-rounded admin-svg-icon ${className}`} aria-hidden="true">
      {materialIconNames[name] || materialIconNames.dashboard}
    </span>
  );
}

function useAdminClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => ({
    date: `Hoy: ${now.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).replaceAll(' de ', ' ')}`,
    time: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  }), [now]);
}

export function AdminLayoutShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const clock = useAdminClock();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const current = adminNavItems.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  });

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // While the drawer is open, lock body scroll and allow Escape-to-close.
  useEffect(() => {
    if (!navOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => { if (event.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  return (
    <div className={`admin-shell ${navOpen ? 'is-nav-open' : ''}`}>
      <header className="admin-header">
        <Link className="admin-header-logo" to="/admin" aria-label="Universidad Politecnica de Bacalar">
          <Picture src="/assets/Logo de la Upb sin fondo.png" alt="Universidad Politecnica de Bacalar" decoding="async" />
        </Link>
        <div className="admin-header-body">
          <button
            type="button"
            className="shell-nav-toggle"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={navOpen}
            aria-controls="admin-sidebar-nav"
          >
            <AppIcon name={navOpen ? 'close' : 'menu'} size={24} />
          </button>
          <div className="admin-header-context">
            <strong>{current?.label || 'Administracion'}</strong>
            <span>Panel administrativo</span>
          </div>
          <div className="admin-header-tools">
            <div className="admin-info-card admin-info-card-inline">
              <AdminIcon name="calendar" />
              <strong>{clock.date}</strong>
              <span>{clock.time}</span>
            </div>
            <div className="admin-info-card admin-info-card-inline">
              <AdminIcon name="location" />
              <strong>Bacalar, Q. Roo.</strong>
            </div>
            <button className="admin-notification" type="button" title="Notificaciones">
              <AdminIcon name="bell" />
            </button>
            <div className="admin-user-menu">
              <button
                className="admin-user-chip"
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-expanded={userMenuOpen}
              >
                <div>
                  <strong>Admin</strong>
                  <small><i /> Conectado</small>
                </div>
                <span>{(user?.email || 'A').slice(0, 1).toUpperCase()}</span>
              </button>
              {userMenuOpen && (
                <div className="admin-user-dropdown">
                  <Link to="/admin/settings" onClick={() => setUserMenuOpen(false)}>
                    <AdminIcon name="profile" /> Mi perfil
                  </Link>
                  <button type="button" onClick={handleSignOut}>
                    <AdminIcon name="logout" /> Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <aside className="admin-sidebar" id="admin-sidebar-nav">
        <button
          type="button"
          className="shell-nav-close"
          onClick={() => setNavOpen(false)}
          aria-label="Cerrar menu"
        >
          <AppIcon name="close" size={22} />
        </button>
        <div className="admin-sidebar-heading">
          <span className="admin-sidebar-mark" aria-hidden="true"><AppIcon name="shield_person" size={22} /></span>
          <span className="admin-sidebar-heading-copy">
            <strong>Leyendas de Bacalar</strong>
            <span>Administracion cultural</span>
          </span>
        </div>
        <nav aria-label="Navegacion administrativa">
          {adminNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} title={item.label} onClick={() => setNavOpen(false)}>
              <span className="admin-nav-icon" aria-hidden="true"><AppIcon name={item.icon} size={22} /></span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-nav-footer">
          <div className="shell-nav-user">
            <span className="shell-nav-user__avatar" aria-hidden="true">{(user?.email || 'A').slice(0, 1).toUpperCase()}</span>
            <span className="shell-nav-user__meta">
              <strong>{user?.email || 'Administrador'}</strong>
              <span>Administrador</span>
            </span>
          </div>
          <button type="button" className="shell-nav-signout" onClick={handleSignOut}>
            <AppIcon name="logout" size={20} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="shell-nav-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setNavOpen(false)}
      />

      <main className="admin-main">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export function AdminSectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="admin-section-header">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <span>{description}</span>}
      </div>
      {action}
    </div>
  );
}

export function AdminStatCard({ label, value, description, icon, tone = 'cyan' }) {
  return (
    <article className={`admin-stat-card admin-stat-card-${tone}`}>
      <span aria-hidden="true">{typeof icon === 'string' ? <AdminIcon name={icon} /> : icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        {description && <small>{description}</small>}
      </div>
    </article>
  );
}

export function AdminStatusBadge({ status = 'pending', context = 'generic' }) {
  return <StatusBadge status={status} context={context} className="admin-status" size="small" />;
}

export function AdminEmptyState({ title = 'Sin datos', message = 'No hay registros para mostrar.' }) {
  return (
    <div className="admin-empty-state">
      <span aria-hidden="true"><AdminIcon name="activity" /></span>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function AdminDataTable({ columns, rows, loading, emptyTitle, emptyMessage }) {
  if (loading) return <p className="admin-muted">Cargando...</p>;
  if (!rows?.length) return <AdminEmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key}>{column.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminToast({ type = 'info', message }) {
  if (!message) return null;
  return <div className={`admin-toast admin-toast-${type}`}>{message}</div>;
}

export function AdminConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  showCancel = true,
  modalClassName = '',
  children,
  onCancel,
  onConfirm,
  loading,
  confirmDisabled,
}) {
  if (!open) return null;
  return (
    <div className="admin-modal-backdrop">
      <div className={`admin-modal ${modalClassName}`}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
        <div className="admin-modal-actions">
          {showCancel && <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>}
          <Button onClick={onConfirm} disabled={loading || confirmDisabled}>{loading ? 'Procesando...' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
