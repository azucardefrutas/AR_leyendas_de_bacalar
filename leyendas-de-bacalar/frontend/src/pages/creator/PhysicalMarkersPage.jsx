import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import StatusBadge from '../../components/creator/StatusBadge.jsx';
import { getMyLegends } from '../../services/creatorService.js';
import { uploadLegendAsset } from '../../services/assetService.js';
import {
  listLegendPhysicalMarkers,
  createLegendPhysicalMarker,
  deleteLegendPhysicalMarker,
} from '../../services/backendApiService.js';

const EMPTY_FORM = { markerFile: null, modelFile: null, label: '' };

const statusLabel = (status) => {
  if (status === 'published') return 'Activo en app';
  if (status === 'draft') return 'Borrador';
  return status || 'Borrador';
};

function PhysicalMarkersPage() {
  const [legends, setLegends] = useState([]);
  const [selectedLegendId, setSelectedLegendId] = useState('');
  const [markers, setMarkers] = useState([]);
  const [loadingLegends, setLoadingLegends] = useState(true);
  const [loadingMarkers, setLoadingMarkers] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const selectedLegend = legends.find((legend) => String(legend.id) === String(selectedLegendId)) || null;
  const legendPublished = String(selectedLegend?.status || '') === 'published';

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: legendsError } = await getMyLegends();
      if (!active) return;
      setLegends(data ?? []);
      if (legendsError) setError(legendsError.message || 'No se pudieron cargar tus leyendas.');
      setLoadingLegends(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedLegendId) { setMarkers([]); return undefined; }
    let active = true;
    setLoadingMarkers(true);
    setError(null);
    (async () => {
      try {
        const resp = await listLegendPhysicalMarkers(selectedLegendId);
        if (active) setMarkers(resp?.markers ?? []);
      } catch (err) {
        if (active) setError(err?.message || 'No se pudieron cargar los marcadores.');
      } finally {
        if (active) setLoadingMarkers(false);
      }
    })();
    return () => { active = false; };
  }, [selectedLegendId]);

  async function handleSave(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!selectedLegendId) { setError('Selecciona una leyenda.'); return; }
    if (!form.markerFile) { setError('Sube la imagen del marcador.'); return; }
    if (!form.modelFile) { setError('Sube el modelo 3D (.glb).'); return; }

    setSaving(true);
    try {
      const markerUpload = await uploadLegendAsset({
        file: form.markerFile, legendId: selectedLegendId, assetType: 'marker_image',
      });
      if (markerUpload.error) throw new Error(markerUpload.error.message || 'No se pudo subir el marcador.');

      const modelUpload = await uploadLegendAsset({
        file: form.modelFile, legendId: selectedLegendId, assetType: 'model_3d',
      });
      if (modelUpload.error) throw new Error(modelUpload.error.message || 'No se pudo subir el modelo.');

      const resp = await createLegendPhysicalMarker(selectedLegendId, {
        marker_asset_id: markerUpload.data.asset.id,
        model_asset_id: modelUpload.data.asset.id,
        label: form.label.trim() || null,
      });
      setMarkers((prev) => [...prev, resp.marker]);
      setForm(EMPTY_FORM);
      event.target.reset();
      setNotice('Par marcador-modelo guardado.');
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el par marcador-modelo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(hotspotId) {
    setError(null);
    setNotice(null);
    try {
      await deleteLegendPhysicalMarker(selectedLegendId, hotspotId);
      setMarkers((prev) => prev.filter((marker) => String(marker.id) !== String(hotspotId)));
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar.');
    }
  }

  if (loadingLegends) return <LoadingState message="Cargando tus leyendas..." />;

  return (
    <section className="page-stack creator-panel">
      <div>
        <p className="creator-kicker">Libro físico · App móvil</p>
        <h1>Marcadores para la app</h1>
        <p className="state-message">
          Registra los marcadores de tu <strong>libro físico</strong> y vincúlalos a su modelo 3D.
          Al escanear el marcador impreso con la app, aparece el modelo. Cada leyenda tiene su
          propia lista; cada marcador va con un solo modelo.
        </p>
      </div>

      <Card>
        <label className="field" htmlFor="pm-legend">
          <span>Leyenda</span>
          <select
            id="pm-legend"
            className="select"
            value={selectedLegendId}
            onChange={(event) => { setSelectedLegendId(event.target.value); setNotice(null); setError(null); }}
          >
            <option value="">— Selecciona una leyenda —</option>
            {legends.map((legend) => (
              <option key={legend.id} value={legend.id}>{legend.title}</option>
            ))}
          </select>
          {selectedLegend && !legendPublished && (
            <small>
              Esta leyenda no está publicada todavía: los marcadores se guardan, pero se activarán
              en la app cuando la publiques.
            </small>
          )}
        </label>
      </Card>

      {error && <p className="error-message">{error}</p>}
      {notice && <p className="state-message" role="status">{notice}</p>}

      {selectedLegendId && (
        <>
          <Card>
            <h2>Agregar par marcador ↔ modelo</h2>
            <form className="creator-code-form" onSubmit={handleSave}>
              <label className="field" htmlFor="pm-marker">
                <span>Imagen del marcador</span>
                <input
                  id="pm-marker"
                  className="input standalone-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setForm((prev) => ({ ...prev, markerFile: event.target.files?.[0] || null }))}
                />
              </label>
              <label className="field" htmlFor="pm-model">
                <span>Modelo 3D (.glb)</span>
                <input
                  id="pm-model"
                  className="input standalone-input"
                  type="file"
                  accept=".glb,model/gltf-binary"
                  onChange={(event) => setForm((prev) => ({ ...prev, modelFile: event.target.files?.[0] || null }))}
                />
              </label>
              <label className="field" htmlFor="pm-label">
                <span>Nombre (opcional)</span>
                <input
                  id="pm-label"
                  className="input standalone-input"
                  type="text"
                  placeholder="Ej. Pirata, Iglesia..."
                  value={form.label}
                  maxLength={200}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                />
              </label>
              <div className="creator-code-submit-row">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar par'}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <h2>Marcadores de esta leyenda</h2>
            {loadingMarkers ? (
              <LoadingState message="Cargando marcadores..." />
            ) : markers.length === 0 ? (
              <p className="state-message">Aún no hay marcadores para esta leyenda.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Marcador</th>
                      <th>Modelo</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markers.map((marker) => (
                      <tr key={marker.id}>
                        <td>
                          {marker.marker.imageUrl ? (
                            <img
                              src={marker.marker.imageUrl}
                              alt={marker.marker.name}
                              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                            />
                          ) : (
                            <span className="state-message">{marker.marker.name}</span>
                          )}
                        </td>
                        <td>{marker.label || marker.model.name}</td>
                        <td><StatusBadge statusKey={marker.status} label={statusLabel(marker.status)} /></td>
                        <td>
                          <Button variant="ghost" onClick={() => handleDelete(marker.id)}>Eliminar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {!legends.length && (
        <Card className="creator-empty-card">
          <h2>Aún no tienes leyendas</h2>
          <p>Crea una obra para poder registrar sus marcadores de libro físico.</p>
        </Card>
      )}
    </section>
  );
}

export default PhysicalMarkersPage;
