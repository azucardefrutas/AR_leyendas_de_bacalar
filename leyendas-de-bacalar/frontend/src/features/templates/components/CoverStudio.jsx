import React, { useEffect, useState } from 'react';
import TemplateSurface from './TemplateSurface.jsx';
import { getTemplateById, listTemplates } from '../templateRegistry.js';
import { getBookTemplate, saveBookTemplate } from '../services/bookTemplateService.js';
import { buildDefaultCoverData, buildDefaultBackCoverData } from '../templateEngine.js';
import { uploadLegendAsset } from '../../../services/assetService.js';

// Inline editor for the book's cover & back cover. Edits ONLY the template data
// (text, image, colors, typography) over the chosen template and persists it via
// bookTemplateService. Never touches Editor.js / the pages.
const FONTS = [
  { v: 'serif', l: 'Serif (clásica)' },
  { v: 'sans', l: 'Sans (moderna)' },
  { v: 'display', l: 'Display (impacto)' },
];

const COVER_FIELDS = [['title', 'Título'], ['subtitle', 'Subtítulo'], ['author', 'Autor']];
const BACK_FIELDS = [['sinopsis', 'Sinopsis'], ['author', 'Autor'], ['bio', 'Biografía'], ['isbn', 'ISBN'], ['credits', 'Créditos']];
const MULTILINE = new Set(['sinopsis', 'bio']);

function assetUrl(result) {
  const asset = result?.asset || result;
  return asset?.public_url || asset?.file_url || asset?.url || asset?.external_url || '';
}

export default function CoverStudio({ legendId, meta = {} }) {
  const [templateId, setTemplateId] = useState('classic');
  const [coverData, setCoverData] = useState({ content: {}, theme: {} });
  const [backData, setBackData] = useState({ content: {}, theme: {} });
  const [side, setSide] = useState('cover');
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
      setBackData(data?.backCoverData && Object.keys(data.backCoverData).length ? data.backCoverData : buildDefaultBackCoverData(tpl, meta));
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

  function switchTemplate(id) {
    const tpl = getTemplateById(id);
    if (!tpl) return;
    setTemplateId(id);
    // Keep the author's text; adopt the new template's default theme.
    setCoverData((d) => ({ ...d, theme: { ...tpl.cover.theme } }));
    setBackData((d) => ({ ...d, theme: { ...(tpl.backCover?.theme || tpl.cover.theme) } }));
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus({ ok: '', err: '' });
    const { data, error } = await uploadLegendAsset({ file, legendId, assetType: 'cover' });
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
        <button type="button" className={isCover ? 'is-active' : ''} onClick={() => setSide('cover')}>Portada</button>
        <button type="button" className={!isCover ? 'is-active' : ''} onClick={() => setSide('back')}>Contraportada</button>
      </div>

      <div className="cover-studio__body">
        <div className="cover-studio__preview">
          <TemplateSurface surface={surface} data={activeData} />
        </div>

        <div className="cover-studio__controls">
          <label className="field">
            <span>Plantilla</span>
            <select className="select" value={templateId} onChange={(e) => switchTemplate(e.target.value)}>
              {listTemplates().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          {fields.map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              {MULTILINE.has(key)
                ? <textarea className="textarea" rows={key === 'sinopsis' ? 4 : 2} value={activeData.content?.[key] || ''} onChange={(e) => setContent(key, e.target.value)} />
                : <input className="standalone-input" value={activeData.content?.[key] || ''} onChange={(e) => setContent(key, e.target.value)} />}
            </label>
          ))}

          {isCover && (
            <label className="field">
              <span>Imagen de portada</span>
              <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleImage} disabled={uploading} />
              {uploading && <small>Subiendo imagen...</small>}
            </label>
          )}

          <div className="cover-studio__row">
            <label className="field"><span>Fondo</span><input type="color" value={activeTheme.bg || '#1e3a5f'} onChange={(e) => setTheme('bg', e.target.value)} /></label>
            <label className="field"><span>Texto</span><input type="color" value={activeTheme.fg || '#ffffff'} onChange={(e) => setTheme('fg', e.target.value)} /></label>
            <label className="field"><span>Acento</span><input type="color" value={activeTheme.accent || '#c9a24b'} onChange={(e) => setTheme('accent', e.target.value)} /></label>
          </div>

          <label className="field">
            <span>Tipografía</span>
            <select className="select" value={activeTheme.font || 'serif'} onChange={(e) => setTheme('font', e.target.value)}>
              {FONTS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
          </label>

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
