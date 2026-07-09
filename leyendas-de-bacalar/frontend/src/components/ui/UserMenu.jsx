import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from './AppIcon.jsx';

// Avatar button that opens a small menu (Perfil + Cerrar sesion). Replaces the
// standalone "Salir" button in the navbar so logout stays reachable everywhere
// while the bar stays clean.
export default function UserMenu({ initial, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-bubble"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu de usuario"
      >
        {initial}
      </button>
      {open && (
        <div className="user-menu-pop" role="menu">
          <Link to="/reader/profile" role="menuitem" onClick={() => setOpen(false)}>
            <AppIcon name="person" size={18} /> Perfil
          </Link>
          <button type="button" role="menuitem" className="user-menu-danger" onClick={() => { setOpen(false); onSignOut?.(); }}>
            <AppIcon name="logout" size={18} /> Cerrar sesion
          </button>
        </div>
      )}
    </div>
  );
}
