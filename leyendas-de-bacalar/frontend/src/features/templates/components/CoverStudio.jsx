import React, { useEffect, useRef, useState } from 'react';
import TemplateSurface from './TemplateSurface.jsx';
import { getTemplateById, listTemplates } from '../templateRegistry.js';
import { getBookTemplate, saveBookTemplate } from '../services/bookTemplateService.js';
import { buildDefaultCoverData, buildDefaultBackCoverData, buildReaderUrl, FONT_OPTIONS } from '../templateEngine.js';
import { uploadLegendAsset } from '../../../services/assetService.js';

// Inline editor for the book's cover & back cover. Edits ONLY the template data
// (text, image, colors, typography) over the chosen template and persists it via
// bookTemplateService. Never touches Editor.js / the pages.
const COVER_FIELDS = [['title', 'Título'], ['subtitle', 'Subtítulo'], ['author', 'Autor']];
const BACK_FIELDS = [['sinopsis', 'Sinopsis'], ['author', 'Autor'], ['bio', 'Biografía'], ['isbn', 'ISBN'], ['credits', 'Créditos'], ['qrUrl', 'Enlace del QR (URL del lector)']];
const MULTILINE = new Set(['sinopsis', 'bio']);
const WIDE = new Set(['sinopsis', 'bio', 'qrUrl']); // span both grid columns

// Canva-like color palette (click a swatch or pick a custom RGB color).
const PALETTE = [
  '#1e3a5f', '#0f766e', '#14342b', '#3b2f2a', '#2e1065', '#7c2d12', '#111827', '#334155',
  '#f8fafc', '#f4f1ea', '#ffffff', '#fef3c7',
  '#c9a24b', '#e0a458', '#5eead4', '#f97316', '#2563eb', '#f0abfc', '#dc2626', '#16a34a',
];

function assetUrl(result) {
  const asset = result?.asset || result;
  return asset?.public_url || asset?.file_url || asset?.url || asset?.external_url || '';
}

// Canva-style collapsible color picker: a compact trigger (swatch + label) that
// opens a popover with the palette + a custom RGB picker. Keeps the panel tidy
// instead of showing dozens of swatches at once.
function ColorField({ label, value, onChange }) {
  const current = String(value || '').toLowerCase();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className={`cover-studio__color${open ? ' is-open' : ''}`} ref={ref}>
      <button type="button" className="cover-studio__color-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog">
        <span className="cover-studio__color-chip" style={{ background: value || '#ffffff' }} />
        <span className="cover-studio__color-text">
          <span className="cover-studio__color-label">{label}</span>
          <span className="cover-studio__color-hex">{current || '—'}</span>
        </span>
        <span className="cover-studio__color-caret" aria-hidden="true">expand_more</span>
      </button>
      {open && (
        <div className="cover-studio__color-pop" role="dialog" aria-label={`Color de ${label}`}>
          <div className="cover-studio__swatches">
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                className={`cover-studio__swatch${current === c ? ' is-active' : ''}`}
                style={{ background: c }}
                onClick={() => { onChange(c); setOpen(false); }}
                aria-label={c}
                title={c}
              />
            ))}
          </div>
          <label className="cover-studio__color-custom" title="Color personalizado (RGB)">
            <span className="cover-studio__color-chip" style={{ background: value || '#000000' }} />
            <span className="cover-studio__color-custom-label">Personalizado</span>
            <span className="cover-studio__color-hex">{current || '—'}</span>
            <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  );
}

export default function CoverStudio({ legendId, meta = {} }) {
  const [templateId, setTemplateId] = useState('classic');
  const [coverData, setCoverData] = useState({ content: {}, theme: {} });
  const [backData, setBackData] = useState({ content: {}, theme: {} });
  const [side, setSide] = useState('cover');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ ok: '', err: '' });

  useEffect(() => {
    let active = true;
    getBookTemplate(legendId).then(({ data }) => {
      if (!active) return;
      const tpl = getTemplateById(data?.templateId) || getTemplateById('classic');
      setTemplateId(tpl?.id || 'classic');
      setCoverData(data?.coverData && Object.keys(data.coverData).length ? data.coverData : buildDefaultCoverData(tpl, meta));
      const existingBack = data?.backCoverData && Object.keys(data.backCoverData).length ? data.backCoverData : null;
      // Backfill the QR link for older drafts (only when the key was never set —
      // an author who cleared it on purpose keeps it empty).
      setBackData(existingBack
        ? { ...existingBack, content: { qrUrl: buildReaderUrl(meta.slug), ...(existingBack.content || {}) } }
        : buildDefaultBackCoverData(tpl, meta));
      setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legendId]);

  const template = getTemplateById(templateId);
  const isCover = side === 'cover';
  const surface = isCover ? template?.cover : template?.backCover;
  const activeData = isCover ? coverData : backData;
  const setActiveData = isCover ? setCoverData : setBackData;
  const activeTheme = { ...(surface?.theme || {}), ...(activeData.theme || {}) };

  function setContent(key, value) {
    setActiveData((d) => ({ ...d, content: { ...(d.content || {}), [key]: value } }));
  }
  function setTheme(key, value) {
    setActiveData((d) => ({ ...d, theme: { ...(d.theme || {}), [key]: value } }));
  }
  function handleMove(key, pos) {
    setActiveData((d) => ({ ...d, layout: { ...(d.layout || {}), [key]: pos } }));
  }
  function resetLayout() {
    setActiveData((d) => ({ ...d, layout: {} }));
    setSelected(null);
  }

  function switchTemplate(id) {
    const tpl = getTemplateById(id);
    if (!tpl) return;
    setTemplateId(id);
    setSelected(null);
    // Las posiciones arrastradas son relativas a la estructura de la plantilla anterior;
    // al cambiar de plantilla se descartan para no colocar elementos fuera de lugar.
    setCoverData((d) => ({ ...d, theme: { ...tpl.cover.theme }, layout: {} }));
    setBackData((d) => ({ ...d, theme: { ...(tpl.backCover?.theme || tpl.cover.theme) }, layout: {} }));
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus({ ok: '', err: '' });
    // Uploaded as an editor image (NOT the catalog cover): this image lives INSIDE
    // the cover design. The public cover the reader sees is the rendered template.
    const { data, error } = await uploadLegendAsset({ file, legendId, assetType: 'editor_image' });
    setUploading(false);
    event.target.value = '';
    if (error) { setStatus({ ok: '', err: error.message || 'No se pudo subir la imagen.' }); return; }
    setContent('imageUrl', assetUrl(data));
  }

  async function handleSave() {
    setSaving(true);
    setStatus({ ok: '', err: '' });
    const { error } = await saveBookTemplate(legendId, { templateId, coverData, backCoverData: backData });
    setSaving(false);
    setStatus(error ? { ok: '', err: error.message || 'No se pudo guardar la portada.' } : { ok: 'Portada y contraportada guardadas.', err: '' });
  }

  if (loading) return <p className="creator-muted">Cargando diseño de portada...</p>;

  const fields = isCover ? COVER_FIELDS : BACK_FIELDS;

  return (
    <div className="cover-studio">
      <div className="cover-studio__tabs" role="tablist">
        <button type="button" className={isCover ? 'is-active' : ''} onClick={() => { setSide('cover'); setSelected(null); }}>Portada</button>
        <button type="button" className={!isCover ? 'is-active' : ''} onClick={() => { setSide('back'); setSelected(null); }}>Contraportada</button>
      </div>

      <div className="cover-studio__body">
        <div className="cover-studio__preview-col">
          <div className="cover-studio__preview">
            <TemplateSurface
              surface={surface}
              data={activeData}
              editable
              selected={selected}
              onSelect={setSelected}
              onMove={handleMove}
            />
          </div>
          <div className="cover-studio__preview-hint">
            <span><span className="cover-studio__hint-icon" aria-hidden="true">drag_pan</span> Arrastra los elementos para reposicionarlos.</span>
            <button type="button" className="cover-studio__reset" onClick={resetLayout}>Restablecer posiciones</button>
          </div>
        </div>

        <div className="cover-studio__controls">
          <div className="cover-studio__fields">
            <label className="field cs-span-2">
              <span>Plantilla</span>
              <select className="select" value={templateId} onChange={(e) => switchTemplate(e.target.value)}>
                {listTemplates().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>

            {fields.map(([key, label]) => (
              <label className={`field${WIDE.has(key) ? ' cs-span-2' : ''}`} key={key}>
                <span>{label}</span>
                {MULTILINE.has(key)
                  ? <textarea className="textarea" rows={key === 'sinopsis' ? 3 : 2} value={activeData.content?.[key] || ''} onChange={(e) => setContent(key, e.target.value)} />
                  : <input className="standalone-input" value={activeData.content?.[key] || ''} onChange={(e) => setContent(key, e.target.value)} />}
                {key === 'qrUrl' && <small>Ruta interna (ej. /legend/mi-slug/read) o URL completa. El QR se genera solo.</small>}
              </label>
            ))}

            {isCover && (
              <label className={`field cover-studio__image-field${uploading ? ' is-uploading' : ''}`}>
                <span>Imagen del diseño</span>
                <div className="cover-studio__image-drop">
                  {activeData.content?.imageUrl
                    ? <img className="cover-studio__image-thumb" src={activeData.content.imageUrl} alt="" />
                    : <span className="cover-studio__image-ico" aria-hidden="true">add_photo_alternate</span>}
                  <em>{uploading ? 'Subiendo…' : (activeData.content?.imageUrl ? 'Cambiar imagen' : 'Subir imagen')}</em>
                </div>
                <input className="cover-studio__image-input" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleImage} disabled={uploading} />
              </label>
            )}

            <label className="field cs-span-2">
              <span>Tipografía</span>
              <select className="select" value={activeTheme.font || 'serif'} onChange={(e) => setTheme('font', e.target.value)}>
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
          </div>

          <div className="cover-studio__colors">
            <ColorField label="Fondo" value={activeTheme.bg} onChange={(v) => setTheme('bg', v)} />
            <ColorField label="Texto" value={activeTheme.fg} onChange={(v) => setTheme('fg', v)} />
            <ColorField label="Acento" value={activeTheme.accent} onChange={(v) => setTheme('accent', v)} />
          </div>

          {status.err && <p className="error-message">{status.err}</p>}
          {status.ok && <p className="success-message">{status.ok}</p>}

          <button type="button" className="btn btn-primary cover-studio__save" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar portada'}
          </button>
        </div>
      </div>
    </div>
  );
}
