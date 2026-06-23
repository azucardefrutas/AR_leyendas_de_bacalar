import React from 'react';

function ArPermissionHelp() {
  return (
    <aside className="ar-permission-help">
      <h2>Permisos de camara</h2>
      <p>
        Usa esta vista en un telefono o navegador compatible. La camara solo se activa cuando presionas iniciar.
      </p>
      <ul>
        <li>Permite acceso a la camara cuando el navegador lo solicite.</li>
        <li>Usa buena luz y manten el marcador dentro del encuadre.</li>
        <li>Si no hay archivo .mind o .patt, el lector digital sigue funcionando.</li>
      </ul>
    </aside>
  );
}

export default ArPermissionHelp;
