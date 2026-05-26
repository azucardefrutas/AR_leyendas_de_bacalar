import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import {
  createLegendPage,
  getLegendPagesByVersion,
  getLegendVersions,
  getMyLegend,
  submitVersionForReview,
  updateLegend,
} from '../../services/creatorService.js';

const editableStatuses = ['draft', 'rejected'];

function EditLegendPage() {
  const { id, legendId } = useParams();
  const resolvedLegendId = id || legendId;
  const [legend, setLegend] = useState(null);
  const [versions, setVersions] = useState([]);
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(null);
  const [pageForm, setPageForm] = useState({ page_number: 1, title: '', text_content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageSaving, setPageSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const activeVersion = useMemo(() => versions[0] ?? null, [versions]);
  const canEdit = editableStatuses.includes(activeVersion?.status || 'draft');

  useEffect(() => {
    async function loadEditor() {
      const { data: legendData, error: legendError } = await getMyLegend(resolvedLegendId);
      const { data: versionData, error: versionsError } = await getLegendVersions(resolvedLegendId);
      const firstVersion = versionData?.[0] ?? null;
      const pagesResult = firstVersion
        ? await getLegendPagesByVersion(firstVersion.id)
        : { data: [], error: null };

      setLegend(legendData);
      setVersions(versionData ?? []);
      setPages(pagesResult.data ?? []);
      setError(legendError || versionsError || pagesResult.error);
      setForm(legendData ? {
        title: legendData.title || '',
        slug: legendData.slug || '',
        synopsis: legendData.synopsis || '',
        short_synopsis: legendData.short_synopsis || '',
        origin_place: legendData.origin_place || '',
        language: legendData.language || 'es',
        age_rating: legendData.age_rating || 'general',
        access_type: legendData.access_type || 'free',
        is_featured: Boolean(legendData.is_featured),
      } : null);
      setLoading(false);
    }

    loadEditor();
  }, [resolvedLegendId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePageField(field, value) {
    setPageForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const { data, error: saveError } = await updateLegend(resolvedLegendId, form);
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    setLegend(data);
    setMessage('Leyenda actualizada.');
  }

  async function handleAddPage(event) {
    event.preventDefault();
    if (!activeVersion) {
      setError(new Error('No hay una version activa para agregar paginas.'));
      return;
    }

    setPageSaving(true);
    setError(null);
    setMessage(null);

    const { data, error: pageError } = await createLegendPage({
      version_id: activeVersion.id,
      page_number: Number(pageForm.page_number),
      title: pageForm.title,
      text_content: pageForm.text_content,
    });

    setPageSaving(false);

    if (pageError) {
      setError(pageError);
      return;
    }

    setPages((current) => [...current, data].sort((a, b) => a.page_number - b.page_number));
    setPageForm({ page_number: Number(pageForm.page_number) + 1, title: '', text_content: '' });
    setMessage('Pagina agregada.');
  }

  async function handleSubmitReview() {
    if (!activeVersion) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: submitError } = await submitVersionForReview(activeVersion.id);
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setVersions((current) => current.map((version) => (
      version.id === activeVersion.id ? { ...version, status: 'in_review' } : version
    )));
    setMessage('Version enviada a revision.');
  }

  if (loading) return <LoadingState message="Cargando editor..." />;

  if (!legend || !form) {
    return <Card><h1>Leyenda no encontrada</h1><p>No se encontro una leyenda editable para tu perfil de creador.</p></Card>;
  }

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Editor</p>
          <h1>{legend.title}</h1>
          <p>Version {activeVersion?.version_number ?? 1} - {activeVersion?.status || 'draft'}</p>
        </div>
        <Button onClick={handleSubmitReview} disabled={!canEdit || submitting || !activeVersion}>
          {submitting ? 'Enviando...' : 'Enviar a revision'}
        </Button>
      </div>

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      <Card>
        <form className="form-grid" onSubmit={handleSave}>
          <Input id="edit-title" label="Titulo" value={form.title} onChange={(event) => updateField('title', event.target.value)} disabled={!canEdit} />
          <Input id="edit-slug" label="Slug" value={form.slug} onChange={(event) => updateField('slug', event.target.value)} disabled={!canEdit} />
          <label className="field form-span-2" htmlFor="edit-short">
            <span>Sinopsis breve</span>
            <textarea id="edit-short" className="textarea" value={form.short_synopsis} onChange={(event) => updateField('short_synopsis', event.target.value)} disabled={!canEdit} rows={3} />
          </label>
          <label className="field form-span-2" htmlFor="edit-synopsis">
            <span>Sinopsis</span>
            <textarea id="edit-synopsis" className="textarea" value={form.synopsis} onChange={(event) => updateField('synopsis', event.target.value)} disabled={!canEdit} rows={5} />
          </label>
          <Input id="edit-origin" label="Lugar de origen" value={form.origin_place} onChange={(event) => updateField('origin_place', event.target.value)} disabled={!canEdit} />
          <Input id="edit-language" label="Idioma" value={form.language} onChange={(event) => updateField('language', event.target.value)} disabled={!canEdit} />
          <div className="form-actions form-span-2">
            <Button type="submit" disabled={!canEdit || saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2>Paginas</h2>
        {pages.length === 0 ? (
          <p className="state-message">Aun no hay paginas para esta version.</p>
        ) : (
          <div className="page-list">
            {pages.map((page) => (
              <article key={page.id}>
                <strong>{page.page_number}. {page.title || 'Pagina sin titulo'}</strong>
                <p>{page.text_content}</p>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2>Agregar pagina</h2>
        <form className="form-grid" onSubmit={handleAddPage}>
          <Input id="page-number" label="Numero" type="number" min="1" value={pageForm.page_number} onChange={(event) => updatePageField('page_number', event.target.value)} disabled={!canEdit} />
          <Input id="page-title" label="Titulo" value={pageForm.title} onChange={(event) => updatePageField('title', event.target.value)} disabled={!canEdit} />
          <label className="field form-span-2" htmlFor="page-content">
            <span>Texto</span>
            <textarea id="page-content" className="textarea" value={pageForm.text_content} onChange={(event) => updatePageField('text_content', event.target.value)} disabled={!canEdit} rows={6} required />
          </label>
          <div className="form-actions form-span-2">
            <Button type="submit" disabled={!canEdit || pageSaving}>{pageSaving ? 'Agregando...' : 'Agregar pagina'}</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

export default EditLegendPage;
