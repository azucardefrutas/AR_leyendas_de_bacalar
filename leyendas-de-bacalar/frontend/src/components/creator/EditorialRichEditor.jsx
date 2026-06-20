import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Checklist from '@editorjs/checklist';
import Table from '@editorjs/table';
import { uploadLegendAsset } from '../../services/assetService.js';
import { editorJsToHtml, editorJsToPlainText } from '../../utils/editorJsToHtml.js';
import EditorJsPreview from './EditorJsPreview.jsx';
import EditorJsToolbar, { EditorIcon } from './EditorJsToolbar.jsx';
import { ImageEditorBlockTool, MarkerBlockTool, Model3DBlockTool } from './editorBlockTools.js';
import InsertLinkModal from './editor-modals/InsertLinkModal.jsx';
import InsertImageModal from './editor-modals/InsertImageModal.jsx';
import InsertTableModal from './editor-modals/InsertTableModal.jsx';
import InsertModel3DModal from './editor-modals/InsertModel3DModal.jsx';
import InsertMarkerModal from './editor-modals/InsertMarkerModal.jsx';
import { isSafeHttpUrl } from './editor-modals/editorModalUtils.js';

const Model3DViewer = lazy(() => import('../3d/Model3DViewer.jsx'));

function getAssetUrl(asset = {}) {
  return asset.previewUrl || asset.url || asset.public_url || asset.file_url || asset.external_url || asset.signed_url || '';
}

function normalizeEditorAsset(asset = {}, fallbackName) {
  const nestedAsset = asset.assets || asset.asset || asset;
  const id = asset.model_asset_id || asset.marker_asset_id || nestedAsset.id || asset.id;
  return {
    id,
    name: nestedAsset.metadata?.original_name || asset.name || asset.marker_code || fallbackName || id,
    fileSize: nestedAsset.file_size || asset.fileSize || null,
    status: asset.status || nestedAsset.status || 'guardado',
    previewUrl: getAssetUrl(nestedAsset),
  };
}

function normalizeAssetList(assets = [], fallbackName) {
  const byId = new Map();
  for (const asset of assets) {
    const normalized = normalizeEditorAsset(asset, fallbackName);
    if (normalized.id) byId.set(String(normalized.id), normalized);
  }
  return [...byId.values()];
}

// Tools config is built per editor so the image uploader and the model/marker pickers
// receive the legend's assets + upload handler.
function buildTools({ onDataChange = null, onOpenModel = null }) {
  return {
    header: { class: Header, inlineToolbar: true, config: { placeholder: 'Encabezado', levels: [1, 2, 3, 4], defaultLevel: 2 } },
    list: { class: List, inlineToolbar: true },
    quote: { class: Quote, inlineToolbar: true },
    delimiter: { class: Delimiter },
    checklist: { class: Checklist, inlineToolbar: true },
    table: { class: Table, inlineToolbar: true },
    image: {
      class: ImageEditorBlockTool,
      toolbox: false,
      config: { onDataChange },
    },
    model3d: { class: Model3DBlockTool, toolbox: false, config: { onDataChange, onOpenModel } },
    marker: { class: MarkerBlockTool, toolbox: false, config: { onDataChange } },
    leyendaMarker: { class: MarkerBlockTool, toolbox: false, config: { onDataChange } },
  };
}

const emptyData = () => ({ blocks: [] });

function countStats(text = '') {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
    chars: text.length,
  };
}

/**
 * Notion/Medium-style editorial editor for the "Crear desde cero" flow. Each page owns
 * its own Editor.js JSON (page.editor_data). Controlled by the parent's `pages` state:
 * content is pushed up via onPageDataChange so the existing save flow persists it.
 *
 * Only ONE Editor.js instance exists; switching pages saves the current page then
 * renders the new page's data (no re-init), and is StrictMode-safe.
 */
export default function EditorialRichEditor({
  pages = [],
  selectedPageId,
  onSelectPage,
  onPageDataChange,
  onTitleChange,
  onAddPage,
  onRemovePage,
  onSave,
  saving = false,
  canSave = true,
  expandHref = '',
  hideExpand = false,
  availableModels = [],
  availableMarkers = [],
  onUploadImage = null,
  legendId = '',
  variant = 'default',
  legendTitle = '',
  statusMessage = '',
  statusError = '',
  onClose = null,
}) {
  const holderRef = useRef(null);
  const editorRef = useRef(null);
  const currentPageIdRef = useRef(selectedPageId);
  const pagesRef = useRef(pages);
  const debounceRef = useRef(0);
  const dirtyRef = useRef(false);
  const openModelRef = useRef(null);
  const [activeTab, setActiveTab] = useState('edit');
  const [expanded, setExpanded] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const [openModal, setOpenModal] = useState(null); // 'link' | 'image' | 'table' | 'model3d' | 'marker'
  const [editorError, setEditorError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [closing, setClosing] = useState(false);
  const [previewModel, setPreviewModel] = useState(null);
  const [modelOptions, setModelOptions] = useState(() => normalizeAssetList(availableModels, 'Modelo 3D'));
  const [markerOptions, setMarkerOptions] = useState(() => normalizeAssetList(availableMarkers, 'Marcador'));
  const isFullscreen = variant === 'fullscreen';

  useEffect(() => {
    setModelOptions((current) => normalizeAssetList([...availableModels, ...current], 'Modelo 3D'));
  }, [availableModels]);

  useEffect(() => {
    setMarkerOptions((current) => normalizeAssetList([...availableMarkers, ...current], 'Marcador'));
  }, [availableMarkers]);

  const uploadEditorAsset = useCallback(async (file, assetType, fallbackName) => {
    if (!legendId) throw new Error('Guarda la leyenda antes de subir recursos.');
    const result = await uploadLegendAsset({ file, legendId, assetType, forceBackend: true });
    if (result.error) throw result.error;
    const asset = result.data?.asset || result.data;
    if (!asset?.id) throw new Error('No se obtuvo un asset válido después de la subida.');
    return normalizeEditorAsset(asset, fallbackName || file.name);
  }, [legendId]);

  const uploadEditorImage = useCallback(async (file) => {
    if (onUploadImage) return onUploadImage(file);
    const uploaded = await uploadEditorAsset(file, 'editor_image', file.name);
    if (!uploaded.previewUrl) throw new Error('La imagen se guardó, pero no tiene una URL utilizable.');
    return uploaded;
  }, [onUploadImage, uploadEditorAsset]);

  const uploadEditorModel = useCallback(async (file) => {
    const uploaded = await uploadEditorAsset(file, 'model_3d', file.name);
    setModelOptions((current) => [uploaded, ...current.filter((asset) => String(asset.id) !== String(uploaded.id))]);
    return uploaded;
  }, [uploadEditorAsset]);

  const uploadEditorMarker = useCallback(async (file) => {
    const uploaded = await uploadEditorAsset(file, 'marker_image', file.name);
    setMarkerOptions((current) => [uploaded, ...current.filter((asset) => String(asset.id) !== String(uploaded.id))]);
    return uploaded;
  }, [uploadEditorAsset]);

  pagesRef.current = pages;
  // Keep the latest tool options available to the one-time editor init.
  const toolsOptionsRef = useRef({
    onDataChange: () => {
      dirtyRef.current = true;
      setDirty(true);
    },
    onOpenModel: (data) => openModelRef.current?.(data),
  });
  const selectedPage = pages.find((page) => page.client_id === selectedPageId) ?? pages[0];

  // Save the editor's current content back into its page (returns the saved payload).
  const persistCurrent = useCallback(async () => {
    const editor = editorRef.current;
    const pageId = currentPageIdRef.current;
    if (!editor || !editor.save || !pageId) return null;
    try {
      const data = await editor.save();
      const html = DOMPurify.sanitize(editorJsToHtml(data), {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'cite', 'hr', 'table', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption', 'img', 'article', 'span', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt'],
        ALLOW_DATA_ATTR: false,
      });
      const text = editorJsToPlainText(data);
      const editorStats = {
        words: countStats(text).words,
        characters: text.length,
        blocks: Array.isArray(data.blocks) ? data.blocks.length : 0,
      };
      const patch = {
        editor_data: data,
        rendered_html: html,
        text_content: text,
        content_format: 'editorjs',
        editor_stats: editorStats,
        editor_version: data.version || null,
      };
      onPageDataChange?.(pageId, patch);
      setEditorError('');
      return { data, html, text, patch };
    } catch (saveError) {
      setEditorError(saveError?.message || 'No se pudo leer el contenido actual. Intenta de nuevo.');
      return null;
    }
  }, [onPageDataChange]);

  // Initialise Editor.js exactly once (StrictMode-safe).
  useEffect(() => {
    let destroyed = false;
    const startPage = pagesRef.current.find((page) => page.client_id === currentPageIdRef.current)
      ?? pagesRef.current[0];

    const editor = new EditorJS({
      holder: holderRef.current,
      autofocus: false,
      placeholder: 'Escribe la historia de esta página…',
      data: startPage?.editor_data?.blocks ? startPage.editor_data : emptyData(),
      tools: buildTools(toolsOptionsRef.current),
      onChange: () => {
        dirtyRef.current = true;
        setDirty(true);
        window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(async () => {
          const saved = await persistCurrent();
          if (saved) setStats(countStats(saved.text));
        }, 500);
      },
    });

    editor.isReady
      .then(() => {
        if (destroyed) { try { editor.destroy(); } catch { /* ignore */ } return; }
        editorRef.current = editor;
        setStats(countStats(startPage?.text_content || ''));
      })
      .catch((readyError) => {
        if (!destroyed) setEditorError(readyError?.message || 'No se pudo iniciar el editor. Recarga la página.');
      });

    return () => {
      destroyed = true;
      window.clearTimeout(debounceRef.current);
      const instance = editorRef.current;
      editorRef.current = null;
      if (instance && instance.destroy) {
        try { instance.destroy(); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the selected page changes, render that page's data into the single editor.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !editor.render) return;
    if (currentPageIdRef.current === selectedPageId) return;
    const page = pagesRef.current.find((item) => item.client_id === selectedPageId);
    editor.isReady
      .then(() => editor.render(page?.editor_data?.blocks ? page.editor_data : emptyData()))
      .then(() => {
        currentPageIdRef.current = selectedPageId;
        setStats(countStats(page?.text_content || ''));
        if (activeTab === 'preview') setActiveTab('edit');
      })
      .catch((renderError) => {
        setEditorError(renderError?.message || 'No se pudo abrir la página seleccionada. Intenta de nuevo.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId]);

  const requestSelect = async (pageId) => {
    if (pageId === currentPageIdRef.current) return;
    const saved = await persistCurrent();
    if (!saved && editorRef.current) return;
    onSelectPage?.(pageId);
  };

  const handleAdd = async () => {
    const saved = await persistCurrent();
    if (!saved && editorRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
    onAddPage?.();
  };

  const handleRemove = async () => {
    dirtyRef.current = true;
    setDirty(true);
    onRemovePage?.(selectedPage);
  };

  const showPreview = async () => {
    const saved = await persistCurrent();
    if (!saved && editorRef.current) return;
    setPreviewData(saved ? saved.data : (selectedPage?.editor_data ?? null));
    setActiveTab('preview');
  };

  const handleSave = async () => {
    const saved = await persistCurrent();
    if (!saved && editorRef.current) return false;
    // Pass the freshly-merged pages straight to onSave so the just-typed content is
    // saved even if React has not flushed the persist setState yet.
    const finalPages = saved
      ? pages.map((page) => (page.client_id === currentPageIdRef.current
        ? { ...page, ...saved.patch }
        : page))
      : pages;
    const result = await onSave?.(finalPages);
    if (result !== false) {
      dirtyRef.current = false;
      setDirty(false);
      setEditorError('');
      return true;
    }
    return false;
  };

  // Command bar: insert an Editor.js block at the current position (or end).
  const insertBlock = (type, data = {}) => {
    const editor = editorRef.current;
    if (!editor?.blocks) return;
    if (activeTab !== 'edit') setActiveTab('edit');
    try {
      const index = editor.blocks.getCurrentBlockIndex();
      const at = index >= 0 ? index + 1 : editor.blocks.getBlocksCount();
      editor.blocks.insert(type, data, undefined, at, true);
      dirtyRef.current = true;
      setDirty(true);
    } catch {
      try {
        editor.blocks.insert(type, data);
        dirtyRef.current = true;
        setDirty(true);
      } catch (insertError) {
        setEditorError(insertError?.message || 'No se pudo insertar el bloque. Intenta de nuevo.');
      }
    }
  };

  // Inline formatting on the current selection inside the contenteditable blocks.
  // execCommand is deprecated but is the simplest reliable way to format a selection
  // from an external toolbar; Editor.js blocks are contenteditable so it applies.
  const applyInline = (command, value = null) => {
    if (activeTab !== 'edit') return;
    try {
      document.execCommand(command, false, value);
      dirtyRef.current = true;
      setDirty(true);
    } catch { /* ignore */ }
  };

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const handleInsertLink = ({ url, text, newTab, rel }) => {
    const safeUrl = String(url).replace(/"/g, '%22');
    const attrs = `href="${safeUrl}"${newTab ? ' target="_blank"' : ''}${rel ? ` rel="${rel}"` : ''}`;
    insertBlock('paragraph', { text: `<a ${attrs}>${escapeHtml(text)}</a>` });
    setOpenModal(null);
  };

  const handleInsertImage = ({ assetId, url, alt, caption }) => {
    if (isSafeHttpUrl(url)) {
      insertBlock('image', {
        assetId: assetId || '',
        file: { url },
        alt: alt || '',
        caption: caption || '',
        withBorder: false,
        withBackground: false,
        stretched: false,
        layout: { width: 520, height: 'auto', align: 'center' },
      });
    }
    setOpenModal(null);
  };

  const handleInsertTable = ({ withHeadings, content }) => {
    insertBlock('table', { withHeadings, content });
    setOpenModal(null);
  };

  const handleInsertModel3D = (data) => {
    insertBlock('model3d', { ...data, layout: data.layout || { width: 520, height: 360, align: 'center' } });
    setOpenModal(null);
  };
  const handleInsertMarker = (data) => {
    insertBlock('leyendaMarker', { ...data, layout: data.layout || { width: 180, height: 'auto', align: 'center' } });
    setOpenModal(null);
  };
  const handleOpenModel = (data) => {
    const asset = modelOptions.find((option) => String(option.id) === String(data.assetId));
    const modelUrl = data.modelUrl || asset?.previewUrl || '';
    if (!modelUrl) {
      setEditorError('El modelo está registrado, pero no tiene una URL utilizable para abrir el visor.');
      return;
    }
    setPreviewModel({ ...data, modelUrl, title: data.title || asset?.name || 'Modelo 3D' });
  };
  openModelRef.current = handleOpenModel;

  const pagesWithText = useMemo(
    () => pages.filter((page) => (page.text_content || '').trim()).length,
    [pages],
  );

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const warnBeforeClose = (event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeClose);
    return () => window.removeEventListener('beforeunload', warnBeforeClose);
  }, [isFullscreen]);

  const handleClose = async () => {
    if (closing || saving) return;
    setClosing(true);
    const canClose = dirty ? await handleSave() : true;
    if (canClose) onClose?.();
    else setClosing(false);
  };

  const modeTabs = (
    <div className="editorial-editor__tabs" role="tablist" aria-label="Modo del editor">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'edit'}
        className={`is-edit ${activeTab === 'edit' ? 'active' : ''}`}
        onClick={() => setActiveTab('edit')}
      >
        {isFullscreen && <EditorIcon name="edit" size={16} />}
        Editar
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'preview'}
        className={`is-preview ${activeTab === 'preview' ? 'active' : ''}`}
        onClick={showPreview}
      >
        {isFullscreen && <EditorIcon name="eye" size={16} />}
        Vista previa
      </button>
      {!isFullscreen && !hideExpand && (
        <button
          type="button"
          className={`editorial-editor__expand is-expand ${expanded ? 'active' : ''}`}
          onClick={async () => {
            if (expandHref) {
              const saved = await handleSave();
              if (saved) window.open(expandHref, '_blank', 'noopener,noreferrer');
              return;
            }
            setExpanded((value) => !value);
          }}
          title={expandHref ? 'Abrir en pantalla completa' : (expanded ? 'Reducir' : 'Expandir')}
        >
          {expandHref ? 'Expandir' : (expanded ? 'Reducir' : 'Expandir')}
        </button>
      )}
    </div>
  );

  const statsPanel = (
    <div className="editorial-editor__stats" aria-label="Estadísticas de la página">
      <span><strong>{stats.words}</strong> palabras</span>
      <span><strong>{stats.chars}</strong> caracteres</span>
      <span><strong>{pagesWithText}</strong> con texto</span>
    </div>
  );

  const footerActions = (
    <div className="editorial-editor__footer-actions">
      <button
        type="button"
        className="editorial-editor__remove"
        onClick={handleRemove}
        disabled={pages.length <= 1 || saving || closing}
      >
        <EditorIcon name="trash" size={17} />
        Quitar página
      </button>
      <button
        type="button"
        className="editorial-editor__save"
        onClick={handleSave}
        disabled={!canSave || saving || closing}
      >
        <EditorIcon name="save" size={17} />
        {saving ? 'Guardando…' : 'Guardar páginas'}
      </button>
    </div>
  );

  const editorCanvas = (
    <>
      <label className="editorial-editor__title-label" htmlFor={`page-title-${selectedPage?.client_id || 'current'}`}>
        Título de página
      </label>
      <input
        id={`page-title-${selectedPage?.client_id || 'current'}`}
        className="editorial-editor__title"
        value={selectedPage?.title || ''}
        onChange={(event) => {
          dirtyRef.current = true;
          setDirty(true);
          onTitleChange?.(selectedPage?.client_id, event.target.value);
        }}
        placeholder={`Título de la página ${selectedPage?.page_number || ''}`.trim()}
      />

      <div className="editorial-editor__surface editorjs-surface" hidden={activeTab !== 'edit'}>
        <div ref={holderRef} className="editorial-editor__holder" />
      </div>

      {activeTab === 'preview' && (
        <div className="editorial-editor__preview" aria-label="Vista previa">
          <EditorJsPreview data={previewData} onOpenModel={handleOpenModel} />
        </div>
      )}
    </>
  );

  return (
    <div className={`editorial-editor ${isFullscreen ? 'editorial-editor--fullscreen' : ''} ${expanded ? 'is-expanded' : ''}`}>
      {isFullscreen ? (
        <header className="fullscreen-editorial__top">
          <a className="fullscreen-editorial__skip" href="#fullscreen-editor-canvas">Ir al lienzo de escritura</a>
          <div className="fullscreen-editorial__title">
            <strong>{legendTitle || 'Historia'}</strong>
            <span>Escritura a pantalla completa</span>
          </div>
          <div className="fullscreen-editorial__modes">{modeTabs}</div>
          <div className="fullscreen-editorial__meta">
            {statsPanel}
            {(statusMessage || statusError || editorError) && (
              <span
                className={`fullscreen-editorial__msg ${(statusError || editorError) ? 'is-error' : ''}`}
                role={(statusError || editorError) ? 'alert' : 'status'}
              >
                {statusError || editorError || statusMessage}
              </span>
            )}
          </div>
          <button
            type="button"
            className="fullscreen-editorial__close"
            onClick={handleClose}
            disabled={closing || saving}
          >
            <EditorIcon name="close" size={17} />
            {closing ? 'Cerrando…' : 'Cerrar'}
          </button>
        </header>
      ) : (
        <div className="editorial-editor__bar">
          {modeTabs}
          {statsPanel}
        </div>
      )}

      {activeTab === 'edit' && (
        <EditorJsToolbar
          onInline={applyInline}
          onInsertBlock={insertBlock}
          onOpenModal={setOpenModal}
          showModel3d={modelOptions.length > 0 || Boolean(legendId)}
          showMarker={markerOptions.length > 0 || Boolean(legendId)}
        />
      )}

      {!isFullscreen && editorError && <p className="editorial-editor__error" role="alert">{editorError}</p>}

      {isFullscreen && (
        <div className="editorial-editor__mobile-pages">
          <label htmlFor="fullscreen-page-select">
            <EditorIcon name="pages" size={17} />
            <span>Página</span>
          </label>
          <select
            id="fullscreen-page-select"
            value={selectedPage?.client_id || ''}
            onChange={(event) => requestSelect(event.target.value)}
          >
            {pages.map((page) => (
              <option key={page.client_id} value={page.client_id}>
                {page.title?.trim() || `Pág. ${page.page_number}`}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleAdd} aria-label="Agregar página">
            <EditorIcon name="plus" size={18} />
          </button>
        </div>
      )}

      <div className="editorial-editor__workspace">
        <div className="editorial-editor__body">
          <aside className="editorial-editor__rail custom-scrollbar" aria-label="Páginas de la historia">
            {isFullscreen && (
              <div className="editorial-editor__rail-heading">
                <strong>Navegador</strong>
                <span>Páginas de la historia</span>
              </div>
            )}
            {pages.map((page) => (
              <button
                type="button"
                key={page.client_id}
                className={page.client_id === selectedPage?.client_id ? 'active' : ''}
                onClick={() => requestSelect(page.client_id)}
                title={page.title?.trim() || `Página ${page.page_number}`}
              >
                <span className="editorial-editor__rail-num">{page.page_number}</span>
                <span className="editorial-editor__rail-title">{page.title?.trim() || `Pág. ${page.page_number}`}</span>
              </button>
            ))}
            <button type="button" className="editorial-editor__add" onClick={handleAdd} title="Agregar página">
              <EditorIcon name="plus" size={16} />
              Página
            </button>
          </aside>

          <div className="editorial-editor__main">
            {isFullscreen ? <section id="fullscreen-editor-canvas" className="editorial-editor__canvas">{editorCanvas}</section> : editorCanvas}
            {!isFullscreen && <div className="editorial-editor__footer">{footerActions}</div>}
          </div>
        </div>
      </div>

      {isFullscreen && (
        <footer className="fullscreen-editorial__footer">
          <span>Modo de escritura a pantalla completa</span>
          {footerActions}
        </footer>
      )}

      {expanded && <button type="button" className="editorial-editor__expand-backdrop" aria-label="Reducir escritura" onClick={() => setExpanded(false)} />}

      {openModal === 'link' && (
        <InsertLinkModal onInsert={handleInsertLink} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'image' && (
        <InsertImageModal
          onInsert={handleInsertImage}
          onClose={() => setOpenModal(null)}
          onUploadImage={(onUploadImage || legendId) ? uploadEditorImage : null}
        />
      )}
      {openModal === 'table' && (
        <InsertTableModal onInsert={handleInsertTable} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'model3d' && (
        <InsertModel3DModal
          assets={modelOptions}
          onInsert={handleInsertModel3D}
          onClose={() => setOpenModal(null)}
          onUploadAsset={legendId ? uploadEditorModel : null}
        />
      )}
      {openModal === 'marker' && (
        <InsertMarkerModal
          assets={markerOptions}
          onInsert={handleInsertMarker}
          onClose={() => setOpenModal(null)}
          onUploadAsset={legendId ? uploadEditorMarker : null}
        />
      )}
      {previewModel && (
        <Suspense fallback={null}>
          <Model3DViewer
            modelUrl={previewModel.modelUrl}
            title={previewModel.title}
            onClose={() => setPreviewModel(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
