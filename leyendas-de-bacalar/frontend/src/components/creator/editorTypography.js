export const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter', stack: 'Inter, Arial, sans-serif' },
  { label: 'Nunito Sans', value: 'Nunito Sans', stack: '"Nunito Sans", Arial, sans-serif' },
  { label: 'Lora', value: 'Lora', stack: 'Lora, Georgia, serif' },
  { label: 'Playfair', value: 'Playfair Display', stack: '"Playfair Display", Georgia, serif' },
];

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
