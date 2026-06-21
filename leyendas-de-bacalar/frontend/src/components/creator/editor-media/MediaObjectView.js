import {
  applyCropPan,
  applyCropZoom,
  bringMediaForward,
  moveFreeMedia,
  normalizeCrop,
  normalizeMediaLayout,
  resetCrop,
  resizeMedia,
  sendMediaBackward,
  setMediaLocked,
  setMediaMode,
  setMediaOpacity,
  setTextLayer,
} from './mediaLayoutState.js';
import {
  applyMediaBlockLayout,
  clearMediaBlockLayout,
} from './mediaDomLayout.js';

function button(label, onClick, { danger = false, active = false } = {}) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.className = [
    'ejs-media-menu__button',
    danger ? 'is-danger' : '',
    active ? 'is-active' : '',
  ].filter(Boolean).join(' ');
  element.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return element;
}

function separator() {
  const element = document.createElement('span');
  element.className = 'ejs-media-menu__separator';
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function setCropImageStyle(image, crop) {
  if (!image) return;
  const normalized = normalizeCrop(crop);
  image.style.objectFit = normalized ? 'cover' : 'contain';
  image.style.objectPosition = normalized
    ? `${normalized.x * 100}% ${normalized.y * 100}%`
    : '50% 50%';
  image.style.transform = normalized ? `scale(${normalized.zoom})` : '';
  image.style.transformOrigin = normalized
    ? `${normalized.x * 100}% ${normalized.y * 100}%`
    : 'center';
}

export default class MediaObjectView {
  constructor({
    data,
    api,
    config,
    kind,
    allowHeight = false,
    allowCrop = false,
  }) {
    this.data = data;
    this.api = api;
    this.config = config || {};
    this.kind = kind;
    this.allowHeight = allowHeight;
    this.allowCrop = allowCrop;
    this.wrapper = null;
    this.frame = null;
    this.menu = null;
    this.cropDialog = null;
    this.interacting3d = false;
    this.outsideHandler = (event) => {
      if (!this.wrapper?.contains(event.target) && !this.menu?.contains(event.target)) {
        this.deselect();
      }
    };
    this.escapeHandler = (event) => {
      if (event.key === 'Escape') this.deselect();
    };
    this.resizeHandler = () => this.applyLayout();
  }

  updateLayout(updater, refreshMenu = true) {
    this.data.layout = normalizeMediaLayout(updater(this.data.layout));
    this.applyLayout();
    this.config.onDataChange?.();
    if (refreshMenu) this.rebuildMenu();
  }

  setMode(mode) {
    this.updateLayout((value) => {
      const current = normalizeMediaLayout(value);
      if (mode !== 'free' || current.mode === 'free') return setMediaMode(current, mode);
      const block = this.wrapper?.closest('.ce-block');
      const redactor = block?.closest('.codex-editor__redactor');
      const blockRect = block?.getBoundingClientRect();
      const redactorRect = redactor?.getBoundingClientRect();
      const scale = Math.min(1, Math.max(0.1, (redactor?.clientWidth || 1120) / 1120));
      return {
        ...setMediaMode(current, mode),
        x: blockRect && redactorRect ? (blockRect.left - redactorRect.left) / scale : current.x,
        y: blockRect && redactorRect ? (blockRect.top - redactorRect.top) / scale : current.y,
      };
    });
  }

  applyLayout() {
    if (!this.wrapper || !this.frame) return;
    const layout = normalizeMediaLayout(this.data.layout);
    this.data.layout = layout;
    applyMediaBlockLayout(this.wrapper, layout);

    const blockOwnsSize = layout.mode !== 'inline';
    this.frame.style.width = blockOwnsSize ? '100%' : `${layout.width}px`;
    this.frame.style.maxWidth = '100%';
    this.frame.style.height = layout.height === 'auto' ? 'auto' : `${layout.height}px`;
    this.frame.dataset.align = layout.align;
    this.wrapper.dataset.mediaMode = layout.mode;
    this.wrapper.dataset.mediaLayer = layout.layer;
    this.wrapper.classList.toggle('is-locked', layout.locked);
    this.wrapper.classList.toggle('is-manipulating-3d', this.interacting3d);
  }

  positionMenu(clientX, clientY) {
    if (!this.menu || !this.frame) return;
    const rect = this.frame.getBoundingClientRect();
    const left = Number.isFinite(clientX) ? clientX : rect.left;
    const top = Number.isFinite(clientY) ? clientY : rect.top - 10;
    this.menu.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 320))}px`;
    this.menu.style.top = `${Math.max(8, Math.min(top, window.innerHeight - 180))}px`;
  }

  rebuildMenu() {
    if (!this.menu) return;
    const layout = normalizeMediaLayout(this.data.layout);
    this.menu.replaceChildren();

    const modeGroup = document.createElement('div');
    modeGroup.className = 'ejs-media-menu__group';
    modeGroup.append(
      button('En línea', () => this.setMode('inline'), { active: layout.mode === 'inline' }),
      button('Texto izq.', () => this.setMode('wrap-left'), { active: layout.mode === 'wrap-left' }),
      button('Texto der.', () => this.setMode('wrap-right'), { active: layout.mode === 'wrap-right' }),
      button('Libre', () => this.setMode('free'), { active: layout.mode === 'free' }),
    );
    this.menu.appendChild(modeGroup);

    const alignGroup = document.createElement('div');
    alignGroup.className = 'ejs-media-menu__group';
    for (const [label, align] of [['Izq.', 'left'], ['Centro', 'center'], ['Der.', 'right']]) {
      alignGroup.appendChild(button(label, () => this.updateLayout((value) => ({ ...value, align })), { active: layout.align === align }));
    }
    alignGroup.append(
      button('Frente', () => this.updateLayout(bringMediaForward)),
      button('Atrás', () => this.updateLayout(sendMediaBackward)),
    );
    this.menu.append(separator(), alignGroup);

    const layerGroup = document.createElement('div');
    layerGroup.className = 'ejs-media-menu__group';
    layerGroup.append(
      button(
        layout.layer === 'behind-text' ? 'Detrás del texto' : 'Sobre el texto',
        () => this.updateLayout((value) => setTextLayer(value, value.layer === 'behind-text' ? 'above-text' : 'behind-text')),
        { active: layout.layer === 'behind-text' },
      ),
      button(layout.locked ? 'Desbloquear' : 'Bloquear', () => this.updateLayout((value) => setMediaLocked(value, !value.locked)), { active: layout.locked }),
    );
    if (this.kind === 'model3d') {
      layerGroup.appendChild(button(
        this.interacting3d ? 'Mover objeto' : 'Manipular 3D',
        () => {
          this.interacting3d = !this.interacting3d;
          this.applyLayout();
          this.rebuildMenu();
        },
        { active: this.interacting3d },
      ));
    }
    if (this.allowCrop) layerGroup.appendChild(button('Recortar', () => this.openCropEditor()));
    layerGroup.appendChild(button('Eliminar', () => this.deleteBlock(), { danger: true }));
    this.menu.append(separator(), layerGroup);

    const opacityLabel = document.createElement('label');
    opacityLabel.className = 'ejs-media-menu__opacity';
    opacityLabel.textContent = 'Opacidad';
    const opacity = document.createElement('input');
    opacity.type = 'range';
    opacity.min = '0.1';
    opacity.max = '1';
    opacity.step = '0.05';
    opacity.value = String(layout.opacity);
    opacity.addEventListener('input', () => this.updateLayout((value) => setMediaOpacity(value, opacity.value), false));
    opacityLabel.appendChild(opacity);
    this.menu.append(separator(), opacityLabel);
  }

  select(clientX, clientY) {
    this.wrapper?.classList.add('is-selected');
    this.rebuildMenu();
    this.menu?.classList.add('is-open');
    this.positionMenu(clientX, clientY);
  }

  deselect() {
    this.wrapper?.classList.remove('is-selected');
    this.menu?.classList.remove('is-open');
  }

  attachDrag() {
    this.frame.addEventListener('pointerdown', (event) => {
      const layout = normalizeMediaLayout(this.data.layout);
      if (
        layout.mode !== 'free'
        || layout.locked
        || this.interacting3d
        || event.button !== 0
        || event.target.closest('button, input, a')
      ) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const start = layout;
      const redactorWidth = this.wrapper.closest('.codex-editor__redactor')?.clientWidth || 1120;
      const scale = Math.min(1, Math.max(0.1, redactorWidth / 1120));

      const move = (moveEvent) => {
        this.data.layout = moveFreeMedia(start, {
          x: start.x + ((moveEvent.clientX - startX) / scale),
          y: start.y + ((moveEvent.clientY - startY) / scale),
        });
        this.applyLayout();
        this.positionMenu();
        this.config.onDataChange?.();
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop, { once: true });
    });
  }

  attachResizeHandle() {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'ejs-media-object__resize';
    handle.setAttribute('aria-label', 'Redimensionar recurso');
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const layout = normalizeMediaLayout(this.data.layout);
      if (layout.locked) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const startHeight = layout.height === 'auto'
        ? this.frame.getBoundingClientRect().height
        : layout.height;

      const move = (moveEvent) => {
        this.data.layout = resizeMedia(layout, {
          width: layout.width + (moveEvent.clientX - startX),
          height: this.allowHeight || this.data.crop
            ? startHeight + (moveEvent.clientY - startY)
            : 'auto',
        });
        this.applyLayout();
        this.positionMenu();
        this.config.onDataChange?.();
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop, { once: true });
    });
    this.frame.appendChild(handle);
  }

  openCropEditor() {
    const sourceImage = this.frame.querySelector('img');
    if (!sourceImage) return;
    this.menu.classList.remove('is-open');
    const original = normalizeCrop(this.data.crop);
    let draft = original || normalizeCrop({});

    const overlay = document.createElement('div');
    overlay.className = 'ejs-crop-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Recortar imagen');
    const panel = document.createElement('div');
    panel.className = 'ejs-crop-panel';
    const preview = document.createElement('div');
    preview.className = 'ejs-crop-panel__preview';
    const image = document.createElement('img');
    image.src = sourceImage.src;
    image.alt = sourceImage.alt;
    preview.appendChild(image);

    const controls = document.createElement('div');
    controls.className = 'ejs-crop-panel__controls';
    const makeRange = (label, key, min, max, step) => {
      const field = document.createElement('label');
      field.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(draft[key]);
      input.addEventListener('input', () => {
        draft = key === 'zoom'
          ? applyCropZoom(draft, input.value)
          : applyCropPan(draft, { [key]: input.value });
        setCropImageStyle(image, draft);
      });
      field.appendChild(input);
      return field;
    };
    controls.append(
      makeRange('Horizontal', 'x', 0, 1, 0.01),
      makeRange('Vertical', 'y', 0, 1, 0.01),
      makeRange('Zoom', 'zoom', 1, 4, 0.05),
    );

    const actions = document.createElement('div');
    actions.className = 'ejs-crop-panel__actions';
    const close = () => {
      overlay.remove();
      this.cropDialog = null;
      this.select();
    };
    actions.append(
      button('Restablecer', () => {
        draft = normalizeCrop({});
        setCropImageStyle(image, draft);
      }),
      button('Cancelar', close),
      button('Aplicar', () => {
        this.data.crop = draft;
        setCropImageStyle(sourceImage, this.data.crop);
        if (this.data.layout.height === 'auto') {
          this.data.layout = resizeMedia(this.data.layout, {
            width: this.data.layout.width,
            height: Math.max(180, this.frame.getBoundingClientRect().height),
          });
        }
        this.applyLayout();
        this.config.onDataChange?.();
        close();
      }, { active: true }),
      button('Quitar recorte', () => {
        this.data.crop = resetCrop();
        setCropImageStyle(sourceImage, null);
        this.config.onDataChange?.();
        close();
      }),
    );
    setCropImageStyle(image, draft);
    panel.append(preview, controls, actions);
    overlay.appendChild(panel);
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) close();
    });
    document.body.appendChild(overlay);
    this.cropDialog = overlay;
  }

  deleteBlock() {
    const blockElement = this.wrapper?.closest('.ce-block');
    const siblings = blockElement?.parentElement
      ? [...blockElement.parentElement.children].filter((node) => node.classList.contains('ce-block'))
      : [];
    const index = siblings.indexOf(blockElement);
    this.destroy();
    if (index >= 0) this.api?.blocks?.delete(index);
  }

  render(content) {
    this.wrapper = document.createElement('div');
    this.wrapper.className = `ejs-media-object ejs-media-object--${this.kind}`;
    this.wrapper.tabIndex = 0;

    this.frame = document.createElement('div');
    this.frame.className = 'ejs-media-object__frame';
    this.frame.appendChild(content);
    this.wrapper.appendChild(this.frame);

    this.menu = document.createElement('div');
    this.menu.className = 'ejs-media-menu';
    this.menu.setAttribute('role', 'toolbar');
    this.menu.setAttribute('aria-label', 'Herramientas del recurso');
    document.body.appendChild(this.menu);

    this.wrapper.addEventListener('pointerdown', (event) => this.select(event.clientX, event.clientY));
    this.wrapper.addEventListener('focusin', () => this.select());
    this.wrapper.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.select(event.clientX, event.clientY);
    });
    document.addEventListener('pointerdown', this.outsideHandler, true);
    window.addEventListener('keydown', this.escapeHandler, true);
    window.addEventListener('resize', this.resizeHandler);

    this.attachDrag();
    this.attachResizeHandle();
    setCropImageStyle(this.frame.querySelector('img'), this.data.crop);
    queueMicrotask(() => this.applyLayout());
    return this.wrapper;
  }

  destroy() {
    clearMediaBlockLayout(this.wrapper);
    document.removeEventListener('pointerdown', this.outsideHandler, true);
    window.removeEventListener('keydown', this.escapeHandler, true);
    window.removeEventListener('resize', this.resizeHandler);
    this.menu?.remove();
    this.cropDialog?.remove();
    this.menu = null;
    this.cropDialog = null;
  }
}

export { setCropImageStyle };
