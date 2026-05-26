import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

function CreatorShell({ items }) {
  return (
    <div className="creator-shell">
      <aside className="creator-sidebar">
        <div className="creator-sidebar-brand">
          <img src="/assets/Logo de la Upb sin fondo.png" alt="Universidad Politecnica de Bacalar" />
          <div>
            <strong>Leyendas de Bacalar</strong>
            <span>Panel editorial</span>
          </div>
        </div>

        <nav aria-label="Navegacion de creador">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="creator-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="creator-main">
        <Outlet />
      </main>
    </div>
  );
}

export default CreatorShell;
