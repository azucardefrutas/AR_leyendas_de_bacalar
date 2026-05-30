import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import {
  canEditVersion,
  deleteLegendPage,
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

const tabs = [
  { key: 'general', label: 'Datos generales', icon: 'contract_edit' },
  { key: 'content', label: 'Contenido', icon: 'article' },
  { key: 'resources', label: 'Recursos', icon: 'photo_library' },
  { key: 'ar', label: '3D / AR', icon: 'view_in_ar' },
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
    assetType: 'cover',
    mediaType: 'cover',
    kind: 'media',
    accept: '.png,.jpg,.jpeg,.webp',
  },
  {
    key: 'banner',
    tab: 'resources',
    title: 'Banner',
    description: 'Imagen horizontal para hero o promociones internas.',
    assetType: 'banner',
    mediaType: 'banner',
    kind: 'media',
    accept: '.png,.jpg,.jpeg,.webp',
  },
  {
    key: 'backdrop',
    tab: 'resources',
    title: 'Imagen de fondo',
    description: 'Imagen ambiental para detalle o lector.',
    assetType: 'backdrop',
    mediaType: 'backdrop',
    kind: 'media',
    accept: '.png,.jpg,.jpeg,.webp',
  },
  {
    key: 'pdf',
    tab: 'resources',
    title: 'PDF opcional',
    description: 'Documento fuente o edicion digital de apoyo.',
    assetType: 'pdf',
    documentType: 'pdf',
    kind: 'document',
    accept: '.pdf',
  },
  {
    key: 'model3d',
    tab: 'ar',
    title: 'Modelo 3D',
    description: 'Archivo GLB/GLTF para escenas futuras.',
    assetType: 'model_3d',
    kind: 'ar_model',
    accept: '.glb,.gltf',
  },
  {
    key: 'marker',
    tab: 'ar',
    title: 'Marcador AR',
    description: 'Imagen fisica que activara una escena AR mas adelante.',
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

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">{name}</span>;
}

function statusLabel(status) {
  const labels = {
    draft: 'Borrador',
    in_review: 'En revision',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    published: 'Publicada',
  };
  return labels[status] || status || 'Borrador';
}

function hasResource(resources, key) {
  if (!resources) return false;
  if (key === 'cover' || key === 'banner' || key === 'backdrop') {
    return resources.media?.some((item) => item.media_type === key || item.type === key);
  }
  if (key === 'pdf') return Boolean(resources.documents?.length);
  if (key === 'model3d') return Boolean(resources.arScenes?.length);
  if (key === 'marker') return Boolean(resources.arMarkers?.length);
  return false;
}

function ResourceCard({ definition, value, existing, disabled, saving, onChange, onSave }) {
  const fileName = value.file?.name;
  const icon = definition.kind === 'document' ? 'picture_as_pdf' : definition.kind.startsWith('ar') ? 'view_in_ar' : 'image';

  return (
    <Card className="creator-resource-card">
      <div className="creator-resource-heading">
        <span><MaterialIcon name={icon} /></span>
        <div>
          <h3>{definition.title}</h3>
          <p>{definition.description}</p>
        </div>
      </div>

      <span className={`creator-resource-status ${existing || value.saved ? 'ready' : ''}`}>
        {existing || value.saved ? 'Cargado' : 'Sin recurso'}
      </span>

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

      {value.url && definition.assetType !== 'pdf' && definition.assetType !== 'model_3d' && (
        <div className="creator-resource-preview">
          <img src={value.url} alt={`Vista previa ${definition.title}`} />
        </div>
      )}

      {value.message && <p className="success-message">{value.message}</p>}
      {value.error && <p className="error-message">{value.error}</p>}

      <Button type="button" variant="ghost" onClick={() => onSave(definition)} disabled={disabled || saving || (!value.file && !value.url.trim())}>
        {saving ? 'Guardando...' : 'Guardar recurso'}
      </Button>
    </Card>
  );
}

function LegendEditor({ legendId }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('content');
  const [legend, setLegend] = useState(null);
  const [version, setVersion] = useState(null);
  const [form, setForm] = useState(getInitialForm);
  const [pages, setPages] = useState([createPage(1)]);
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [resources, setResources] = useState(defaultResources);
  const [existingResources, setExistingResources] = useState({ media: [], documents: [], arScenes: [], arMarkers: [] });
  const [arPageNumber, setArPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingResourceKey, setSavingResourceKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadEditor() {
    setLoading(true);
    const { data, error: editorError } = await getLegendEditorData(legendId);
    if (editorError) setError(editorError);
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
  const canEdit = canEditVersion(version);
  const isReviewLocked = !canEdit;
  const reviewError = validateReadyForReview({ legend: form, pages });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePage(field, value) {
    setPages((current) => current.map((page, index) => (
      index === selectedPageIndex ? { ...page, [field]: value } : page
    )));
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

    const { data, error: saveError } = await updateLegendGeneralData(legend.id, form);
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
    setMessage('Paginas guardadas.');
    return true;
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
      const sceneId = existingResources.arScenes?.[0]?.id;
      if (sceneId && result.data?.asset?.id) {
        await createArMarker({ legendId: legend.id, sceneId, markerAssetId: result.data.asset.id });
      }
    }

    setSavingResourceKey(null);

    if (result.error) {
      updateResource(definition.key, { ...value, error: result.error.message });
      return;
    }

    updateResource(definition.key, { url: '', file: null, saved: true, message: 'Recurso guardado.', error: '' });
    await loadEditor();
  }

  async function handleSubmitReview() {
    const validationError = validateReadyForReview({ legend: form, pages });
    if (validationError) {
      setError(validationError);
      setActiveTab('review');
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

    const pagesSaved = await handleSavePages();
    if (!pagesSaved) {
      setSubmitting(false);
      return;
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
          <p>Version {version.version_number || 1} · {statusLabel(version.status)}</p>
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
          <strong>Esta version esta en {statusLabel(version.status)}.</strong>
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
              <h2>Contenido de la leyenda</h2>
              <p>{visiblePages.length} paginas en esta version.</p>
            </div>
          </div>

          {visiblePages.length === 0 ? (
            <div className="creator-empty-editor">
              <MaterialIcon name="note_add" />
              <h3>Aun no has agregado paginas.</h3>
              <p>Empieza creando la primera pagina de tu leyenda.</p>
              <Button type="button" onClick={addPage} disabled={isReviewLocked}>Anadir pagina</Button>
            </div>
          ) : (
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
                <div className="creator-review-actions">
                  <Button type="button" onClick={handleSavePages} disabled={saving || isReviewLocked}>{saving ? 'Guardando...' : 'Guardar paginas'}</Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'resources' && (
        <div className="creator-resource-grid creator-resource-grid-roomy">
          {resourceDefinitions.filter((definition) => definition.tab === 'resources').map((definition) => (
            <ResourceCard
              key={definition.key}
              definition={definition}
              value={resources[definition.key]}
              existing={hasResource(existingResources, definition.key)}
              disabled={isReviewLocked}
              saving={savingResourceKey === definition.key}
              onChange={(value) => updateResource(definition.key, value)}
              onSave={handleSaveResource}
            />
          ))}
        </div>
      )}

      {activeTab === 'ar' && (
        <div className="page-stack">
          <Card className="creator-editor-card">
            <div className="creator-editor-card-title">
              <span>3</span>
              <div>
                <h2>Experiencia 3D y AR</h2>
                <p>Prepara modelo 3D, marcador fisico y asociacion con una pagina.</p>
              </div>
            </div>
            <div className="creator-ar-link-row">
              <label className="field" htmlFor="ar-page">
                <span>Asociar escena 3D a pagina</span>
                <select id="ar-page" className="select" value={arPageNumber} onChange={(event) => setArPageNumber(event.target.value)} disabled={isReviewLocked}>
                  {visiblePages.map((page) => (
                    <option key={page.client_id} value={page.page_number}>Pagina {page.page_number}</option>
                  ))}
                </select>
              </label>
              <p>Si registras un modelo 3D, se preparara una escena AR vinculada a la pagina elegida.</p>
            </div>
          </Card>

          <div className="creator-resource-grid creator-resource-grid-roomy">
            {resourceDefinitions.filter((definition) => definition.tab === 'ar').map((definition) => (
              <ResourceCard
                key={definition.key}
                definition={definition}
                value={resources[definition.key]}
                existing={hasResource(existingResources, definition.key)}
                disabled={isReviewLocked}
                saving={savingResourceKey === definition.key}
                onChange={(value) => updateResource(definition.key, value)}
                onSave={handleSaveResource}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <Card className="creator-editor-card">
          <div className="creator-editor-card-title">
            <span>4</span>
            <div>
              <h2>Revision y envio</h2>
              <p>Confirma que la obra tiene lo necesario antes de enviarla al admin.</p>
            </div>
          </div>

          <div className="creator-review-grid">
            <span className={form.title && form.synopsis && form.short_synopsis ? 'ready' : ''}>Datos generales</span>
            <span className={visiblePages.some((page) => page.text_content?.trim()) ? 'ready' : ''}>Paginas con texto: {visiblePages.filter((page) => page.text_content?.trim()).length}</span>
            <span className={hasResource(existingResources, 'cover') ? 'ready' : ''}>Portada {hasResource(existingResources, 'cover') ? 'cargada' : 'pendiente'}</span>
            <span className={hasResource(existingResources, 'banner') ? 'ready' : ''}>Banner {hasResource(existingResources, 'banner') ? 'cargado' : 'opcional'}</span>
            <span className={hasResource(existingResources, 'pdf') ? 'ready' : ''}>PDF {hasResource(existingResources, 'pdf') ? 'cargado' : 'opcional'}</span>
            <span className={hasResource(existingResources, 'model3d') ? 'ready' : ''}>Modelo 3D {hasResource(existingResources, 'model3d') ? 'listo' : 'opcional'}</span>
            <span className={hasResource(existingResources, 'marker') ? 'ready' : ''}>Marcador AR {hasResource(existingResources, 'marker') ? 'listo' : 'opcional'}</span>
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
    </section>
  );
}

export default LegendEditor;
