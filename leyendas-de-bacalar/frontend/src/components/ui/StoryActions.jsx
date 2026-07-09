import React from 'react';
import AppIcon from './AppIcon.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useSaved } from '../../context/SavedContext.jsx';

// Small icon toggles on a story: + (add to "mi estanteria") and heart (favorito
// / me gusta). Hidden for signed-out users. The buttons stop propagation so they
// never trigger the card's navigation.
export default function StoryActions({ legend, className = '' }) {
  const { isAuthenticated } = useAuth();
  const { isOnShelf, isFavorite, toggleShelf, toggleFavorite } = useSaved();

  if (!isAuthenticated || !legend?.id) return null;

  const onShelf = isOnShelf(legend.id);
  const fav = isFavorite(legend.id);
  const guard = (fn) => (event) => { event.preventDefault(); event.stopPropagation(); fn(); };

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
