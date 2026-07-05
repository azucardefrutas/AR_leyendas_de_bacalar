import React, { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { COVER_FONTS, resolveCoverConfig } from '../../utils/coverRenderer.js';
import {
  applyCoverToLegend,
  deleteCoverTemplate,
  listCoverTemplates,
  saveCoverTemplate,
} from '../../services/coverTemplateService.js';

// Fase 2 — editable cover designer (templates library). Live-edits title,
// subtitle, author, image, color and typography, then renders a real PNG stored
// as the legend cover. Mirrors the canvas renderer layout for a faithful preview.

function configToState(template, base = {}) {
  const resolved = resolveCoverConfig(template?.config || {});
  return {
    templateId: template?.id || null,
    templateName: template?.name || '',
    preset: resolved.preset,
    background: resolved.background,
    foreground: resolved.foreground,
    font: resolved.font,
    align: resolved.align,
    ...base,
  };
}

function stateToConfig(state) {
  return {
    preset: state.preset,
    palette: [state.background, state.foreground],
    font: state.font,
    align: state.align,
  };
}

export default function CoverDesigner({ legendId, defaultTitle = '', defaultAuthor = '', onApplied }) {
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [design, setDesign] = useState(() => configToState(null));
  const [fields, setFields] = useState({ title: defaultTitle, subtitle: '', author: defaultAuthor });
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState({ saving: false, message: '', error: '' });
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    let active = true;
    listCoverTemplates().then(({ data, error }) => {
      if (!active) return;
      setLoadingTemplates(false);
      if (error) {
        setStatus((s) => ({ ...s, error: error.message }));
        return;
      }
      setTemplates(data);
      if (data.length) setDesign(configToState(data[0]));
    });
    return () => { active = false; };
  }, []);

  // Object URL lifecycle for the uploaded background image.
  useEffect(() => {
    if (!imageFile) return undefined;
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const previewStyle = useMemo(() => {
    const base = {
      color: imageUrl ? '#ffffff' : design.foreground,
      fontFamily: COVER_FONTS[design.font],
      textAlign: design.align,
      alignItems: design.align === 'left' ? 'flex-start' : 'center',
    };
    if (imageUrl) {
      return { ...base, backgroundImage: `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.42)), url(${imageUrl})` };
    }
    if (design.preset === 'modern') {
      return { ...base, backgroundImage: `linear-gradient(135deg, ${design.background}, ${design.foreground})` };
    }
    return { ...base, background: design.background };
  }, [design, imageUrl]);

  function selectTemplate(template) {
    setDesign(configToState(template));
    setStatus((s) => ({ ...s, error: '', message: '' }));
  }

  function updateField(key, value) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function updateDesign(key, value) {
    setDesign((current) => ({ ...current, [key]: value }));
  }

  async function handleApply() {
    if (!legendId) {
      setStatus({ saving: false, message: '', error: 'Primero crea el borrador.' });
      return;
    }
    setStatus({ saving: true, message: '', error: '' });
    const { error } = await applyCoverToLegend({
      legendId,
      config: stateToConfig(design),
      fields: { ...fields, imageUrl },
    });
    if (error) {
      setStatus({ saving: false, message: '', error: error.message });
      return;
    }
    setStatus({ saving: false, message: 'Portada aplicada a la leyenda.', error: '' });
    if (typeof onApplied === 'function') onApplied();
  }

  async function handleSaveTemplate() {
    const name = templateName.trim() || `${design.preset} personalizada`;
    setStatus({ saving: true, message: '', error: '' });
    const { data, error } = await saveCoverTemplate({ name, config: stateToConfig(design) });
    if (error) {
      setStatus({ saving: false, message: '', error: error.message });
      return;
    }
    setTemplates((current) => [...current, data]);
    setTemplateName('');
    setStatus({ saving: false, message: 'Plantilla guardada en tu biblioteca.', error: '' });
  }

  async function handleDeleteTemplate(template) {
    const { error } = await deleteCoverTemplate(template.id);
    if (error) {
      setStatus((s) => ({ ...s, error: error.message }));
      return;
    }
    setTemplates((current) => current.filter((item) => item.id !== template.id));
  }

  return (
    <div className="cover-designer">
      <div className="cover-designer__gallery">
        <h3>Plantillas</h3>
        {loadingTemplates ? (
          <p className="creator-muted">Cargando plantillas...</p>
        ) : (
          <div className="cover-designer__templates">
            {templates.map((template) => {
              const resolved = resolveCoverConfig(template.config || {});
              const isActive = design.templateId === template.id;
              return (
                <button
                  type="button"
                  key={template.id}
                  className={`cover-designer__template ${isActive ? 'is-active' : ''}`}
                  onClick={() => selectTemplate(template)}
                >
                  <span
                    className="cover-designer__swatch"
                    style={{
                      background: resolved.preset === 'modern'
                        ? `linear-gradient(135deg, ${resolved.background}, ${resolved.foreground})`
                        : resolved.background,
                      color: resolved.foreground,
                      fontFamily: COVER_FONTS[resolved.font],
                    }}
                  >
                    Aa
                  </span>
                  <strong>{template.name}</strong>
                  {template.scope === 'creator' && (
                    <span
                      className="cover-designer__template-delete"
                      role="button"
                      tabIndex={0}
                      onClick={(event) => { event.stopPropagation(); handleDeleteTemplate(template); }}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); handleDeleteTemplate(template); } }}
                      aria-label={`Eliminar plantilla ${template.name}`}
                    >
                      x
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="cover-designer__editor">
        <div className="cover-designer__preview-wrap">
          <div className="cover-designer__preview" style={previewStyle}>
            <div className="cover-designer__preview-title">{fields.title || 'Título de la leyenda'}</div>
            {fields.subtitle && <div className="cover-designer__preview-subtitle">{fields.subtitle}</div>}
            {fields.author && <div className="cover-designer__preview-author">{fields.author}</div>}
          </div>
        </div>

        <div className="cover-designer__controls">
          <label className="field">
            <span>Título</span>
            <input className="standalone-input" value={fields.title} onChange={(e) => updateField('title', e.target.value)} />
          </label>
          <label className="field">
            <span>Subtítulo</span>
            <input className="standalone-input" value={fields.subtitle} onChange={(e) => updateField('subtitle', e.target.value)} />
          </label>
          <label className="field">
            <span>Autor</span>
            <input className="standalone-input" value={fields.author} onChange={(e) => updateField('author', e.target.value)} />
          </label>
          <label className="field">
            <span>Imagen de fondo (opcional)</span>
            <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </label>

          <div className="cover-designer__row">
            <label className="field">
              <span>Color de fondo</span>
              <input type="color" value={design.background} onChange={(e) => updateDesign('background', e.target.value)} />
            </label>
            <label className="field">
              <span>Color de texto</span>
              <input type="color" value={design.foreground} onChange={(e) => updateDesign('foreground', e.target.value)} />
            </label>
          </div>

          <div className="cover-designer__row">
            <label className="field">
              <span>Tipografía</span>
              <select className="select" value={design.font} onChange={(e) => updateDesign('font', e.target.value)}>
                <option value="sans">Sans (moderna)</option>
                <option value="serif">Serif (clásica)</option>
              </select>
            </label>
            <label className="field">
              <span>Alineación</span>
              <select className="select" value={design.align} onChange={(e) => updateDesign('align', e.target.value)}>
                <option value="center">Centrado</option>
                <option value="left">Izquierda</option>
              </select>
            </label>
          </div>

          {status.error && <p className="error-message">{status.error}</p>}
          {status.message && <p className="success-message">{status.message}</p>}

          <div className="cover-designer__actions">
            <Button type="button" onClick={handleApply} disabled={status.saving}>
              {status.saving ? 'Aplicando...' : 'Usar como portada'}
            </Button>
          </div>

          <div className="cover-designer__save-template">
            <input
              className="standalone-input"
              placeholder="Nombre de la plantilla"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <Button type="button" variant="ghost" onClick={handleSaveTemplate} disabled={status.saving}>
              Guardar como plantilla
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
