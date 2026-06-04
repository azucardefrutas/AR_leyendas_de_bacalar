import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Button from './Button.jsx';

export const adminNavItems = [
  { label: 'Dashboard', to: '/admin', icon: 'dashboard', end: true },
  { label: 'Usuarios', to: '/admin/users', icon: 'users' },
  { label: 'Registro creador', to: '/admin/creator-applications', icon: 'application' },
  { label: 'Autores', to: '/admin/authors', icon: 'author' },
  { label: 'Leyendas', to: '/admin/legends', icon: 'book' },
  { label: 'Revisiones', to: '/admin/reviews', icon: 'review' },
  { label: 'Recursos', to: '/admin/assets', icon: 'asset' },
  { label: 'Codigos', to: '/admin/codes', icon: 'request' },
  { label: 'Lotes de codigos', to: '/admin/code-batches', icon: 'codes' },
  { label: 'Compras', to: '/admin/purchases', icon: 'orders' },
  { label: 'Suscripciones', to: '/admin/subscriptions', icon: 'subscription' },
  { label: 'Actividad', to: '/admin/activity', icon: 'activity' },
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
  const current = adminNavItems.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  });

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="admin-header-logo" to="/admin" aria-label="Universidad Politecnica de Bacalar">
          <img src="/assets/Logo de la Upb sin fondo.png" alt="Universidad Politecnica de Bacalar" />
        </Link>
        <div className="admin-header-body">
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

      <aside className="admin-sidebar">
        <div className="admin-sidebar-heading">
          <span className="admin-sidebar-mark" aria-hidden="true">LB</span>
          <span className="admin-sidebar-heading-copy">
            <strong>Leyendas de Bacalar</strong>
            <span>Administracion cultural</span>
          </span>
        </div>
        <nav aria-label="Navegacion administrativa">
          {adminNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} title={item.label}>
              <span className="admin-nav-icon" aria-hidden="true"><AdminIcon name={item.icon} /></span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
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

const statusClassMap = {
  active: 'success',
  approved: 'success',
  published: 'success',
  redeemed: 'success',
  paid: 'success',
  completed: 'success',
  pending: 'warning',
  draft: 'info',
  submitted: 'warning',
  in_review: 'warning',
  review: 'warning',
  changes_requested: 'warning',
  rejected: 'danger',
  suspended: 'danger',
  disabled: 'danger',
  canceled: 'danger',
  cancelled: 'danger',
  unused: 'info',
  assigned: 'info',
  expired: 'danger',
  generated: 'info',
  exported: 'info',
  partially_used: 'warning',
};

const statusLabelMap = {
  active: 'Activo',
  approved: 'Aprobada',
  published: 'Publicada',
  redeemed: 'Canjeado',
  paid: 'Pagado',
  completed: 'Completado',
  pending: 'Pendiente de correo',
  draft: 'Borrador',
  submitted: 'Enviada',
  in_review: 'En revision',
  review: 'En revision',
  changes_requested: 'Cambios solicitados',
  rejected: 'Rechazada',
  suspended: 'Suspendido',
  disabled: 'Deshabilitado',
  canceled: 'Cancelado',
  cancelled: 'Cancelado',
  unused: 'Disponible',
  assigned: 'Asignado',
  expired: 'Expirado',
  generated: 'Generado',
  exported: 'Exportado',
  partially_used: 'Uso parcial',
};

export function AdminStatusBadge({ status = 'pending' }) {
  const tone = statusClassMap[status] || 'info';
  return <span className={`admin-status admin-status-${tone}`}>{statusLabelMap[status] || status}</span>;
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
