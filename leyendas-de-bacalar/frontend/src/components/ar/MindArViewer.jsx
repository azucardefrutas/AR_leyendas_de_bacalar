import React from 'react';

function MindArViewer({ trackingUrl }) {
  return (
    <div className="ar-engine-note">
      <span>Image tracking</span>
      <strong>MindAR preparado</strong>
      <p>Archivo de reconocimiento: {trackingUrl ? 'configurado' : 'pendiente'} (.mind)</p>
    </div>
  );
}

export default MindArViewer;
