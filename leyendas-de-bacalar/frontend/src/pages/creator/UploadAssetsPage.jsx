import React from 'react';
import Card from '../../components/ui/Card.jsx';

const assetTypes = [
  { title: 'Portada', text: 'Imagen vertical para catalogo y detalle de leyenda.' },
  { title: 'Banner', text: 'Imagen horizontal para hero o promociones internas.' },
  { title: 'PDF opcional', text: 'Documento fuente o edicion digital de apoyo.' },
  { title: 'Modelo 3D', text: 'Archivo GLB/GLTF para escenas futuras.' },
  { title: 'Marcador AR', text: 'Imagen fisica que activara una escena AR mas adelante.' },
];

function UploadAssetsPage() {
  return (
    <section className="page-stack creator-panel">
      <div>
        <p className="eyebrow">Recursos</p>
        <h1>Subir recursos</h1>
        <p className="state-message">Estructura inicial para portadas, banners, documentos, modelos y marcadores. Storage se conectara en una fase posterior.</p>
      </div>

      <div className="creator-list-grid">
        {assetTypes.map((asset) => (
          <Card key={asset.title}>
            <h2>{asset.title}</h2>
            <p>{asset.text}</p>
            <div className="asset-dropzone">Preparado para carga futura</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default UploadAssetsPage;
