import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import SourceDocumentPreview from './SourceDocumentPreview.jsx';
import {
  canEditVersion,
  deleteLegendPage,
  getAvailableGenres,
  getLegendDisplayStatus,
  getLegendEditorData,
  saveLegendPages,
  submitLegendForReview,
  updateLegendGeneralData,
  validateReadyForReview,
} from '../../services/creatorLegendService.js';
import {
  createArMarker,
  saveLegendResource,
} from '../../services/assetService.js';
import {
  generatePagesFromDocument,
  getSourceDocumentViewUrl,
  startDocumentExtraction,
} from '../../services/backendApiService.js';
import ArSceneModal from '../3d/ArSceneModal.jsx';

const tabs = [
  { key: 'general', label: 'Datos de historia', icon: 'contract_edit' },
  { key: 'resources', label: 'Portada / banner', icon: 'photo_library' },
  { key: 'content', label: 'Documento / libro', icon: 'article' },
  { key: 'ar', label: 'Modelos y marcadores', icon: 'view_in_ar' },
  { key: 'declarations', label: 'Declaraciones', icon: 'gavel' },
  { key: 'review', label: 'Revision', icon: 'task_alt' },
];

const accessTypeOptions = [
  { value: 'free', label: 'Gratis' },
  { value: 'paid', label: 'Compra' },
  { value: 'subscription', label: 'Suscripcion' },
  { value: 'code_required', label: 'Codigo fisico' },
  { value: 'mixed', label: 'Mixto' },
];

const ageRatings = ['general', '7+', '12+', '16+'];

const resourceDefinitions = [
  {
    key: 'cover',
    tab: 'resources',
    title: 'Portada',
    description: 'Imagen vertical para catalogo y detalle de leyenda.',
    recommendation: 'Recomendado: vertical tipo poster (2:3), buena resolucion.',
    assetType: 'cover',
    mediaType: 'cover',
    kind: 'media',
    accept: '.png,.jpg,.jpeg,.webp',
  },
  {
    key: 'banner',
    tab: 'resources',
    title: 'Banner',
    description: 'Imagen horizontal para el fondo del detalle.',
    recommendation: 'Recomendado: horizontal panoramico (16:9 o mas ancho).',
    assetType: 'banner',
    mediaType: 'banner',
    kind: 'media',
    accept: '.png,.jpg,.jpeg,.webp',
  },
  {
    key: 'model3d',
    tab: 'ar',
    title: 'Modelo 3D',
    description: 'Archivo GLB/GLTF que se mostrara al tocar un marcador.',
    recommendation: 'Recomendado: GLB/GLTF optimizado (pocos MB).',
    assetType: 'model_3d',
    kind: 'ar_model',
    accept: '.glb,.gltf',
  },
  {
    key: 'marker',
    tab: 'ar',
    title: 'Marcador AR',
    description: 'Imagen opcional que puede mostrarse encima de la pagina como marcador visual.',
    recommendation: 'Recomendado: imagen nitida con buen contraste.',
    assetType: 'marker_image',
    kind: 'ar_marker',
    accept: '.png,.jpg,.jpeg,.webp',
  },
];

function createPage(pageNumber = 1) {
  return {
    client_id: `page-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    page_number: pageNumber,
    title: '',
    text_content: '',
  };
}

function defaultResources() {
  return resourceDefinitions.reduce((acc, resource) => ({
    ...acc,
    [resource.key]: { url: '', file: null, saved: false, message: '', error: '' },
  }), {});
}

function getInitialForm() {
  return {
    title: '',
    slug: '',
    short_synopsis: '',
    synopsis: '',
    origin_place: 'Bacalar',
    language: 'es',
    age_rating: 'general',
    access_type: 'free',
    is_featured: false,
  };
}

function getInitialDeclarations() {
  return {
    authorship: false,
    rights: false,
    culturalRespect: false,
    review: false,
  };
}

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">{name}</span>;
}

function getResourceAsset(resource = {}) {
  return resource?.assets || resource?.asset || resource;
}

function getResourceUrl(resource = {}) {
  const asset = getResourceAsset(resource);
  return asset?.public_url || asset?.file_url || asset?.url || asset?.external_url || '';
}

function getPrimarySourceDocument(documents = []) {
  return documents.find((document) => document.is_primary_source) || documents[0] || null;
}

function findSceneForPage(arScenes = [], pageId) {
  if (!pageId) return null;
  return arScenes.find(
    (scene) => String(scene.page_id) === String(pageId) && String(scene.status || '').toLowerCase() !== 'archived',
  ) || null;
}

function findMarkerForScene(arMarkers = [], sceneId) {
  if (!sceneId) return null;
  return arMarkers.find((marker) => String(marker.ar_scene_id) === String(sceneId)) || null;
}

function getMarkerAssetId(marker = {}) {
  return marker.marker_asset_id || marker.asset_id || marker.assets?.id || marker.asset?.id || null;
}

function getMarkerLabel(marker = {}) {
  const asset = getResourceAsset(marker);
  return asset?.metadata?.original_name || marker.marker_code || marker.label || 'Marcador visual';
}

function getSceneLabel(scene = {}) {
  const asset = getResourceAsset(scene);
  return scene.name || asset?.metadata?.original_name || asset?.filename || 'Modelo 3D';
}

function getCameraArConfig(scene = {}) {
  return scene.interaction_config?.camera_ar
    || scene.interactionConfig?.cameraAr
    || scene.interactionConfig?.camera_ar
    || scene.metadata?.camera_ar
    || scene.metadata?.ar_camera
    || null;
}

function isCameraArReady(scene = {}) {
  const config = getCameraArConfig(scene);
  return Boolean(
    config?.enabled
    && (config.trackingUrl || config.tracking_url || config.trackingAssetUrl || config.mindUrl || config.pattUrl),
  );
}

function getExistingResource(resources, key) {
  if (!resources) return null;
  if (key === 'cover' || key === 'banner') {
    const matches = (resources.media ?? []).filter((item) => item.media_type === key || item.type === key || item.assets?.asset_type === key);
    return matches.find((item) => Boolean(getResourceUrl(item)) && item.is_primary)
      || matches.find((item) => Boolean(getResourceUrl(item)))
      || matches.find((item) => item.is_primary)
      || matches[0]
      || null;
  }
  if (key === 'model3d') return resources.arScenes?.[0] || null;
  if (key === 'marker') return resources.arMarkers?.[0] || null;
  return null;
}

function hasResource(resources, key) {
  return Boolean(getExistingResource(resources, key));
}

function countScenes(resources = {}) {
  return (resources.arScenes ?? []).filter((scene) => String(scene.status || '').toLowerCase() !== 'archived').length;
}

function countMarkers(resources = {}) {
  return (resources.arMarkers ?? []).filter((marker) => String(marker.status || '').toLowerCase() !== 'archived').length;
}

function getDocumentRenderSummary(sourceDocument, liveSummary = {}) {
  const status = liveSummary.status || sourceDocument?.render_status || sourceDocument?.renderStatus || null;
  const renderedCount = liveSummary.count ?? sourceDocument?.rendered_page_count ?? sourceDocument?.renderedPageCount ?? 0;
  const pageCount = liveSummary.pageCount ?? sourceDocument?.page_count ?? sourceDocument?.pageCount ?? null;

  return {
    status,
    renderedCount: Number(renderedCount || 0),
    pageCount: Number(pageCount || 0),
    ready: status === 'ready' && Number(renderedCount || 0) > 0,
  };
}

function getCreatorReviewError({
  baseError,
  primarySourceDocument,
  renderChecklist,
  modelCount,
  hotspotAssociatedCount,
  declarationsAccepted,
}) {
  if (baseError) return baseError;
  if (primarySourceDocument && !renderChecklist.ready) {
    return new Error('Falta preparar el libro para tener paginas renderizadas.');
  }
  if (!modelCount) {
    return new Error('Falta subir un modelo 3D.');
  }
  if (primarySourceDocument && !hotspotAssociatedCount) {
    return new Error('Falta asociar un modelo a una pagina renderizada.');
  }
  if (!declarationsAccepted) {
    return new Error('Acepta las declaraciones editoriales antes de enviar a revision.');
  }
  return null;
}

function ResourceCard({ definition, value, existing, disabled, saving, onChange, onSave }) {
  const fileName = value.file?.name;
  const icon = definition.kind === 'document' ? 'picture_as_pdf' : definition.kind.startsWith('ar') ? 'view_in_ar' : 'image';
  const savedRecord = value.record?.asset || value.record;
  const previewUrl = value.previewUrl || getResourceUrl(savedRecord) || getResourceUrl(existing) || value.url;
  const canPreviewImage = previewUrl && ['cover', 'banner', 'marker_image'].includes(definition.assetType);
  const isArResource = definition.tab === 'ar';

  return (
    <Card className={`creator-resource-card ${isArResource ? 'compact' : ''}`}>
      <div className="creator-resource-heading">
        <span><MaterialIcon name={icon} /></span>
        <div>
          <h3>{definition.title}</h3>
          <p>{definition.description}</p>
          {definition.recommendation && <p className="creator-resource-recommendation">{definition.recommendation}</p>}
        </div>
      </div>

      <span className={`creator-resource-status ${existing || value.saved ? 'ready' : ''}`}>
        {existing || value.saved ? 'Cargado' : 'Sin recurso'}
      </span>

      {canPreviewImage && (
        <div className="creator-resource-preview">
          <img src={previewUrl} alt={`Vista previa ${definition.title}`} />
        </div>
      )}

      <label className="field" htmlFor={`resource-url-${definition.key}`}>
        <span>URL externa</span>
        <input
          id={`resource-url-${definition.key}`}
          className="standalone-input"
          value={value.url}
          onChange={(event) => onChange({ ...value, url: event.target.value, saved: false, error: '', message: '' })}
          disabled={disabled || saving}
          placeholder="https://..."
        />
      </label>

      <label className="creator-file-input" htmlFor={`resource-file-${definition.key}`}>
        <input
          id={`resource-file-${definition.key}`}
          type="file"
          accept={definition.accept}
          disabled={disabled || saving}
          onChange={(event) => onChange({ ...value, file: event.target.files?.[0] || null, saved: false, error: '', message: '' })}
        />
        <MaterialIcon name="upload_file" />
        <span>{fileName || 'Subir archivo'}</span>
      </label>

      {value.message && <p className="success-message">{value.message}</p>}
      {value.error && <p className="error-message">{value.error}</p>}

      <Button type="button" variant="ghost" onClick={() => onSave(definition)} disabled={disabled || saving || (!value.file && !value.url.trim())}>
        {saving ? 'Guardando...' : 'Guardar recurso'}
      </Button>
    </Card>
  );
}

function getDocumentProcessingErrorMessage(error, fallbackMessage) {
  const message = error?.message || fallbackMessage;

  if (error?.status === 409 || /already has pages|ya tiene paginas/i.test(message)) {
    return 'Esta version ya tiene paginas generadas.';
  }

  if (/extract/i.test(message)) {
    return 'No se pudo extraer el texto del documento.';
  }

  if (error?.status === 0) {
    return 'No se pudo conectar con el backend. Verifica que este activo.';
  }

  return message || fallbackMessage;
}

function LegendEditor({ legendId }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('content');
  const [legend, setLegend] = useState(null);
  const [version, setVersion] = useState(null);
  const [form, setForm] = useState(getInitialForm);
  const [genres, setGenres] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [pages, setPages] = useState([createPage(1)]);
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [resources, setResources] = useState(defaultResources);
  const [existingResources, setExistingResources] = useState({ media: [], documents: [], arScenes: [], arMarkers: [] });
  const [activeScene, setActiveScene] = useState(null);
  const [arPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingResourceKey, setSavingResourceKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingDocument, setProcessingDocument] = useState(false);
  const [documentProcessingMessage, setDocumentProcessingMessage] = useState('');
  const [sourceDocumentView, setSourceDocumentView] = useState({
    sourceDocumentId: null,
    data: null,
    error: '',
    loading: false,
  });
  const [documentRenderSummary, setDocumentRenderSummary] = useState({ status: null, count: 0, pageCount: null, pages: [] });
  const [hotspotSummary, setHotspotSummary] = useState({ total: 0, associated: 0, items: [] });
  const [isSourceDocumentOpen, setIsSourceDocumentOpen] = useState(true);
  const [isInteractiveReadingOpen, setIsInteractiveReadingOpen] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  // TODO: Persist editorial declarations when the schema exposes per-legend acceptance columns.
  const [declarations, setDeclarations] = useState(getInitialDeclarations);

  async function loadEditor() {
    setLoading(true);
    setGenresLoading(true);
    const [editorSettled, genresSettled] = await Promise.allSettled([
      getLegendEditorData(legendId),
      getAvailableGenres(),
    ]);
    const editorResult = editorSettled.status === 'fulfilled'
      ? editorSettled.value
      : { data: null, error: editorSettled.reason };
    const genresResult = genresSettled.status === 'fulfilled'
      ? genresSettled.value
      : { data: [], error: genresSettled.reason };
    const { data, error: editorError } = editorResult;

    if (editorError) setError(editorError);
    if (genresResult.error && import.meta.env.DEV) {
      console.error('[CreatorModule] Error real:', {
        operation: 'loadLegendEditorGenres',
        table: 'genres',
        legendId,
        error: genresResult.error,
      });
    }
    setAvailableGenres(genresResult.data ?? []);
    setGenresLoading(false);
    if (data) {
      setLegend(data.legend);
      setVersion(data.version);
      setForm({
        title: data.legend.title || '',
        slug: data.legend.slug || '',
        short_synopsis: data.legend.short_synopsis || '',
        synopsis: data.legend.synopsis || '',
        origin_place: data.legend.origin_place || 'Bacalar',
        language: data.legend.language || 'es',
        age_rating: data.legend.age_rating || 'general',
        access_type: data.legend.access_type || 'free',
        is_featured: Boolean(data.legend.is_featured),
      });
      const loadedPages = data.pages.length
        ? data.pages.map((page) => ({ ...page, client_id: page.id }))
        : [];
      setGenres((data.genres ?? []).map((genre) => genre.name).filter(Boolean));
      setPages(loadedPages);
      setSelectedPageKey(loadedPages[0]?.client_id ?? null);
      setExistingResources({
        media: data.media ?? data.resources?.media ?? [],
        documents: data.sourceDocuments ?? data.resources?.documents ?? [],
        arScenes: data.arScenes ?? data.resources?.arScenes ?? [],
        arMarkers: data.arMarkers ?? data.resources?.arMarkers ?? [],
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEditor();
  }, [legendId]);

  const visiblePages = useMemo(() => pages.filter((page) => !page._delete), [pages]);
  const selectedPage = visiblePages.find((page) => page.client_id === selectedPageKey) ?? visiblePages[0];
  const selectedPageIndex = pages.findIndex((page) => page.client_id === selectedPage?.client_id);
  const hotspotAssociationItems = useMemo(
    () => (hotspotSummary.items ?? []).filter((item) => Boolean(item.arSceneId)),
    [hotspotSummary.items],
  );
  const canEdit = canEditVersion(version);
  const isReviewLocked = !canEdit;
  const declarationsAccepted = Object.values(declarations).every(Boolean);
  const primarySourceDocument = getPrimarySourceDocument(existingResources.documents);
  const baseReviewError = validateReadyForReview({ legend: form, pages, hasSourceDocument: Boolean(primarySourceDocument) });
  const renderChecklist = getDocumentRenderSummary(primarySourceDocument, documentRenderSummary);
  const modelCount = countScenes(existingResources);
  const markerCount = countMarkers(existingResources);
  // Camera AR is hidden from the creator flow for now (kept in code, isolated).
  // Flip to true to bring the optional camera-AR configuration UI back.
  const SHOW_CAMERA_AR = false;
  const cameraArReady = (existingResources.arScenes ?? []).some(isCameraArReady);
  const reviewError = getCreatorReviewError({
    baseError: baseReviewError,
    primarySourceDocument,
    renderChecklist,
    modelCount,
    hotspotAssociatedCount: hotspotSummary.associated,
    declarationsAccepted,
  });
  const sceneForSelectedPage = findSceneForPage(existingResources.arScenes, selectedPage?.id);
  const versionStatusLabel = getLegendDisplayStatus(version?.status).label;
  const interactiveReadingPanelId = `interactive-reading-panel-${version?.id || 'current'}`;

  useEffect(() => {
    setSourceDocumentView({
      sourceDocumentId: primarySourceDocument?.id ?? null,
      data: null,
      error: '',
      loading: false,
    });
    setDocumentRenderSummary({
      status: primarySourceDocument?.render_status || primarySourceDocument?.renderStatus || null,
      count: primarySourceDocument?.rendered_page_count ?? primarySourceDocument?.renderedPageCount ?? 0,
      pageCount: primarySourceDocument?.page_count ?? primarySourceDocument?.pageCount ?? null,
      pages: [],
    });
    setHotspotSummary({ total: 0, associated: 0, items: [] });
    setIsSourceDocumentOpen(Boolean(primarySourceDocument));
    setIsInteractiveReadingOpen(!primarySourceDocument);
  }, [primarySourceDocument?.id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePage(field, value) {
    setPages((current) => current.map((page, index) => (
      index === selectedPageIndex ? { ...page, [field]: value } : page
    )));
  }

  function toggleGenre(genreName) {
    setGenres((current) => (
      current.includes(genreName)
        ? current.filter((item) => item !== genreName)
        : [...current, genreName]
    ));
  }

  function updateDeclaration(field, checked) {
    setDeclarations((current) => ({ ...current, [field]: checked }));
  }

  function addPage() {
    const nextPage = createPage(visiblePages.length + 1);
    setPages((current) => [...current, nextPage]);
    setSelectedPageKey(nextPage.client_id);
  }

  async function removePage(page) {
    if (visiblePages.length <= 1) return;
    if (page?.id) await deleteLegendPage(page.id);
    const nextPages = pages
      .filter((item) => item.client_id !== page.client_id)
      .map((item, index) => ({ ...item, page_number: index + 1 }));
    setPages(nextPages);
    setSelectedPageKey(nextPages[0]?.client_id ?? null);
  }

  function updateResource(key, value) {
    setResources((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveGeneral(event) {
    event?.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const { data, error: saveError } = await updateLegendGeneralData(legend.id, { ...form, genres });
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return false;
    }

    setLegend(data);
    setMessage('Datos generales guardados.');
    return true;
  }

  async function handleSavePages(event) {
    event?.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const { data, error: pagesError } = await saveLegendPages({ versionId: version?.id, pages });
    setSaving(false);

    if (pagesError) {
      setError(pagesError);
      return false;
    }

    const savedPages = data.length ? data.map((page) => ({ ...page, client_id: page.id })) : [createPage(1)];
    setPages(savedPages);
    setSelectedPageKey(savedPages[0]?.client_id ?? null);
    setMessage(primarySourceDocument ? 'Texto editorial guardado.' : 'Paginas guardadas.');
    return true;
  }

  async function handleViewSourceDocument(sourceDocument) {
    if (!sourceDocument?.id) {
      setSourceDocumentView((current) => ({
        ...current,
        error: 'No se encontro el documento fuente.',
        loading: false,
      }));
      return;
    }

    setSourceDocumentView({
      sourceDocumentId: sourceDocument.id,
      data: null,
      error: '',
      loading: true,
    });

    try {
      const data = await getSourceDocumentViewUrl(sourceDocument.id);
      setSourceDocumentView({
        sourceDocumentId: sourceDocument.id,
        data,
        error: '',
        loading: false,
      });
    } catch (viewError) {
      const message = viewError?.status === 0
        ? 'No se pudo conectar con el backend para abrir el documento.'
        : 'No se pudo abrir el documento original.';

      setSourceDocumentView({
        sourceDocumentId: sourceDocument.id,
        data: null,
        error: message,
        loading: false,
      });
    }
  }

  async function handleProcessSourceDocument(sourceDocument) {
    if (visiblePages.length > 0) {
      setError(new Error('Esta version ya tiene paginas generadas.'));
      return;
    }

    if (!sourceDocument?.id) {
      setError(new Error('No se encontro el documento fuente.'));
      return;
    }

    const extractionStatus = String(sourceDocument.extraction_status || '').toLowerCase();

    setProcessingDocument(true);
    setDocumentProcessingMessage(extractionStatus === 'pending' ? 'Procesando documento...' : 'Generando paginas...');
    setError(null);
    setMessage(null);

    try {
      if (extractionStatus === 'pending') {
        const extractionResponse = await startDocumentExtraction(sourceDocument.id);
        const responseStatus = String(
          extractionResponse?.sourceDocument?.extractionStatus
            || extractionResponse?.sourceDocument?.extraction_status
            || '',
        ).toLowerCase();
        const extractionJobStatus = String(extractionResponse?.extraction?.status || '').toLowerCase();

        if (responseStatus === 'failed' || responseStatus === 'manual_required' || extractionJobStatus === 'failed') {
          throw new Error('No se pudo extraer el texto del documento.');
        }
      } else if (extractionStatus !== 'extracted') {
        throw new Error('El documento fuente todavia no esta listo para generar paginas.');
      }

      setDocumentProcessingMessage('Generando paginas...');
      await generatePagesFromDocument(sourceDocument.id);
      await loadEditor();
      setActiveTab('content');
      setIsInteractiveReadingOpen(true);
      setMessage('Paginas generadas desde el documento.');
    } catch (processError) {
      if (processError?.status === 409) {
        await loadEditor();
      }

      setError(new Error(getDocumentProcessingErrorMessage(
        processError,
        'No se pudo procesar el documento.',
      )));
    } finally {
      setProcessingDocument(false);
      setDocumentProcessingMessage('');
    }
  }

  async function handleSaveResource(definition) {
    setSavingResourceKey(definition.key);
    setError(null);
    setMessage(null);

    const value = resources[definition.key];
    const arPage = visiblePages.find((page) => Number(page.page_number) === Number(arPageNumber));
    const result = await saveLegendResource({
      legendId: legend.id,
      pageId: definition.kind === 'ar_model' ? arPage?.id : null,
      resource: { ...definition, ...value },
    });

    if (!result.error && definition.kind === 'ar_marker') {
      const sceneId = findSceneForPage(existingResources.arScenes, arPage?.id)?.id || existingResources.arScenes?.[0]?.id;
      if (sceneId && result.data?.asset?.id) {
        await createArMarker({ legendId: legend.id, sceneId, markerAssetId: result.data.asset.id });
      }
    }

    setSavingResourceKey(null);

    if (result.error) {
      updateResource(definition.key, { ...value, error: result.error.message });
      return;
    }

    const asset = result.data?.asset || result.data;
    updateResource(definition.key, {
      url: '',
      file: null,
      saved: true,
      message: 'Recurso guardado.',
      error: '',
      record: result.data,
      previewUrl: getResourceUrl(asset),
    });
    await loadEditor();
  }

  async function handleSubmitReview() {
    if (reviewError) {
      setError(reviewError);
      setActiveTab('review');
      return;
    }

    if (!declarationsAccepted) {
      setError(new Error('Acepta las declaraciones editoriales antes de enviar a revision.'));
      setActiveTab('declarations');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const generalSaved = await handleSaveGeneral();
    if (!generalSaved) {
      setSubmitting(false);
      return;
    }

    if (visiblePages.length > 0) {
      const pagesSaved = await handleSavePages();
      if (!pagesSaved) {
        setSubmitting(false);
        return;
      }
    }

    const { error: submitError } = await submitLegendForReview(version.id);
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setMessage('Leyenda enviada a revision.');
    navigate('/creator/reviews');
  }

  if (loading) return <LoadingState message="Cargando editor de leyenda..." />;

  if (!legend || !version) {
    const isVersionProblem = error?.message?.includes('version inicial') || error?.message?.includes('version de trabajo');
    return (
      <Card className="creator-empty-card">
        <h1>{isVersionProblem ? 'No pudimos preparar esta leyenda' : 'Leyenda no encontrada'}</h1>
        <p>
          {isVersionProblem
            ? 'Esta leyenda no tenia version inicial y no pudimos crearla automaticamente. Revisa el error real de Supabase en consola.'
            : 'No pudimos cargar esta obra para tu perfil de creador.'}
        </p>
        {error && <p className="error-message">{error.message}</p>}
      </Card>
    );
  }

  return (
    <section className="page-stack creator-panel creator-editor-page">
      <div className="creator-editor-header">
        <div>
          <p className="creator-kicker">Editor editorial</p>
          <h1>{legend.title}</h1>
          <p>Version {version.version_number || 1} · {getLegendDisplayStatus(version.status).label}</p>
        </div>
        <div className="creator-editor-actions">
          <Button variant="ghost" onClick={activeTab === 'content' ? handleSavePages : handleSaveGeneral} disabled={saving || isReviewLocked}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button onClick={handleSubmitReview} disabled={saving || submitting || isReviewLocked}>
            {submitting ? 'Enviando...' : 'Enviar a revision'}
          </Button>
        </div>
      </div>

      <nav className="creator-editor-tabs" aria-label="Secciones del editor">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            <MaterialIcon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </nav>

      {isReviewLocked && (
        <Card className="creator-editor-alert">
          <strong>Esta version esta en {getLegendDisplayStatus(version.status).label}.</strong>
          <span>La edicion queda bloqueada hasta que vuelva a borrador o sea rechazada.</span>
        </Card>
      )}

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      {activeTab === 'general' && (
        <Card className="creator-editor-card">
          <div className="creator-editor-card-title">
            <span>1</span>
            <div>
              <h2>Datos generales</h2>
              <p>Informacion principal para catalogo, detalle y revision editorial.</p>
            </div>
          </div>

          <form className="creator-start-form" onSubmit={handleSaveGeneral}>
            <label className="field" htmlFor="legend-title">
              <span>Titulo</span>
              <input id="legend-title" className="standalone-input" value={form.title} onChange={(event) => updateField('title', event.target.value)} disabled={isReviewLocked} required />
            </label>
            <label className="field" htmlFor="legend-slug">
              <span>Slug</span>
              <input id="legend-slug" className="standalone-input" value={form.slug} onChange={(event) => updateField('slug', event.target.value)} disabled={isReviewLocked} required />
            </label>
            <label className="field" htmlFor="legend-short">
              <span>Sinopsis breve</span>
              <textarea id="legend-short" className="textarea" value={form.short_synopsis} onChange={(event) => updateField('short_synopsis', event.target.value)} disabled={isReviewLocked} rows={4} required />
            </label>
            <label className="field" htmlFor="legend-synopsis">
              <span>Sinopsis completa</span>
              <textarea id="legend-synopsis" className="textarea" value={form.synopsis} onChange={(event) => updateField('synopsis', event.target.value)} disabled={isReviewLocked} rows={4} required />
            </label>
            <label className="field" htmlFor="legend-origin">
              <span>Lugar de origen</span>
              <input id="legend-origin" className="standalone-input" value={form.origin_place} onChange={(event) => updateField('origin_place', event.target.value)} disabled={isReviewLocked} required />
            </label>
            <label className="field" htmlFor="legend-language">
              <span>Idioma</span>
              <input id="legend-language" className="standalone-input" value={form.language} onChange={(event) => updateField('language', event.target.value)} disabled={isReviewLocked} required />
            </label>
            <label className="field" htmlFor="legend-age">
              <span>Clasificacion</span>
              <select id="legend-age" className="select" value={form.age_rating} onChange={(event) => updateField('age_rating', event.target.value)} disabled={isReviewLocked}>
                {ageRatings.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            </label>
            <label className="field" htmlFor="legend-access">
              <span>Tipo de acceso</span>
              <select id="legend-access" className="select" value={form.access_type} onChange={(event) => updateField('access_type', event.target.value)} disabled={isReviewLocked}>
                {accessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="creator-section-block form-span-2">
              <h3>Generos editoriales</h3>
              {genresLoading ? (
                <p className="creator-muted">Cargando generos...</p>
              ) : availableGenres.length ? (
                <div className="creator-genre-options">
                  {availableGenres.map((genre) => (
                    <button
                      key={genre.id || genre.name}
                      type="button"
                      className={`creator-genre-option ${genres.includes(genre.name) ? 'active' : ''}`}
                      onClick={() => toggleGenre(genre.name)}
                      disabled={isReviewLocked}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="creator-muted">No hay generos disponibles.</p>
              )}
            </div>
            <div className="creator-review-actions form-span-2">
              <Button type="submit" disabled={saving || isReviewLocked}>{saving ? 'Guardando...' : 'Guardar datos'}</Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'content' && (
        <Card className="creator-editor-card creator-pages-card">
          <div className="creator-editor-card-title">
            <span>2</span>
            <div>
              <h2>Documento, libro y marcadores</h2>
              <p>
                {primarySourceDocument
                  ? 'Prepara el PDF como libro, elige una pagina renderizada y coloca marcadores cuadrados.'
                  : `${visiblePages.length} paginas en esta version.`}
              </p>
            </div>
          </div>

          {primarySourceDocument && (
            <SourceDocumentPreview
              sourceDocument={primarySourceDocument}
              viewUrl={sourceDocumentView.sourceDocumentId === primarySourceDocument.id ? sourceDocumentView.data : null}
              viewLoading={sourceDocumentView.sourceDocumentId === primarySourceDocument.id && sourceDocumentView.loading}
              viewError={sourceDocumentView.sourceDocumentId === primarySourceDocument.id ? sourceDocumentView.error : ''}
              disabled={isReviewLocked}
              hasInteractivePages={visiblePages.length > 0}
              processing={processingDocument}
              processingMessage={documentProcessingMessage}
              onViewDocument={() => handleViewSourceDocument(primarySourceDocument)}
              onConvertToInteractive={() => handleProcessSourceDocument(primarySourceDocument)}
              onAddManualPage={addPage}
              isOpen={isSourceDocumentOpen}
              onToggle={() => setIsSourceDocumentOpen((current) => !current)}
              onRenderStateChange={setDocumentRenderSummary}
              onHotspotSummaryChange={setHotspotSummary}
              onGoToResources={() => setActiveTab('ar')}
            />
          )}

          {visiblePages.length === 0 ? (
            primarySourceDocument ? null : (
              <div className="creator-empty-editor">
              <MaterialIcon name="note_add" />
              <h3>Aun no has agregado paginas.</h3>
              <p>Empieza creando la primera pagina de tu leyenda.</p>
              <Button type="button" onClick={addPage} disabled={isReviewLocked}>Anadir pagina</Button>
              </div>
            )
          ) : (
            <section className="creator-section-block creator-editorial-support">
              <button
                type="button"
                className="creator-accordion-header"
                onClick={() => setIsInteractiveReadingOpen((current) => !current)}
                aria-expanded={isInteractiveReadingOpen}
                aria-controls={interactiveReadingPanelId}
              >
                <span className="creator-accordion-icon">TXT</span>
                <div className="creator-accordion-copy">
                  <h2>Texto extraido / apoyo editorial</h2>
                  <p>Texto extraido del PDF para apoyo editorial. No afecta la colocacion visual de marcadores sobre el libro renderizado.</p>
                </div>
                <span className="creator-accordion-badges">
                  <span className="creator-accordion-badge">{visiblePages.length} textos</span>
                  <span className="creator-accordion-badge">Version {version.version_number || 1}</span>
                  <span className="creator-accordion-badge">{versionStatusLabel}</span>
                </span>
                <span className={`creator-accordion-chevron ${isInteractiveReadingOpen ? 'open' : ''}`} aria-hidden="true">&rsaquo;</span>
              </button>

              <div id={interactiveReadingPanelId} className={`creator-accordion-panel ${isInteractiveReadingOpen ? 'open' : 'closed'}`}>
                <div className="creator-review-grid compact">
                  <span className="ready">Textos editoriales: {visiblePages.length}</span>
                  <span>Version {version.version_number || 1}</span>
                  <span>Estado: {versionStatusLabel}</span>
                </div>

                {isInteractiveReadingOpen && (
                <div className="creator-pages-layout">
                <aside className="creator-page-rail">
                  {visiblePages.map((page) => (
                    <button
                      type="button"
                      key={page.client_id}
                      className={page.client_id === selectedPage?.client_id ? 'active' : ''}
                      onClick={() => setSelectedPageKey(page.client_id)}
                    >
                      <MaterialIcon name="article" />
                      <span>Pag. {page.page_number}</span>
                      {findSceneForPage(existingResources.arScenes, page.id) && (
                        <span className="creator-page-3d-dot" title="Tiene escena 3D">3D</span>
                      )}
                    </button>
                  ))}
                  <button type="button" className="creator-add-page" onClick={addPage} disabled={isReviewLocked}>
                    <MaterialIcon name="add" />
                    <span>Anadir pagina</span>
                  </button>
                </aside>

                <div className="creator-page-editor">
                  <div className="creator-page-toolbar">
                    <label className="field" htmlFor="page-number">
                      <span>Numero</span>
                      <input id="page-number" className="standalone-input" type="number" min="1" value={selectedPage?.page_number || 1} onChange={(event) => updatePage('page_number', event.target.value)} disabled={isReviewLocked} />
                    </label>
                    <label className="field" htmlFor="page-title">
                      <span>Titulo de pagina</span>
                      <input id="page-title" className="standalone-input" value={selectedPage?.title || ''} onChange={(event) => updatePage('title', event.target.value)} disabled={isReviewLocked} placeholder="Opcional" />
                    </label>
                    <Button variant="ghost" onClick={() => removePage(selectedPage)} disabled={isReviewLocked || visiblePages.length <= 1}>Quitar</Button>
                    {sceneForSelectedPage && (
                      <Button type="button" variant="ghost" onClick={() => setActiveScene(sceneForSelectedPage)}>
                        Ver modelo 3D
                      </Button>
                    )}
                  </div>
                  <label className="field" htmlFor="page-content">
                    <span>Texto de la historia</span>
                    <textarea
                      id="page-content"
                      className="textarea creator-story-textarea"
                      value={selectedPage?.text_content || ''}
                      onChange={(event) => updatePage('text_content', event.target.value)}
                      disabled={isReviewLocked}
                      placeholder="Erase una vez en Bacalar..."
                    />
                  </label>
                  <div className="creator-page-stats">
                    <span>{(selectedPage?.text_content || '').trim().split(/\s+/).filter(Boolean).length} palabras</span>
                    <span>{(selectedPage?.text_content || '').length} caracteres</span>
                    <span>Version {version.version_number || 1}</span>
                  </div>
                  <div className="creator-review-actions">
                    <Button type="button" onClick={handleSavePages} disabled={saving || isReviewLocked}>{saving ? 'Guardando...' : 'Guardar texto editorial'}</Button>
                  </div>
                </div>
                </div>
                )}
              </div>
            </section>
          )}
        </Card>
      )}

      {activeTab === 'resources' && (
        <div className="page-stack">
          <Card className="creator-editor-card">
            <div className="creator-editor-card-title">
              <span>2</span>
              <div>
                <h2>Portada y banner</h2>
                <p>Sube las imagenes visibles en catalogo y detalle antes de preparar la publicacion.</p>
              </div>
            </div>
            <div className="creator-resource-grid creator-resource-grid-roomy">
              {resourceDefinitions.filter((definition) => definition.tab === 'resources').map((definition) => (
                <ResourceCard
                  key={definition.key}
                  definition={definition}
                  value={resources[definition.key]}
                  existing={getExistingResource(existingResources, definition.key)}
                  disabled={isReviewLocked}
                  saving={savingResourceKey === definition.key}
                  onChange={(value) => updateResource(definition.key, value)}
                  onSave={handleSaveResource}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ar' && (
        <div className="page-stack">
          <Card className="creator-editor-card">
            <div className="creator-editor-card-title">
              <span>3</span>
              <div>
                <h2>Modelos y marcadores</h2>
                <p>Sube recursos por separado. La asociacion se hace sobre una pagina renderizada en Documento / libro.</p>
              </div>
            </div>
            <div className="creator-ar-link-row">
              <p>Selecciona una pagina renderizada del libro, coloca el marcador pequeno y elige el modelo desde Documento / libro.</p>
            </div>
          </Card>

          <section className="creator-resource-group">
            <div className="creator-resource-group-heading">
              <h3>Modelos 3D</h3>
              <p>{modelCount ? `${modelCount} modelo(s) listo(s) para asociar.` : 'Sube un GLB/GLTF optimizado. No se carga en la lista, solo al probar.'}</p>
            </div>
            <ResourceCard
              definition={resourceDefinitions.find((definition) => definition.key === 'model3d')}
              value={resources.model3d}
              existing={getExistingResource(existingResources, 'model3d')}
              disabled={isReviewLocked}
              saving={savingResourceKey === 'model3d'}
              onChange={(value) => updateResource('model3d', value)}
              onSave={handleSaveResource}
            />
          </section>

          <section className="creator-resource-group">
            <div className="creator-resource-group-heading">
              <h3>Marcadores / imagenes</h3>
              <p>{markerCount ? `${markerCount} marcador(es) registrado(s).` : 'Sube una imagen pequena y nitida para usarla como marcador visual.'}</p>
            </div>
            <ResourceCard
              definition={resourceDefinitions.find((definition) => definition.key === 'marker')}
              value={resources.marker}
              existing={getExistingResource(existingResources, 'marker')}
              disabled={isReviewLocked}
              saving={savingResourceKey === 'marker'}
              onChange={(value) => updateResource('marker', value)}
              onSave={handleSaveResource}
            />
          </section>

          <section className="creator-resource-group">
            <div className="creator-resource-group-heading">
              <h3>Asociaciones disponibles</h3>
              <p>Prueba modelos existentes o editalos colocando un marcador en Documento / libro.</p>
            </div>
            {hotspotAssociationItems.length ? (
              <div className="creator-scene-list creator-association-list">
                {hotspotAssociationItems.map((item) => {
                  const scene = existingResources.arScenes.find((candidate) => String(candidate.id) === String(item.arSceneId));
                  const marker = item.markerAssetId
                    ? existingResources.arMarkers.find((candidate) => String(getMarkerAssetId(candidate)) === String(item.markerAssetId))
                    : null;
                  return (
                    <article key={item.id} className="creator-scene-item creator-association-item">
                      <div>
                        <strong>Pagina {item.pageNumber} - marcador colocado</strong>
                        <span>Modelo: {getSceneLabel(scene)}{marker ? ` - Marcador: ${getMarkerLabel(marker)}` : ' - sin imagen de marcador'}</span>
                      </div>
                      <div className="creator-association-actions">
                        <Button type="button" variant="ghost" onClick={() => setActiveTab('content')}>
                          Editar en pagina
                        </Button>
                        {scene && (
                          <Button type="button" variant="ghost" onClick={() => setActiveScene(scene)}>
                            Probar
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : modelCount ? (
              <div className="creator-scene-list">
                {existingResources.arScenes
                  .filter((scene) => String(scene.status || '').toLowerCase() !== 'archived')
                  .map((scene) => {
                    const marker = findMarkerForScene(existingResources.arMarkers, scene.id);
                    return (
                      <article key={scene.id} className="creator-scene-item">
                        <div>
                          <strong>{getSceneLabel(scene)}</strong>
                          <span>{marker ? `Marcador visual: ${getMarkerLabel(marker)}` : 'Disponible para asociar desde Documento / libro'}</span>
                        </div>
                        <Button type="button" variant="ghost" onClick={() => setActiveScene(scene)}>
                          Probar modelo
                        </Button>
                      </article>
                    );
                  })}
              </div>
            ) : (
              <p className="creator-muted">Todavia no hay modelos disponibles para asociar.</p>
            )}
          </section>

          {SHOW_CAMERA_AR && (
            <section className="creator-resource-group creator-ar-optional">
              <div className="creator-resource-group-heading">
                <h3>Camara AR, opcional</h3>
                <p>
                  El lector digital funciona con el icono sobre la pagina. La camara AR se mostrara solo cuando una escena tenga configuracion completa con archivo .mind o .patt.
                </p>
              </div>
              <div className="creator-review-grid compact">
                <span className={cameraArReady ? 'ready' : ''}>
                  {cameraArReady ? 'Camara AR lista' : 'Camara AR pendiente'}
                </span>
                <span>Reconocimiento por imagen: archivo .mind</span>
                <span>Marcador cuadrado fisico: archivo .patt</span>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'declarations' && (
        <Card className="creator-editor-card">
          <div className="creator-editor-card-title">
            <span>5</span>
            <div>
              <h2>Declaraciones editoriales</h2>
              <p>Confirma responsabilidad autoral antes de enviar la obra a revision.</p>
            </div>
          </div>

          <div className="creator-declaration-list">
            <label className="creator-declaration-item">
              <input
                type="checkbox"
                checked={declarations.authorship}
                onChange={(event) => updateDeclaration('authorship', event.target.checked)}
                disabled={isReviewLocked}
              />
              <span>Declaro que la historia fue creada por mi o que cuento con autorizacion para publicarla.</span>
            </label>
            <label className="creator-declaration-item">
              <input
                type="checkbox"
                checked={declarations.rights}
                onChange={(event) => updateDeclaration('rights', event.target.checked)}
                disabled={isReviewLocked}
              />
              <span>Declaro que los recursos visuales, PDF, modelos 3D y marcadores AR son propios o autorizados.</span>
            </label>
            <label className="creator-declaration-item">
              <input
                type="checkbox"
                checked={declarations.culturalRespect}
                onChange={(event) => updateDeclaration('culturalRespect', event.target.checked)}
                disabled={isReviewLocked}
              />
              <span>Declaro que el contenido respeta la memoria cultural, comunidades y contexto de Bacalar.</span>
            </label>
            <label className="creator-declaration-item">
              <input
                type="checkbox"
                checked={declarations.review}
                onChange={(event) => updateDeclaration('review', event.target.checked)}
                disabled={isReviewLocked}
              />
              <span>Acepto que la obra sea revisada por administracion antes de publicarse.</span>
            </label>
          </div>

          <p className="creator-checklist-note">
            Estas declaraciones se validan antes de enviar la obra a revision administrativa.
          </p>

          <div className="creator-review-actions">
            <Button type="button" variant="ghost" onClick={() => setActiveTab('ar')}>Volver</Button>
            <Button type="button" onClick={() => setActiveTab('review')} disabled={!declarationsAccepted}>Continuar a revision</Button>
          </div>
        </Card>
      )}

      {activeTab === 'review' && (
        <Card className="creator-editor-card">
          <div className="creator-editor-card-title">
            <span>6</span>
            <div>
              <h2>Revision y envio</h2>
              <p>Confirma que la obra tiene lo necesario antes de enviarla al admin.</p>
            </div>
          </div>

          <div className="creator-review-grid">
            <span className={form.title && form.synopsis && form.short_synopsis ? 'ready' : ''}>Historia guardada</span>
            <span className={genres.length ? 'ready' : ''}>Generos: {genres.length || 'pendientes'}</span>
            <span className={primarySourceDocument || visiblePages.some((page) => page.text_content?.trim()) ? 'ready' : ''}>
              PDF/documento {primarySourceDocument ? 'cargado' : `${visiblePages.filter((page) => page.text_content?.trim()).length} pagina(s)`}
            </span>
            <span className={renderChecklist.ready ? 'ready' : ''}>
              Libro preparado {renderChecklist.ready ? `${renderChecklist.renderedCount} paginas` : 'pendiente'}
            </span>
            <span className={hasResource(existingResources, 'cover') ? 'ready' : ''}>Portada {hasResource(existingResources, 'cover') ? 'cargada' : 'pendiente'}</span>
            <span className={hasResource(existingResources, 'banner') ? 'ready' : ''}>Banner {hasResource(existingResources, 'banner') ? 'cargado' : 'pendiente'}</span>
            <span className={modelCount ? 'ready' : ''}>Modelo 3D {modelCount ? `${modelCount} listo(s)` : 'pendiente'}</span>
            <span className={markerCount ? 'ready' : ''}>Marcador visual {markerCount ? `${markerCount} cargado(s)` : 'opcional'}</span>
            <span className={hotspotSummary.associated ? 'ready' : ''}>
              Hotspot listo para lector {hotspotSummary.associated ? `${hotspotSummary.associated}/${hotspotSummary.total}` : 'pendiente'}
            </span>
            {SHOW_CAMERA_AR && (
              <span className={cameraArReady ? 'ready optional' : 'optional'}>
                Camara AR {cameraArReady ? 'configurada' : 'opcional, puede configurarse despues'}
              </span>
            )}
            <span className={declarationsAccepted ? 'ready' : ''}>Declaraciones {declarationsAccepted ? 'aceptadas' : 'pendientes'}</span>
          </div>

          {reviewError && <p className="error-message">{reviewError.message}</p>}
          <div className="creator-review-actions">
            <Button type="button" variant="ghost" onClick={() => setActiveTab('content')}>Volver al contenido</Button>
            <Button type="button" onClick={handleSubmitReview} disabled={submitting || isReviewLocked || Boolean(reviewError)}>
              {submitting ? 'Enviando...' : 'Enviar a revision'}
            </Button>
          </div>
        </Card>
      )}

      {activeScene && (
        <ArSceneModal
          scene={activeScene}
          marker={findMarkerForScene(existingResources.arMarkers, activeScene.id)}
          pageNumber={visiblePages.find((page) => String(page.id) === String(activeScene.page_id))?.page_number ?? null}
          onClose={() => setActiveScene(null)}
        />
      )}
    </section>
  );
}

export default LegendEditor;
