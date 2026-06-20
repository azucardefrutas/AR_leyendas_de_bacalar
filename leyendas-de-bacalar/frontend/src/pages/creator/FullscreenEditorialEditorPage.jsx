import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import EditorialRichEditor from '../../components/creator/EditorialRichEditor.jsx';
import { getLegendEditorData, saveLegendPages } from '../../services/creatorLegendService.js';
import { plainTextToEditorData } from '../../utils/editorJsToHtml.js';

function createPage(pageNumber = 1) {
  return {
    client_id: `page-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    page_number: pageNumber,
    title: '',
    text_content: '',
    editor_data: { blocks: [] },
    rendered_html: '',
    content_format: 'editorjs',
  };
}

/**
 * Clean, standalone writing screen for "crear desde cero" stories. Loads the legend's
 * draft pages and reuses EditorialRichEditor — no sidebar, no PDF/document sections.
 * Saves to the same legend_pages via the existing service (never creates a new legend).
 */
export default function FullscreenEditorialEditorPage() {
  const { legendId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [legend, setLegend] = useState(null);
  const [version, setVersion] = useState(null);
  const [pages, setPages] = useState([createPage(1)]);
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await getLegendEditorData(legendId);
    if (loadError || !data) {
      setError(loadError || new Error('No se pudo cargar el editor.'));
      setLoading(false);
      return;
    }
    setLegend(data.legend);
    setVersion(data.version);
    const loaded = (data.pages || []).map((page) => ({
      ...page,
      client_id: page.id,
      editor_data: page.editor_data?.blocks ? page.editor_data : plainTextToEditorData(page.text_content || ''),
      content_format: page.content_format || 'editorjs',
    }));
    const finalPages = loaded.length ? loaded : [createPage(1)];
    setPages(finalPages);
    setSelectedPageKey(finalPages[0]?.client_id ?? null);
    setLoading(false);
  }, [legendId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.body.classList.add('fullscreen-editorial-open');
    return () => document.body.classList.remove('fullscreen-editorial-open');
  }, []);

  const selectedPage = pages.find((page) => page.client_id === selectedPageKey) ?? pages[0];

  const patchPageById = (clientId, patch) =>
    setPages((current) => current.map((page) => (page.client_id === clientId ? { ...page, ...patch } : page)));

  const addPage = () => {
    const next = createPage(pages.length + 1);
    setPages((current) => [...current, next]);
    setSelectedPageKey(next.client_id);
  };

  const removePage = (page) => {
    if (pages.length <= 1) return;
    const next = pages
      .filter((item) => item.client_id !== page.client_id)
      .map((item, index) => ({ ...item, page_number: index + 1 }));
    setPages(next);
    setSelectedPageKey(next[0]?.client_id ?? null);
  };

  const savePages = async (override) => {
    const pagesToSave = Array.isArray(override) ? override : pages;
    setSaving(true);
    setMessage('');
    const { data, error: saveError } = await saveLegendPages({ versionId: version?.id, pages: pagesToSave });
    setSaving(false);
    if (saveError) { setError(saveError); return; }
    const saved = data.length ? data.map((page) => ({ ...page, client_id: page.id })) : [createPage(1)];
    setPages(saved);
    setSelectedPageKey(saved[0]?.client_id ?? null);
    setMessage('Páginas guardadas.');
  };

  if (loading) return <LoadingState message="Abriendo editor..." />;
  if (error) return <EmptyState title="No se pudo abrir el editor" message={error.message} />;

  return (
    <div className="fullscreen-editorial">
      <header className="fullscreen-editorial__top">
        <div className="fullscreen-editorial__title">
          <strong>{legend?.title || 'Historia'}</strong>
          <span>Escritura a pantalla completa</span>
        </div>
        <div className="fullscreen-editorial__actions">
          {message && <span className="fullscreen-editorial__msg" role="status">{message}</span>}
          <button
            type="button"
            className="fullscreen-editorial__close"
            onClick={() => { if (window.opener) window.close(); else window.history.back(); }}
          >
            Cerrar
          </button>
        </div>
      </header>

      <div className="fullscreen-editorial__body">
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
          canSave={Boolean(version?.id)}
          hideExpand
        />
      </div>
    </div>
  );
}
