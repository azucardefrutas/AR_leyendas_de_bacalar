// Shared reader theme palette + contrast helpers. Extracted from the reader so the
// settings panel, color picker and the reader itself all use one source of truth.

// Canva-style color palette for the reader theme picker (12-18 colors max).
export const READER_THEMES = [
  { id: 'paper', name: 'Papel clásico', color: '#f7f2e6' },
  { id: 'sepia', name: 'Sepia', color: '#d8b982' },
  { id: 'sand', name: 'Arena', color: '#ead7b1' },
  { id: 'night', name: 'Noche', color: '#0d0d0d' },
  { id: 'deep-blue', name: 'Azul profundo', color: '#152659' },
  { id: 'laguna', name: 'Laguna', color: '#049dd9' },
  { id: 'turquoise', name: 'Turquesa', color: '#30cff2' },
  { id: 'dark-cyan', name: 'Cian oscuro', color: '#087ea4' },
  { id: 'mangrove', name: 'Verde manglar', color: '#0f766e' },
  { id: 'jade', name: 'Verde jade', color: '#10b981' },
  { id: 'deep-purple', name: 'Morado profundo', color: '#4c1d95' },
  { id: 'violet', name: 'Violeta', color: '#7c3aed' },
  { id: 'coral', name: 'Rojo coral', color: '#ef4444' },
  { id: 'orange', name: 'Naranja', color: '#f97316' },
  { id: 'gold', name: 'Dorado', color: '#c4933f' },
  { id: 'gray', name: 'Gris elegante', color: '#374151' },
];

export const READER_THEME_IDS = READER_THEMES.map((theme) => theme.id);

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function readerLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Per the design spec: dark colors -> white text, light colors -> dark text.
// Guarantees we never render white text on a light background (or vice versa).
export function getContrastText(hexColor) {
  return readerLuminance(hexColor) < 0.45 ? '#ffffff' : '#111827';
}

function mixHex(hex, target, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const channel = (x, y) => Math.round(x + (y - x) * amount);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(channel(a.r, b.r))}${toHex(channel(a.g, b.g))}${toHex(channel(a.b, b.b))}`;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Build the full CSS-variable set for a theme color, with automatic contrast so the
// panel, glass controls and back button stay legible on any background (light or dark).
export function buildReaderThemeVars(color) {
  const isDark = readerLuminance(color) < 0.45;
  return {
    '--reader-bg': `linear-gradient(180deg, ${mixHex(color, '#ffffff', isDark ? 0.05 : 0.16)} 0%, ${color} 55%, ${mixHex(color, '#000000', 0.18)} 100%)`,
    '--reader-text': isDark ? '#ffffff' : '#111827',
    '--reader-muted': isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(17, 24, 39, 0.62)',
    '--reader-accent': color,
    '--reader-accent-ink': getContrastText(color),
    '--reader-surface': isDark ? rgba(mixHex(color, '#0b1020', 0.5), 0.88) : rgba('#ffffff', 0.9),
    '--reader-control-bg': isDark ? rgba(mixHex(color, '#0b1020', 0.45), 0.82) : rgba('#ffffff', 0.84),
    '--reader-control-border': isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(15, 23, 42, 0.14)',
    '--reader-border': isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(15, 23, 42, 0.14)',
    '--reader-ring': isDark ? '#ffffff' : '#0f172a',
  };
}
