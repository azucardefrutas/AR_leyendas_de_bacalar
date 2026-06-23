import React from 'react';
import { createRoot } from 'react-dom/client';
import { normalizeCompositionData } from '../editor-composition/compositionState.js';

const TOOL_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 8 4-8 4-8-4 8-4Z"/><path d="m4 10 8 4 8-4"/><path d="m4 14 8 4 8-4"/></svg>';

export function serializeCompositionData(data = {}) {
  return normalizeCompositionData(data);
}

export default class CompositionBlockTool {
  static get toolbox() {
    return { title: 'Composición visual', icon: TOOL_ICON };
  }

  static get isReadOnlySupported() {
    return true;
  }

  static get sanitize() {
    return {
      canvas: { width: false, height: false, background: false },
      layers: {
        id: false,
        type: false,
        assetId: false,
        title: false,
        url: false,
        caption: false,
        alt: false,
        x: false,
        y: false,
        width: false,
        height: false,
        zIndex: false,
        rotation: false,
        opacity: false,
        locked: false,
      },
    };
  }

  constructor({ data, config, readOnly }) {
    this.config = config || {};
    this.readOnly = Boolean(readOnly);
    this.data = serializeCompositionData(data);
    this.root = null;
    this.host = null;
    this.destroyed = false;
  }

  render() {
    this.host = document.createElement('div');
    this.host.className = 'ejs-composition-host';

    import('../editor-composition/CompositionCanvas.jsx')
      .then(({ default: CompositionCanvas }) => {
        if (this.destroyed || !this.host) return;
        this.root = createRoot(this.host);
        this.root.render(React.createElement(CompositionCanvas, {
          data: this.data,
          readOnly: this.readOnly,
          onChange: (nextData) => {
            this.data = serializeCompositionData(nextData);
            this.config.onDataChange?.();
          },
          onRequestAsset: this.config.requestAsset,
        }));
      })
      .catch(() => {
        if (!this.host || this.destroyed) return;
        this.host.textContent = 'No se pudo abrir la composición visual.';
        this.host.classList.add('is-error');
      });

    return this.host;
  }

  save() {
    return serializeCompositionData(this.data);
  }

  validate(savedData) {
    const normalized = serializeCompositionData(savedData);
    return normalized.canvas.width === 900 && normalized.canvas.height === 560;
  }

  destroy() {
    this.destroyed = true;
    this.root?.unmount();
    this.root = null;
    this.host = null;
  }
}
