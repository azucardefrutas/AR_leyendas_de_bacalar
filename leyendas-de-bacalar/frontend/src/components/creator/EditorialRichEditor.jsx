import React, { useCallback, useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Checklist from '@editorjs/checklist';
import Table from '@editorjs/table';
import { editorJsToHtml, editorJsToPlainText } from '../../utils/editorJsToHtml.js';
import EditorJsPreview from './EditorJsPreview.jsx';

const EDITOR_TOOLS = {
  header: { class: Header, inlineToolbar: true, config: { placeholder: 'Encabezado', levels: [2, 3, 4], defaultLevel: 2 } },
  list: { class: List, inlineToolbar: true },
  quote: { class: Quote, inlineToolbar: true },
  delimiter: { class: Delimiter },
  checklist: { class: Checklist, inlineToolbar: true },
  table: { class: Table, inlineToolbar: true },
};

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
}) {
  const holderRef = useRef(null);
  const editorRef = useRef(null);
  const currentPageIdRef = useRef(selectedPageId);
  const pagesRef = useRef(pages);
  const debounceRef = useRef(0);
  const [activeTab, setActiveTab] = useState('edit');
  const [expanded, setExpanded] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  pagesRef.current = pages;
  const selectedPage = pages.find((page) => page.client_id === selectedPageId) ?? pages[0];

  // Save the editor's current content back into its page (returns the saved payload).
  const persistCurrent = useCallback(async () => {
    const editor = editorRef.current;
    const pageId = currentPageIdRef.current;
    if (!editor || !editor.save || !pageId) return null;
    try {
      const data = await editor.save();
      const html = editorJsToHtml(data);
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
      return { data, html, text, patch };
    } catch {
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
      tools: EDITOR_TOOLS,
      onChange: () => {
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
      .catch(() => { /* ignore init race */ });

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
      .catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId]);

  const requestSelect = async (pageId) => {
    if (pageId === currentPageIdRef.current) return;
    await persistCurrent();
    onSelectPage?.(pageId);
  };

  const handleAdd = async () => {
    await persistCurrent();
    onAddPage?.();
  };

  const handleRemove = async () => {
    onRemovePage?.(selectedPage);
  };

  const showPreview = async () => {
    const saved = await persistCurrent();
    setPreviewData(saved ? saved.data : (selectedPage?.editor_data ?? null));
    setActiveTab('preview');
  };

  const handleSave = async () => {
    const saved = await persistCurrent();
    // Pass the freshly-merged pages straight to onSave so the just-typed content is
    // saved even if React has not flushed the persist setState yet.
    const finalPages = saved
      ? pages.map((page) => (page.client_id === currentPageIdRef.current
        ? { ...page, ...saved.patch }
        : page))
      : pages;
    onSave?.(finalPages);
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
    } catch {
      try { editor.blocks.insert(type, data); } catch { /* ignore */ }
    }
  };

  // Inline formatting on the current selection inside the contenteditable blocks.
  // execCommand is deprecated but is the simplest reliable way to format a selection
  // from an external toolbar; Editor.js blocks are contenteditable so it applies.
  const applyInline = (command, value = null) => {
    if (activeTab !== 'edit') return;
    try { document.execCommand(command, false, value); } catch { /* ignore */ }
  };

  const applyLink = () => {
    const url = window.prompt('URL del enlace:', 'https://');
    if (url) applyInline('createLink', url);
  };

  // Keep the editor selection when clicking a toolbar button (prevent focus steal).
  const keepSelection = (event) => event.preventDefault();

  const pagesWithText = pages.filter((page) => (page.text_content || '').trim()).length;

  return (
    <div className={`editorial-editor ${expanded ? 'is-expanded' : ''}`}>
      {/* Top bar: writing controls + stats live OUTSIDE the writing area so the
          Editor.js surface stays clean and wide. */}
      <div className="editorial-editor__bar">
        <div className="editorial-editor__tabs" role="tablist">
          <button type="button" role="tab" aria-selected={activeTab === 'edit'} className={`is-edit ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')} title="Editar">Editar</button>
          <button type="button" role="tab" aria-selected={activeTab === 'preview'} className={`is-preview ${activeTab === 'preview' ? 'active' : ''}`} onClick={showPreview} title="Vista previa">Vista previa</button>
          {!hideExpand && (
            <button
              type="button"
              className={`editorial-editor__expand is-expand ${expanded ? 'active' : ''}`}
              onClick={() => {
                // expandHref opens a clean standalone writing page in a new tab; we save
                // the current content first so it loads up to date. Otherwise toggle overlay.
                if (expandHref) { handleSave(); window.open(expandHref, '_blank', 'noopener,noreferrer'); return; }
                setExpanded((value) => !value);
              }}
              title={expandHref ? 'Abrir en pantalla completa' : (expanded ? 'Reducir' : 'Expandir')}
            >
              {expandHref ? 'Expandir' : (expanded ? 'Reducir' : 'Expandir')}
            </button>
          )}
        </div>
        <div className="editorial-editor__stats" aria-label="Estadísticas">
          <span>{stats.words} palabras</span>
          <span>{stats.chars} caracteres</span>
          <span>{pagesWithText} con texto</span>
        </div>
      </div>

      {/* Quill-style command bar that drives Editor.js (inline formatting on the
          selection + block insertion via the Editor.js blocks API). */}
      {activeTab === 'edit' && (
        <div className="editorial-editor__toolbar" role="toolbar" aria-label="Herramientas de formato">
          <div className="editorial-editor__toolbar-group">
            <button type="button" title="Negrita" onMouseDown={keepSelection} onClick={() => applyInline('bold')}><b>B</b></button>
            <button type="button" title="Cursiva" onMouseDown={keepSelection} onClick={() => applyInline('italic')}><i>I</i></button>
            <button type="button" title="Subrayado" onMouseDown={keepSelection} onClick={() => applyInline('underline')}><u>U</u></button>
            <button type="button" title="Tachado" onMouseDown={keepSelection} onClick={() => applyInline('strikeThrough')}><s>S</s></button>
            <button type="button" title="Enlace" onMouseDown={keepSelection} onClick={applyLink}>Link</button>
          </div>
          <span className="editorial-editor__toolbar-sep" aria-hidden="true" />
          <div className="editorial-editor__toolbar-group">
            <button type="button" title="Título" onClick={() => insertBlock('header', { text: '', level: 2 })}>H2</button>
            <button type="button" title="Subtítulo" onClick={() => insertBlock('header', { text: '', level: 3 })}>H3</button>
            <button type="button" title="Lista" onClick={() => insertBlock('list', { style: 'unordered', items: [] })}>Lista</button>
            <button type="button" title="Checklist" onClick={() => insertBlock('checklist', { items: [] })}>Checklist</button>
            <button type="button" title="Cita" onClick={() => insertBlock('quote', { text: '', caption: '' })}>Quote</button>
            <button type="button" title="Separador" onClick={() => insertBlock('delimiter', {})}>—</button>
            <button type="button" title="Tabla" onClick={() => insertBlock('table', {})}>Tabla</button>
          </div>
        </div>
      )}

      <div className="editorial-editor__body">
        <aside className="editorial-editor__rail" aria-label="Páginas de la historia">
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
          <button type="button" className="editorial-editor__add" onClick={handleAdd} title="Agregar página">+ Página</button>
        </aside>

        <div className="editorial-editor__main">
          <input
            className="editorial-editor__title"
            value={selectedPage?.title || ''}
            onChange={(event) => onTitleChange?.(selectedPage?.client_id, event.target.value)}
            placeholder={`Título de la página ${selectedPage?.page_number || ''}`.trim()}
          />

          {/* The Editor.js holder stays mounted; we only hide it on the preview tab. */}
          <div className="editorial-editor__surface" hidden={activeTab !== 'edit'}>
            <div ref={holderRef} className="editorial-editor__holder" />
          </div>

          {activeTab === 'preview' && (
            <div className="editorial-editor__preview" aria-label="Vista previa">
              <EditorJsPreview data={previewData} />
            </div>
          )}

          <div className="editorial-editor__footer">
            <button type="button" className="editorial-editor__remove" onClick={handleRemove} disabled={pages.length <= 1}>Quitar página</button>
            <button type="button" className="editorial-editor__save" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Guardando…' : 'Guardar páginas'}
            </button>
          </div>
        </div>
      </div>

      {expanded && <button type="button" className="editorial-editor__expand-backdrop" aria-label="Reducir escritura" onClick={() => setExpanded(false)} />}
    </div>
  );
}
