import React from 'react';
import { getContrastText } from './readerTheme.js';

/**
 * Canva-style grid of color dots for picking the reader theme. Reusable: pass any
 * list of { id, name, color } themes, the selected id, and an onChange(id) handler.
 * The selected dot shows a check whose color is auto-contrasted against the swatch.
 */
export default function ColorThemePicker({ themes, selectedTheme, onChange }) {
  return (
    <div className="theme-color-grid" role="group" aria-label="Color del lector">
      {themes.map((theme) => {
        const selected = selectedTheme === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            className={`theme-color-dot ${selected ? 'is-selected' : ''}`}
            style={{ background: theme.color }}
            title={theme.name}
            aria-label={`Usar tema ${theme.name}`}
            aria-pressed={selected}
            onClick={() => onChange(theme.id)}
          >
            {selected && (
              <span
                className="material-symbols-rounded theme-color-check"
                style={{ color: getContrastText(theme.color) }}
                aria-hidden="true"
              >
                check
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
