import React from 'react';
function LoadingState({ message = 'Cargando...' }) {
  return <p className="state-message">{message}</p>;
}

export default LoadingState;
