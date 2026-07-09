import React from 'react';
import { NavLink } from 'react-router-dom';
import AppIcon from '../ui/AppIcon.jsx';
import { useAuth } from '../../hooks/useAuth.js';

// Glass rail with icon + label items, a collapse toggle, and a logout at the
// bottom. Collapsing narrows it to an icon rail so the content area gets the
// full width.
function Sidebar({ title, titleIcon, items = [], collapsed = false, onToggle }) {
  const { signOut } = useAuth();

  return (
    <aside className={`rx-sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label={title}>
      <div className="rx-sidebar-head">
        <span className="rx-sidebar-brand">
          {titleIcon && <span className="rx-sidebar-brand-ico" aria-hidden="true"><AppIcon name={titleIcon} size={22} filled /></span>}
          <span className="rx-sidebar-title">{title}</span>
        </span>
        <button
          type="button"
          className="rx-sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <AppIcon name={collapsed ? 'chevron_right' : 'chevron_left'} size={20} />
        </button>
      </div>

      <nav className="rx-sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="rx-sidebar-link"
            title={collapsed ? item.label : undefined}
          >
            <span className="rx-sidebar-ico" aria-hidden="true"><AppIcon name={item.icon} size={22} /></span>
            <span className="rx-sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="rx-sidebar-foot">
        <button
          type="button"
          className="rx-sidebar-link rx-sidebar-logout"
          onClick={signOut}
          title={collapsed ? 'Cerrar sesion' : undefined}
        >
          <span className="rx-sidebar-ico" aria-hidden="true"><AppIcon name="logout" size={22} /></span>
          <span className="rx-sidebar-label">Cerrar sesion</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
