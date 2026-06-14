import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import ArSceneModal from '../3d/ArSceneModal.jsx';
import {
  createLegendHotspot,
  deleteLegendHotspot,
  getDocumentRenderStatus,
  listLegendHotspots,
  startDocumentRender,
  updateLegendHotspot,
} from '../../services/backendApiService.js';
import { getLegendResources } from '../../services/assetService.js';

const DEFAULT_HOTSPOT_SIZE = 0.085;
const MIN_HOTSPOT_SIZE = 0.04;
const MAX_HOTSPOT_SIZE = 0.2;

const sceneStatusLabels = {
  draft: 'borrador',
  in_review: 'en revision',
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
    .filter((page) => page.status === 'ready' && page.imageUrl)
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
  const [placingHotspot, setPlacingHotspot] = useState(false);
  const [hotspotBusy, setHotspotBusy] = useState(false);
  const [hotspotError, setHotspotError] = useState('');
  const [arScenes, setArScenes] = useState([]);
  const [arMarkers, setArMarkers] = useState([]);
  const [associatingHotspotId, setAssociatingHotspotId] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [selectedMarkerAssetId, setSelectedMarkerAssetId] = useState('');
  const [modalScene, setModalScene] = useState(null);
  const [hotspotSize, setHotspotSize] = useState(DEFAULT_HOTSPOT_SIZE);
  const [pageImageError, setPageImageError] = useState('');
  const [hotspotMessage, setHotspotMessage] = useState('');
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
  const markerOptions = arMarkers
    .map((marker) => ({
      id: getMarkerAssetId(marker),
      label: getMarkerLabel(marker),
      imageUrl: getResourceUrl(marker),
      marker,
    }))
    .filter((marker, index, list) => marker.id && list.findIndex((item) => String(item.id) === String(marker.id)) === index);

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
      const resources = await getLegendResources(legendId);
      setArScenes((resources.data?.arScenes ?? []).filter(
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
    setPlacingHotspot(false);
    setSelectedPdfPage(1);
    setHotspotError('');
    setHotspotMessage('');
    setHotspots([]);
    setAssociatingHotspotId(null);
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

  async function handlePlaceHotspot(event) {
    if (!placingHotspot || hotspotBusy || !canEditHotspots) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const size = normalizeSize(hotspotSize);
    const edge = size / 2;
    const x = Math.min(1 - edge, Math.max(edge, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1 - edge, Math.max(edge, (event.clientY - rect.top) / rect.height));

    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      const response = await createLegendHotspot(legendId, {
        target_type: 'source_document',
        source_document_id: sourceDocument.id,
        source_page_number: Number(selectedPdfPage),
        hotspot_type: 'marker',
        label: `Marcador pagina ${selectedPdfPage}`,
        x,
        y,
        width: size,
        height: size,
      });
      const createdHotspot = response?.hotspot || response?.data || response;
      setPlacingHotspot(false);
      setHotspotMessage('Marcador colocado. Selecciona un modelo para activarlo.');
      await loadHotspots();
      if (createdHotspot?.id) {
        openAssociatePanel(createdHotspot);
      }
    } catch (createError) {
      setHotspotError('No se pudo crear el marcador.');
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

  function openAssociatePanel(hotspot) {
    setAssociatingHotspotId(hotspot.id);
    setSelectedSceneId(hotspot.ar_scene_id ? String(hotspot.ar_scene_id) : (arScenes[0]?.id ? String(arScenes[0].id) : ''));
    setSelectedMarkerAssetId(hotspot.marker_asset_id ? String(hotspot.marker_asset_id) : '');
    setHotspotError('');
  }

  async function handleAssociateScene(hotspotId) {
    if (!selectedSceneId || hotspotBusy) return;
    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      await updateLegendHotspot(legendId, hotspotId, {
        ar_scene_id: selectedSceneId,
        marker_asset_id: selectedMarkerAssetId || null,
      });
      setAssociatingHotspotId(null);
      await loadHotspots();
      await loadScenes();
      setHotspotMessage('Asociacion guardada.');
    } catch (associateError) {
      setHotspotError('No se pudo asociar el modelo 3D.');
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
      openAssociatePanel(hotspot);
      setHotspotMessage('Este marcador todavia no tiene modelo asociado. Selecciona un modelo para activarlo.');
    }
  }

  async function handleResizeHotspot(hotspot, nextSize) {
    if (!legendId || hotspotBusy) return;
    const size = normalizeSize(nextSize);
    setHotspotBusy(true);
    setHotspotError('');
    setHotspotMessage('');
    try {
      await updateLegendHotspot(legendId, hotspot.id, { width: size, height: size });
      await loadHotspots();
    } catch {
      setHotspotError('No se pudo actualizar el tamano del marcador.');
    } finally {
      setHotspotBusy(false);
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
            <div className="source-document-viewer-toolbar">
              <span>Pagina renderizada del libro</span>
              <div>
                <Button type="button" variant="ghost" onClick={loadRenderStatus} disabled={renderState.busy}>
                  Actualizar paginas
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPreviewExpanded(true)}>
                  Pantalla completa
                </Button>
                <a className="btn btn-ghost" href={signedUrl} target="_blank" rel="noreferrer">
                  Abrir completo
                </a>
              </div>
            </div>

            {canEditHotspots && (
              <div className="hotspot-toolbar">
                <label className="hotspot-page-select">
                  <span>Pagina renderizada</span>
                  <select
                    value={selectedPdfPage}
                    onChange={(event) => { setSelectedPdfPage(Number(event.target.value)); setPlacingHotspot(false); }}
                    disabled={hotspotBusy || !renderedPageOptions.length}
                  >
                    {(renderedPageOptions.length ? renderedPageOptions : [selectedPdfPage]).map((number) => (
                      <option key={number} value={number}>Pagina {number}</option>
                    ))}
                  </select>
                </label>
                <div className="hotspot-page-controls" aria-label="Navegacion de paginas renderizadas">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setSelectedPdfPage((current) => Math.max(1, Number(current) - 1)); setPlacingHotspot(false); }}
                    disabled={hotspotBusy || Number(selectedPdfPage) <= 1}
                  >
                    Anterior
                  </Button>
                  <span>Pagina {selectedPdfPage}{renderedPageOptions.length ? ` de ${renderedPageOptions.length}` : ''}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setSelectedPdfPage((current) => Math.min(renderedPageOptions.length || Number(current), Number(current) + 1)); setPlacingHotspot(false); }}
                    disabled={hotspotBusy || !renderedPageOptions.length || Number(selectedPdfPage) >= renderedPageOptions.length}
                  >
                    Siguiente
                  </Button>
                </div>
                <Button
                  type="button"
                  variant={placingHotspot ? '' : 'ghost'}
                  onClick={() => setPlacingHotspot((current) => !current)}
                  disabled={hotspotBusy || !usesRenderedPageSurface}
                >
                  {placingHotspot ? 'Cancelar' : 'Agregar marcador'}
                </Button>
                <label className="hotspot-size-control" htmlFor="hotspot-size">
                  <span>Tamano</span>
                  <input
                    id="hotspot-size"
                    type="range"
                    min={MIN_HOTSPOT_SIZE}
                    max={MAX_HOTSPOT_SIZE}
                    step="0.01"
                    value={hotspotSize}
                    onChange={(event) => setHotspotSize(Number(event.target.value))}
                    disabled={hotspotBusy}
                  />
                </label>
                <span className="hotspot-hint">
                  {usesRenderedPageSurface
                    ? (placingHotspot
                      ? 'Haz clic sobre la pagina renderizada para colocar un marcador pequeno.'
                      : `${hotspotsForPage.length} marcador(es) en pagina ${selectedPdfPage}`)
                    : 'Prepara o actualiza el libro para usar la pagina renderizada real.'}
                </span>
              </div>
            )}

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

            <div className={`source-document-frame-wrap ${placingHotspot ? 'placing' : ''}`}>
              {usesRenderedPageSurface ? (
                <div
                  className="source-document-rendered-page"
                  style={selectedRenderedPage?.width && selectedRenderedPage?.height
                    ? { aspectRatio: `${selectedRenderedPage.width} / ${selectedRenderedPage.height}` }
                    : null}
                >
                  <img
                    src={selectedRenderedPage.imageUrl}
                    alt={`Pagina renderizada ${selectedPdfPage}`}
                    draggable={false}
                    onError={() => setPageImageError('No se pudo cargar la imagen renderizada. La URL puede haber vencido.')}
                  />
                  <div
                    className="hotspot-overlay"
                    style={{ pointerEvents: placingHotspot ? 'auto' : 'none' }}
                    onClick={handlePlaceHotspot}
                  >
                    {hotspotsForPage.map((hotspot, index) => {
                      const size = getHotspotSize(hotspot);
                      const markerOption = hotspot.marker_asset_id
                        ? markerOptions.find((marker) => String(marker.id) === String(hotspot.marker_asset_id))
                        : null;
                      return (
                        <button
                          type="button"
                          key={hotspot.id}
                          className={`hotspot-square ${hotspot.ar_scene_id ? 'has-model' : 'no-model'}`}
                          style={{
                            left: `${Number(hotspot.x) * 100}%`,
                            top: `${Number(hotspot.y) * 100}%`,
                            width: `${size.width * 100}%`,
                            height: `${size.height * 100}%`,
                            pointerEvents: placingHotspot ? 'none' : 'auto',
                          }}
                          title={hotspot.label || `Marcador ${index + 1} (${hotspot.ar_scene_id ? 'con modelo 3D' : 'sin modelo 3D'})`}
                          onClick={(event) => { event.stopPropagation(); handleMarkerClick(hotspot); }}
                        >
                          {markerOption?.imageUrl ? (
                            <img src={markerOption.imageUrl} alt="" aria-hidden="true" />
                          ) : (
                            <span>{hotspot.ar_scene_id ? '3D' : index + 1}</span>
                          )}
                        </button>
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

            {canEditHotspots && hotspotsForPage.length > 0 && (
              <ul className="hotspot-list">
                {hotspotsForPage.map((hotspot, index) => {
                  const scene = hotspot.ar_scene_id ? getSceneById(hotspot.ar_scene_id) : null;
                  const hasScene = Boolean(hotspot.ar_scene_id);
                  const isAssociating = associatingHotspotId === hotspot.id;
                  return (
                    <li key={hotspot.id} className={hasScene ? 'has-model' : 'no-model'}>
                      <div className="hotspot-list-row">
                        <span className="hotspot-list-info">
                          <strong>{hotspot.label || `Marcador ${index + 1}`}</strong>
                          <small>
                            Pagina {hotspot.source_page_number} - marcador colocado
                            {hasScene ? ' - listo para probar' : ' - falta asociar modelo'}
                          </small>
                        </span>
                        <span className={`hotspot-model-badge ${hasScene ? 'on' : 'off'}`}>
                          {hasScene ? `Modelo: ${scene?.name || 'asociado'}` : 'Sin modelo 3D'}
                        </span>
                      </div>
                      <div className="hotspot-list-actions">
                        <Button type="button" variant="ghost" onClick={() => openAssociatePanel(hotspot)} disabled={hotspotBusy}>
                          {hasScene ? 'Cambiar modelo' : 'Asociar modelo'}
                        </Button>
                        {hasScene && (
                          <Button type="button" variant="ghost" onClick={() => handleMarkerClick(hotspot)} disabled={hotspotBusy}>
                            Probar modelo
                          </Button>
                        )}
                        {hasScene && (
                          <Button type="button" variant="ghost" onClick={() => handleRemoveScene(hotspot.id)} disabled={hotspotBusy}>
                            Quitar modelo
                          </Button>
                        )}
                        <Button type="button" variant="ghost" onClick={() => handleDeleteHotspot(hotspot.id)} disabled={hotspotBusy}>
                          Eliminar
                        </Button>
                      </div>
                      <label className="hotspot-inline-size" htmlFor={`hotspot-size-${hotspot.id}`}>
                        <span>Tamano del cuadro</span>
                        <input
                          id={`hotspot-size-${hotspot.id}`}
                          type="range"
                          min={MIN_HOTSPOT_SIZE}
                          max={MAX_HOTSPOT_SIZE}
                          step="0.01"
                          value={normalizeSize(hotspot.width)}
                          onChange={(event) => handleResizeHotspot(hotspot, Number(event.target.value))}
                          disabled={hotspotBusy}
                        />
                      </label>
                      {isAssociating && (
                        <div className="hotspot-associate-panel">
                          {arScenes.length === 0 ? (
                            <div className="hotspot-association-empty">
                              <p className="creator-muted">
                                No hay modelos 3D cargados. Sube uno en Modelos y marcadores.
                              </p>
                              {onGoToResources && (
                                <Button type="button" variant="ghost" onClick={onGoToResources}>
                                  Ir a Modelos y marcadores
                                </Button>
                              )}
                            </div>
                          ) : (
                            <>
                              <label className="hotspot-scene-select">
                                <span>Modelo asociado</span>
                                <select
                                  value={selectedSceneId}
                                  onChange={(event) => setSelectedSceneId(event.target.value)}
                                  disabled={hotspotBusy}
                                >
                                  {arScenes.map((sceneOption) => (
                                    <option key={sceneOption.id} value={sceneOption.id}>
                                      {(sceneOption.name || 'Escena 3D')} ({sceneStatusLabel(sceneOption.status)})
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="hotspot-scene-select">
                                <span>Imagen marcador</span>
                                <select
                                  value={selectedMarkerAssetId}
                                  onChange={(event) => setSelectedMarkerAssetId(event.target.value)}
                                  disabled={hotspotBusy}
                                >
                                  <option value="">Sin imagen por ahora</option>
                                  {markerOptions.map((markerOption) => (
                                    <option key={markerOption.id} value={markerOption.id}>
                                      {markerOption.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="hotspot-associate-actions">
                                <Button type="button" onClick={() => handleAssociateScene(hotspot.id)} disabled={hotspotBusy || !selectedSceneId}>
                                  Guardar asociacion
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setAssociatingHotspotId(null)} disabled={hotspotBusy}>
                                  Cancelar
                                </Button>
                              </div>
                              {!markerOptions.length && (
                                <p className="creator-muted hotspot-soft-warning">
                                  Puedes asociar una imagen de marcador despues.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <details className="hotspot-technical-details">
                        <summary>Detalles tecnicos</summary>
                        <span>x {(hotspot.x * 100).toFixed(0)}%</span>
                        <span>y {(hotspot.y * 100).toFixed(0)}%</span>
                        <span>w {(normalizeSize(hotspot.width) * 100).toFixed(0)}%</span>
                        <span>h {(normalizeSize(hotspot.height) * 100).toFixed(0)}%</span>
                        <span>{hotspot.status}</span>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
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
