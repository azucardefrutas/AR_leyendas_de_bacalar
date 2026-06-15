import React from 'react';

function ArJsPatternViewer({ trackingUrl }) {
  return (
    <div className="ar-engine-note">
      <span>Marker tracking</span>
      <strong>AR.js preparado</strong>
      <p>Archivo de patron: {trackingUrl ? 'configurado' : 'pendiente'} (.patt)</p>
    </div>
  );
}

export default ArJsPatternViewer;
