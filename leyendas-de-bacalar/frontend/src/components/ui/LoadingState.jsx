import React from 'react';
import AppIcon from './AppIcon.jsx';

// Preloader con un libro que "respira". Reemplaza el texto pelón sobre fondo azul por
// una precarga suave y de marca. Se usa en toda la app (guards y páginas), así que se
// mantiene compacto para verse bien tanto a pantalla completa como dentro de una tarjeta.
function LoadingState({ message = 'Cargando...' }) {
  return (
    <div className="book-loader" role="status" aria-live="polite">
      <span className="book-loader-book" aria-hidden="true">
        <AppIcon name="auto_stories" size={46} />
      </span>
      <p className="state-message book-loader-msg">{message}</p>
    </div>
  );
}

export default LoadingState;
