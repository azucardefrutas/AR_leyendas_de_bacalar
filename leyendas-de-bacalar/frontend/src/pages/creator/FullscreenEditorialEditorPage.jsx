import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
 * draft pages and reuses EditorialRichEditor — no creator shell or PDF/document sections.
 * Saves to the same legend_pages via the existing service (never creates a new legend).
 */
export default function FullscreenEditorialEditorPage() {
  const { legendId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [legend, setLegend] = useState(null);
  const [version, setVersion] = useState(null);
  const [pages, setPages] = useState([createPage(1)]);
  const [removedPages, setRemovedPages] = useState([]);
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [resources, setResources] = useState({ modelAssets: [], arScenes: [], arMarkers: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');

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
    setResources({
      modelAssets: data.modelAssets ?? data.resources?.modelAssets ?? [],
      arScenes: data.arScenes ?? data.resources?.arScenes ?? [],
      arMarkers: data.arMarkers ?? data.resources?.arMarkers ?? [],
    });
    const loaded = (data.pages || []).map((page) => ({
      ...page,
      client_id: page.id,
      editor_data: page.editor_data?.blocks ? page.editor_data : plainTextToEditorData(page.text_content || ''),
      content_format: page.content_format || 'editorjs',
    }));
    const finalPages = loaded.length ? loaded : [createPage(1)];
    setPages(finalPages);
    setRemovedPages([]);
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
    const removedIndex = pages.findIndex((item) => item.client_id === page.client_id);
    const next = pages
      .filter((item) => item.client_id !== page.client_id)
      .map((item, index) => ({ ...item, page_number: index + 1 }));
    if (page.id) setRemovedPages((current) => [...current, { ...page, _delete: true }]);
    setPages(next);
    setSelectedPageKey(next[Math.min(Math.max(removedIndex, 0), next.length - 1)]?.client_id ?? null);
  };

  const savePages = async (override) => {
    const visiblePagesToSave = Array.isArray(override) ? override : pages;
    const pagesToSave = [...visiblePagesToSave, ...removedPages];
    const selectedPageNumber = visiblePagesToSave.find((page) => page.client_id === selectedPageKey)?.page_number;
    setSaving(true);
    setMessage('');
    setSaveError('');
    try {
      const { data, error: savePagesError } = await saveLegendPages({ versionId: version?.id, pages: pagesToSave });
      if (savePagesError) {
        setSaveError(savePagesError.message || 'No se pudieron guardar las páginas. Intenta de nuevo.');
        return false;
      }
      const saved = Array.isArray(data) && data.length
        ? data.map((page) => ({ ...page, client_id: page.id }))
        : [createPage(1)];
      setPages(saved);
      setRemovedPages([]);
      const stillSelected = saved.find((page) => page.page_number === selectedPageNumber) ?? saved[0];
      setSelectedPageKey(stillSelected?.client_id ?? null);
      setMessage('Páginas guardadas.');
      return true;
    } catch (unexpectedError) {
      setSaveError(unexpectedError?.message || 'No se pudieron guardar las páginas. Intenta de nuevo.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closeEditor = () => {
    window.close();
    if (!window.closed) navigate(`/creator/legends/${legendId}/edit`, { replace: true });
  };

  if (loading) return <LoadingState message="Abriendo editor..." />;
  if (error) return <EmptyState title="No se pudo abrir el editor" message={error.message} />;

  return (
    <div className="fullscreen-editorial">
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
        variant="fullscreen"
        legendTitle={legend?.title || 'Historia'}
        statusMessage={message}
        statusError={saveError}
        onClose={closeEditor}
        legendId={legendId}
        availableModels={[...(resources.modelAssets ?? []), ...(resources.arScenes ?? [])]}
        availableMarkers={resources.arMarkers ?? []}
      />
    </div>
  );
}
