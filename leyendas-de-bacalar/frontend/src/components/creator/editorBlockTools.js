// Visual Editor.js tools for manually-authored stories. Every tool stores its
// layout in editor_data; resources remain in the normal Editor.js document flow.
import MediaObjectView from './editor-media/MediaObjectView.js';
import { normalizeCrop, normalizeMediaLayout } from './editor-media/mediaLayoutState.js';
import { normalizeAnimationConfig } from '../3d/modelAnimationConfig.js';

const ICONS = {
  image: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  model3d: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>',
  marker: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
};

const ALIGN_ICONS = {
  left: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14M3 8h9M3 12h14M3 16h9"/></svg>',
  center: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14M5 8h10M3 12h14M5 16h10"/></svg>',
  right: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14M8 8h9M3 12h14M8 16h9"/></svg>',
};

export function normalizeBlockLayout(layout = {}, { defaultWidth = 520, defaultHeight = 'auto' } = {}) {
  const normalized = normalizeMediaLayout(layout, { defaultWidth, defaultHeight });
  return { width: Math.max(120, normalized.width), height: normalized.height, align: normalized.align };
}

export function normalizeImageBlockData(data = {}) {
  return {
    assetId: data.assetId || '',
    file: { url: data.file?.url || data.url || '' },
    alt: data.alt || '',
    caption: data.caption || '',
    withBorder: Boolean(data.withBorder),
    withBackground: Boolean(data.withBackground),
    stretched: Boolean(data.stretched),
    layout: normalizeMediaLayout(data.layout, { defaultWidth: 520, defaultHeight: 'auto' }),
    crop: normalizeCrop(data.crop),
  };
}

export function normalizeAssetBlockData(data = {}, { kind, toolTitle }) {
  const isModel = kind === 'model3d';
  return {
    assetId: data.assetId || '',
    title: data.title || toolTitle,
    caption: data.caption || '',
    displayMode: isModel ? 'inline-model' : (data.displayMode || 'inline-card'),
    modelUrl: data.modelUrl || '',
    imageUrl: data.imageUrl || data.previewUrl || '',
    // Link between a MODEL block and a MARKER: the model "absorbs" a marker dropped on it,
    // keeps itself (the model is what shows), and records the marker for the physical/AR
    // mapping. Empty otherwise.
    modelAssetId: data.modelAssetId || '',
    modelTitle: data.modelTitle || '',
    markerAssetId: data.markerAssetId || '',
    markerImageUrl: data.markerImageUrl || '',
    markerTitle: data.markerTitle || '',
    animationConfig: isModel ? normalizeAnimationConfig(data.animationConfig) : null,
    layout: normalizeMediaLayout(data.layout, {
      defaultWidth: isModel ? 520 : 180,
      defaultHeight: isModel ? 360 : 'auto',
    }),
    crop: isModel ? null : normalizeCrop(data.crop),
  };
}

export function canRenderInlineModel(data = {}) {
  return /^https?:\/\//i.test(String(data.modelUrl || '').trim());
}

export function resolveModelBlockData(data = {}, assets = []) {
  const normalized = normalizeAssetBlockData(data, { kind: 'model3d', toolTitle: 'Modelo 3D' });
  const asset = assets.find((item) => String(item?.id) === String(normalized.assetId));
  if (!asset) return normalized;
  return {
    ...normalized,
    modelUrl: normalized.modelUrl || asset.previewUrl || asset.url || '',
    title: data.title || asset.name || normalized.title,
  };
}

function createButton({ label, title, html, onClick, className = '' }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `ejs-resizable__action ${className}`.trim();
  button.setAttribute('aria-label', label);
  button.title = title || label;
  if (html) button.innerHTML = html;
  else button.textContent = label;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  });
  return button;
}

class ResizableBlockView {
  constructor({ data, api, config, kind, allowHeight = false }) {
    this.data = data;
    this.api = api;
    this.config = config || {};
    this.kind = kind;
    this.allowHeight = allowHeight;
    this.wrapper = null;
    this.frame = null;
  }

  notifyChange() {
    this.applyLayout();
    this.config.onDataChange?.();
  }

  applyLayout() {
    if (!this.frame) return;
    const { width, height, align } = this.data.layout;
    this.frame.style.width = `${width}px`;
    this.frame.style.maxWidth = '100%';
    this.frame.style.height = height === 'auto' ? 'auto' : `${height}px`;
    this.frame.dataset.align = align;
  }

  setAlign(align) {
    this.data.layout = normalizeBlockLayout({ ...this.data.layout, align });
    this.notifyChange();
  }

  setWidthPercent(percent) {
    const canvasWidth = this.wrapper?.parentElement?.clientWidth || 1040;
    this.data.layout = normalizeBlockLayout({
      ...this.data.layout,
      width: Math.round(canvasWidth * percent),
    });
    this.notifyChange();
  }

  deleteBlock() {
    const blockElement = this.wrapper?.closest('.ce-block');
    const siblings = blockElement?.parentElement
      ? [...blockElement.parentElement.children].filter((node) => node.classList.contains('ce-block'))
      : [];
    const index = siblings.indexOf(blockElement);
    if (index >= 0) this.api?.blocks?.delete(index);
  }

  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'ejs-resizable__toolbar';
    toolbar.setAttribute('aria-label', 'Controles del bloque');

    for (const align of ['left', 'center', 'right']) {
      toolbar.appendChild(createButton({
        label: `Alinear ${align === 'left' ? 'a la izquierda' : align === 'right' ? 'a la derecha' : 'al centro'}`,
        html: ALIGN_ICONS[align],
        onClick: () => this.setAlign(align),
      }));
    }

    for (const [label, percent] of [['25%', 0.25], ['50%', 0.5], ['100%', 1]]) {
      toolbar.appendChild(createButton({ label, title: `Ancho ${label}`, onClick: () => this.setWidthPercent(percent) }));
    }

    toolbar.appendChild(createButton({
      label: 'Eliminar bloque',
      title: 'Eliminar',
      className: 'is-danger',
      html: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 3h4l1 2H7l1-2ZM6 6l1 11h6l1-11M9 9v5M11 9v5"/></svg>',
      onClick: () => this.deleteBlock(),
    }));

    return toolbar;
  }

  attachResizeHandle() {
    if (!this.frame) return;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'ejs-resizable__handle';
    handle.setAttribute('aria-label', 'Redimensionar bloque');
    handle.title = 'Arrastra para cambiar el tamaño';

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture?.(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = this.data.layout.width;
      const startHeight = this.data.layout.height === 'auto'
        ? this.frame.getBoundingClientRect().height
        : this.data.layout.height;

      const move = (moveEvent) => {
        this.data.layout = normalizeBlockLayout({
          ...this.data.layout,
          width: startWidth + (moveEvent.clientX - startX),
          height: this.allowHeight ? startHeight + (moveEvent.clientY - startY) : 'auto',
        });
        this.notifyChange();
      };
      const stop = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', stop);
        handle.removeEventListener('pointercancel', stop);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
    });

    this.frame.appendChild(handle);
  }

  render(content) {
    this.wrapper = document.createElement('div');
    this.wrapper.className = `ejs-resizable ejs-resizable--${this.kind}`;
    this.wrapper.tabIndex = 0;
    this.wrapper.appendChild(this.createToolbar());

    this.frame = document.createElement('div');
    this.frame.className = 'ejs-resizable__frame';
    this.frame.appendChild(content);
    this.wrapper.appendChild(this.frame);
    this.applyLayout();
    this.attachResizeHandle();

    this.wrapper.addEventListener('pointerdown', () => this.wrapper.classList.add('is-selected'));
    this.wrapper.addEventListener('focusin', () => this.wrapper.classList.add('is-selected'));
    this.wrapper.addEventListener('focusout', (event) => {
      if (!this.wrapper.contains(event.relatedTarget)) this.wrapper.classList.remove('is-selected');
    });
    return this.wrapper;
  }
}

export class ImageEditorBlockTool {
  static get toolbox() {
    return { title: 'Imagen', icon: ICONS.image };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor({ data, api, config, readOnly }) {
    this.api = api;
    this.config = config || {};
    this.readOnly = Boolean(readOnly);
    this.data = normalizeImageBlockData(data);
  }

  render() {
    const figure = document.createElement('figure');
    figure.className = 'ejs-visual-image';
    const image = document.createElement('img');
    image.src = this.data.file.url;
    image.alt = this.data.alt;
    image.loading = 'lazy';
    figure.appendChild(image);
    if (this.data.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = this.data.caption;
      figure.appendChild(caption);
    }
    if (this.readOnly) return figure;
    this.view = new MediaObjectView({
      data: this.data,
      api: this.api,
      config: this.config,
      kind: 'image',
      allowCrop: true,
    });
    return this.view.render(figure);
  }

  save() {
    return normalizeImageBlockData(this.data);
  }

  validate(data) {
    return /^https?:\/\//i.test(data?.file?.url || '');
  }

  static get sanitize() {
    return {
      assetId: false, file: { url: false }, alt: false, caption: false,
      withBorder: false, withBackground: false, stretched: false,
      crop: { x: false, y: false, width: false, height: false, zoom: false },
      layout: {
        mode: false, align: false, layer: false, x: false, y: false,
        width: false, height: false, rotation: false, zIndex: false,
        locked: false, opacity: false, anchorBlockId: false,
      },
    };
  }

  destroy() {
    this.view?.destroy();
  }
}

class AssetBlockTool {
  constructor({ data, api, config, readOnly }, { kind, toolTitle }) {
    this.kind = kind;
    this.toolTitle = toolTitle;
    this.api = api;
    this.config = config || {};
    this.readOnly = Boolean(readOnly);
    this.data = normalizeAssetBlockData(data, { kind, toolTitle });
    this.inlineObserver = null;
    this.inlineCleanup = null;
  }

  createInlineModel() {
    const figure = document.createElement('figure');
    figure.className = 'ejs-inline-model';
    const stage = document.createElement('div');
    stage.className = 'ejs-inline-model__stage';
    const loading = document.createElement('span');
    loading.className = 'ejs-inline-model__loading';
    loading.textContent = 'Cargando modelo 3D…';
    stage.appendChild(loading);
    figure.appendChild(stage);
    if (this.data.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = this.data.caption;
      figure.appendChild(caption);
    }
    this.inlineStage = stage;
    return figure;
  }

  mountInlineModel() {
    if (!this.inlineStage || this.inlineCleanup || !this.config.mountInlineModel) return;
    this.inlineCleanup = this.config.mountInlineModel(this.inlineStage, this.data) || (() => {});
  }

  observeInlineModel() {
    if (!this.inlineStage) return;
    if (typeof IntersectionObserver === 'undefined') {
      this.mountInlineModel();
      return;
    }
    this.inlineObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      this.inlineObserver?.disconnect();
      this.inlineObserver = null;
      this.mountInlineModel();
    }, { rootMargin: '180px' });
    this.inlineObserver.observe(this.inlineStage);
  }

  createContent() {
    if (this.kind === 'model3d' && canRenderInlineModel(this.data) && this.config.mountInlineModel) {
      return this.createInlineModel();
    }

    const card = document.createElement('article');
    card.className = `ejs-visual-asset ejs-visual-asset--${this.kind}`;

    if (this.kind === 'marker' && this.data.imageUrl) {
      const image = document.createElement('img');
      image.src = this.data.imageUrl;
      image.alt = this.data.title || 'Marcador';
      image.loading = 'lazy';
      card.appendChild(image);
    } else {
      const icon = document.createElement('span');
      icon.className = 'ejs-visual-asset__icon';
      icon.innerHTML = ICONS[this.kind] || ICONS.model3d;
      card.appendChild(icon);
    }

    const info = document.createElement('div');
    info.className = 'ejs-visual-asset__info';
    const eyebrow = document.createElement('span');
    eyebrow.textContent = this.toolTitle;
    const title = document.createElement('strong');
    title.textContent = this.data.title || this.toolTitle;
    info.append(eyebrow, title);
    if (this.data.caption) {
      const caption = document.createElement('p');
      caption.textContent = this.data.caption;
      info.appendChild(caption);
    }
    card.appendChild(info);

    if (this.kind === 'model3d') {
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'ejs-visual-asset__preview';
      preview.textContent = 'Probar modelo';
      preview.disabled = !this.config.onOpenModel;
      preview.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.config.onOpenModel?.(this.data);
      });
      card.appendChild(preview);
    }
    return card;
  }

  render() {
    const content = this.createContent();
    if (this.readOnly) {
      queueMicrotask(() => this.observeInlineModel());
      return content;
    }
    this.view = new MediaObjectView({
      data: this.data,
      api: this.api,
      config: this.config,
      kind: this.kind,
      allowHeight: this.kind === 'model3d',
      allowCrop: this.kind === 'marker',
    });
    const rendered = this.view.render(content);
    queueMicrotask(() => this.observeInlineModel());
    return rendered;
  }

  save() {
    return normalizeAssetBlockData(this.data, { kind: this.kind, toolTitle: this.toolTitle });
  }

  validate(data) {
    return Boolean(data?.assetId);
  }

  destroy() {
    this.inlineObserver?.disconnect();
    this.inlineCleanup?.();
    this.view?.destroy();
    this.inlineObserver = null;
    this.inlineCleanup = null;
  }

  static get sanitize() {
    return {
      assetId: false, title: false, caption: false, displayMode: false,
      modelUrl: false, imageUrl: false, modelAssetId: false, modelTitle: false,
      markerAssetId: false, markerImageUrl: false, markerTitle: false,
      animationConfig: {
        clips: false, defaultClip: false, autoplay: false, loop: false, speed: false, trigger: false,
      },
      crop: { x: false, y: false, width: false, height: false, zoom: false },
      layout: {
        mode: false, align: false, layer: false, x: false, y: false,
        width: false, height: false, rotation: false, zIndex: false,
        locked: false, opacity: false, anchorBlockId: false,
      },
    };
  }
}

export class Model3DBlockTool extends AssetBlockTool {
  static get toolbox() {
    return { title: 'Modelo 3D', icon: ICONS.model3d };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor(options) {
    super(options, { kind: 'model3d', toolTitle: 'Modelo 3D' });
    this.data = resolveModelBlockData(this.data, this.config.assets || []);
  }
}

export class MarkerBlockTool extends AssetBlockTool {
  static get toolbox() {
    return { title: 'Marcador', icon: ICONS.marker };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor(options) {
    super(options, { kind: 'marker', toolTitle: 'Marcador' });
  }
}

// Kept for the current editor integration while callers migrate to named tools.
export function makeAssetCardTool({ kind }) {
  return kind === 'marker' ? MarkerBlockTool : Model3DBlockTool;
}
