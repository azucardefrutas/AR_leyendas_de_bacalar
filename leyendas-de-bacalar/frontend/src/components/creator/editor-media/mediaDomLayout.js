import {
  MEDIA_SHEET_WIDTH,
  normalizeMediaLayout,
} from './mediaLayoutState.js';

export function getScaledMediaGeometry(layout, availableWidth = MEDIA_SHEET_WIDTH) {
  const normalized = normalizeMediaLayout(layout);
  const measuredWidth = Number(availableWidth) || MEDIA_SHEET_WIDTH;
  const scale = Math.min(1, Math.max(0.1, measuredWidth / MEDIA_SHEET_WIDTH));
  return {
    x: Math.round(normalized.x * scale),
    y: Math.round(normalized.y * scale),
    width: Math.round(normalized.width * scale),
    height: normalized.height === 'auto'
      ? 'auto'
      : Math.round(normalized.height * scale),
    scale,
  };
}

export function getMediaBlockStyle(layout, availableWidth = MEDIA_SHEET_WIDTH) {
  const normalized = normalizeMediaLayout(layout);
  const geometry = getScaledMediaGeometry(normalized, availableWidth);
  const common = {
    opacity: String(normalized.opacity),
    transform: `rotate(${normalized.rotation}deg)`,
    transformOrigin: 'center center',
  };

  if (normalized.mode === 'free') {
    return {
      ...common,
      position: 'absolute',
      float: 'none',
      clear: 'none',
      left: `${geometry.x}px`,
      top: `${geometry.y}px`,
      width: `${geometry.width}px`,
      height: geometry.height === 'auto' ? 'auto' : `${geometry.height}px`,
      margin: '0',
      zIndex: String(normalized.zIndex),
    };
  }

  if (normalized.mode === 'wrap-left' || normalized.mode === 'wrap-right') {
    const isLeft = normalized.mode === 'wrap-left';
    return {
      ...common,
      position: 'relative',
      float: isLeft ? 'left' : 'right',
      clear: 'none',
      left: 'auto',
      top: 'auto',
      width: `${geometry.width}px`,
      height: geometry.height === 'auto' ? 'auto' : `${geometry.height}px`,
      margin: isLeft ? '0 24px 16px 0' : '0 0 16px 24px',
      zIndex: String(normalized.zIndex),
    };
  }

  return {
    ...common,
    position: 'relative',
    float: 'none',
    clear: 'both',
    left: 'auto',
    top: 'auto',
    width: '100%',
    height: 'auto',
    margin: '0',
    zIndex: String(normalized.zIndex),
  };
}

export function refreshMediaSheetHeight(redactor) {
  if (!redactor) return;
  const previousMinHeight = redactor.style.minHeight;
  redactor.style.minHeight = '';
  const redactorRect = redactor.getBoundingClientRect();
  let requiredHeight = 680;

  for (const block of redactor.querySelectorAll(':scope > .ce-block')) {
    const rect = block.getBoundingClientRect();
    const isFreeMedia = block.classList.contains('ejs-media-block')
      && block.dataset.mediaMode === 'free';
    if (isFreeMedia) {
      requiredHeight = Math.max(requiredHeight, rect.bottom - redactorRect.top + 96);
    } else {
      requiredHeight = Math.max(requiredHeight, rect.bottom - redactorRect.top + 120);
    }
  }

  const nextMinHeight = `${Math.ceil(requiredHeight)}px`;
  redactor.style.minHeight = nextMinHeight === previousMinHeight ? previousMinHeight : nextMinHeight;
}

export function applyMediaBlockLayout(host, layout) {
  const block = host?.closest?.('.ce-block');
  if (!block) return null;
  const redactor = block.closest('.codex-editor__redactor');
  if (redactor) {
    redactor.classList.add('ejs-media-redactor');
    redactor.style.position = 'relative';
  }
  const availableWidth = redactor?.clientWidth || MEDIA_SHEET_WIDTH;
  const normalized = normalizeMediaLayout(layout);
  const style = getMediaBlockStyle(normalized, availableWidth);

  block.classList.add('ejs-media-block');
  block.dataset.mediaMode = normalized.mode;
  block.dataset.mediaLayer = normalized.layer;
  Object.assign(block.style, style);
  block.style.zIndex = String(normalized.layer === 'above-text'
    ? 20 + normalized.zIndex
    : Math.min(9, normalized.zIndex));
  queueMicrotask(() => refreshMediaSheetHeight(redactor));
  return block;
}

export function clearMediaBlockLayout(host) {
  const block = host?.closest?.('.ce-block');
  if (!block) return;
  block.classList.remove('ejs-media-block');
  delete block.dataset.mediaMode;
  delete block.dataset.mediaLayer;
  for (const property of [
    'position', 'float', 'clear', 'left', 'top', 'width', 'height',
    'margin', 'zIndex', 'opacity', 'transform', 'transformOrigin',
  ]) {
    block.style[property] = '';
  }
  queueMicrotask(() => refreshMediaSheetHeight(block.closest('.codex-editor__redactor')));
}
