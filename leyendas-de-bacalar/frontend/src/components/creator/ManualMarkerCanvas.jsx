import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArSceneModal from '../3d/ArSceneModal.jsx';
import {
  createLegendHotspot,
  deleteLegendHotspot,
  linkPhysicalEditionMarker,
  listLegendHotspots,
  listLegendScenes,
  updateLegendHotspot,
} from '../../services/backendApiService.js';
import { getLegendResources } from '../../services/assetService.js';

// Lazy so the three.js bundle only loads when a placed marker actually shows a model.
const MarkerModelPreview = lazy(() => import('../3d/MarkerModelPreview.jsx'));

// Marker + model placement over a MANUAL (crear desde cero) legend page. Mirrors the
// PDF flow (SourceDocumentPreview): drag a marker onto the page sheet, then drop a model
// inside the marker. Each placement writes an interactive_hotspots row with
// target_type='legend_page', which is what the reader overlay AND the mobile AR feed read.
// Associating a model also registers the physical-edition <-> marker link.

const DEFAULT_HOTSPOT_SIZE = 0.18;
const MIN_HOTSPOT_SIZE = 0.055;
const MAX_HOTSPOT_SIZE = 0.46;

function normalizeSize(value, fallback = DEFAULT_HOTSPOT_SIZE) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(MAX_HOTSPOT_SIZE, Math.max(MIN_HOTSPOT_SIZE, number));
}

function getHotspotSize(hotspot) {
  return { width: normalizeSize(hotspot.width), height: normalizeSize(hotspot.height) };
}

function clampHotspotPosition({ x, y, width, height }) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return {
    x: Math.min(1 - halfWidth, Math.max(halfWidth, x)),
    y: Math.min(1 - halfHeight, Math.max(halfHeight, y)),
  };
}

function getResourceAsset(resource = {}) {
  return resource?.assets || resource?.asset || resource;
}

function getResourceUrl(resource = {}) {
  const asset = getResourceAsset(resource);
  return asset?.public_url || asset?.file_url || asset?.url || asset?.external_url || '';
}

function getMarkerAssetId(marker = {}) {
  return marker.marker_asset_id || marker.asset_id || marker.assets?.id || marker.asset?.id || null;
}

function getMarkerLabel(marker = {}) {
  const asset = getResourceAsset(marker);
  return asset?.metadata?.original_name || marker.marker_code || marker.label || 'Marcador visual';
}

function getSceneAsset(scene = {}) {
  return scene.assets || scene.asset || scene.modelAsset || scene.model_asset || {};
}

function getSceneLabel(scene = {}) {
  const asset = getSceneAsset(scene);
  return scene.name || asset?.metadata?.original_name || asset?.file_name || 'Modelo 3D';
}

function getHotspotSceneMarker(scene, arMarkers) {
  if (!scene) return null;
  return arMarkers.find((marker) => String(marker.ar_scene_id) === String(scene.id)) || null;
}

function ManualMarkerCanvas({ legendId, page, disabled = false, onGoToResources, onHotspotSummaryChange }) {
  const [hotspots, setHotspots] = useState([]);
  const [arScenes, setArScenes] = useState([]);
  const [arMarkers, setArMarkers] = useState([]);
  const [draggingAsset, setDraggingAsset] = useState(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [activeAssetTab, setActiveAssetTab] = useState('markers');
  const [hotspotBusy, setHotspotBusy] = useState(false);
  const [hotspotError, setHotspotError] = useState('');
  const [hotspotMessage, setHotspotMessage] = useState('');
  const [dragMode, setDragMode] = useState('');
  const [modalScene, setModalScene] = useState(null);
  const pageCanvasRef = useRef(null);
  const dragEditRef = useRef(null);

  const pageId = page?.id || null;
  const pageNumber = page?.page_number ?? page?.pageNumber ?? null;
  const canEdit = !disabled && Boolean(legendId) && Boolean(pageId);

  const markerOptions = useMemo(() => arMarkers
    .map((marker) => ({
      id: getMarkerAssetId(marker),
      label: getMarkerLabel(marker),
      imageUrl: getResourceUrl(marker),
      marker,
    }))
    .filter((marker, index, list) => marker.id && list.findIndex((item) => String(item.id) === String(marker.id)) === index), [arMarkers]);

  const getSceneById = (sceneId) => arScenes.find((scene) => String(scene.id) === String(sceneId)) || null;
  const getMarkerForScene = (scene) => getHotspotSceneMarker(scene, arMarkers);
  const selectedHotspot = hotspots.find((hotspot) => String(hotspot.id) === String(selectedHotspotId)) || null;

  const loadHotspots = useCallback(async () => {
    if (!legendId || !pageId) return;
    try {
      const response = await listLegendHotspots(legendId, { targetType: 'legend_page', pageId });
      const nextHotspots = response?.hotspots ?? [];
      setHotspots(nextHotspots);
      onHotspotSummaryChange?.({
        total: nextHotspots.length,
        associated: nextHotspots.filter((hotspot) => Boolean(hotspot.ar_scene_id)).length,
        items: nextHotspots.map((hotspot) => ({
          id: hotspot.id,
          label: hotspot.label,
          pageId: hotspot.page_id,
          arSceneId: hotspot.ar_scene_id,
          markerAssetId: hotspot.marker_asset_id,
          status: hotspot.status,
        })),
      });
    } catch (loadError) {
      if (import.meta.env.DEV) console.error('load manual hotspots error', loadError);
    }
  }, [legendId, pageId, onHotspotSummaryChange]);

  const loadScenes = useCallback(async () => {
    if (!legendId) return;
    try {
      const [resources, sceneResponse] = await Promise.all([
        getLegendResources(legendId),
        listLegendScenes(legendId).catch(() => ({ scenes: [] })),
      ]);
      const backendScenes = sceneResponse?.scenes ?? [];
      const scenes = backendScenes.length ? backendScenes : (resources.data?.arScenes ?? []);
      setArScenes(scenes.filter((scene) => String(scene.status || '').toLowerCase() !== 'archived'));
      setArMarkers(resources.data?.arMarkers ?? []);
    } catch (sceneError) {
      if (import.meta.env.DEV) console.error('load manual scenes error', sceneError);
    }
  }, [legendId]);

  useEffect(() => {
    setSelectedHotspotId(null);
    setHotspotError('');
    setHotspotMessage('');
    loadHotspots();
  }, [loadHotspots]);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  useEffect(() => {
    if (selectedHotspotId && !hotspots.some((hotspot) => String(hotspot.id) === String(selectedHotspotId))) {
      setSelectedHotspotId(null);
    }
  }, [hotspots, selectedHotspotId]);

  function getDropPoint(event) {
    const rect = pageCanvasRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return null;
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      rect,
    };
  }

  function handleAssetDragStart(event, assetType, assetPayload) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-leyendas-asset', JSON.stringify({ type: assetType, id: assetPayload?.id || '' }));
    setDraggingAsset({ type: assetType, payload: assetPayload });
  }

  function handleAssetDragEnd() {
    setDraggingAsset(null);
  }

  async function handlePageDrop(event) {
    event.preventDefault();
    if (hotspotBusy || !canEdit || draggingAsset?.type !== 'marker') return;
    const dropPoint = getDropPoint(event);
    if (!dropPoint) return;
    const width = DEFAULT_HOTSPOT_SIZE;
    const height = Math.min(0.24, DEFAULT_HOTSPOT_SIZE * 0.78);
    const position = clampHotspotPosition({ x: dropPoint.x, y: dropPoint.y, width, height });

    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      const response = await createLegendHotspot(legendId, {
        target_type: 'legend_page',
        page_id: pageId,
        hotspot_type: 'marker',
        label: draggingAsset.payload?.label || `Marcador pagina ${pageNumber ?? ''}`.trim(),
        x: position.x,
        y: position.y,
        width,
        height,
        marker_asset_id: draggingAsset.payload?.id || null,
      });
      const createdHotspot = response?.hotspot || response?.data || response;
      setSelectedHotspotId(createdHotspot?.id || null);
      setHotspotMessage('Marcador colocado. Arrastra un modelo 3D dentro del cuadro.');
      await loadHotspots();
    } catch {
      setHotspotError('No se pudo colocar el marcador.');
    } finally {
      setHotspotBusy(false);
      setDraggingAsset(null);
    }
  }

  async function handleModelDropOnHotspot(event, hotspot) {
    if (draggingAsset?.type !== 'model') return;
    event.preventDefault();
    event.stopPropagation();
    if (hotspotBusy || !draggingAsset.payload?.id) return;
    const sceneId = draggingAsset.payload.id;
    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      await updateLegendHotspot(legendId, hotspot.id, {
        ar_scene_id: sceneId,
        marker_asset_id: hotspot.marker_asset_id || null,
      });
      setSelectedHotspotId(hotspot.id);
      // Formalize the physical-edition <-> marker link so the printed book and the digital
      // legend share the same marker->model mapping. Best-effort: never block the
      // association (the reader + mobile feed already work off the hotspot itself).
      if (hotspot.marker_asset_id) {
        try {
          await linkPhysicalEditionMarker(legendId, {
            marker_asset_id: hotspot.marker_asset_id,
            ar_scene_id: sceneId,
            page_reference: pageNumber ? `Pagina ${pageNumber}` : null,
          });
        } catch (linkError) {
          if (import.meta.env.DEV) console.warn('physical edition marker link failed', linkError);
        }
      }
      await loadHotspots();
      await loadScenes();
      setHotspotMessage('Modelo asociado al marcador y registrado para la edicion fisica.');
    } catch {
      setHotspotError('No se pudo asociar el modelo 3D.');
    } finally {
      setHotspotBusy(false);
      setDraggingAsset(null);
    }
  }

  function patchHotspotLocally(hotspotId, patch) {
    setHotspots((current) => current.map((hotspot) => (
      String(hotspot.id) === String(hotspotId) ? { ...hotspot, ...patch } : hotspot
    )));
  }

  function handleHotspotEditStart(event, hotspot, mode) {
    if (hotspotBusy || !canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = pageCanvasRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    const size = getHotspotSize(hotspot);
    setSelectedHotspotId(hotspot.id);
    setDragMode(mode);
    dragEditRef.current = {
      hotspotId: hotspot.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      initial: { x: Number(hotspot.x), y: Number(hotspot.y), width: size.width, height: size.height },
      latest: { x: Number(hotspot.x), y: Number(hotspot.y), width: size.width, height: size.height },
    };
    window.addEventListener('pointermove', handleHotspotEditMove);
    window.addEventListener('pointerup', handleHotspotEditEnd, { once: true });
  }

  function handleHotspotEditMove(event) {
    const state = dragEditRef.current;
    if (!state) return;
    const deltaX = (event.clientX - state.startX) / state.rect.width;
    const deltaY = (event.clientY - state.startY) / state.rect.height;

    if (state.mode === 'resize') {
      const width = normalizeSize(state.initial.width + deltaX);
      const height = normalizeSize(state.initial.height + deltaY);
      const position = clampHotspotPosition({ x: state.initial.x, y: state.initial.y, width, height });
      state.latest = { ...position, width, height };
    } else {
      const position = clampHotspotPosition({
        x: state.initial.x + deltaX,
        y: state.initial.y + deltaY,
        width: state.initial.width,
        height: state.initial.height,
      });
      state.latest = { ...position, width: state.initial.width, height: state.initial.height };
    }
    patchHotspotLocally(state.hotspotId, state.latest);
  }

  async function handleHotspotEditEnd() {
    window.removeEventListener('pointermove', handleHotspotEditMove);
    const state = dragEditRef.current;
    dragEditRef.current = null;
    setDragMode('');
    if (!state?.latest || hotspotBusy) return;

    setHotspotBusy(true);
    setHotspotError('');
    try {
      await updateLegendHotspot(legendId, state.hotspotId, state.latest);
      await loadHotspots();
      setHotspotMessage('Posicion del marcador guardada.');
    } catch {
      setHotspotError('No se pudo guardar la posicion del marcador.');
      await loadHotspots();
    } finally {
      setHotspotBusy(false);
    }
  }

  async function handleDeleteHotspot(hotspotId) {
    if (!legendId || hotspotBusy) return;
    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      await deleteLegendHotspot(legendId, hotspotId);
      await loadHotspots();
    } catch {
      setHotspotError('No se pudo eliminar el marcador.');
    } finally {
      setHotspotBusy(false);
    }
  }

  async function handleRemoveScene(hotspotId) {
    if (hotspotBusy) return;
    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      await updateLegendHotspot(legendId, hotspotId, { ar_scene_id: null });
      await loadHotspots();
    } catch {
      setHotspotError('No se pudo quitar el modelo 3D.');
    } finally {
      setHotspotBusy(false);
    }
  }

  function handleTestModel(hotspot) {
    const scene = hotspot.ar_scene_id ? getSceneById(hotspot.ar_scene_id) : null;
    if (!scene) return;
    const explicitMarker = hotspot.marker_asset_id
      ? arMarkers.find((marker) => String(getMarkerAssetId(marker)) === String(hotspot.marker_asset_id))
      : null;
    setModalScene({ scene, marker: explicitMarker || getMarkerForScene(scene), pageNumber });
  }

  if (!pageId) {
    return <p className="creator-muted">Guarda la pagina (boton Guardar) para colocar marcadores y modelos sobre ella.</p>;
  }

  return (
    <div className="manual-marker-editor">
      {hotspotError && <p className="error-message">{hotspotError}</p>}
      {hotspotMessage && <p className="success-message hotspot-success-message">{hotspotMessage}</p>}

      <div className={`document-book-editor ${draggingAsset ? `dragging-${draggingAsset.type}` : ''}`}>
        <div className="document-book-stage">
          <div className={`source-document-frame-wrap ${draggingAsset?.type === 'marker' ? 'placing' : ''}`}>
            <div
              ref={pageCanvasRef}
              className="source-document-rendered-page manual-marker-sheet"
              onDragOver={(event) => { if (draggingAsset?.type === 'marker') event.preventDefault(); }}
              onDrop={handlePageDrop}
            >
              <div className="manual-marker-sheet-bg" aria-hidden="true">
                <span className="manual-marker-sheet-title">{page?.title || `Pagina ${pageNumber ?? ''}`.trim()}</span>
                <span className="manual-marker-sheet-hint">Arrastra el marcador donde aparecera el modelo</span>
                <span className="manual-marker-sheet-number">{pageNumber}</span>
              </div>
              <div className="hotspot-overlay">
                {hotspots.map((hotspot, index) => {
                  const size = getHotspotSize(hotspot);
                  const markerOption = hotspot.marker_asset_id
                    ? markerOptions.find((marker) => String(marker.id) === String(hotspot.marker_asset_id))
                    : null;
                  const scene = hotspot.ar_scene_id ? getSceneById(hotspot.ar_scene_id) : null;
                  const sceneModelUrl = scene ? getResourceUrl(getSceneAsset(scene)) : '';
                  const selected = String(selectedHotspotId) === String(hotspot.id);
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={hotspot.id}
                      className={`hotspot-square visual-editor-hotspot ${hotspot.ar_scene_id ? 'has-model' : 'no-model'} ${selected ? 'selected' : ''} ${dragMode ? 'is-editing' : ''}`}
                      style={{
                        left: `${Number(hotspot.x) * 100}%`,
                        top: `${Number(hotspot.y) * 100}%`,
                        width: `${size.width * 100}%`,
                        height: `${size.height * 100}%`,
                      }}
                      title={hotspot.label || `Marcador ${index + 1}`}
                      onClick={(event) => { event.stopPropagation(); setSelectedHotspotId(hotspot.id); }}
                      onKeyDown={(event) => { if (event.key === 'Enter') setSelectedHotspotId(hotspot.id); }}
                      onPointerDown={(event) => handleHotspotEditStart(event, hotspot, 'move')}
                      onDragOver={(event) => { if (draggingAsset?.type === 'model') event.preventDefault(); }}
                      onDrop={(event) => handleModelDropOnHotspot(event, hotspot)}
                    >
                      {hotspot.ar_scene_id ? (
                        sceneModelUrl ? (
                          <>
                            <Suspense fallback={<div className="marker-model-preview"><span className="marker-model-loader">Cargando…</span></div>}>
                              <MarkerModelPreview modelUrl={sceneModelUrl} selected={selected} />
                            </Suspense>
                            <span className="hotspot-model-tag">{getSceneLabel(scene)}</span>
                          </>
                        ) : (
                          <div className="hotspot-model-preview">
                            <span className="hotspot-model-cube">3D</span>
                            <strong>{scene ? getSceneLabel(scene) : 'Modelo asociado'}</strong>
                            <small>Modelo no disponible</small>
                          </div>
                        )
                      ) : (
                        <div className="hotspot-empty-preview">
                          {markerOption?.imageUrl ? <img src={markerOption.imageUrl} alt="" aria-hidden="true" /> : <span>{index + 1}</span>}
                          <small>Arrastra un modelo aqui</small>
                        </div>
                      )}
                      <button
                        type="button"
                        className="hotspot-delete-button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => { event.stopPropagation(); handleDeleteHotspot(hotspot.id); }}
                        aria-label="Eliminar marcador"
                        disabled={hotspotBusy}
                      >
                        x
                      </button>
                      <span
                        className="hotspot-resize-handle"
                        role="presentation"
                        onPointerDown={(event) => handleHotspotEditStart(event, hotspot, 'resize')}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {canEdit && (
          <aside className="document-asset-tray" aria-label="Bandeja de marcadores y modelos">
            <div className="asset-tray-tabs" role="tablist" aria-label="Recursos para asociar">
              <button type="button" className={activeAssetTab === 'markers' ? 'active' : ''} onClick={() => setActiveAssetTab('markers')}>Marcadores</button>
              <button type="button" className={activeAssetTab === 'models' ? 'active' : ''} onClick={() => setActiveAssetTab('models')}>Modelos 3D</button>
            </div>

            {activeAssetTab === 'markers' ? (
              <div className="asset-tray-section">
                <div className="asset-tray-heading">
                  <strong>Marcadores</strong>
                  {onGoToResources && <button type="button" onClick={onGoToResources}>+ Subir</button>}
                </div>
                <div className="asset-grid">
                  {markerOptions.map((markerOption) => (
                    <button
                      key={markerOption.id}
                      type="button"
                      className="asset-tile marker-tile"
                      draggable
                      onDragStart={(event) => handleAssetDragStart(event, 'marker', markerOption)}
                      onDragEnd={handleAssetDragEnd}
                      title="Arrastra este marcador a la pagina"
                    >
                      <span className="asset-thumb">
                        {markerOption.imageUrl ? <img src={markerOption.imageUrl} alt="" /> : <span>MK</span>}
                      </span>
                      <strong>{markerOption.label}</strong>
                      <small>Marcador</small>
                    </button>
                  ))}
                  {!markerOptions.length && (
                    <div className="asset-tray-empty">
                      <p>No hay marcadores visuales.</p>
                      {onGoToResources && <button type="button" onClick={onGoToResources}>Subir marcador</button>}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="asset-tray-section">
                <div className="asset-tray-heading">
                  <strong>Modelos 3D</strong>
                  {onGoToResources && <button type="button" onClick={onGoToResources}>+ Subir</button>}
                </div>
                <div className="asset-grid">
                  {arScenes.map((sceneOption) => {
                    const asset = getSceneAsset(sceneOption);
                    const assetUrl = getResourceUrl(asset);
                    return (
                      <button
                        key={sceneOption.id}
                        type="button"
                        className="asset-tile model-tile"
                        draggable
                        onDragStart={(event) => handleAssetDragStart(event, 'model', sceneOption)}
                        onDragEnd={handleAssetDragEnd}
                        title="Arrastra este modelo dentro de un marcador"
                      >
                        <span className="asset-thumb model-thumb">
                          {assetUrl ? (
                            <Suspense fallback={<span className="marker-model-loader">Cargando…</span>}>
                              <MarkerModelPreview modelUrl={assetUrl} autoRotate={false} />
                            </Suspense>
                          ) : (
                            <span>3D</span>
                          )}
                        </span>
                        <strong>{getSceneLabel(sceneOption)}</strong>
                        <small>{assetUrl ? 'GLB/GLTF' : 'modelo'}</small>
                      </button>
                    );
                  })}
                  {!arScenes.length && (
                    <div className="asset-tray-empty">
                      <p>No hay modelos 3D cargados.</p>
                      {onGoToResources && <button type="button" onClick={onGoToResources}>Subir modelo</button>}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="asset-tray-selected">
              <strong>Seleccion actual</strong>
              {selectedHotspot ? (
                <>
                  <span>Pagina {pageNumber}</span>
                  <span>{selectedHotspot.ar_scene_id ? `Modelo: ${getSceneLabel(getSceneById(selectedHotspot.ar_scene_id) || {})}` : 'Sin modelo 3D'}</span>
                  <div className="asset-tray-selected-actions">
                    {selectedHotspot.ar_scene_id && <button type="button" onClick={() => handleTestModel(selectedHotspot)}>Probar modelo</button>}
                    {selectedHotspot.ar_scene_id && <button type="button" onClick={() => handleRemoveScene(selectedHotspot.id)}>Quitar modelo</button>}
                    <button type="button" onClick={() => handleDeleteHotspot(selectedHotspot.id)}>Eliminar</button>
                  </div>
                </>
              ) : (
                <p>Arrastra un marcador a la hoja para empezar.</p>
              )}
            </div>
          </aside>
        )}
      </div>

      {modalScene && (
        <ArSceneModal
          scene={modalScene.scene}
          marker={modalScene.marker}
          pageNumber={modalScene.pageNumber}
          onClose={() => setModalScene(null)}
        />
      )}
    </div>
  );
}

export default ManualMarkerCanvas;
