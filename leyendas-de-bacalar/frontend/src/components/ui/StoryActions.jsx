import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppIcon from './AppIcon.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useSaved } from '../../context/SavedContext.jsx';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

// Small icon toggles on a story: + (add to "mi estanteria") and heart (favorito /
// me gusta). For SIGNED-OUT visitors the buttons are still shown, but tapping them
// sends the visitor to iniciar sesion / registrarse (with a redirect back) instead of
// silently doing nothing — so a guest can browse freely and is only asked to sign in
// when they try to SAVE something. The buttons stop propagation so they never trigger
// the card's navigation.
export default function StoryActions({ legend, className = '' }) {
  const { isAuthenticated } = useAuth();
  const { isOnShelf, isFavorite, toggleShelf, toggleFavorite } = useSaved();
  const navigate = useNavigate();
  const location = useLocation();

  if (!legend?.id) return null;

  const guard = (fn) => (event) => { event.preventDefault(); event.stopPropagation(); fn(); };

  // Visitante (sin sesion): cualquier accion invita a iniciar sesion / registrarse,
  // conservando a donde volver.
  if (!isAuthenticated) {
    const goLogin = guard(() => navigate(getLoginPathForRedirect(location)));
    return (
      <div className={`story-actions ${className}`}>
        <button
          type="button"
          className="story-action"
          onClick={goLogin}
          aria-label="Inicia sesion para agregar a tu estanteria"
          title="Inicia sesion para guardarla en tu estanteria"
        >
          <AppIcon name="add" size={18} />
        </button>
        <button
          type="button"
          className="story-action story-action-fav"
          onClick={goLogin}
          aria-label="Inicia sesion para marcarla como favorita"
          title="Inicia sesion para marcarla como favorita"
        >
          <AppIcon name="favorite" size={18} />
        </button>
      </div>
    );
  }

  const onShelf = isOnShelf(legend.id);
  const fav = isFavorite(legend.id);

  return (
    <div className={`story-actions ${className}`}>
      <button
        type="button"
        className={`story-action ${onShelf ? 'is-on' : ''}`}
        onClick={guard(() => toggleShelf(legend))}
        aria-pressed={onShelf}
        aria-label={onShelf ? 'Quitar de mi estanteria' : 'Agregar a mi estanteria'}
        title={onShelf ? 'En tu estanteria' : 'Agregar a mi estanteria'}
      >
        <AppIcon name={onShelf ? 'check' : 'add'} size={18} />
      </button>
      <button
        type="button"
        className={`story-action story-action-fav ${fav ? 'is-on' : ''}`}
        onClick={guard(() => toggleFavorite(legend.id))}
        aria-pressed={fav}
        aria-label={fav ? 'Quitar de favoritos' : 'Me gusta'}
        title={fav ? 'En favoritos' : 'Me gusta'}
      >
        <AppIcon name="favorite" filled={fav} size={18} />
      </button>
    </div>
  );
}
