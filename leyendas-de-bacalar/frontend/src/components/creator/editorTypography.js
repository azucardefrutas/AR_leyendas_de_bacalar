import { EDITOR_FONT_OPTIONS } from './editorFonts.js';

export const FONT_OPTIONS = EDITOR_FONT_OPTIONS;

const FONT_NAMES = new Set(FONT_OPTIONS.map((option) => option.value));

export function normalizeFontFamily(value, fallback = 'Inter') {
  return FONT_NAMES.has(value) ? value : fallback;
}

export function normalizeFontSize(value, fallback = 16) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(72, Math.max(10, Math.round(numeric)));
}

export function fontSizeToLegacyValue(value) {
  const size = normalizeFontSize(value);
  if (size <= 10) return 1;
  if (size <= 13) return 2;
  if (size <= 16) return 3;
  if (size <= 20) return 4;
  if (size <= 28) return 5;
  if (size <= 44) return 6;
  return 7;
}

export function normalizeHexColor(value, fallback = '#0f172a') {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}
