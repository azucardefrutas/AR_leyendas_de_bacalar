import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import EditorialRichEditor from '../../components/creator/EditorialRichEditor.jsx';
import BookPreviewOverlay from '../../components/creator/BookPreviewOverlay.jsx';
import EditorReaderRender from '../../components/reader/EditorReaderRender.jsx';
import { getLegendEditorData, saveLegendPages } from '../../services/creatorLegendService.js';
import { plainTextToEditorData } from '../../utils/editorJsToHtml.js';

function findCoverUrl(media = []) {
  const cover = (media || []).find((item) => (item.media_type === 'cover' || item.type === 'cover') && (item.url || item.file_url || item.assets?.file_url));
  return cover?.url || cover?.file_url || cover?.assets?.file_url || '';
}

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
  const [coverUrl, setCoverUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showReader, setShowReader] = useState(false);
  // Fase 4 — autosave a BD. 'saved' | 'dirty' | 'saving'.
  const [autoSaveState, setAutoSaveState] = useState('saved');
  const dirtyRef = useRef(false);
  const autosaveTimerRef = useRef(null);
  const savingRef = useRef(false);
  const savePagesRef = useRef(null);

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
    setCoverUrl(findCoverUrl(data.media ?? data.resources?.media ?? []));
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

  // Keep the latest pages in a ref so debounced autosave never persists a stale snapshot.
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  // Fase 4 — debounced DB autosave. Fires ~3.5s after the last change; each save
  // reuses the proven savePages path, so nothing is lost while typing.
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (dirtyRef.current && !savingRef.current && version?.id) {
        savePagesRef.current?.(pagesRef.current);
      }
    }, 3500);
  }, [version?.id]);

  const patchPageById = (clientId, patch) => {
    dirtyRef.current = true;
    setAutoSaveState('dirty');
    scheduleAutosave();
    setPages((current) => current.map((page) => (page.client_id === clientId ? { ...page, ...patch } : page)));
  };

  // Cambio de página: guarda pronto (deja que persistCurrent asiente el estado primero).
  const handleSelectPage = (id) => {
    setSelectedPageKey(id);
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (dirtyRef.current && !savingRef.current && version?.id) savePagesRef.current?.(pagesRef.current);
    }, 400);
  };

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
    savingRef.current = true;
    setAutoSaveState('saving');
    setMessage('');
    setSaveError('');
    try {
      const { data, error: savePagesError } = await saveLegendPages({ versionId: version?.id, pages: pagesToSave, legendId });
      if (savePagesError) {
        setSaveError(savePagesError.message || 'No se pudieron guardar las páginas. Intenta de nuevo.');
        setAutoSaveState('dirty');
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
      dirtyRef.current = false;
      setAutoSaveState('saved');
      return true;
    } catch (unexpectedError) {
      setSaveError(unexpectedError?.message || 'No se pudieron guardar las páginas. Intenta de nuevo.');
      setAutoSaveState('dirty');
      return false;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  // Always call the latest savePages from the debounced autosave.
  useEffect(() => { savePagesRef.current = savePages; });

  // Flush any pending autosave and clear the timer when leaving the editor (Salir del editor).
  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (dirtyRef.current && !savingRef.current) savePagesRef.current?.(pagesRef.current);
  }, []);

  const closeEditor = () => {
    window.close();
    if (!window.closed) navigate(`/creator/legends/${legendId}/edit`, { replace: true });
  };

  // Fase 3 + 4: opening the reading preview autosaves the draft first, so the
  // preview shows the persisted state and no changes are lost.
  const openPreview = async () => {
    if (version?.id) await savePages();
    setShowPreview(true);
  };

  // Render like the public reader (CONALITEG). Saves first so the bundle reflects
  // the latest content, then opens the same reader the audience sees.
  const openReader = async () => {
    if (version?.id) await savePages();
    setShowReader(true);
  };

  if (loading) return <LoadingState message="Abriendo editor..." />;
  if (error) return <EmptyState title="No se pudo abrir el editor" message={error.message} />;

  const autoSaveLabel = saveError
    ? ''
    : autoSaveState === 'saving'
      ? 'Guardando…'
      : autoSaveState === 'dirty'
        ? 'Cambios sin guardar'
        : (message || 'Guardado');

  return (
    <div className="fullscreen-editorial">
      <EditorialRichEditor
        pages={pages}
        selectedPageId={selectedPage?.client_id}
        onSelectPage={handleSelectPage}
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
        statusMessage={autoSaveLabel}
        statusError={saveError}
        onClose={closeEditor}
        legendId={legendId}
        availableModels={[...(resources.modelAssets ?? []), ...(resources.arScenes ?? [])]}
        availableMarkers={resources.arMarkers ?? []}
      />

      <div className="book-preview-fab-group">
        <button type="button" className="book-preview-fab book-preview-fab--reader" onClick={openReader}>
          <span className="material-symbols-rounded" aria-hidden="true">menu_book</span>
          Ver como lector
        </button>
        <button type="button" className="book-preview-fab" onClick={openPreview}>
          <span className="material-symbols-rounded" aria-hidden="true">visibility</span>
          Vista previa
        </button>
      </div>

      {showReader && (
        <EditorReaderRender legendId={legendId} onClose={() => setShowReader(false)} />
      )}

      {showPreview && (
        <BookPreviewOverlay
          pages={pages}
          coverUrl={coverUrl}
          title={legend?.title || ''}
          author={legend?.author_name || ''}
          templateId={legend?.cover_template_id || ''}
          coverData={legend?.cover_data || null}
          backCoverData={legend?.back_cover_data || null}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
