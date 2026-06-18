import React from 'react';
import AppIcon from '../ui/AppIcon.jsx';
import ColorThemePicker from './ColorThemePicker.jsx';
import { READER_THEMES } from './readerTheme.js';

const BOOK_SIZES = [
  ['fit', 'Ajustado'],
  ['large', 'Grande'],
  ['full', 'Pantalla'],
];

const CONTROL_MODES = [
  ['always', 'Siempre'],
  ['auto', 'Automaticos'],
];

/**
 * Reader settings panel: theme color picker + book size + controls mode + fullscreen.
 * Presentational and reusable — all state lives in the parent reader via `settings`
 * and the `onChange(key, value)` handler.
 */
export default function ReaderSettingsPanel({ settings, onChange, onClose, isFullscreen, onToggleFullscreen }) {
  return (
    <aside id="reader-settings-panel" className="reader-settings-panel" aria-label="Configuracion del lector">
      <div className="reader-settings-panel-header">
        <strong>Lectura</strong>
        <button type="button" onClick={onClose} aria-label="Cerrar configuracion" title="Cerrar">
          <AppIcon name="close" size={18} />
        </button>
      </div>

      <div className="reader-settings-group">
        <span>Tema y color</span>
        <ColorThemePicker
          themes={READER_THEMES}
          selectedTheme={settings.theme}
          onChange={(id) => onChange('theme', id)}
        />
      </div>

      <div className="reader-settings-group">
        <span>Tamano del libro</span>
        <div className="reader-settings-options">
          {BOOK_SIZES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={settings.bookSize === value ? 'is-active' : ''}
              onClick={() => onChange('bookSize', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="reader-settings-group">
        <span>Controles</span>
        <div className="reader-settings-options">
          {CONTROL_MODES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={settings.controlsMode === value ? 'is-active' : ''}
              onClick={() => onChange('controlsMode', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="reader-settings-fullscreen" onClick={onToggleFullscreen}>
        {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      </button>
    </aside>
  );
}
