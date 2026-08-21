import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import AppIcon from '../../components/ui/AppIcon.jsx';
import MarkerModelPreview from '../../components/3d/MarkerModelPreview.jsx';
import ModelAnimationSettings from '../../components/3d/ModelAnimationSettings.jsx';
import { normalizeAnimationConfig } from '../../components/3d/modelAnimationConfig.js';
import { getMyLegends } from '../../services/creatorService.js';
import { uploadLegendAsset } from '../../services/assetService.js';
import { pickUploadedAsset } from '../../utils/uploadedAsset.js';
import {
  listLegendPhysicalMarkers,
  createLegendPhysicalMarker,
  updateLegendPhysicalMarker,
  deleteLegendPhysicalMarker,
} from '../../services/backendApiService.js';

const emptyForm = () => ({
  markerFile: null,
  modelFile: null,
  label: '',
  animationConfig: normalizeAnimationConfig({}, 'marker-found'),
});

// Miniatura 3D perezosa: monta el <canvas> WebGL solo cuando la fila entra en el
// viewport, para no agotar contextos WebGL en listas con muchos modelos. La lista
// es un scroll vertical normal (no un flip-book), así que el IntersectionObserver
// sí dispara. MarkerModelPreview ya trae WebGLErrorBoundary + fallback si falla.
function ModelThumb({ url }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible || typeof IntersectionObserver === 'undefined') {
      if (!node) return undefined;
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div className="pm-item-model3d" ref={ref}>
      {visible && url ? (
        <MarkerModelPreview modelUrl={url} />
      ) : (
        <AppIcon name="deployed_code" size={20} />
      )}
    </div>
  );
}

// Turn technical backend errors into friendly copy (never surface raw stack/route text).
function friendlyError(message = '') {
  if (/route not found/i.test(message) || /not found/i.test(message)) {
    return 'El servicio de marcadores aún no responde. Si acabas de actualizar el servidor, espera un momento y reintenta.';
  }
  if (/failed to fetch|network|conectar/i.test(message)) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }
  if (/409|ya (existe|está)/i.test(message)) {
    return 'Ese marcador ya está vinculado a un modelo en esta leyenda. Usa una imagen distinta.';
  }
  return message || 'Ocurrió un error inesperado.';
}

function humanSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const HOWTO = [
  { icon: 'add_photo_alternate', title: 'Sube el par', text: 'Imagen del marcador impreso + su modelo 3D (.glb).' },
  { icon: 'publish', title: 'Publica la leyenda', text: 'Los marcadores se activan en la app al publicar la obra.' },
  { icon: 'qr_code_scanner', title: 'Escanea con la app', text: 'Apunta al marcador del libro físico y aparece el modelo.' },
];

function PhysicalMarkersPage() {
  const [legends, setLegends] = useState([]);
  const [selectedLegendId, setSelectedLegendId] = useState('');
  const [markers, setMarkers] = useState([]);
  const [loadingLegends, setLoadingLegends] = useState(true);
  const [loadingMarkers, setLoadingMarkers] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [replacingId, setReplacingId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const selectedLegend = legends.find((legend) => String(legend.id) === String(selectedLegendId)) || null;
  // Viene del backend (columna legends.status), que es exactamente lo que filtra el
  // feed de la app. El status de getMyLegends es derivado (revision/version) y puede
  // no coincidir, asi que no sirve para prometer visibilidad en la app.
  const [legendPublished, setLegendPublished] = useState(false);

  // Live thumbnail of the marker image while composing (revoked to avoid leaks).
  const markerPreview = useMemo(
    () => (form.markerFile ? URL.createObjectURL(form.markerFile) : ''),
    [form.markerFile],
  );
  useEffect(() => () => { if (markerPreview) URL.revokeObjectURL(markerPreview); }, [markerPreview]);
  const modelPreview = useMemo(
    () => (form.modelFile ? URL.createObjectURL(form.modelFile) : ''),
    [form.modelFile],
  );
  useEffect(() => () => { if (modelPreview) URL.revokeObjectURL(modelPreview); }, [modelPreview]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: legendsError } = await getMyLegends();
      if (!active) return;
      setLegends(data ?? []);
      if (legendsError) setError(friendlyError(legendsError.message));
      setLoadingLegends(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedLegendId) { setMarkers([]); setLegendPublished(false); return undefined; }
    let active = true;
    setLoadingMarkers(true);
    setError(null);
    (async () => {
      try {
        const resp = await listLegendPhysicalMarkers(selectedLegendId);
        if (active) {
          setMarkers(resp?.markers ?? []);
          setLegendPublished(Boolean(resp?.legendPublished));
        }
      } catch (err) {
        if (active) setError(friendlyError(err?.message));
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
      // forceBackend: marker_image/model_3d solo pasan por el backend con este flag
      // (shouldUseBackendUpload). Sin él caen a Supabase directo, que además de
      // saltarse el registro service-role devuelve otra forma de respuesta.
      const markerUpload = await uploadLegendAsset({
        file: form.markerFile, legendId: selectedLegendId, assetType: 'marker_image', forceBackend: true,
      });
      if (markerUpload.error) throw new Error(markerUpload.error.message || 'No se pudo subir el marcador.');
      const markerAsset = pickUploadedAsset(markerUpload);
      if (!markerAsset) throw new Error('No pudimos registrar la imagen del marcador. Intenta de nuevo.');

      const modelUpload = await uploadLegendAsset({
        file: form.modelFile, legendId: selectedLegendId, assetType: 'model_3d', forceBackend: true,
      });
      if (modelUpload.error) throw new Error(modelUpload.error.message || 'No se pudo subir el modelo.');
      const modelAsset = pickUploadedAsset(modelUpload);
      if (!modelAsset) throw new Error('No pudimos registrar el modelo 3D. Intenta de nuevo.');

      const resp = await createLegendPhysicalMarker(selectedLegendId, {
        marker_asset_id: markerAsset.id,
        model_asset_id: modelAsset.id,
        label: form.label.trim() || null,
        animation_config: form.animationConfig,
      });
      setMarkers((prev) => [...prev, resp.marker]);
      setForm(emptyForm());
      event.target.reset();
      setNotice('Par marcador-modelo guardado.');
    } catch (err) {
      setError(friendlyError(err?.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleReplaceModel(hotspotId, file) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setReplacingId(hotspotId);
    try {
      const upload = await uploadLegendAsset({
        file, legendId: selectedLegendId, assetType: 'model_3d', forceBackend: true,
      });
      if (upload.error) throw new Error(upload.error.message || 'No se pudo subir el modelo.');
      const asset = pickUploadedAsset(upload);
      if (!asset) throw new Error('No pudimos registrar el modelo 3D. Intenta de nuevo.');

      const resp = await updateLegendPhysicalMarker(selectedLegendId, hotspotId, { model_asset_id: asset.id });
      setMarkers((prev) => prev.map((marker) => (String(marker.id) === String(hotspotId) ? resp.marker : marker)));
      setNotice('Modelo reemplazado.');
    } catch (err) {
      setError(friendlyError(err?.message));
    } finally {
      setReplacingId(null);
    }
  }

  async function handleDelete(hotspotId) {
    setError(null);
    setNotice(null);
    try {
      await deleteLegendPhysicalMarker(selectedLegendId, hotspotId);
      setMarkers((prev) => prev.filter((marker) => String(marker.id) !== String(hotspotId)));
    } catch (err) {
      setError(friendlyError(err?.message));
    }
  }

  if (loadingLegends) return <LoadingState message="Cargando tus leyendas..." />;

  const canSave = Boolean(selectedLegendId && form.markerFile && form.modelFile && !saving);
  // Un marcador solo se ve en la app si su hotspot está publicado Y la leyenda está publicada.
  const liveCount = legendPublished ? markers.filter((marker) => marker.status === 'published').length : 0;

  return (
    <section className="page-stack creator-panel pm-page">
      <header className="pm-head">
        <p className="creator-kicker">Libro físico · App móvil</p>
        <h1>Marcadores para la app</h1>
        <p className="state-message">
          Vincula el <strong>marcador impreso</strong> de tu libro físico con su <strong>modelo 3D</strong>.
          Al escanearlo con la app, el modelo cobra vida. Cada leyenda tiene su propia lista.
        </p>
        <ol className="pm-howto">
          {HOWTO.map((step, index) => (
            <li key={step.icon}>
              <span className="pm-howto-num">{index + 1}</span>
              <AppIcon name={step.icon} size={22} />
              <span className="pm-howto-text">
                <strong>{step.title}</strong>
                <em>{step.text}</em>
              </span>
            </li>
          ))}
        </ol>
      </header>

      <Card className="pm-legend-card">
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
        </label>
        {selectedLegend && (
          <div className={`pm-legend-status${legendPublished ? ' is-live' : ' is-draft'}`}>
            <AppIcon name={legendPublished ? 'check_circle' : 'schedule'} size={20} />
            <p>
              {legendPublished
                ? 'Esta leyenda está publicada: sus marcadores ya funcionan en la app.'
                : 'Esta leyenda aún no está publicada. Puedes guardar marcadores ahora; se activarán en la app cuando la publiques.'}
            </p>
          </div>
        )}
      </Card>

      {error && (
        <p className="error-message pm-error" role="alert">
          <AppIcon name="error" size={18} /> {error}
        </p>
      )}
      {notice && (
        <p className="pm-notice" role="status">
          <AppIcon name="check_circle" size={18} /> {notice}
        </p>
      )}

      {selectedLegendId && (
        <>
          <Card className="pm-form-card">
            <h2>Agregar par marcador ↔ modelo</h2>
            <form className="pm-form" onSubmit={handleSave}>
              <div className="pm-pair">
                <label className={`pm-drop${form.markerFile ? ' is-filled' : ''}`}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setForm((prev) => ({ ...prev, markerFile: event.target.files?.[0] || null }))}
                  />
                  {markerPreview ? (
                    <img className="pm-drop-thumb" src={markerPreview} alt="Vista previa del marcador" />
                  ) : (
                    <span className="pm-drop-icon"><AppIcon name="add_photo_alternate" size={30} /></span>
                  )}
                  <span className="pm-drop-label">Imagen del marcador</span>
                  <span className="pm-drop-hint">
                    {form.markerFile ? form.markerFile.name : 'PNG, JPG o WEBP'}
                  </span>
                </label>

                <span className="pm-pair-link" aria-hidden="true"><AppIcon name="sync_alt" size={22} /></span>

                <label className={`pm-drop${form.modelFile ? ' is-filled' : ''}`}>
                  <input
                    type="file"
                    accept=".glb,model/gltf-binary"
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      modelFile: event.target.files?.[0] || null,
                      animationConfig: normalizeAnimationConfig({}, 'marker-found'),
                    }))}
                  />
                  <span className={`pm-drop-icon${form.modelFile ? ' is-model' : ''}`}>
                    <AppIcon name={form.modelFile ? 'deployed_code' : 'view_in_ar'} size={30} />
                  </span>
                  <span className="pm-drop-label">Modelo 3D (.glb)</span>
                  <span className="pm-drop-hint">
                    {form.modelFile ? `${form.modelFile.name} · ${humanSize(form.modelFile.size)}` : 'Archivo .glb'}
                  </span>
                </label>
              </div>

              {modelPreview && (
                <ModelAnimationSettings
                  modelUrl={modelPreview}
                  value={form.animationConfig}
                  onChange={(animationConfig) => setForm((prev) => ({ ...prev, animationConfig }))}
                  context="marker"
                />
              )}

              <label className="field pm-name-field" htmlFor="pm-label">
                <span>Nombre (opcional)</span>
                <input
                  id="pm-label"
                  className="input standalone-input"
                  type="text"
                  placeholder="Ej. Pirata, Iglesia, Serpiente…"
                  value={form.label}
                  maxLength={200}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                />
              </label>

              <div className="pm-submit-row">
                <Button type="submit" disabled={!canSave}>
                  {saving ? 'Guardando…' : 'Guardar par'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="pm-list-card">
            <div className="pm-list-head">
              <h2>Marcadores de esta leyenda</h2>
              {markers.length > 0 && (
                <span className={`pm-live-summary${legendPublished ? ' is-live' : ' is-pending'}`}>
                  <AppIcon name={legendPublished ? 'smartphone' : 'schedule'} size={15} />
                  {legendPublished
                    ? `${liveCount} en vivo en la app`
                    : 'Publica la leyenda para activar'}
                </span>
              )}
            </div>
            {loadingMarkers ? (
              <LoadingState message="Cargando marcadores..." />
            ) : markers.length === 0 ? (
              <div className="pm-empty">
                <AppIcon name="qr_code_2" size={34} />
                <p>Aún no hay marcadores. Sube el primer par arriba.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table pm-table">
                  <thead>
                    <tr>
                      <th className="pm-col-num">#</th>
                      <th>Marcador</th>
                      <th>Modelo</th>
                      <th>Estado</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {markers.map((marker, index) => {
                      const live = legendPublished && marker.status === 'published';
                      return (
                        <tr key={marker.id}>
                          <td><span className="pm-num">{index + 1}</span></td>
                          <td>
                            <div className="pm-cell">
                              <div className="pm-item-marker">
                                {marker.marker.imageUrl ? (
                                  <img src={marker.marker.imageUrl} alt={marker.marker.name || 'Marcador'} />
                                ) : (
                                  <AppIcon name="image" size={24} />
                                )}
                              </div>
                              <span className="pm-cell-name">{marker.marker.name || 'Marcador'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="pm-cell">
                              <ModelThumb url={marker.model.url} />
                              <span className="pm-cell-model-info">
                                <span className="pm-cell-name">{marker.label || marker.model.name || 'Modelo 3D'}</span>
                                {marker.animationConfig?.clips?.length > 0 && (
                                  <span className="pm-emote-count">
                                    <AppIcon name="animation" size={13} />
                                    {marker.animationConfig.clips.length} {marker.animationConfig.clips.length === 1 ? 'emote' : 'emotes'}
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`pm-app-badge${live ? ' is-live' : ' is-pending'}`}>
                              <AppIcon name={live ? 'check_circle' : 'schedule'} size={15} />
                              {live ? 'En vivo en la app' : 'Se verá al publicar'}
                            </span>
                          </td>
                          <td>
                            <div className="pm-item-actions">
                              <label
                                className={`pm-item-replace${replacingId === marker.id ? ' is-busy' : ''}`}
                                title="Reemplazar modelo 3D"
                              >
                                <input
                                  type="file"
                                  accept=".glb,model/gltf-binary"
                                  disabled={replacingId === marker.id}
                                  onChange={(event) => {
                                    handleReplaceModel(marker.id, event.target.files?.[0]);
                                    event.target.value = '';
                                  }}
                                />
                                <AppIcon name={replacingId === marker.id ? 'hourglass_top' : 'cached'} size={18} />
                              </label>
                              <button
                                type="button"
                                className="pm-item-delete"
                                onClick={() => handleDelete(marker.id)}
                                title="Eliminar"
                                aria-label={`Eliminar marcador ${index + 1}`}
                              >
                                <AppIcon name="delete" size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
