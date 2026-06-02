import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { createLegendDraft, getAvailableGenres } from '../../services/creatorLegendService.js';
import { saveLegendResource } from '../../services/assetService.js';

const accessTypeOptions = [
  { value: 'free', label: 'Gratis' },
  { value: 'paid', label: 'Compra' },
  { value: 'subscription', label: 'Suscripcion' },
  { value: 'code_required', label: 'Codigo fisico' },
  { value: 'mixed', label: 'Mixto' },
];

const ageRatings = ['general', '7+', '12+', '16+'];

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function CreateLegendPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [sourceMode, setSourceMode] = useState(null);
  const [form, setForm] = useState(getInitialForm);
  const [genres, setGenres] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [documentSource, setDocumentSource] = useState({ url: '', file: null });
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadGenres() {
      setGenresLoading(true);
      const { data, error: genresError } = await getAvailableGenres();
      if (genresError) console.error('getAvailableGenres error', genresError);
      if (mounted) {
        setAvailableGenres(data ?? []);
        setGenresLoading(false);
      }
    }

    loadGenres();

    return () => {
      mounted = false;
    };
  }, []);

  const accessLabel = useMemo(() => (
    accessTypeOptions.find((option) => option.value === form.access_type)?.label || 'Gratis'
  ), [form.access_type]);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  }

  function toggleGenre(genreName) {
    setGenres((current) => (
      current.includes(genreName)
        ? current.filter((item) => item !== genreName)
        : [...current, genreName]
    ));
  }

  async function handleStart(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: createError } = await createLegendDraft({
      ...form,
      slug: form.slug || slugify(form.title),
      genres,
    });

    if (createError) {
      setError(createError);
      setLoading(false);
      return;
    }

    if (!data?.legend?.id || !data?.version?.id) {
      setError(new Error('No pudimos crear la version inicial.'));
      setLoading(false);
      return;
    }

    if (sourceMode === 'document' && (documentSource.url.trim() || documentSource.file)) {
      const resourceResult = await saveLegendResource({
        legendId: data.legend.id,
        resource: {
          key: 'pdf',
          assetType: 'pdf',
          kind: 'document',
          documentType: 'pdf',
          url: documentSource.url,
          file: documentSource.file,
        },
      });

      if (resourceResult.error) {
        console.error('asset upload/link error', resourceResult.error);
        setError(new Error('El borrador se creo, pero no pudimos guardar el PDF. Puedes adjuntarlo desde Recursos.'));
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    navigate(`/creator/legends/${data.legend.id}/edit`);
  }

  return (
    <section className="page-stack creator-panel creator-create-flow">
      <div className="creator-editor-header">
        <div>
          <p className="creator-kicker">Nueva obra</p>
          <h1>Crear leyenda</h1>
          <p>Primero crea un borrador real. Despues escribiras paginas, recursos y experiencia 3D/AR.</p>
        </div>
      </div>

      {!mode && (
        <div className="creator-mode-grid">
          <Card className="creator-mode-card">
            <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">edit_note</span>
            <h2>Crear leyenda desde cero</h2>
            <p>Escribe tu historia directamente en el editor editorial.</p>
            <Button onClick={() => {
              setSourceMode('scratch');
              setMode('scratch');
            }}>Crear desde cero</Button>
          </Card>
          <Card className="creator-mode-card">
            <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">picture_as_pdf</span>
            <h2>Cargar leyenda existente</h2>
            <p>Guarda un PDF como documento fuente y continua escribiendo paginas despues.</p>
            <Button variant="ghost" onClick={() => {
              setSourceMode('document');
              setMode('document');
            }}>Preparar documento</Button>
          </Card>
        </div>
      )}

      {mode === 'document' && (
        <Card className="creator-editor-card">
          <div className="creator-editor-card-title">
            <span>0</span>
            <div>
              <h2>Documento fuente</h2>
              <p>El PDF se guardara como recurso de apoyo. La extraccion automatica se implementara despues.</p>
            </div>
          </div>
          <div className="creator-start-form">
            <label className="field" htmlFor="source-pdf-url">
              <span>URL del PDF</span>
              <input
                id="source-pdf-url"
                className="standalone-input"
                value={documentSource.url}
                onChange={(event) => setDocumentSource((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <label className="field" htmlFor="source-pdf-file">
              <span>Archivo PDF</span>
              <input
                id="source-pdf-file"
                className="standalone-input"
                type="file"
                accept=".pdf"
                onChange={(event) => setDocumentSource((current) => ({ ...current, file: event.target.files?.[0] || null }))}
              />
            </label>
          </div>
          <div className="creator-review-actions">
            <Button variant="ghost" onClick={() => {
              setSourceMode(null);
              setMode(null);
            }}>Volver</Button>
            <Button onClick={() => setMode('scratch')}>Continuar con datos generales</Button>
          </div>
        </Card>
      )}

      {mode === 'scratch' && (
        <div className="creator-editor-shell-grid">
          <Card className="creator-editor-card">
            <div className="creator-editor-card-title">
              <span>1</span>
              <div>
                <h2>Datos de la obra</h2>
                <p>Crea la ficha editorial inicial para abrir el editor completo.</p>
              </div>
            </div>

            <form className="creator-start-form" onSubmit={handleStart}>
              <div className="creator-section-block form-span-2">
                <h3>Identidad</h3>
                <div className="creator-start-form">
                  <label className="field" htmlFor="legend-title">
                    <span>Titulo de la leyenda</span>
                    <input id="legend-title" className="standalone-input" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
                  </label>
                  <label className="field" htmlFor="legend-slug">
                    <span>Slug</span>
                    <input
                      id="legend-slug"
                      className="standalone-input"
                      value={form.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        updateField('slug', slugify(event.target.value));
                      }}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="creator-section-block form-span-2">
                <h3>Presentacion</h3>
                <div className="creator-start-form">
                  <label className="field" htmlFor="legend-short">
                    <span>Sinopsis breve</span>
                    <textarea id="legend-short" className="textarea" value={form.short_synopsis} onChange={(event) => updateField('short_synopsis', event.target.value)} rows={3} required />
                  </label>
                  <label className="field" htmlFor="legend-synopsis">
                    <span>Sinopsis completa</span>
                    <textarea id="legend-synopsis" className="textarea" value={form.synopsis} onChange={(event) => updateField('synopsis', event.target.value)} rows={5} required />
                  </label>
                </div>
              </div>

              <div className="creator-section-block form-span-2">
                <h3>Catalogacion</h3>
                <div className="creator-start-form">
                  <label className="field" htmlFor="legend-origin">
                    <span>Lugar de origen</span>
                    <input id="legend-origin" className="standalone-input" value={form.origin_place} onChange={(event) => updateField('origin_place', event.target.value)} required />
                  </label>
                  <label className="field" htmlFor="legend-language">
                    <span>Idioma</span>
                    <input id="legend-language" className="standalone-input" value={form.language} onChange={(event) => updateField('language', event.target.value)} required />
                  </label>
                  <label className="field" htmlFor="legend-age">
                    <span>Clasificacion</span>
                    <select id="legend-age" className="select" value={form.age_rating} onChange={(event) => updateField('age_rating', event.target.value)}>
                      {ageRatings.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
                    </select>
                  </label>
                  <label className="field" htmlFor="legend-access">
                    <span>Tipo de acceso</span>
                    <select id="legend-access" className="select" value={form.access_type} onChange={(event) => updateField('access_type', event.target.value)}>
                      {accessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div className="creator-section-block form-span-2">
                <h3>Generos</h3>
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
                      >
                        {genre.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="creator-muted">No hay generos disponibles.</p>
                )}
              </div>

              {error && <p className="error-message form-span-2">{error.message}</p>}

              <div className="creator-review-actions form-span-2">
                <Button type="button" variant="ghost" onClick={() => {
                  setSourceMode(null);
                  setMode(null);
                }}>Cambiar modo</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Creando borrador...' : 'Crear borrador editorial'}</Button>
              </div>
            </form>
          </Card>

          <Card className="creator-editor-preview-card">
            <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">auto_stories</span>
            <p className="creator-kicker">Vista previa</p>
            <h2>{form.title || 'Titulo de tu leyenda'}</h2>
            <p>{form.short_synopsis || 'La sinopsis breve aparecera aqui para revisar como se lee la ficha inicial.'}</p>
            <div className="creator-review-grid compact">
              <span className={form.origin_place ? 'ready' : ''}>{form.origin_place || 'Origen pendiente'}</span>
              <span className="ready">{accessLabel}</span>
              <span className={genres.length ? 'ready' : ''}>{genres.length ? `${genres.length} generos` : 'Sin generos'}</span>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

export default CreateLegendPage;
