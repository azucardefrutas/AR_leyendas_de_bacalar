import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import ArSceneModal from '../3d/ArSceneModal.jsx';

// Lazy-loaded so the heavy three.js / react-three bundle only loads when a placed
// marker actually has a 3D model to render inside the page.
const MarkerModelPreview = lazy(() => import('../3d/MarkerModelPreview.jsx'));
import {
  createLegendHotspot,
  deleteLegendHotspot,
  getDocumentRenderStatus,
  listLegendHotspots,
  listLegendScenes,
  startDocumentRender,
  updateLegendHotspot,
} from '../../services/backendApiService.js';
import { getLegendResources } from '../../services/assetService.js';

const DEFAULT_HOTSPOT_SIZE = 0.18;
const MIN_HOTSPOT_SIZE = 0.055;
const MAX_HOTSPOT_SIZE = 0.46;

const sceneStatusLabels = {
  draft: 'borrador',
  in_review: 'en revision',
  active: 'activa',
  inactive: 'inactiva',
  rejected: 'rechazada',
  published: 'publicada',
  approved: 'aprobada',
  archived: 'archivada',
};

function sceneStatusLabel(status) {
  return sceneStatusLabels[String(status || '').toLowerCase()] || status || 'sin estado';
}

function getSourceDocumentAsset(sourceDocument = {}) {
  return sourceDocument.assets || sourceDocument.asset || {};
}

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return 'Tamano no disponible';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPageCount(pageCount) {
  const pages = Number(pageCount);
  if (!Number.isInteger(pages) || pages <= 0) return '';
  return pages === 1 ? '1 pagina' : `${pages} paginas`;
}

function getStatusLabel(status) {
  const labels = {
    pending: 'pendiente de extraccion',
    extracted: 'extraido',
    failed: 'fallo de extraccion',
    manual_required: 'revision manual requerida',
    not_required: 'no requiere extraccion',
  };

  const normalized = String(status || '').toLowerCase();
  return labels[normalized] || normalized || 'estado no disponible';
}

function getDocumentTypeLabel({ sourceDocument, viewUrl }) {
  const asset = getSourceDocumentAsset(sourceDocument);
  return String(viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || 'documento').toUpperCase();
}

function isPdfDocument({ sourceDocument, viewUrl }) {
  const asset = getSourceDocumentAsset(sourceDocument);
  const documentType = String(viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || '').toLowerCase();
  const mimeType = String(viewUrl?.mimeType || asset.mime_type || '').toLowerCase();

  return documentType === 'pdf' || mimeType === 'application/pdf';
}

function isDocxDocument({ sourceDocument, viewUrl }) {
  const asset = getSourceDocumentAsset(sourceDocument);
  const documentType = String(viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || '').toLowerCase();
  const mimeType = String(viewUrl?.mimeType || asset.mime_type || '').toLowerCase();

  return documentType === 'docx' || mimeType.includes('wordprocessingml') || mimeType === 'application/msword';
}

function getRenderedPageNumber(page = {}) {
  return Number(page.pageNumber ?? page.page_number);
}

function getRenderedPageImageUrl(page = {}) {
  return page.imageUrl || page.image_url || page.signedUrl || page.url || '';
}

function getReadyRenderedPages(renderState) {
  return (renderState.pages ?? [])
    .map((page) => ({
      ...page,
      pageNumber: getRenderedPageNumber(page),
      imageUrl: getRenderedPageImageUrl(page),
    }))
    // Show any page that actually has a rendered image, regardless of the status
    // string the backend reports. If the signed URL later fails/expires, the <img>
    // onError shows a clear retry instead of hiding a page that has an image.
    .filter((page) => page.imageUrl && Number.isInteger(page.pageNumber) && page.pageNumber > 0)
    .sort((a, b) => Number(a.pageNumber) - Number(b.pageNumber));
}

function getKnownRenderedPages(renderState) {
  return (renderState.pages ?? [])
    .map((page) => ({
      ...page,
      pageNumber: getRenderedPageNumber(page),
      imageUrl: getRenderedPageImageUrl(page),
    }))
    .filter((page) => Number.isInteger(page.pageNumber) && page.pageNumber > 0)
    .sort((a, b) => Number(a.pageNumber) - Number(b.pageNumber));
}

function getRenderedPageTotal({ renderState, pageCount }) {
  const explicitTotals = [
    renderState.pageCount,
    renderState.count,
    pageCount,
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const maxKnownPage = Math.max(0, ...getKnownRenderedPages(renderState).map((page) => page.pageNumber));
  return Math.max(0, ...explicitTotals, maxKnownPage);
}

function normalizeSize(value, fallback = DEFAULT_HOTSPOT_SIZE) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(MAX_HOTSPOT_SIZE, Math.max(MIN_HOTSPOT_SIZE, number));
}

function getHotspotSize(hotspot) {
  return {
    width: normalizeSize(hotspot.width),
    height: normalizeSize(hotspot.height),
  };
}

function clampHotspotPosition({ x, y, width, height }) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return {
    x: Math.min(1 - halfWidth, Math.max(halfWidth, x)),
    y: Math.min(1 - halfHeight, Math.max(halfHeight, y)),
  };
}

function getHotspotSceneMarker(scene, arMarkers) {
  if (!scene) return null;
  return arMarkers.find((marker) => String(marker.ar_scene_id) === String(scene.id)) || null;
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

function SourceDocumentPreview({
  sourceDocument,
  viewUrl,
  viewLoading,
  viewError,
  disabled,
  hasInteractivePages,
  processing,
  processingMessage,
  onViewDocument,
  onConvertToInteractive,
  onAddManualPage,
  isOpen,
  onToggle,
  onRenderStateChange,
  onHotspotSummaryChange,
  onGoToResources,
}) {
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [hotspots, setHotspots] = useState([]);
  const [selectedPdfPage, setSelectedPdfPage] = useState(1);
  const [hotspotBusy, setHotspotBusy] = useState(false);
  const [hotspotError, setHotspotError] = useState('');
  const [arScenes, setArScenes] = useState([]);
  const [arMarkers, setArMarkers] = useState([]);
  const [modalScene, setModalScene] = useState(null);
  const [activeAssetTab, setActiveAssetTab] = useState('markers');
  const [draggingAsset, setDraggingAsset] = useState(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [dragMode, setDragMode] = useState('');
  const [pageImageError, setPageImageError] = useState('');
  const [hotspotMessage, setHotspotMessage] = useState('');
  const pageCanvasRef = useRef(null);
  const dragEditRef = useRef(null);
  const asset = getSourceDocumentAsset(sourceDocument);
  const signedUrl = viewUrl?.signedUrl || '';
  const storagePath = viewUrl?.storagePath || asset.storage_path || '';
  const mimeType = viewUrl?.mimeType || asset.mime_type || 'MIME no disponible';
  const fileSize = viewUrl?.fileSize || asset.file_size || sourceDocument.file_size;
  const formattedFileSize = formatFileSize(fileSize);
  const pageCount = viewUrl?.pageCount ?? sourceDocument.page_count ?? sourceDocument.pageCount;
  const pageCountLabel = formatPageCount(pageCount);
  const documentType = viewUrl?.documentType || sourceDocument.document_type || asset.asset_type || 'documento';
  const documentTypeLabel = getDocumentTypeLabel({ sourceDocument, viewUrl });
  const statusLabel = getStatusLabel(sourceDocument.extraction_status);
  const extractionStatus = String(sourceDocument.extraction_status || '').toLowerCase();
  const isPdf = isPdfDocument({ sourceDocument, viewUrl });
  const isDocx = isDocxDocument({ sourceDocument, viewUrl });
  const canConvert = !hasInteractivePages && ['pending', 'extracted'].includes(extractionStatus);
  const contentId = `source-document-panel-${sourceDocument?.id || 'current'}`;
  const filename = storagePath.split('/').pop() || 'Documento original';

  const legendId = sourceDocument?.legend_id || null;
  const [renderState, setRenderState] = useState({
    status: null,
    count: null,
    pageCount: null,
    pages: [],
    busy: false,
  });
  const knownRenderedPages = useMemo(() => getKnownRenderedPages(renderState), [renderState]);
  const renderedPages = useMemo(() => getReadyRenderedPages(renderState), [renderState]);
  const renderedPageTotal = useMemo(
    () => getRenderedPageTotal({ renderState, pageCount }),
    [renderState, pageCount],
  );
  const renderedPageOptions = useMemo(() => {
    if (renderedPageTotal > 0) {
      return Array.from({ length: renderedPageTotal }, (_, index) => index + 1);
    }
    return renderedPages.map((page) => Number(page.pageNumber)).filter((number) => Number.isInteger(number) && number > 0);
  }, [renderedPageTotal, renderedPages]);
  const selectedRenderedPage = renderedPages.find((page) => Number(page.pageNumber) === Number(selectedPdfPage)) || null;
  const selectedKnownPage = knownRenderedPages.find((page) => Number(page.pageNumber) === Number(selectedPdfPage)) || null;
  const usesRenderedPageSurface = Boolean(selectedRenderedPage?.imageUrl);
  const hasRenderedPageRecords = knownRenderedPages.length > 0 || renderedPageTotal > 0;
  const showPdfFallback = signedUrl && !hasRenderedPageRecords && renderState.status !== 'ready';
  const canEditHotspots = !disabled && isPdf && Boolean(legendId) && Boolean(sourceDocument?.id);
  const hotspotsForPage = hotspots.filter((hotspot) => Number(hotspot.source_page_number) === Number(selectedPdfPage));
  const selectedHotspot = hotspots.find((hotspot) => String(hotspot.id) === String(selectedHotspotId)) || null;
  const markerOptions = useMemo(() => arMarkers
    .map((marker) => ({
      id: getMarkerAssetId(marker),
      label: getMarkerLabel(marker),
      imageUrl: getResourceUrl(marker),
      marker,
    }))
    .filter((marker, index, list) => marker.id && list.findIndex((item) => String(item.id) === String(marker.id)) === index), [arMarkers]);

  const renderAutoTried = useRef(false);

  function applyRenderResult(result, busy = false) {
    const nextState = {
      status: result?.renderStatus ?? result?.render_status ?? 'not_rendered',
      count: result?.renderedPageCount ?? result?.rendered_page_count ?? (Array.isArray(result?.pages) ? result.pages.length : null),
      pageCount: result?.pageCount ?? result?.page_count ?? null,
      pages: Array.isArray(result?.pages) ? result.pages : [],
      busy,
    };
    setRenderState({
      ...nextState,
    });
    onRenderStateChange?.(nextState);
  }

  const triggerRender = useCallback(async (force) => {
    if (!sourceDocument?.id) return;
    setRenderState((prev) => ({ ...prev, busy: true }));
    try {
      const result = await startDocumentRender(sourceDocument.id, { force });
      applyRenderResult(result, false);
    } catch {
      setRenderState((prev) => ({ ...prev, status: 'failed', busy: false }));
    }
  }, [sourceDocument?.id]);

  const loadRenderStatus = useCallback(async () => {
    if (!sourceDocument?.id || !isPdf) return;
    try {
      const result = await getDocumentRenderStatus(sourceDocument.id);
      const status = result?.renderStatus ?? result?.render_status ?? 'not_rendered';
      applyRenderResult(result, false);
      // Best-effort: kick off the render once if the book was never prepared.
      if (!renderAutoTried.current && status === 'not_rendered') {
        renderAutoTried.current = true;
        triggerRender(false);
      }
    } catch {
      // Render status is best-effort; never break the preview.
    }
  }, [sourceDocument?.id, isPdf, triggerRender]);

  const loadHotspots = useCallback(async () => {
    if (!legendId || !sourceDocument?.id) return;
    try {
      const response = await listLegendHotspots(legendId, {
        targetType: 'source_document',
        sourceDocumentId: sourceDocument.id,
      });
      const nextHotspots = response?.hotspots ?? [];
      setHotspots(nextHotspots);
      onHotspotSummaryChange?.({
        total: nextHotspots.length,
        associated: nextHotspots.filter((hotspot) => Boolean(hotspot.ar_scene_id)).length,
        items: nextHotspots.map((hotspot) => ({
          id: hotspot.id,
          label: hotspot.label,
          pageNumber: hotspot.source_page_number,
          arSceneId: hotspot.ar_scene_id,
          markerAssetId: hotspot.marker_asset_id,
          status: hotspot.status,
        })),
      });
    } catch (loadError) {
      // Best-effort: hotspots are optional and must not break the preview.
      if (import.meta.env.DEV) console.error('load hotspots error', loadError);
    }
  }, [legendId, sourceDocument?.id, onHotspotSummaryChange]);

  const loadScenes = useCallback(async () => {
    if (!legendId) return;
    try {
      const [resources, sceneResponse] = await Promise.all([
        getLegendResources(legendId),
        listLegendScenes(legendId).catch(() => ({ scenes: [] })),
      ]);
      // Scenes come from the backend (service role) so models tied to a rendered PDF
      // page (page_id null) are visible; the anon RLS list hides those. Fall back to
      // the anon list only if the backend returned nothing.
      const backendScenes = sceneResponse?.scenes ?? [];
      const scenes = backendScenes.length ? backendScenes : (resources.data?.arScenes ?? []);
      setArScenes(scenes.filter(
        (scene) => String(scene.status || '').toLowerCase() !== 'archived',
      ));
      setArMarkers(resources.data?.arMarkers ?? []);
    } catch (sceneError) {
      // Best-effort: 3D scenes are optional and must not break the preview.
      if (import.meta.env.DEV) console.error('load scenes error', sceneError);
    }
  }, [legendId]);

  useEffect(() => {
    renderAutoTried.current = false;
    loadRenderStatus();
  }, [loadRenderStatus]);

  useEffect(() => {
    setPreviewExpanded(false);
    setSelectedPdfPage(1);
    setHotspotError('');
    setHotspotMessage('');
    setHotspots([]);
    setSelectedHotspotId(null);
    setModalScene(null);
  }, [sourceDocument?.id]);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  useEffect(() => {
    if (!renderedPageOptions.length) return;
    if (!renderedPageOptions.includes(Number(selectedPdfPage))) {
      setSelectedPdfPage(renderedPageOptions[0]);
    }
  }, [renderedPageOptions, selectedPdfPage]);

  useEffect(() => {
    setPageImageError('');
    setHotspotMessage('');
  }, [selectedRenderedPage?.imageUrl]);

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
    event.dataTransfer.setData('application/x-leyendas-asset', JSON.stringify({
      type: assetType,
      id: assetPayload?.id || '',
    }));
    setDraggingAsset({ type: assetType, payload: assetPayload });
  }

  function handleAssetDragEnd() {
    setDraggingAsset(null);
  }

  async function handlePageDrop(event) {
    event.preventDefault();
    if (hotspotBusy || !canEditHotspots || draggingAsset?.type !== 'marker') return;
    const dropPoint = getDropPoint(event);
    if (!dropPoint) return;
    const width = DEFAULT_HOTSPOT_SIZE;
    const height = Math.min(0.24, DEFAULT_HOTSPOT_SIZE * 0.78);
    const position = clampHotspotPosition({
      x: dropPoint.x,
      y: dropPoint.y,
      width,
      height,
    });

    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      const response = await createLegendHotspot(legendId, {
        target_type: 'source_document',
        source_document_id: sourceDocument.id,
        source_page_number: Number(selectedPdfPage),
        hotspot_type: 'marker',
        label: draggingAsset.payload?.label || `Marcador pagina ${selectedPdfPage}`,
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
    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      await updateLegendHotspot(legendId, hotspot.id, {
        ar_scene_id: draggingAsset.payload.id,
        marker_asset_id: hotspot.marker_asset_id || null,
      });
      setSelectedHotspotId(hotspot.id);
      await loadHotspots();
      await loadScenes();
      setHotspotMessage('Modelo asociado al marcador.');
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
    if (hotspotBusy || !canEditHotspots) return;
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
      initial: {
        x: Number(hotspot.x),
        y: Number(hotspot.y),
        width: size.width,
        height: size.height,
      },
      rect,
      latest: {
        x: Number(hotspot.x),
        y: Number(hotspot.y),
        width: size.width,
        height: size.height,
      },
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
      const position = clampHotspotPosition({
        x: state.initial.x,
        y: state.initial.y,
        width,
        height,
      });
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
    } catch (deleteError) {
      setHotspotError('No se pudo eliminar el marcador.');
    } finally {
      setHotspotBusy(false);
    }
  }

  const getSceneById = (sceneId) => arScenes.find((scene) => String(scene.id) === String(sceneId)) || null;
  const getMarkerForScene = (scene) => getHotspotSceneMarker(scene, arMarkers);

  async function handleRemoveScene(hotspotId) {
    if (hotspotBusy) return;
    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      await updateLegendHotspot(legendId, hotspotId, { ar_scene_id: null, marker_asset_id: null });
      await loadHotspots();
    } catch (removeError) {
      setHotspotError('No se pudo quitar el modelo 3D.');
    } finally {
      setHotspotBusy(false);
    }
  }

  function handleMarkerClick(hotspot) {
    const scene = hotspot.ar_scene_id ? getSceneById(hotspot.ar_scene_id) : null;
    if (scene) {
      const explicitMarker = hotspot.marker_asset_id
        ? arMarkers.find((marker) => String(getMarkerAssetId(marker)) === String(hotspot.marker_asset_id))
        : null;
      setModalScene({ scene, marker: explicitMarker || getMarkerForScene(scene), pageNumber: hotspot.source_page_number });
    } else {
      setSelectedHotspotId(hotspot.id);
      setHotspotMessage('Este marcador todavia no tiene modelo asociado. Selecciona un modelo para activarlo.');
    }
  }

  return (
    <section className="creator-section-block source-document-preview">
      <button
        type="button"
        className="creator-accordion-header source-document-header"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="creator-accordion-icon">DOC</span>
        <div className="creator-accordion-copy">
          <h2>Documento original</h2>
          <p>El archivo cargado se conserva como fuente principal de esta obra.</p>
        </div>
        <span className="creator-accordion-badges">
          <span className="creator-accordion-badge">{documentTypeLabel}</span>
          <span className="creator-accordion-badge">{statusLabel}</span>
          {pageCountLabel && <span className="creator-accordion-badge">{pageCountLabel}</span>}
          <span className="creator-accordion-badge">{formattedFileSize}</span>
        </span>
        <span className={`creator-accordion-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">&rsaquo;</span>
      </button>

      <div id={contentId} className={`creator-accordion-panel source-document-panel ${isOpen ? 'open' : 'closed'}`}>
        {viewError && <p className="error-message">{viewError}</p>}
        {processingMessage && <p className="creator-muted">{processingMessage}</p>}

        <div className="source-document-primary-actions">
          <Button type="button" onClick={onViewDocument} disabled={disabled || viewLoading}>
            {viewLoading ? 'Preparando preview...' : 'Ver preview'}
          </Button>
          {signedUrl ? (
            <a className="btn btn-ghost" href={signedUrl} target="_blank" rel="noreferrer">
              Abrir completo
            </a>
          ) : (
            <Button type="button" variant="ghost" disabled>
              Abrir completo
            </Button>
          )}
        </div>

        {isPdf && (
          <div className="source-document-render">
            <span className="source-document-render-label">Libro CONALITEG</span>
            {renderState.busy || ['processing', 'rendering'].includes(renderState.status) ? (
              <span className="creator-muted">Preparando libro...</span>
            ) : renderState.status === 'ready' ? (
              <span className="source-document-render-ready">
                Libro preparado{renderState.count ? `: ${renderState.count} paginas` : ''}
              </span>
            ) : renderState.status === 'failed' ? (
              <>
                <span className="error-message">Error al preparar paginas.</span>
                <Button type="button" variant="ghost" onClick={() => triggerRender(true)} disabled={disabled}>
                  Reintentar preparacion
                </Button>
              </>
            ) : (
              <Button type="button" variant="ghost" onClick={() => triggerRender(false)} disabled={disabled}>
                Preparar libro
              </Button>
            )}
          </div>
        )}

        {isOpen && isPdf && (signedUrl || hasRenderedPageRecords) && (
          <div className="source-document-viewer">
            <div className="document-book-editor-topbar">
              <div className="document-page-nav" aria-label="Navegacion de paginas renderizadas">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setSelectedPdfPage((current) => Math.max(1, Number(current) - 1)); setSelectedHotspotId(null); }}
                  disabled={hotspotBusy || Number(selectedPdfPage) <= 1}
                >
                  Anterior
                </Button>
                <label>
                  <span>Pagina</span>
                  <select
                    value={selectedPdfPage}
                    onChange={(event) => { setSelectedPdfPage(Number(event.target.value)); setSelectedHotspotId(null); }}
                    disabled={hotspotBusy || !renderedPageOptions.length}
                  >
                    {(renderedPageOptions.length ? renderedPageOptions : [selectedPdfPage]).map((number) => (
                      <option key={number} value={number}>{number}</option>
                    ))}
                  </select>
                </label>
                <span>{renderedPageOptions.length ? `de ${renderedPageOptions.length}` : ''}</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setSelectedPdfPage((current) => Math.min(renderedPageOptions.length || Number(current), Number(current) + 1)); setSelectedHotspotId(null); }}
                  disabled={hotspotBusy || !renderedPageOptions.length || Number(selectedPdfPage) >= renderedPageOptions.length}
                >
                  Siguiente
                </Button>
              </div>
              <details className="document-book-actions-menu">
                <summary>Mas acciones</summary>
                <div>
                  <button type="button" onClick={loadRenderStatus} disabled={renderState.busy}>Actualizar paginas</button>
                  <button type="button" onClick={() => setPreviewExpanded(true)}>Pantalla completa</button>
                  {signedUrl && <a href={signedUrl} target="_blank" rel="noreferrer">Abrir completo</a>}
                </div>
              </details>
            </div>

            {hotspotError && <p className="error-message">{hotspotError}</p>}
            {hotspotMessage && <p className="success-message hotspot-success-message">{hotspotMessage}</p>}
            {pageImageError && (
              <p className="error-message">
                {pageImageError}{' '}
                <button type="button" className="inline-link-button" onClick={loadRenderStatus}>
                  Reintentar
                </button>
              </p>
            )}

            <div className={`document-book-editor ${draggingAsset ? `dragging-${draggingAsset.type}` : ''}`}>
              <div className="document-book-stage">
                <div className={`source-document-frame-wrap ${draggingAsset?.type === 'marker' ? 'placing' : ''}`}>
                  {usesRenderedPageSurface ? (
                    <div
                      ref={pageCanvasRef}
                      className="source-document-rendered-page"
                      style={selectedRenderedPage?.width && selectedRenderedPage?.height
                        ? { aspectRatio: `${selectedRenderedPage.width} / ${selectedRenderedPage.height}` }
                        : null}
                      onDragOver={(event) => { if (draggingAsset?.type === 'marker') event.preventDefault(); }}
                      onDrop={handlePageDrop}
                    >
                      <img
                        src={selectedRenderedPage.imageUrl}
                        alt={`Pagina renderizada ${selectedPdfPage}`}
                        draggable={false}
                        onError={() => setPageImageError('No se pudo cargar la imagen renderizada. La URL puede haber vencido.')}
                      />
                      <div className="hotspot-overlay">
                        {hotspotsForPage.map((hotspot, index) => {
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
                                    <Suspense
                                      fallback={(
                                        <div className="marker-model-preview">
                                          <span className="marker-model-loader">Cargando…</span>
                                        </div>
                                      )}
                                    >
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
                  ) : (
                    showPdfFallback ? (
                      <iframe
                        className="source-document-preview-frame"
                        title="Vista previa del documento original"
                        src={signedUrl}
                      />
                    ) : (
                      <div className="source-document-preview-frame source-document-preview-placeholder">
                        <strong>Pagina renderizada no disponible</strong>
                        <span>
                          {selectedKnownPage
                            ? 'La imagen de esta pagina no esta lista o la URL firmada vencio.'
                            : 'Actualiza el estado del libro para cargar las paginas renderizadas.'}
                        </span>
                        <Button type="button" variant="ghost" onClick={loadRenderStatus} disabled={renderState.busy}>
                          Reintentar
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {canEditHotspots && (
                <aside className="document-asset-tray" aria-label="Bandeja de marcadores y modelos">
                  <div className="asset-tray-tabs" role="tablist" aria-label="Recursos para asociar">
                    <button
                      type="button"
                      className={activeAssetTab === 'markers' ? 'active' : ''}
                      onClick={() => setActiveAssetTab('markers')}
                    >
                      Marcadores
                    </button>
                    <button
                      type="button"
                      className={activeAssetTab === 'models' ? 'active' : ''}
                      onClick={() => setActiveAssetTab('models')}
                    >
                      Modelos 3D
                    </button>
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
                              onClick={() => setModalScene({ scene: sceneOption, marker: getMarkerForScene(sceneOption), pageNumber: selectedPdfPage })}
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
                              <small>{assetUrl ? 'GLB/GLTF' : sceneStatusLabel(sceneOption.status)}</small>
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
                        <span>Pagina {selectedHotspot.source_page_number}</span>
                        <span>{selectedHotspot.ar_scene_id ? `Modelo: ${getSceneLabel(getSceneById(selectedHotspot.ar_scene_id) || {})}` : 'Sin modelo 3D'}</span>
                        <div className="asset-tray-selected-actions">
                          {selectedHotspot.ar_scene_id && (
                            <button type="button" onClick={() => handleMarkerClick(selectedHotspot)}>Probar modelo</button>
                          )}
                          {selectedHotspot.ar_scene_id && (
                            <button type="button" onClick={() => handleRemoveScene(selectedHotspot.id)}>Quitar modelo</button>
                          )}
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
          </div>
        )}

        {isOpen && signedUrl && isDocx && (
          <p className="creator-muted">
            Vista previa DOCX pendiente. Puedes abrir o descargar el documento con la URL firmada.
          </p>
        )}

        {hasInteractivePages && (
          <p className="creator-muted">Texto extraido disponible abajo como apoyo editorial.</p>
        )}

        <p className="creator-muted source-document-current-note">
          Selecciona una pagina renderizada del libro y coloca el marcador donde aparecera el modelo.
        </p>

        <details className="source-document-advanced">
          <summary>Texto extraido / apoyo editorial</summary>
          <div className="source-document-advanced-body">
            {canConvert && (
              <Button type="button" variant="ghost" onClick={onConvertToInteractive} disabled={disabled || processing}>
                {processing ? (processingMessage || 'Procesando documento...') : 'Generar paginas editoriales desde texto'}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onAddManualPage} disabled={disabled || processing}>
              Anadir pagina manualmente
            </Button>
            <details className="source-document-technical">
              <summary>Detalles tecnicos</summary>
              <dl>
                <div>
                  <dt>Estado</dt>
                  <dd>{statusLabel}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{documentType}</dd>
                </div>
                <div>
                  <dt>Tamano</dt>
                  <dd>{formattedFileSize}</dd>
                </div>
                <div>
                  <dt>Paginas detectadas</dt>
                  <dd>{pageCountLabel || 'No disponible'}</dd>
                </div>
                <div>
                  <dt>MIME</dt>
                  <dd>{mimeType}</dd>
                </div>
                <div>
                  <dt>Source document ID</dt>
                  <dd>{sourceDocument.id || 'No disponible'}</dd>
                </div>
                <div>
                  <dt>Asset ID</dt>
                  <dd>{asset.id || sourceDocument.asset_id || 'No disponible'}</dd>
                </div>
                {storagePath && (
                  <div>
                    <dt>Ruta Storage</dt>
                    <dd>{storagePath}</dd>
                  </div>
                )}
              </dl>
            </details>
          </div>
        </details>
      </div>

      {previewExpanded && isPdf && (signedUrl || usesRenderedPageSurface) && (
        <div className="source-document-modal" role="dialog" aria-modal="true" aria-label="Preview del documento original">
          <div className="source-document-modal-panel">
            <div className="source-document-modal-header">
              <div>
                <h3>{filename}</h3>
                <p>{documentTypeLabel} &middot; {statusLabel}</p>
              </div>
              <div className="source-document-modal-actions">
                <a className="btn btn-ghost" href={signedUrl} target="_blank" rel="noreferrer">
                  Abrir completo
                </a>
                <Button type="button" variant="ghost" onClick={() => setPreviewExpanded(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
            {usesRenderedPageSurface ? (
              <div className="source-document-modal-rendered-page">
                <img src={selectedRenderedPage.imageUrl} alt={`Pagina renderizada ${selectedPdfPage}`} />
              </div>
            ) : (
              <iframe
                className="source-document-modal-frame"
                title="Preview ampliado del documento original"
                src={signedUrl}
              />
            )}
          </div>
        </div>
      )}

      {modalScene && (
        <ArSceneModal
          scene={modalScene.scene}
          marker={modalScene.marker}
          pageNumber={modalScene.pageNumber}
          onClose={() => setModalScene(null)}
        />
      )}
    </section>
  );
}

export default SourceDocumentPreview;
