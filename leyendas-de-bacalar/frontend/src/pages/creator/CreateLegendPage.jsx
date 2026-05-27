import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { createLegendDraft } from '../../services/creatorLegendService.js';
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
  const [genreInput, setGenreInput] = useState('');
  const [documentSource, setDocumentSource] = useState({ url: '', file: null });
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  }

  function addGenre() {
    const nextGenre = genreInput.trim();
    if (!nextGenre) return;
    setGenres((current) => (current.includes(nextGenre) ? current : [...current, nextGenre]));
    setGenreInput('');
  }

  function removeGenre(genre) {
    setGenres((current) => current.filter((item) => item !== genre));
  }

  function handleGenreKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addGenre();
    }
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

    if (!data?.legend?.id) {
      setError(new Error('No pudimos guardar la leyenda.'));
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
          <h1>Crear Nueva Leyenda</h1>
          <p>Empieza con lo esencial. Despues agregaras paginas, recursos y experiencia AR en el editor.</p>
        </div>
      </div>

      {!mode && (
        <div className="creator-mode-grid">
          <Card className="creator-mode-card">
            <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">edit_note</span>
            <h2>Crear leyenda desde cero</h2>
            <p>Escribe tu historia directamente en el editor.</p>
            <Button onClick={() => {
              setSourceMode('scratch');
              setMode('scratch');
            }}>Crear desde cero</Button>
          </Card>
          <Card className="creator-mode-card">
            <span className="material-symbols-rounded creator-editor-icon" aria-hidden="true">picture_as_pdf</span>
            <h2>Cargar leyenda existente</h2>
            <p>Sube un PDF o documento fuente para usarlo como apoyo.</p>
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
              <h2>Carga de documento</h2>
              <p>El PDF se guardara como documento fuente. La extraccion automatica del contenido se implementara despues.</p>
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
        <Card className="creator-editor-card">
          <div className="creator-editor-card-title">
            <span>1</span>
            <div>
              <h2>Datos generales</h2>
              <p>Primero crea el borrador real. Luego escribirás contenido y agregarás recursos.</p>
            </div>
          </div>

          <form className="creator-start-form" onSubmit={handleStart}>
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
            <label className="field" htmlFor="legend-short">
              <span>Sinopsis breve</span>
              <textarea id="legend-short" className="textarea" value={form.short_synopsis} onChange={(event) => updateField('short_synopsis', event.target.value)} rows={3} required />
            </label>
            <label className="field" htmlFor="legend-synopsis">
              <span>Sinopsis completa</span>
              <textarea id="legend-synopsis" className="textarea" value={form.synopsis} onChange={(event) => updateField('synopsis', event.target.value)} rows={5} required />
            </label>
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

            <div className="field form-span-2">
              <span>Generos</span>
              <div className="creator-genre-input">
                <input
                  className="standalone-input"
                  value={genreInput}
                  onChange={(event) => setGenreInput(event.target.value)}
                  onKeyDown={handleGenreKeyDown}
                  placeholder="Agregar genero y presionar Enter"
                />
                <Button type="button" variant="ghost" onClick={addGenre}>Agregar</Button>
              </div>
              <div className="creator-genre-chips">
                {genres.map((genre) => (
                  <button key={genre} type="button" onClick={() => removeGenre(genre)}>
                    {genre}
                    <span aria-hidden="true">x</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="error-message form-span-2">{error.message}</p>}

            <div className="creator-review-actions form-span-2">
              <Button type="button" variant="ghost" onClick={() => {
                setSourceMode(null);
                setMode(null);
              }}>Cambiar modo</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Empezar a crear'}</Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}

export default CreateLegendPage;
