import {
  applyCropPan,
  applyCropZoom,
  bringMediaForward,
  moveFreeMedia,
  normalizeCrop,
  normalizeMediaLayout,
  promoteMediaLayoutToFree,
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
  getMediaFrameStyle,
} from './mediaDomLayout.js';
import {
  clampFreeLayoutToSheet,
  resizeFromHandle,
  rotateFromPointer,
} from './mediaGeometry.js';
import {
  copyMediaBlock,
  hasMediaClipboard,
  pasteMediaBlock,
} from './mediaClipboard.js';
import { getNextMediaCandidate, uniqueMediaCandidates } from './mediaSelection.js';
import {
  canStartMediaPointerGesture,
  hasExceededDragThreshold,
  shouldPromoteMediaToFree,
  shouldResetMediaSelectionCycle,
  shouldCycleMediaSelection,
} from './mediaPointerGesture.js';

let activeMediaView = null;
let lastMediaSelectionPoint = null;

function button(label, onClick, { danger = false, active = false, disabled = false } = {}) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.className = [
    'ejs-media-menu__button',
    danger ? 'is-danger' : '',
    active ? 'is-active' : '',
  ].filter(Boolean).join(' ');
  element.disabled = disabled;
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
    this.hitArea = null;
    this.menu = null;
    this.quickToolbar = null;
    this.cropDialog = null;
    this.interacting3d = false;
    this.lastPointer = null;
    this.outsideHandler = (event) => {
      if (
        !this.wrapper?.contains(event.target)
        && !this.menu?.contains(event.target)
        && !this.quickToolbar?.contains(event.target)
      ) {
        if (shouldResetMediaSelectionCycle({
          clickedMedia: Boolean(event.target.closest?.('.ejs-media-object')),
        })) {
          lastMediaSelectionPoint = null;
        }
        this.deselect();
      }
    };
    this.escapeHandler = (event) => {
      if (event.key === 'Escape') {
        if (this.interacting3d) {
          this.interacting3d = false;
          this.applyLayout();
          this.rebuildQuickToolbar();
          return;
        }
        this.deselect();
      }
    };
    this.resizeHandler = () => {
      this.applyLayout();
      this.positionQuickToolbar();
    };
  }

  updateLayout(updater, refreshMenu = true) {
    this.data.layout = normalizeMediaLayout(updater(this.data.layout));
    this.applyLayout();
    this.config.onDataChange?.();
    this.positionQuickToolbar();
    if (refreshMenu) {
      this.rebuildMenu();
      this.rebuildQuickToolbar();
    }
  }

  setMode(mode) {
    this.updateLayout((value) => {
      const current = normalizeMediaLayout(value);
      if (mode !== 'free' || current.mode === 'free') return setMediaMode(current, mode);
      return this.promoteLayoutToFree(current);
    });
  }

  promoteLayoutToFree(layout) {
    const current = normalizeMediaLayout(layout);
    if (!shouldPromoteMediaToFree(current.mode)) return current;
    const block = this.wrapper?.closest('.ce-block');
    const redactor = block?.closest('.codex-editor__redactor');
    const blockRect = block?.getBoundingClientRect();
    const redactorRect = redactor?.getBoundingClientRect();
    const frameRect = this.frame?.getBoundingClientRect();
    const scale = Math.min(1, Math.max(0.1, (redactor?.clientWidth || 1120) / 1120));
    return promoteMediaLayoutToFree(current, {
      x: blockRect && redactorRect ? (blockRect.left - redactorRect.left) / scale : current.x,
      y: blockRect && redactorRect ? (blockRect.top - redactorRect.top) / scale : current.y,
      width: frameRect ? frameRect.width / scale : current.width,
      height: frameRect ? frameRect.height / scale : current.height,
    });
  }

  alignToPage(align) {
    this.updateLayout((value) => {
      const current = normalizeMediaLayout(value);
      if (current.mode !== 'free') return { ...current, align };
      const x = align === 'left'
        ? 0
        : align === 'right'
          ? 1120 - current.width
          : (1120 - current.width) / 2;
      return { ...current, align, x };
    });
  }

  applyLayout() {
    if (!this.wrapper || !this.frame) return;
    const layout = normalizeMediaLayout(this.data.layout);
    this.data.layout = layout;
    applyMediaBlockLayout(this.wrapper, layout);

    const frameStyle = getMediaFrameStyle(layout);
    this.frame.style.width = frameStyle.width;
    this.frame.style.maxWidth = '100%';
    this.frame.style.height = frameStyle.height;
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

  positionQuickToolbar() {
    if (!this.quickToolbar || !this.frame) return;
    const rect = this.frame.getBoundingClientRect();
    const toolbarRect = this.quickToolbar.getBoundingClientRect();
    const preferredTop = rect.bottom + 10;
    const top = preferredTop + toolbarRect.height <= window.innerHeight - 8
      ? preferredTop
      : Math.max(8, rect.top - toolbarRect.height - 10);
    const left = Math.max(8, Math.min(
      rect.left + ((rect.width - toolbarRect.width) / 2),
      window.innerWidth - toolbarRect.width - 8,
    ));
    this.quickToolbar.style.left = `${left}px`;
    this.quickToolbar.style.top = `${top}px`;
  }

  getBlockPayload() {
    const type = this.kind === 'image'
      ? 'image'
      : this.kind === 'model3d'
        ? 'model3d'
        : 'leyendaMarker';
    return { type, data: structuredClone(this.data) };
  }

  insertBlockPayload(payload) {
    if (!payload || !this.api?.blocks) return;
    const blockElement = this.wrapper?.closest('.ce-block');
    const siblings = blockElement?.parentElement
      ? [...blockElement.parentElement.children].filter((node) => node.classList.contains('ce-block'))
      : [];
    const index = siblings.indexOf(blockElement);
    this.api.blocks.insert(payload.type, payload.data, undefined, index >= 0 ? index + 1 : undefined, true);
    this.config.onDataChange?.();
  }

  copyBlock() {
    copyMediaBlock(this.getBlockPayload());
    this.rebuildMenu();
  }

  pasteBlock() {
    const pasted = pasteMediaBlock({
      highestZ: normalizeMediaLayout(this.data.layout).zIndex,
    });
    this.insertBlockPayload(pasted);
    this.deselect();
  }

  duplicateBlock() {
    this.copyBlock();
    this.pasteBlock();
  }

  getMediaCandidatesAtPoint(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return [];
    const redactor = this.wrapper?.closest('.codex-editor__redactor');
    const candidates = document.elementsFromPoint(clientX, clientY)
      .map((element) => element.closest?.('.ejs-media-object'))
      .filter((element) => element && (!redactor || element.closest('.codex-editor__redactor') === redactor));
    return uniqueMediaCandidates(candidates);
  }

  selectBelow(clientX, clientY) {
    const candidates = this.getMediaCandidatesAtPoint(clientX, clientY);
    const nextWrapper = getNextMediaCandidate(candidates, this.wrapper);
    const nextView = nextWrapper?.__ejsMediaView;
    if (!nextView || nextView === this) return false;
    this.deselect();
    nextView.select();
    nextView.wrapper?.focus({ preventScroll: true });
    return true;
  }

  // Find a MARKER block whose element sits under the given screen point (used when a
  // model is dropped, so the marker can absorb it). Ignores self.
  findMarkerViewAt(clientX, clientY) {
    const candidates = this.getMediaCandidatesAtPoint(clientX, clientY);
    for (const wrapper of candidates) {
      const view = wrapper?.__ejsMediaView;
      if (view && view !== this && view.kind === 'marker') return view;
    }
    return null;
  }

  // The MODEL records which marker it is linked to (asset id + image + title) and keeps
  // itself; the marker block is removed. The model is what shows (editor + reader); the
  // marker link is kept for the physical/AR mapping.
  absorbMarker(markerView) {
    this.data.markerAssetId = markerView.data.assetId || '';
    this.data.markerImageUrl = markerView.data.imageUrl || markerView.data.previewUrl || '';
    this.data.markerTitle = markerView.data.title || '';
    this.wrapper?.classList.add('has-linked-marker');
    markerView.deleteBlock();
    this.config.onDataChange?.();
  }

  // Visual feedback while dragging a model: outline the marker it would drop onto.
  highlightMarkerDropTarget(clientX, clientY) {
    const marker = this.findMarkerViewAt(clientX, clientY);
    if (this._markerDropTarget && this._markerDropTarget !== marker) {
      this._markerDropTarget.wrapper?.classList.remove('is-drop-target');
    }
    if (marker) marker.wrapper?.classList.add('is-drop-target');
    this._markerDropTarget = marker || null;
  }

  clearMarkerDropTarget() {
    this._markerDropTarget?.wrapper?.classList.remove('is-drop-target');
    this._markerDropTarget = null;
  }

  toggleModelInteraction() {
    if (this.kind !== 'model3d') return;
    this.interacting3d = !this.interacting3d;
    this.applyLayout();
    this.rebuildMenu();
    this.rebuildQuickToolbar();
  }

  rebuildQuickToolbar() {
    if (!this.quickToolbar) return;
    const layout = normalizeMediaLayout(this.data.layout);
    const actions = [];
    if (this.kind === 'model3d') {
      actions.push(button(
        this.interacting3d ? 'Mover capa' : 'Manipular 3D',
        () => this.toggleModelInteraction(),
        { active: this.interacting3d },
      ));
    }
    actions.push(
      button('Duplicar', () => this.duplicateBlock()),
      button('Frente', () => this.updateLayout(bringMediaForward)),
      button('Atrás', () => this.updateLayout(sendMediaBackward)),
      button(layout.locked ? 'Desbloquear' : 'Bloquear', () => (
        this.updateLayout((value) => setMediaLocked(value, !value.locked))
      ), { active: layout.locked }),
      button('Eliminar', () => this.deleteBlock(), { danger: true }),
      button('Más', () => {
        const rect = this.quickToolbar.getBoundingClientRect();
        const frameRect = this.frame.getBoundingClientRect();
        this.openMenu(
          rect.right,
          rect.bottom + 6,
          { x: frameRect.left + (frameRect.width / 2), y: frameRect.top + (frameRect.height / 2) },
        );
      }),
    );
    this.quickToolbar.replaceChildren(...actions);
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

    const clipboardGroup = document.createElement('div');
    clipboardGroup.className = 'ejs-media-menu__group';
    clipboardGroup.append(
      button('Copiar', () => this.copyBlock()),
      button('Pegar', () => this.pasteBlock(), { disabled: !hasMediaClipboard() }),
      button('Duplicar', () => this.duplicateBlock()),
    );
    this.menu.prepend(clipboardGroup, separator());

    const alignGroup = document.createElement('div');
    alignGroup.className = 'ejs-media-menu__group';
    for (const [label, align] of [['Izq.', 'left'], ['Centro', 'center'], ['Der.', 'right']]) {
      alignGroup.appendChild(button(label, () => this.alignToPage(align), { active: layout.align === align }));
    }
    alignGroup.append(
      button('Frente', () => this.updateLayout(bringMediaForward)),
      button('Atrás', () => this.updateLayout(sendMediaBackward)),
    );
    this.menu.append(separator(), alignGroup);

    const layerGroup = document.createElement('div');
    layerGroup.className = 'ejs-media-menu__group';
    layerGroup.append(
      button('Seleccionar debajo', () => {
        const point = this.lastPointer || {
          x: this.frame.getBoundingClientRect().left + 12,
          y: this.frame.getBoundingClientRect().top + 12,
        };
        this.selectBelow(point.x, point.y);
        this.menu?.classList.remove('is-open');
      }),
      button(
        layout.layer === 'behind-text' ? 'Detrás del texto' : 'Sobre el texto',
        () => this.updateLayout((value) => setTextLayer(value, value.layer === 'behind-text' ? 'above-text' : 'behind-text')),
        { active: layout.layer === 'behind-text' },
      ),
      button(layout.locked ? 'Desbloquear' : 'Bloquear', () => this.updateLayout((value) => setMediaLocked(value, !value.locked)), { active: layout.locked }),
    );
    if (this.kind === 'model3d') {
      layerGroup.appendChild(button(
        this.interacting3d ? 'Mover capa' : 'Manipular 3D',
        () => this.toggleModelInteraction(),
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

  select() {
    if (activeMediaView && activeMediaView !== this) activeMediaView.deselect();
    activeMediaView = this;
    this.wrapper?.classList.add('is-selected');
    this.rebuildQuickToolbar();
    this.quickToolbar?.classList.add('is-open');
    queueMicrotask(() => this.positionQuickToolbar());
  }

  openMenu(clientX, clientY, selectionPoint = null) {
    this.lastPointer = selectionPoint || { x: clientX, y: clientY };
    this.select();
    this.rebuildMenu();
    this.menu?.classList.add('is-open');
    this.positionMenu(clientX, clientY);
  }

  deselect() {
    if (activeMediaView === this) activeMediaView = null;
    this.wrapper?.classList.remove('is-selected');
    this.menu?.classList.remove('is-open');
    this.quickToolbar?.classList.remove('is-open');
  }

  attachDrag() {
    this.frame.addEventListener('pointerdown', (event) => {
      let layout = normalizeMediaLayout(this.data.layout);
      if (!canStartMediaPointerGesture({
        button: event.button,
        locked: layout.locked,
        interacting3d: this.interacting3d,
        interactiveTarget: Boolean(event.target.closest?.('button, input, a')),
      })) return;
      event.preventDefault();
      if (shouldPromoteMediaToFree(layout.mode)) {
        layout = normalizeMediaLayout(this.promoteLayoutToFree(layout));
        this.data.layout = layout;
        this.applyLayout();
        this.config.onDataChange?.();
      }
      const wasSelected = activeMediaView === this;
      const startX = event.clientX;
      const startY = event.clientY;
      const pointerStart = { x: startX, y: startY };
      const start = layout;
      let moved = false;
      const redactorWidth = this.wrapper.closest('.codex-editor__redactor')?.clientWidth || 1120;
      const scale = Math.min(1, Math.max(0.1, redactorWidth / 1120));
      this.frame.setPointerCapture?.(event.pointerId);

      const move = (moveEvent) => {
        if (!moved) {
          moved = hasExceededDragThreshold(pointerStart, {
            x: moveEvent.clientX,
            y: moveEvent.clientY,
          });
        }
        if (!moved) return;
        this.data.layout = moveFreeMedia(start, {
          x: start.x + ((moveEvent.clientX - startX) / scale),
          y: start.y + ((moveEvent.clientY - startY) / scale),
        });
        this.applyLayout();
        this.positionQuickToolbar();
        this.config.onDataChange?.();
        // Highlight a marker under the cursor so dropping a model onto it reads clearly.
        if (this.kind === 'model3d') this.highlightMarkerDropTarget(moveEvent.clientX, moveEvent.clientY);
      };
      const detach = () => {
        if (this.frame.hasPointerCapture?.(event.pointerId)) {
          this.frame.releasePointerCapture(event.pointerId);
        }
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
      };
      const stop = (stopEvent) => {
        const point = {
          x: stopEvent?.clientX ?? startX,
          y: stopEvent?.clientY ?? startY,
        };
        this.clearMarkerDropTarget();
        // Drop a 3D model onto a marker => the MODEL absorbs the marker: the model stays
        // (it is what matters), records the marker link, and the marker block is removed.
        // In the reader the model floats over the page (InlineModelLayer).
        if (moved && this.kind === 'model3d') {
          const marker = this.findMarkerViewAt(point.x, point.y);
          if (marker) this.absorbMarker(marker);
        }
        if (moved) {
          const redactor = this.wrapper.closest('.codex-editor__redactor');
          this.data.layout = clampFreeLayoutToSheet(this.data.layout, {
            width: 1120,
            height: Math.max(800, (redactor?.scrollHeight || 800) / scale),
          });
          this.applyLayout();
        } else if (shouldCycleMediaSelection({
          isCurrentSelected: wasSelected,
          moved,
          previousPoint: lastMediaSelectionPoint,
          point,
        })) {
          this.selectBelow(point.x, point.y);
        }
        lastMediaSelectionPoint = point;
        detach();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    });
  }

  attachResizeHandles() {
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const direction of handles) {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = `ejs-media-object__resize is-${direction}`;
      handle.setAttribute('aria-label', `Redimensionar ${direction}`);
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const layout = normalizeMediaLayout(this.data.layout);
        if (layout.locked) return;
        const startX = event.clientX;
        const startY = event.clientY;
        const redactorWidth = this.wrapper.closest('.codex-editor__redactor')?.clientWidth || 1120;
        const scale = Math.min(1, Math.max(0.1, redactorWidth / 1120));
        const start = layout.height === 'auto'
          ? { ...layout, height: this.frame.getBoundingClientRect().height / scale }
          : layout;

        const move = (moveEvent) => {
          this.data.layout = resizeFromHandle(start, direction, {
            x: (moveEvent.clientX - startX) / scale,
            y: (moveEvent.clientY - startY) / scale,
          });
          this.applyLayout();
          this.positionQuickToolbar();
        };
        const stop = () => {
          this.config.onDataChange?.();
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop, { once: true });
      });
      this.frame.appendChild(handle);
    }
  }

  attachRotationHandle() {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'ejs-media-object__rotate';
    handle.setAttribute('aria-label', 'Rotar recurso');
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const layout = normalizeMediaLayout(this.data.layout);
      if (layout.locked) return;

      const move = (moveEvent) => {
        const rect = this.frame.getBoundingClientRect();
        this.data.layout = normalizeMediaLayout({
          ...layout,
          rotation: rotateFromPointer(
            layout,
            { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) },
            { x: moveEvent.clientX, y: moveEvent.clientY },
          ),
        });
        this.applyLayout();
        this.positionQuickToolbar();
      };
      const stop = () => {
        this.config.onDataChange?.();
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
    this.config.onDataChange?.();
  }

  render(content) {
    this.wrapper = document.createElement('div');
    this.wrapper.className = `ejs-media-object ejs-media-object--${this.kind}`;
    this.wrapper.tabIndex = 0;
    this.wrapper.__ejsMediaView = this;
    // A model linked to a marker keeps a small "marcador" badge (see CSS).
    if (this.kind === 'model3d' && (this.data.markerAssetId || this.data.markerImageUrl)) {
      this.wrapper.classList.add('has-linked-marker');
    }

    this.frame = document.createElement('div');
    this.frame.className = 'ejs-media-object__frame';
    this.frame.appendChild(content);
    this.hitArea = document.createElement('span');
    this.hitArea.className = 'ejs-media-object__hit-area';
    this.hitArea.setAttribute('aria-hidden', 'true');
    this.frame.appendChild(this.hitArea);
    this.wrapper.appendChild(this.frame);

    this.menu = document.createElement('div');
    this.menu.className = 'ejs-media-menu';
    this.menu.setAttribute('role', 'toolbar');
    this.menu.setAttribute('aria-label', 'Herramientas del recurso');
    document.body.appendChild(this.menu);

    this.quickToolbar = document.createElement('div');
    this.quickToolbar.className = 'ejs-media-quick-toolbar';
    this.quickToolbar.setAttribute('role', 'toolbar');
    this.quickToolbar.setAttribute('aria-label', 'Acciones rápidas del recurso');
    document.body.appendChild(this.quickToolbar);

    this.wrapper.addEventListener('pointerdown', (event) => {
      if (!event.altKey || event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      lastMediaSelectionPoint = { x: event.clientX, y: event.clientY };
      this.selectBelow(event.clientX, event.clientY);
    }, true);
    this.wrapper.addEventListener('pointerdown', () => this.select());
    this.wrapper.addEventListener('focusin', () => this.select());
    this.wrapper.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.openMenu(event.clientX, event.clientY);
    });
    this.wrapper.addEventListener('keydown', (event) => {
      const layout = normalizeMediaLayout(this.data.layout);
      if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
        event.preventDefault();
        const rect = this.frame.getBoundingClientRect();
        this.openMenu(rect.left + 20, rect.top + 20);
        return;
      }
      if (event.key === 'Delete' && !layout.locked) {
        event.preventDefault();
        this.deleteBlock();
        return;
      }
      if (layout.mode !== 'free' || layout.locked || !event.key.startsWith('Arrow')) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const delta = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      }[event.key];
      this.data.layout = moveFreeMedia(layout, {
        x: layout.x + delta.x,
        y: layout.y + delta.y,
      });
      this.applyLayout();
      this.positionQuickToolbar();
      this.config.onDataChange?.();
    });
    document.addEventListener('pointerdown', this.outsideHandler, true);
    window.addEventListener('keydown', this.escapeHandler, true);
    window.addEventListener('resize', this.resizeHandler);

    this.attachDrag();
    this.attachResizeHandles();
    this.attachRotationHandle();
    setCropImageStyle(this.frame.querySelector('img'), this.data.crop);
    queueMicrotask(() => this.applyLayout());
    return this.wrapper;
  }

  destroy() {
    if (activeMediaView === this) activeMediaView = null;
    if (this.wrapper) delete this.wrapper.__ejsMediaView;
    clearMediaBlockLayout(this.wrapper);
    document.removeEventListener('pointerdown', this.outsideHandler, true);
    window.removeEventListener('keydown', this.escapeHandler, true);
    window.removeEventListener('resize', this.resizeHandler);
    this.menu?.remove();
    this.quickToolbar?.remove();
    this.cropDialog?.remove();
    this.menu = null;
    this.quickToolbar = null;
    this.cropDialog = null;
    this.hitArea = null;
  }
}

export { setCropImageStyle };
