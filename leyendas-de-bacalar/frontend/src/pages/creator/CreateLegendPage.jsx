import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { createLegend, createLegendVersion } from '../../services/creatorService.js';

const accessTypes = ['free', 'paid', 'subscription', 'code_required', 'mixed'];
const ageRatings = ['general', '7+', '12+', '16+'];

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CreateLegendPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    slug: '',
    synopsis: '',
    short_synopsis: '',
    origin_place: 'Bacalar',
    language: 'es',
    age_rating: 'general',
    access_type: 'free',
    is_featured: false,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && !slugTouched) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data: legend, error: legendError } = await createLegend({
      ...form,
      slug: form.slug || slugify(form.title),
      status: 'draft',
    });

    if (legendError) {
      setError(legendError);
      setLoading(false);
      return;
    }

    const { error: versionError } = await createLegendVersion(legend.id, 1);
    setLoading(false);

    if (versionError) {
      setError(versionError);
      return;
    }

    navigate(`/creator/legends/${legend.id}/edit`);
  }

  return (
    <section className="page-stack creator-panel">
      <div>
        <p className="eyebrow">Nueva obra</p>
        <h1>Crear leyenda</h1>
      </div>

      <Card>
        <form className="form-grid" onSubmit={handleSubmit}>
          <Input
            id="legend-title"
            label="Titulo"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            required
          />
          <Input
            id="legend-slug"
            label="Slug"
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              updateField('slug', slugify(event.target.value));
            }}
            required
          />
          <label className="field form-span-2" htmlFor="legend-short">
            <span>Sinopsis breve</span>
            <textarea
              id="legend-short"
              className="textarea"
              value={form.short_synopsis}
              onChange={(event) => updateField('short_synopsis', event.target.value)}
              rows={3}
            />
          </label>
          <label className="field form-span-2" htmlFor="legend-synopsis">
            <span>Sinopsis</span>
            <textarea
              id="legend-synopsis"
              className="textarea"
              value={form.synopsis}
              onChange={(event) => updateField('synopsis', event.target.value)}
              rows={5}
              required
            />
          </label>
          <Input
            id="legend-origin"
            label="Lugar de origen"
            value={form.origin_place}
            onChange={(event) => updateField('origin_place', event.target.value)}
          />
          <Input
            id="legend-language"
            label="Idioma"
            value={form.language}
            onChange={(event) => updateField('language', event.target.value)}
          />
          <label className="field" htmlFor="legend-age">
            <span>Clasificacion</span>
            <select
              id="legend-age"
              className="select"
              value={form.age_rating}
              onChange={(event) => updateField('age_rating', event.target.value)}
            >
              {ageRatings.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="legend-access">
            <span>Tipo de acceso</span>
            <select
              id="legend-access"
              className="select"
              value={form.access_type}
              onChange={(event) => updateField('access_type', event.target.value)}
            >
              {accessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="checkbox-field form-span-2">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(event) => updateField('is_featured', event.target.checked)}
            />
            Destacar leyenda cuando sea publicada
          </label>
          {error && <p className="error-message form-span-2">{error.message}</p>}
          <div className="form-actions form-span-2">
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar borrador'}</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

export default CreateLegendPage;
