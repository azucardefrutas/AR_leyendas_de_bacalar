import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import BookSpreadPreview from '../../components/editor/BookSpreadPreview.jsx';
import EditorialRichEditor from '../../components/creator/EditorialRichEditor.jsx';
import {
  createArMarker,
  getLegendSourceDocumentsLight,
  saveLegendResource,
  uploadSourceDocument,
} from '../../services/assetService.js';
import {
  createLegendDraft,
  getCurrentCreatorReviewData,
  normalizeGenreName,
  saveLegendPages,
  submitLegendForReview,
  updateLegendGeneralData,
  validateReadyForReview,
} from '../../services/creatorLegendService.js';
import { getSourceDocumentViewUrl } from '../../services/backendApiService.js';
import {
  TemplatePicker,
  BookTemplatePreview,
  saveBookTemplate,
  buildDefaultCoverData,
  buildDefaultBackCoverData,
  getTemplateById,
} from '../../features/templates/index.js';

const accessTypeOptions = [
  { value: 'free', label: 'Gratis' },
  { value: 'code_required', label: 'Codigo fisico' },
  { value: 'paid', label: 'Compra' },
  { value: 'subscription', label: 'Suscripcion' },
  { value: 'mixed', label: 'Mixto' },
];

const ageRatingOptions = [
  { value: 'general', label: 'Todo publico' },
  { value: '12+', label: 'Adolescentes' },
  { value: '16+', label: 'Publico maduro' },
];

const stepDefinitions = {
  source: { key: 'source', label: 'Documento', icon: 'upload_file' },
  editorial: { key: 'editorial', label: 'Datos editoriales', icon: 'contract_edit' },
  resources: { key: 'resources', label: 'Recursos', icon: 'photo_library' },
  content: { key: 'content', label: 'Contenido', icon: 'article' },
  documentPreview: { key: 'documentPreview', label: 'Vista previa', icon: 'preview' },
  ar: { key: 'ar', label: '3D / AR', icon: 'view_in_ar' },
  declarations: { key: 'declarations', label: 'Declaraciones', icon: 'gavel' },
  review: { key: 'review', label: 'Revision', icon: 'task_alt' },
};

const stepsByMode = {
  scratch: [
    stepDefinitions.editorial,
    stepDefinitions.resources,
    stepDefinitions.content,
    stepDefinitions.ar,
    stepDefinitions.declarations,
    stepDefinitions.review,
  ],
  upload: [
    stepDefinitions.source,
    stepDefinitions.editorial,
    stepDefinitions.resources,
    stepDefinitions.documentPreview,
    stepDefinitions.ar,
    stepDefinitions.declarations,
    stepDefinitions.review,
  ],
};

const mediaResourceDefinitions = [
  {
    key: 'cover',
    step: 'resources',
    title: 'Portada',
    description: 'Imagen vertical para tarjeta, libro y detalle.',
    assetType: 'cover',
    mediaType: 'cover',
    kind: 'media',
    accept: '.png,.jpg,.jpeg,.webp',
  },
  {
    key: 'banner',
    step: 'resources',
    title: 'Banner',
    description: 'Imagen horizontal para fondo visual de la historia.',
    assetType: 'banner',
    mediaType: 'banner',
    kind: 'media',
    accept: '.png,.jpg,.jpeg,.webp',
  },
];

const sourceDocumentDefinition = {
  key: 'sourceDocument',
  step: 'source',
  title: 'Documento fuente',
  description: 'Archivo principal de tu leyenda. Puede ser Word o PDF.',
  assetType: 'source_document',
  documentType: 'pdf',
  kind: 'document',
  accept: '.pdf,.doc,.docx',
};

const arResourceDefinitions = [
  {
    key: 'model3d',
    step: 'ar',
    title: 'Modelo 3D',
    description: 'Archivo GLB/GLTF para preparar una escena AR.',
    assetType: 'model_3d',
    kind: 'ar_model',
    accept: '.glb,.gltf',
  },
  {
    key: 'marker',
    step: 'ar',
    title: 'Marcador AR',
    description: 'Imagen fisica que puede activar una escena asociada.',
    assetType: 'marker_image',
    kind: 'ar_marker',
    accept: '.png,.jpg,.jpeg,.webp',
  },
];

const resourceDefinitions = [
  ...mediaResourceDefinitions,
  sourceDocumentDefinition,
  ...arResourceDefinitions,
];

const SHORT_SYNOPSIS_LENGTH = 220;
const SOURCE_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx'];

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createShortSynopsis(synopsis = '') {
  const cleanSynopsis = synopsis.trim().replace(/\s+/g, ' ');
  if (cleanSynopsis.length <= SHORT_SYNOPSIS_LENGTH) return cleanSynopsis;
  return `${cleanSynopsis.slice(0, SHORT_SYNOPSIS_LENGTH).trim()}...`;
}

function getInitialForm() {
  return {
    title: '',
    slug: '',
    synopsis: '',
    origin_place: 'Bacalar, Quintana Roo',
    language: 'es',
    age_rating: 'general',
    access_type: 'free',
    is_featured: false,
  };
}

function createPage(pageNumber = 1) {
  return {
    client_id: `new-page-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    page_number: pageNumber,
    title: '',
    text_content: '',
    editor_data: { blocks: [] },
    rendered_html: '',
    content_format: 'editorjs',
  };
}

function defaultResources() {
  return resourceDefinitions.reduce((acc, definition) => ({
    ...acc,
    [definition.key]: {
      url: '',
      file: null,
      saved: false,
      message: '',
      error: '',
      record: null,
      fileName: '',
      fileSize: null,
      fileType: '',
      documentType: '',
      previewUrl: '',
    },
  }), {});
}

function getInitialDeclarations() {
  return {
    authorship: false,
    rights: false,
    review: false,
    changes: false,
  };
}

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">{name}</span>;
}

function getFileExtension(name = '') {
  return String(name).split('.').pop()?.toLowerCase() || '';
}

function getSourceDocumentType(file) {
  const extension = getFileExtension(file?.name);
  if (extension === 'pdf') return 'pdf';
  if (extension === 'doc' || extension === 'docx') return 'docx';
  return extension || 'docx';
}

function isValidSourceDocument(file) {
  return file && SOURCE_DOCUMENT_EXTENSIONS.includes(getFileExtension(file.name));
}

function getAssetUrl(asset) {
  return asset?.public_url || asset?.file_url || asset?.url || asset?.external_url || asset?.storage_path || '';
}

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return 'No disponible';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSavedAsset(resource) {
  return resource?.record?.asset || resource?.record || null;
}

function getAssetDisplayName(asset) {
  return asset?.metadata?.original_name || asset?.name || asset?.id || 'No disponible';
}

function WizardStepIndicator({ currentStep, steps }) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0;

  return (
    <div className="creator-wizard-steps" aria-label="Progreso de creacion" style={{ '--wizard-step-count': steps.length }}>
      <div className="creator-wizard-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        return (
          <button
            key={step.key}
            type="button"
            className={`${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span>{isDone ? <MaterialIcon name="check" /> : index + 1}</span>
            <strong>{step.label}</strong>
          </button>
        );
      })}
    </div>
  );
}

function ResourceCard({ definition, value, disabled, saving, onChange, onSave }) {
  const fileName = value.file?.name;
  const icon = definition.kind === 'document' ? 'description' : definition.kind.startsWith('ar') ? 'view_in_ar' : 'image';
  const asset = getSavedAsset(value);
  const previewUrl = value.previewUrl || getAssetUrl(asset);
  const canPreviewImage = previewUrl && ['cover', 'banner', 'marker_image'].includes(definition.assetType);
  // External URLs only make sense for editorial media (cover/banner). A 3D model or an AR
  // marker must be a real uploaded file, and that upload now goes through the backend.
  const allowExternalUrl = definition.kind === 'media';

  return (
    <Card className="creator-resource-card creator-wizard-resource-card">
      <div className="creator-resource-heading">
        <span><MaterialIcon name={icon} /></span>
        <div>
          <h3>{definition.title}</h3>
          <p>{definition.description}</p>
        </div>
      </div>

      <span className={`creator-resource-status ${value.saved ? 'ready' : ''}`}>
        {value.saved ? 'Guardado' : 'Opcional'}
      </span>

      {canPreviewImage && (
        <div className="creator-resource-preview">
          <img src={previewUrl} alt={`Vista previa de ${definition.title}`} />
        </div>
      )}

      {allowExternalUrl && (
        <label className="field" htmlFor={`wizard-resource-url-${definition.key}`}>
          <span>URL externa</span>
          <input
            id={`wizard-resource-url-${definition.key}`}
            className="standalone-input"
            value={value.url}
            onChange={(event) => onChange({ ...value, url: event.target.value, saved: false, message: '', error: '' })}
            disabled={disabled || saving}
            placeholder="https://..."
          />
        </label>
      )}

      <label className="creator-file-input" htmlFor={`wizard-resource-file-${definition.key}`}>
        <input
          id={`wizard-resource-file-${definition.key}`}
          type="file"
          accept={definition.accept}
          disabled={disabled || saving}
          onChange={(event) => onChange({ ...value, file: event.target.files?.[0] || null, saved: false, message: '', error: '' })}
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

function SourceDocumentPanel({ value, canSave, saving, onChange, onSave }) {
  const selectedName = value.file?.name || value.fileName;
  const selectedType = value.file?.type || value.fileType || value.documentType;
  const selectedSize = value.file?.size || value.fileSize;

  return (
    <div className="creator-source-document-layout">
      <Card className="creator-source-document-card">
        <div className="creator-editor-card-title">
          <span><MaterialIcon name="upload_file" /></span>
          <div>
            <h2>Subir leyenda existente</h2>
            <p>Sube el archivo principal de tu leyenda. Puede ser un documento Word o PDF.</p>
          </div>
        </div>
        <p className="creator-checklist-note">
          El archivo se guardará como fuente editorial de la obra y quedará vinculado a la leyenda para su revisión.
        </p>
        <label className="creator-source-dropzone" htmlFor="wizard-source-document">
          <input
            id="wizard-source-document"
            type="file"
            accept={sourceDocumentDefinition.accept}
            disabled={saving}
            onChange={(event) => onChange({
              ...value,
              file: event.target.files?.[0] || null,
              saved: false,
              message: '',
              error: '',
              fileName: event.target.files?.[0]?.name || '',
              fileSize: event.target.files?.[0]?.size || null,
              fileType: event.target.files?.[0]?.type || '',
              documentType: getSourceDocumentType(event.target.files?.[0]),
              previewUrl: '',
            })}
          />
          <MaterialIcon name="description" />
          <strong>{selectedName || 'Seleccionar PDF o Word'}</strong>
          <span>.pdf, .doc o .docx</span>
        </label>
        {selectedName && (
          <div className="creator-document-meta">
            <span>Archivo: <strong>{selectedName}</strong></span>
            <span>Tipo: <strong>{selectedType || getSourceDocumentType(value.file).toUpperCase()}</strong></span>
            <span>Tamano: <strong>{formatFileSize(selectedSize)}</strong></span>
          </div>
        )}
        {value.message && <p className="success-message">{value.message}</p>}
        {value.error && <p className="error-message">{value.error}</p>}
        {!canSave ? (
          <p className="creator-muted">Se guardara en Supabase despues de crear el borrador editorial.</p>
        ) : (
          <Button type="button" variant="ghost" onClick={onSave} disabled={saving || !value.file}>
            {saving ? 'Guardando...' : value.saved ? 'Documento guardado' : 'Guardar documento'}
          </Button>
        )}
      </Card>

      <Card className="creator-source-help-card">
        <span className="creator-resource-status ready">Fuente editorial</span>
        <h3>Que pasara con el archivo</h3>
        <p>Se subira como documento fuente real y quedara vinculado a la leyenda para revision administrativa.</p>
        <p>No se convertira automaticamente en paginas. Si necesitas escribir por paginas, usa Crear desde cero.</p>
      </Card>
    </div>
  );
}

function DocumentPreviewPanel({ sourceDocument }) {
  const asset = getSavedAsset(sourceDocument);
  const previewUrl = sourceDocument.previewUrl || getAssetUrl(asset);
  const documentType = sourceDocument.documentType || asset?.document_type || (sourceDocument.fileName ? getSourceDocumentType({ name: sourceDocument.fileName }) : '');
  const isPdf = documentType === 'pdf' || sourceDocument.fileType === 'application/pdf' || /\.pdf($|\?)/i.test(previewUrl);

  return (
    <div className="creator-document-preview-layout">
      {isPdf && (sourceDocument.file || previewUrl) ? (
        <div className="creator-document-frame creator-document-frame--live">
          {/* Frontend pdfjs preview: works from the local File or the Storage URL,
              without waiting for backend extraction. Includes optional double-page mode. */}
          <BookSpreadPreview file={sourceDocument.file || null} fileUrl={previewUrl} />
        </div>
      ) : (
        <Card className="creator-document-placeholder">
          <MaterialIcon name="description" />
          <h3>{sourceDocument.fileName || getAssetDisplayName(asset) || 'Documento fuente'}</h3>
          <p>
            {sourceDocument.saved
              ? 'Documento guardado como fuente y listo para su revisión.'
              : 'Guarda el documento para verlo aqui antes de enviar a revision.'}
          </p>
        </Card>
      )}
      <div className="creator-document-meta creator-document-meta-panel">
        <span>Nombre: <strong>{sourceDocument.fileName || getAssetDisplayName(asset)}</strong></span>
        <span>Tipo: <strong>{sourceDocument.fileType || documentType || 'No disponible'}</strong></span>
        <span>Tamano: <strong>{formatFileSize(sourceDocument.fileSize || asset?.size_bytes || asset?.file_size)}</strong></span>
        <span>Estado: <strong>{sourceDocument.saved ? 'Guardado' : 'Pendiente'}</strong></span>
      </div>
    </div>
  );
}

function FinalReviewPanel({
  form,
  genres,
  resources,
  pages,
  sourceMode,
  declarationsAccepted,
  creatorSummary,
}) {
  const coverUrl = resources.cover.previewUrl || getAssetUrl(getSavedAsset(resources.cover));
  const sourceDocument = resources.sourceDocument;
  const sourceAsset = getSavedAsset(sourceDocument);
  const savedArCount = [resources.model3d.saved, resources.marker.saved].filter(Boolean).length;
  const validPageCount = pages.filter((page) => page.text_content?.trim()).length;
  const accessLabel = accessTypeOptions.find((option) => option.value === form.access_type)?.label || form.access_type || 'No disponible';
  const ageLabel = ageRatingOptions.find((option) => option.value === form.age_rating)?.label || form.age_rating || 'No disponible';
  const authorName = creatorSummary?.penName || creatorSummary?.profile?.pen_name || 'No disponible';
  const userName = creatorSummary?.userLabel || creatorSummary?.userId || 'No disponible';
  const profileStatus = creatorSummary?.status || creatorSummary?.profile?.status || 'No disponible';

  return (
    <div className="creator-final-review">
      <div className="creator-final-ready">
        <MaterialIcon name="check_circle" />
        <strong>Listo para revision</strong>
      </div>

      <section className="creator-final-card">
        <header>
          <h3>Resumen de tu leyenda</h3>
          <span>{sourceMode === 'upload' ? 'Leyenda existente' : 'Creada desde cero'}</span>
        </header>
        <div className="creator-final-body">
          <div className="creator-final-cover">
            {coverUrl ? (
              <img src={coverUrl} alt={`Portada de ${form.title || 'la leyenda'}`} />
            ) : (
              <span>
                <MaterialIcon name="image" />
                Sin portada
              </span>
            )}
          </div>
          <div className="creator-final-details">
            <article>
              <span>Titulo</span>
              <strong>{form.title || 'No especificado'}</strong>
            </article>
            <article>
              <span>Sinopsis</span>
              <p>{form.synopsis || 'No especificada'}</p>
            </article>
            <div className="creator-final-inline">
              <article>
                <span>Genero</span>
                <div className="creator-final-chips">
                  {genres.length ? genres.map((genre) => <b key={genre}>{genre}</b>) : <b>Recomendado</b>}
                </div>
              </article>
              <article>
                <span>Publico objetivo</span>
                <strong>{ageLabel}</strong>
              </article>
              <article>
                <span>Acceso</span>
                <strong>{accessLabel}</strong>
              </article>
            </div>
          </div>
        </div>
      </section>

      <div className="creator-final-facts">
        <article>
          <span>Lugar de origen</span>
          <strong>{form.origin_place || 'No disponible'}</strong>
        </article>
        <article>
          <span>Autor</span>
          <strong>{authorName}</strong>
        </article>
        <article>
          <span>Usuario actual</span>
          <strong>{userName}</strong>
        </article>
        <article>
          <span>Perfil</span>
          <strong>{profileStatus}</strong>
        </article>
        <article>
          <span>Estado</span>
          <strong>{declarationsAccepted ? 'Borrador listo para revision' : 'Declaraciones pendientes'}</strong>
        </article>
        {sourceMode === 'upload' ? (
          <article>
            <span>Documento subido</span>
            <strong>{sourceDocument.saved ? (sourceDocument.fileName || getAssetDisplayName(sourceAsset) || 'Guardado') : 'Pendiente'}</strong>
          </article>
        ) : (
          <article>
            <span>Paginas</span>
            <strong>{validPageCount} con texto</strong>
          </article>
        )}
        <article>
          <span>Portada / banner</span>
          <strong>{[resources.cover.saved && 'Portada', resources.banner.saved && 'Banner'].filter(Boolean).join(' y ') || 'Recomendados'}</strong>
        </article>
        <article>
          <span>3D / AR</span>
          <strong>{savedArCount ? `${savedArCount} recurso(s)` : 'Opcional'}</strong>
        </article>
      </div>

      <p className="creator-final-note">
        Al enviar, la leyenda pasa a revision administrativa. Podras editarla si el administrador solicita cambios.
      </p>
    </div>
  );
}

function CreateLegendPage() {
  const [sourceMode, setSourceMode] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(getInitialForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [genres, setGenres] = useState([]);
  const [genreInput, setGenreInput] = useState('');
  const [draft, setDraft] = useState({ legend: null, version: null });
  const [pages, setPages] = useState([createPage(1)]);
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [resources, setResources] = useState(defaultResources);
  const [savedArSceneId, setSavedArSceneId] = useState(null);
  const [arPageNumber, setArPageNumber] = useState(1);
  const [declarations, setDeclarations] = useState(getInitialDeclarations);
  const [creatorSummary, setCreatorSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingResourceKey, setSavingResourceKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const [scratchStep, setScratchStep] = useState('form'); // 'form' | 'template'
  const [templateId, setTemplateId] = useState('classic');

  useEffect(() => {
    if (!selectedPageKey && pages.length) setSelectedPageKey(pages[0].client_id);
  }, [pages, selectedPageKey]);

  useEffect(() => {
    if (!sourceMode) return;
    let isMounted = true;
    getCurrentCreatorReviewData().then((result) => {
      if (!isMounted) return;
      if (!result.error) setCreatorSummary(result.data);
    });
    return () => {
      isMounted = false;
    };
  }, [sourceMode]);

  const selectedPage = pages.find((page) => page.client_id === selectedPageKey) ?? pages[0];
  const selectedPageIndex = pages.findIndex((page) => page.client_id === selectedPage?.client_id);
  const declarationsAccepted = Object.values(declarations).every(Boolean);
  const validPageCount = pages.filter((page) => page.text_content?.trim()).length;
  const hasDraft = Boolean(draft.legend?.id && draft.version?.id);
  const modeLabel = sourceMode === 'upload' ? 'Subir leyenda existente' : 'Crear leyenda desde cero';
  const activeSteps = useMemo(() => stepsByMode[sourceMode] ?? stepsByMode.scratch, [sourceMode]);
  const currentStepDefinition = activeSteps[currentStep] ?? activeSteps[0];
  const currentStepKey = currentStepDefinition.key;
  const sourceDocument = resources.sourceDocument;

  // Best-effort: refresh a signed preview URL from the backend when entering the
  // document preview step. A failure here must NOT be treated as a load error.
  useEffect(() => {
    if (currentStepKey !== 'documentPreview') return undefined;
    const sourceDocumentId = sourceDocument.sourceDocumentId;
    if (!sourceDocumentId) return undefined;
    let isMounted = true;
    getSourceDocumentViewUrl(sourceDocumentId)
      .then((view) => {
        if (!isMounted || !view?.signedUrl) return;
        updateResource(sourceDocumentDefinition.key, {
          ...resources.sourceDocument,
          previewUrl: view.signedUrl,
        });
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepKey, sourceDocument.sourceDocumentId]);

  function getLegendPayload() {
    return {
      ...form,
      short_synopsis: createShortSynopsis(form.synopsis),
      genres,
    };
  }

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  }

  function updatePage(field, value) {
    setPages((current) => current.map((page, index) => (
      index === selectedPageIndex ? { ...page, [field]: value } : page
    )));
  }

  function patchPageById(clientId, patch) {
    setPages((current) => current.map((page) => (
      page.client_id === clientId ? { ...page, ...patch } : page
    )));
  }

  function addGenreChip(rawValue = genreInput) {
    const genreNames = String(rawValue)
      .split(',')
      .map((value) => normalizeGenreName(value))
      .filter(Boolean);
    if (!genreNames.length) return;
    setGenres((current) => [...new Set([...current, ...genreNames])]);
    setGenreInput('');
  }

  function handleGenreKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addGenreChip();
    }
  }

  function removeGenreChip(genreName) {
    setGenres((current) => current.filter((item) => item !== genreName));
  }

  function selectSourceMode(mode) {
    setSourceMode(mode);
    setCurrentStep(0);
    setError(null);
    setMessage(null);
  }

  function goToStep(stepKey) {
    const targetIndex = activeSteps.findIndex((step) => step.key === stepKey);
    if (targetIndex >= 0) setCurrentStep(targetIndex);
  }

  function addPage() {
    const nextPage = createPage(pages.length + 1);
    setPages((current) => [...current, nextPage]);
    setSelectedPageKey(nextPage.client_id);
  }

  function removePage(page) {
    if (pages.length <= 1) return;
    const nextPages = pages
      .filter((item) => item.client_id !== page.client_id)
      .map((item, index) => ({ ...item, page_number: index + 1 }));
    setPages(nextPages);
    setSelectedPageKey(nextPages[0]?.client_id ?? null);
  }

  function updateResource(key, value) {
    setResources((current) => ({ ...current, [key]: value }));
  }

  function updateDeclaration(field, checked) {
    setDeclarations((current) => ({ ...current, [field]: checked }));
  }

  function validateEditorialStep() {
    if (!form.title.trim()) return new Error('Agrega el titulo de la leyenda.');
    if (!form.slug.trim()) return new Error('Agrega un slug valido.');
    if (!form.synopsis.trim()) return new Error('Agrega la sinopsis de la leyenda.');
    if (form.synopsis.trim().length < 30) return new Error('La sinopsis debe tener al menos 30 caracteres.');
    if (!form.origin_place.trim()) return new Error('Agrega el lugar de origen.');
    if (!form.access_type) return new Error('Selecciona el tipo de acceso.');
    return null;
  }

  async function ensureDraft() {
    const validationError = validateEditorialStep();
    if (validationError) {
      setError(validationError);
      return { ok: false, error: validationError };
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = getLegendPayload();
    const result = hasDraft
      ? await updateLegendGeneralData(draft.legend.id, payload)
      : await createLegendDraft({
        ...payload,
        creation_mode: sourceMode === 'upload' ? 'source_document' : 'manual',
      });

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return { ok: false, error: result.error };
    }

    if (!hasDraft) {
      const nextDraft = { legend: result.data.legend, version: result.data.version };
      setDraft(nextDraft);
      setMessage('Borrador editorial creado. Puedes continuar con recursos y contenido.');
      const genreError = result.genreError || result.data?.genreError;
      if (genreError) setMessage(genreError.message);
      return { ok: true, draft: nextDraft };
    } else {
      const nextDraft = { legend: result.data, version: draft.version };
      setDraft(nextDraft);
      setMessage('Datos editoriales guardados.');
      const genreError = result.genreError || result.data?.genreError;
      if (genreError) setMessage(genreError.message);
      return { ok: true, draft: nextDraft };
    }
  }

  // Fase 1: compact "crear desde cero" flow. Creates the real draft (reusing
  // ensureDraft) and lands the author straight in the full editor, where cover,
  // pages, AR and review live. Upload mode keeps its full wizard untouched.
  async function handleCreateBook() {
    const result = await ensureDraft();
    if (result.ok && result.draft?.legend?.id) {
      const legendId = result.draft.legend.id;
      // Persist ONLY the template reference + editable cover/back data.
      // Pages stay in Editor.js. Best-effort: never block opening the editor.
      const template = getTemplateById(templateId);
      if (template) {
        const meta = {
          title: form.title,
          author: creatorSummary?.penName || creatorSummary?.profile?.pen_name || '',
          sinopsis: form.synopsis,
          slug: form.slug,
        };
        try {
          await saveBookTemplate(legendId, {
            templateId,
            coverData: buildDefaultCoverData(template, meta),
            backCoverData: buildDefaultBackCoverData(template, meta),
          });
        } catch (templateError) {
          if (import.meta.env.DEV) console.warn('[CreateLegend] no se guardó la plantilla:', templateError?.message || templateError);
        }
      }
      // Auto-crear Página 1 para que el libro no abra vacío (Portada + Página 1 + Contraportada).
      const versionId = result.draft.version?.id;
      if (versionId) {
        try {
          await saveLegendPages({ versionId, pages: [createPage(1)], legendId });
        } catch (pageError) {
          if (import.meta.env.DEV) console.warn('[CreateLegend] no se creó la página 1:', pageError?.message || pageError);
        }
      }
      navigate(`/creator/legends/${legendId}/edit`);
    }
  }

  async function savePages(pagesOverride) {
    if (!hasDraft) {
      const draftError = new Error('Primero crea el borrador editorial.');
      setError(draftError);
      return { ok: false, error: draftError };
    }

    // The editorial editor passes the freshly-merged pages so the latest typing is saved.
    const pagesToSave = Array.isArray(pagesOverride) ? pagesOverride : pages;

    setSaving(true);
    setError(null);
    setMessage(null);

    const { data, error: pagesError } = await saveLegendPages({ versionId: draft.version.id, pages: pagesToSave, legendId: draft.legend.id });
    setSaving(false);

    if (pagesError) {
      setError(pagesError);
      return { ok: false, error: pagesError };
    }

    const savedPages = data.length ? data.map((page) => ({ ...page, client_id: page.id })) : [createPage(1)];
    setPages(savedPages);
    setSelectedPageKey(savedPages[0]?.client_id ?? null);
    setMessage('Paginas guardadas.');
    return { ok: true };
  }

  async function saveSourceDocument(draftOverride = draft) {
    if (sourceMode !== 'upload') return { ok: true };
    const value = resources.sourceDocument;
    if (value.saved) return { ok: true };
    if (!value.file) {
      const sourceError = new Error('Sube un documento PDF o Word para continuar.');
      setError(sourceError);
      return { ok: false, error: sourceError };
    }
    if (!isValidSourceDocument(value.file)) {
      const sourceError = new Error('El documento fuente debe ser PDF, DOC o DOCX.');
      setError(sourceError);
      return { ok: false, error: sourceError };
    }
    if (!draftOverride.legend?.id) {
      const sourceError = new Error('Primero crea el borrador editorial.');
      setError(sourceError);
      return { ok: false, error: sourceError };
    }

    const documentType = getSourceDocumentType(value.file);
    setSavingResourceKey(sourceDocumentDefinition.key);
    setError(null);
    setMessage(null);

    const result = await uploadSourceDocument({
      legendId: draftOverride.legend.id,
      file: value.file,
    });

    // Happy path: register-upload already returns the source-document relation and its
    // asset, so we build the saved state directly and skip the expensive full-resource
    // read (media + AR scenes + markers + hydration) that caused a visible tiron after
    // saving. Only when the register step reports an error do we fall back to a
    // lightweight source-document lookup as a safety net against a misleading error
    // (the register step can report a non-fatal side-effect while the row was created).
    let registeredDoc = null;
    if (!result.error && result.data?.relation?.id) {
      registeredDoc = {
        id: result.data.relation.id,
        is_primary_source: true,
        page_count: result.data.relation.pageCount ?? null,
        assets: result.data.asset || null,
      };
    } else {
      const verify = await getLegendSourceDocumentsLight(draftOverride.legend.id);
      registeredDoc = !verify.error
        ? (verify.data || []).find((document) => document.is_primary_source) || (verify.data || [])[0]
        : null;
    }

    setSavingResourceKey(null);

    if (!result.error || registeredDoc) {
      const hydratedAsset = registeredDoc?.assets || registeredDoc?.asset || null;
      const fallbackAsset = result.data?.asset || result.data || null;
      const asset = hydratedAsset || fallbackAsset;
      // Only keep a usable URL; a bare storage_path is not a preview URL. The document
      // preview step refreshes a real signed URL from the backend (getSourceDocumentViewUrl).
      const rawPreviewUrl = getAssetUrl(asset);
      const previewUrl = /^(https?:|blob:|data:)/i.test(rawPreviewUrl) ? rawPreviewUrl : '';
      updateResource(sourceDocumentDefinition.key, {
        ...value,
        url: '',
        file: null,
        saved: true,
        message: 'Documento cargado correctamente.',
        error: '',
        record: registeredDoc ? { ...registeredDoc, asset: hydratedAsset } : result.data,
        sourceDocumentId: registeredDoc?.id || result.data?.relation?.id || null,
        fileName: value.file?.name || asset?.metadata?.original_name || asset?.name || value.fileName,
        fileSize: value.file?.size || asset?.file_size || asset?.size_bytes || value.fileSize,
        fileType: value.file?.type || asset?.mime_type || value.fileType || documentType,
        documentType,
        previewUrl,
      });
      setMessage(result.error
        ? 'Documento cargado correctamente. La extraccion de texto queda como paso posterior.'
        : 'Documento fuente guardado.');
      return { ok: true };
    }

    const detail = result.error.message || 'Intenta guardar el documento nuevamente desde este borrador.';
    const documentError = new Error(`El borrador se creo, pero no se pudo registrar el documento. ${detail}`);
    documentError.cause = result.error;
    documentError.details = detail;
    documentError.phase = result.error.phase || result.error.supabaseError?.phase || null;
    updateResource(sourceDocumentDefinition.key, { ...value, error: documentError.message });
    setError(documentError);
    return { ok: false, error: documentError };
  }

  async function saveResource(definition) {
    if (!hasDraft) {
      setError(new Error('Primero crea el borrador editorial.'));
      goToStep('editorial');
      return;
    }

    const value = resources[definition.key];
    setSavingResourceKey(definition.key);
    setError(null);
    setMessage(null);

    const arPage = sourceMode === 'scratch'
      ? pages.find((page) => Number(page.page_number) === Number(arPageNumber))
      : null;
    const result = await saveLegendResource({
      legendId: draft.legend.id,
      pageId: definition.kind === 'ar_model' ? arPage?.id : null,
      resource: { ...definition, ...value },
    });

    if (!result.error && definition.kind === 'ar_model' && result.data?.scene?.id) {
      setSavedArSceneId(result.data.scene.id);
    }

    if (!result.error && definition.kind === 'ar_marker' && savedArSceneId && result.data?.asset?.id) {
      await createArMarker({ legendId: draft.legend.id, sceneId: savedArSceneId, markerAssetId: result.data.asset.id });
    }

    setSavingResourceKey(null);

    if (result.error) {
      updateResource(definition.key, { ...value, error: result.error.message });
      return;
    }

    const asset = result.data?.asset || result.data;

    updateResource(definition.key, {
      ...value,
      url: '',
      file: null,
      saved: true,
      message: 'Recurso guardado.',
      error: '',
      record: result.data,
      fileName: value.file?.name || asset?.name || value.fileName,
      fileSize: value.file?.size || asset?.size_bytes || asset?.file_size || value.fileSize,
      fileType: value.file?.type || asset?.mime_type || value.fileType,
      previewUrl: getAssetUrl(asset),
    });
  }

  async function handleNext() {
    setError(null);
    const stepKey = currentStepKey;

    if (stepKey === 'source') {
      if (!sourceDocument.saved && !sourceDocument.file) {
        setError(new Error('Sube un documento PDF o Word para continuar.'));
        return;
      }
      if (sourceDocument.file && !isValidSourceDocument(sourceDocument.file)) {
        setError(new Error('El documento fuente debe ser PDF, DOC o DOCX.'));
        return;
      }
    }

    if (stepKey === 'editorial') {
      const result = await ensureDraft();
      if (!result.ok) return;
      if (sourceMode === 'upload') {
        const sourceResult = await saveSourceDocument(result.draft);
        if (!sourceResult.ok) {
          setMessage('Borrador editorial creado. Puedes reintentar la carga del documento.');
        }
      }
    }

    if (stepKey === 'content') {
      const hasText = pages.some((page) => page.text_content?.trim());
      if (!hasText) {
        setError(new Error('Agrega al menos una pagina con texto antes de continuar.'));
        return;
      }
      const result = await savePages();
      if (!result.ok) return;
    }

    if (stepKey === 'documentPreview' && !sourceDocument.saved) {
      const sourceResult = await saveSourceDocument();
      if (!sourceResult.ok) return;
    }

    if (stepKey === 'declarations' && !declarationsAccepted) {
      setError(new Error('Acepta las declaraciones editoriales antes de continuar.'));
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, activeSteps.length - 1));
  }

  function handleBack() {
    setError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function handleSubmitReview() {
    const draftResult = await ensureDraft();
    if (!draftResult.ok) return;

    let hasReviewSourceDocument = true;

    if (sourceMode === 'scratch') {
      const pageSaveResult = await savePages();
      if (!pageSaveResult.ok) return;
    }

    if (sourceMode === 'upload') {
      const sourceResult = await saveSourceDocument(draftResult.draft);
      if (!sourceResult.ok) {
        goToStep('source');
        return;
      }
      hasReviewSourceDocument = sourceDocument.saved || sourceResult.ok;
    }

    const validationError = validateReadyForReview({
      legend: getLegendPayload(),
      pages,
      requirePages: sourceMode === 'scratch',
      hasSourceDocument: hasReviewSourceDocument,
    });
    if (validationError) {
      setError(validationError);
      goToStep(sourceMode === 'scratch' ? 'content' : 'source');
      return;
    }

    if (!declarationsAccepted) {
      setError(new Error('Acepta las declaraciones editoriales antes de enviar a revision.'));
      goToStep('declarations');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: submitError } = await submitLegendForReview(draftResult.draft.version.id);
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setSubmitted(true);
    setMessage('Tu leyenda fue enviada a revision. El administrador la revisara antes de publicarla.');
  }

  if (!sourceMode) {
    return (
      <section className="page-stack creator-panel creator-create-flow">
        <div className="creator-editor-header">
          <div>
            <p className="creator-kicker">Sistema editorial</p>
            <h1>Crear o subir leyenda</h1>
            <p>Inicia un borrador real y completa el flujo editorial antes de enviarlo a revision.</p>
          </div>
        </div>

        <div className="creator-mode-grid">
          <Card className="creator-mode-card">
            <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">edit_note</span>
            <h2>Crear leyenda desde cero</h2>
            <p>Para autores que escribiran directamente en la plataforma por paginas.</p>
            <Button onClick={() => selectSourceMode('scratch')}>Crear desde cero</Button>
          </Card>
          <Card className="creator-mode-card">
            <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">upload_file</span>
            <h2>Subir leyenda existente</h2>
            <p>Registra tu obra desde Word o PDF y conserva el archivo como fuente editorial.</p>
            <Button variant="ghost" onClick={() => selectSourceMode('upload')}>Subir documento fuente</Button>
          </Card>
        </div>
      </section>
    );
  }

  // Fase 1 — Pantalla inicial compacta (crear desde cero): Titulo, Autor (auto),
  // Categoria/Etiquetas y Sinopsis. "Crear libro" crea el borrador y abre el editor.
  if (sourceMode === 'scratch' && !hasDraft) {
    const authorName = creatorSummary?.penName
      || creatorSummary?.profile?.pen_name
      || creatorSummary?.userLabel
      || 'Autor autenticado';
    const synopsisLength = form.synopsis.trim().length;
    const canProceed = Boolean(form.title.trim()) && synopsisLength >= 30;

    return (
      <section className="page-stack creator-panel creator-create-flow">
        <div className="creator-editor-header creator-start-hero">
          <div>
            <p className="creator-kicker">Nueva leyenda</p>
            <h1>Empecemos tu libro</h1>
            <p>Define lo esencial y entra directo al editor. El resto (portada, recursos, revision) lo completas dentro.</p>
          </div>
          <div className="creator-editor-actions">
            <Button variant="ghost" onClick={() => selectSourceMode(null)} disabled={saving}>Cambiar modo</Button>
          </div>
        </div>

        <Card className="creator-wizard-card creator-start-card">
          {error && <p className="error-message">{error.message}</p>}

          {scratchStep === 'form' && (
          <>
          <div className="creator-start-card-head">
            <div>
              <span className="creator-start-step">Paso 1 de 2</span>
              <h2>Datos principales</h2>
              <p>Con esta informacion se crea tu libro. Despues eliges la plantilla.</p>
            </div>
            <span className="creator-start-status">Crear desde cero</span>
          </div>

          <div className="creator-start-form">
            <label className="field form-span-2" htmlFor="start-title">
              <span>Titulo del libro</span>
              <input
                id="start-title"
                className="standalone-input"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Ej. La leyenda del Cenote Azul"
                autoFocus
                required
              />
            </label>

            <label className="field" htmlFor="start-author">
              <span>Autor</span>
              <input id="start-author" className="standalone-input" value={authorName} readOnly disabled />
              <small>Se toma automaticamente de tu perfil.</small>
            </label>

            <label className="field" htmlFor="start-genre-input">
              <span>Categoria y etiquetas</span>
              <input
                id="start-genre-input"
                className="standalone-input"
                value={genreInput}
                onChange={(event) => setGenreInput(event.target.value)}
                onKeyDown={handleGenreKeyDown}
                onBlur={() => addGenreChip()}
                placeholder="Terror, Misterio, Historico... (Enter o coma)"
              />
            </label>

            {genres.length > 0 && (
              <div className="creator-selected-chips form-span-2">
                {genres.map((genre) => (
                  <button type="button" key={genre} onClick={() => removeGenreChip(genre)}>
                    {genre}<span aria-hidden="true">x</span>
                  </button>
                ))}
              </div>
            )}

            <label className="field form-span-2" htmlFor="start-synopsis">
              <span>Sinopsis</span>
              <textarea
                id="start-synopsis"
                className="textarea"
                value={form.synopsis}
                onChange={(event) => updateField('synopsis', event.target.value)}
                rows={5}
                placeholder="Un resumen breve de la leyenda (minimo 30 caracteres)."
                required
              />
              <small className={synopsisLength >= 30 ? 'is-ready' : ''}>{synopsisLength}/30 caracteres minimos</small>
            </label>
          </div>

          <p className="creator-muted">
            Al crear el libro se guarda un borrador real con portada y contraportada listas.
          </p>

          <div className="creator-wizard-actions">
            <Button type="button" variant="ghost" onClick={() => selectSourceMode(null)} disabled={saving}>Atras</Button>
            <Button type="button" onClick={() => setScratchStep('template')} disabled={!canProceed}>
              Siguiente: elegir plantilla
            </Button>
          </div>
          </>
          )}

          {scratchStep === 'template' && (
          <>
          <div className="creator-start-card-head">
            <div>
              <span className="creator-start-step">Paso 2 de 2</span>
              <h2>Elige una plantilla</h2>
              <p>Se crea tu libro con portada y contraportada. Podras editarlas cuando quieras.</p>
            </div>
            <span className="creator-start-status">{getTemplateById(templateId)?.name || ''}</span>
          </div>

          <TemplatePicker value={templateId} onSelect={setTemplateId} meta={{ title: form.title, author: authorName }} />

          <div style={{ marginTop: 20 }}>
            <BookTemplatePreview templateId={templateId} meta={{ title: form.title, author: authorName, sinopsis: form.synopsis }} />
          </div>

          <div className="creator-wizard-actions">
            <Button type="button" variant="ghost" onClick={() => setScratchStep('form')} disabled={saving}>Atras</Button>
            <Button type="button" onClick={handleCreateBook} disabled={saving}>
              {saving ? 'Creando libro...' : 'Crear libro'}
            </Button>
          </div>
          </>
          )}
        </Card>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="page-stack creator-panel creator-create-flow">
        <Card className="creator-wizard-success">
          <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">task_alt</span>
          <h1>Leyenda enviada a revision</h1>
          <p>Tu leyenda fue enviada a revision. El administrador la revisara antes de publicarla.</p>
          <div className="creator-review-actions">
            <Link to="/creator/legends"><Button>Ver mis leyendas</Button></Link>
            <Link to="/creator"><Button variant="ghost">Volver al panel de autor</Button></Link>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="page-stack creator-panel creator-create-flow creator-wizard-flow">
      <div className="creator-editor-header">
        <div>
          <p className="creator-kicker">{modeLabel}</p>
          <h1>Preparar leyenda editorial</h1>
          <p>Crea un borrador, agrega contenido real y envia la obra a revision administrativa.</p>
        </div>
        {hasDraft && (
          <div className="creator-editor-actions">
            <Link to={`/creator/legends/${draft.legend.id}/edit`}><Button variant="ghost">Abrir editor completo</Button></Link>
          </div>
        )}
      </div>

      <Card className="creator-wizard-card">
        <WizardStepIndicator currentStep={currentStep} steps={activeSteps} />

        {error && <p className="error-message">{error.message}</p>}
        {message && <p className="success-message">{message}</p>}

        {currentStepKey === 'source' && (
          <div className="creator-wizard-step">
            <SourceDocumentPanel
              value={sourceDocument}
              canSave={hasDraft}
              saving={savingResourceKey === sourceDocumentDefinition.key}
              onChange={(value) => updateResource(sourceDocumentDefinition.key, value)}
              onSave={() => saveSourceDocument()}
            />
          </div>
        )}

        {currentStepKey === 'editorial' && (
          <div className="creator-wizard-step">
            <div className="creator-editor-card-title">
              <span>{currentStep + 1}</span>
              <div>
                <h2>Datos editoriales basicos</h2>
                <p>Esta informacion crea el borrador real en Supabase.</p>
              </div>
            </div>

            <div className="creator-start-form">
              <label className="field" htmlFor="wizard-title">
                <span>Titulo</span>
                <input id="wizard-title" className="standalone-input" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
              </label>
              <label className="field" htmlFor="wizard-slug">
                <span>Slug</span>
                <input
                  id="wizard-slug"
                  className="standalone-input"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    updateField('slug', slugify(event.target.value));
                  }}
                  required
                />
              </label>
              <label className="field form-span-2" htmlFor="wizard-synopsis">
                <span>Sinopsis</span>
                <textarea
                  id="wizard-synopsis"
                  className="textarea"
                  value={form.synopsis}
                  onChange={(event) => updateField('synopsis', event.target.value)}
                  rows={7}
                  required
                />
                <small>{form.synopsis.trim().length}/30 caracteres minimos</small>
              </label>
              <label className="field" htmlFor="wizard-origin">
                <span>Lugar de origen</span>
                <input id="wizard-origin" className="standalone-input" value={form.origin_place} onChange={(event) => updateField('origin_place', event.target.value)} required />
              </label>
              <label className="field" htmlFor="wizard-language">
                <span>Idioma</span>
                <input id="wizard-language" className="standalone-input" value={form.language} onChange={(event) => updateField('language', event.target.value)} required />
              </label>
              <label className="field" htmlFor="wizard-age">
                <span>Publico objetivo</span>
                <select id="wizard-age" className="select" value={form.age_rating} onChange={(event) => updateField('age_rating', event.target.value)}>
                  {ageRatingOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field" htmlFor="wizard-access">
                <span>Tipo de acceso</span>
                <select id="wizard-access" className="select" value={form.access_type} onChange={(event) => updateField('access_type', event.target.value)}>
                  {accessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <div className="creator-section-block">
              <h3>Generos</h3>
              <label className="field" htmlFor="wizard-genre-input">
                <span>Escribe generos y presiona Enter o coma</span>
                <input
                  id="wizard-genre-input"
                  className="standalone-input"
                  value={genreInput}
                  onChange={(event) => setGenreInput(event.target.value)}
                  onKeyDown={handleGenreKeyDown}
                  onBlur={() => addGenreChip()}
                  placeholder="Terror, Misterio, Leyenda Maya..."
                />
              </label>
              {genres.length > 0 && (
                <div className="creator-selected-chips">
                  {genres.map((genre) => (
                    <button type="button" key={genre} onClick={() => removeGenreChip(genre)}>
                      {genre}<span aria-hidden="true">x</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="creator-muted">
                Si un genero no existe, el sistema intentara crearlo y vincularlo con la leyenda.
              </p>
            </div>
          </div>
        )}

        {currentStepKey === 'resources' && (
          <div className="creator-wizard-step">
            <div className="creator-editor-card-title">
              <span>{currentStep + 1}</span>
              <div>
                <h2>Portada y banner</h2>
                <p>Los recursos visuales son recomendados, no obligatorios para guardar el borrador.</p>
              </div>
            </div>
            <div className="creator-resource-grid creator-resource-grid-roomy">
              {mediaResourceDefinitions.map((definition) => (
                <ResourceCard
                  key={definition.key}
                  definition={definition}
                  value={resources[definition.key]}
                  disabled={!hasDraft}
                  saving={savingResourceKey === definition.key}
                  onChange={(value) => updateResource(definition.key, value)}
                  onSave={saveResource}
                />
              ))}
            </div>
          </div>
        )}

        {currentStepKey === 'content' && (
          <div className="creator-wizard-step">
            <div className="creator-editor-card-title">
              <span>{currentStep + 1}</span>
              <div>
                <h2>Contenido de la leyenda</h2>
                <p>Escribe la historia por páginas con el editor editorial. Cada página guarda su propio contenido.</p>
              </div>
            </div>
            <EditorialRichEditor
              pages={pages}
              selectedPageId={selectedPage?.client_id}
              onSelectPage={setSelectedPageKey}
              onPageDataChange={patchPageById}
              onTitleChange={(id, title) => patchPageById(id, { title })}
              onAddPage={addPage}
              onRemovePage={removePage}
              onSave={savePages}
              saving={saving}
              canSave={hasDraft}
              expandHref={hasDraft && draft?.legend?.id ? `/creator/legends/${draft.legend.id}/write` : ''}
              legendId={draft?.legend?.id || ''}
            />
          </div>
        )}

        {currentStepKey === 'documentPreview' && (
          <div className="creator-wizard-step">
            <div className="creator-editor-card-title">
              <span>{currentStep + 1}</span>
              <div>
                <h2>Vista previa del documento</h2>
                <p>Revisa el archivo fuente guardado antes de preparar portada, modelo, marcador y asociacion por pagina.</p>
              </div>
            </div>
            <DocumentPreviewPanel sourceDocument={sourceDocument} />
          </div>
        )}

        {currentStepKey === 'ar' && (
          <div className="creator-wizard-step">
            <div className="creator-editor-card-title">
              <span>{currentStep + 1}</span>
              <div>
                <h2>Recursos 3D / AR</h2>
                <p>Puedes enriquecer la obra ahora o dejarlo para despues. La revision puede continuar sin esto.</p>
              </div>
            </div>
            {sourceMode === 'scratch' ? (
              <div className="creator-ar-link-row">
                <label className="field" htmlFor="wizard-ar-page">
                  <span>Pagina asociada</span>
                  <select id="wizard-ar-page" className="select" value={arPageNumber} onChange={(event) => setArPageNumber(event.target.value)}>
                    {pages.map((page) => (
                      <option key={page.client_id} value={page.page_number}>Pagina {page.page_number}</option>
                    ))}
                  </select>
                </label>
                <p>Si guardas un modelo 3D, se preparara una escena AR vinculada a la pagina elegida.</p>
              </div>
            ) : (
              <p className="creator-checklist-note">
                En una leyenda subida como documento, guarda los recursos y abre el editor completo para colocar el marcador sobre una pagina renderizada y asociar el modelo.
              </p>
            )}
            <div className="creator-resource-grid creator-resource-grid-roomy">
              {arResourceDefinitions.map((definition) => (
                <ResourceCard
                  key={definition.key}
                  definition={definition}
                  value={resources[definition.key]}
                  disabled={!hasDraft}
                  saving={savingResourceKey === definition.key}
                  onChange={(value) => updateResource(definition.key, value)}
                  onSave={saveResource}
                />
              ))}
            </div>
          </div>
        )}

        {currentStepKey === 'declarations' && (
          <div className="creator-wizard-step">
            <div className="creator-editor-card-title">
              <span>{currentStep + 1}</span>
              <div>
                <h2>Declaraciones editoriales</h2>
                <p>Estas confirmaciones son obligatorias para enviar tu leyenda a revisión.</p>
              </div>
            </div>
            <div className="creator-declaration-list">
              <label className="creator-declaration-item">
                <input type="checkbox" checked={declarations.authorship} onChange={(event) => updateDeclaration('authorship', event.target.checked)} />
                <span>Confirmo que soy autor o tengo permiso para publicar esta leyenda.</span>
              </label>
              <label className="creator-declaration-item">
                <input type="checkbox" checked={declarations.rights} onChange={(event) => updateDeclaration('rights', event.target.checked)} />
                <span>Confirmo que imagenes, documentos, modelos 3D o marcadores son propios o autorizados.</span>
              </label>
              <label className="creator-declaration-item">
                <input type="checkbox" checked={declarations.review} onChange={(event) => updateDeclaration('review', event.target.checked)} />
                <span>Acepto que el administrador revise mi obra antes de publicarla.</span>
              </label>
              <label className="creator-declaration-item">
                <input type="checkbox" checked={declarations.changes} onChange={(event) => updateDeclaration('changes', event.target.checked)} />
                <span>Entiendo que la obra puede ser aprobada, rechazada o enviada a cambios.</span>
              </label>
            </div>
          </div>
        )}

        {currentStepKey === 'review' && (
          <div className="creator-wizard-step">
            <div className="creator-editor-card-title">
              <span>{currentStep + 1}</span>
              <div>
                <h2>Revision y envio</h2>
                <p>Confirma el resumen antes de enviar la version a revision.</p>
              </div>
            </div>
            <FinalReviewPanel
              form={form}
              genres={genres}
              resources={resources}
              pages={pages}
              sourceMode={sourceMode}
              declarationsAccepted={declarationsAccepted}
              creatorSummary={creatorSummary}
            />
            <div className="creator-review-grid">
              <span className={form.title && form.slug ? 'ready' : ''}>Titulo y slug</span>
              <span className={form.synopsis.trim().length >= 30 ? 'ready' : ''}>Sinopsis</span>
              <span className={form.origin_place ? 'ready' : ''}>Lugar de origen</span>
              {sourceMode === 'scratch' ? (
                <span className={validPageCount > 0 ? 'ready' : ''}>Al menos una pagina</span>
              ) : (
                <span className={sourceDocument.saved ? 'ready' : ''}>Documento fuente {sourceDocument.saved ? 'guardado' : 'pendiente'}</span>
              )}
              <span className={declarationsAccepted ? 'ready' : ''}>Declaraciones aceptadas</span>
              <span className={resources.cover.saved ? 'ready' : ''}>Portada {resources.cover.saved ? 'lista' : 'recomendada'}</span>
              <span className={resources.banner.saved ? 'ready' : ''}>Banner {resources.banner.saved ? 'listo' : 'recomendado'}</span>
              <span className={resources.model3d.saved || resources.marker.saved ? 'ready' : ''}>3D / AR {resources.model3d.saved || resources.marker.saved ? 'preparado' : 'pendiente'}</span>
            </div>
            <p className="creator-checklist-note">
              El boton final envia a revision administrativa. No publica la obra.
            </p>
          </div>
        )}

        <div className="creator-wizard-actions">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={currentStep === 0 || saving || submitting}>
            Atras
          </Button>
          {currentStep < activeSteps.length - 1 ? (
            <Button type="button" onClick={handleNext} disabled={saving || submitting}>
              {currentStepKey === 'editorial' && !hasDraft ? 'Crear borrador' : 'Continuar'}
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmitReview} disabled={submitting || saving || !hasDraft}>
              {submitting ? 'Enviando...' : 'Enviar a revision'}
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}

export default CreateLegendPage;
