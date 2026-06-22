import { normalizeHexColor } from './editorTypography.js';

export const TEXT_COLOR_OPTIONS = [
  '#0f172a',
  '#334155',
  '#64748b',
  '#ffffff',
  '#0e7490',
  '#0369a1',
  '#4338ca',
  '#7c3aed',
  '#be123c',
  '#b45309',
  '#15803d',
  '#111827',
];

export const HIGHLIGHT_COLOR_OPTIONS = [
  '#fef08a',
  '#fde68a',
  '#fed7aa',
  '#fecdd3',
  '#e9d5ff',
  '#c7d2fe',
  '#bae6fd',
  '#a5f3fc',
  '#bbf7d0',
  '#e2e8f0',
  '#ffffff',
  '#f8fafc',
];

export function resolveEditorColor(value, fallback) {
  return normalizeHexColor(value, fallback);
}
