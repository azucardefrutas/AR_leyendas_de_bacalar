// Template engine — resolves a JSON template definition + the user's editable
// data (cover_data / back_cover_data) into a render model. Templates are pure
// configuration (positions, colors, typography), never images. Fully decoupled
// from Editor.js: this only draws the cover & back cover surfaces.

export const SURFACE_BASE = { width: 800, height: 1200 }; // book cover canvas (2:3)

export const FONT_STACKS = {
  serif: "'Fraunces', Georgia, 'Times New Roman', serif",
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  display: "'Anton', 'Arial Narrow', sans-serif",
};

// Placeholder text used only for previews / empty fields.
const PLACEHOLDERS = {
  title: 'Título de la leyenda',
  subtitle: 'Un subtítulo evocador',
  author: 'Nombre del autor',
  sinopsis: 'Aquí va la sinopsis de la leyenda: una breve descripción que invite a leer la historia completa.',
  bio: 'Sobre el autor: breve reseña biográfica.',
  isbn: 'ISBN 000-0-00-000000-0',
  credits: 'Leyendas de Bacalar · Estudio de publicación',
  institution: 'Universidad Politécnica de Bacalar',
};

export function resolveFont(name) {
  return FONT_STACKS[name] || FONT_STACKS.sans;
}

function resolveColor(token, theme) {
  if (!token) return theme.fg;
  if (token === 'fg' || token === 'bg' || token === 'accent' || token === 'muted') {
    return theme[token] || theme.fg;
  }
  return token; // literal color
}

function buildBackgroundStyle(background = {}, theme = {}) {
  const type = background.type || 'solid';
  if (type === 'gradient') {
    const from = resolveColor(background.from || 'bg', theme);
    const to = resolveColor(background.to || 'accent', theme);
    const angle = background.angle ?? 135;
    return { background: `linear-gradient(${angle}deg, ${from}, ${to})` };
  }
  if (type === 'image' && background.imageUrl) {
    return {
      backgroundImage: `linear-gradient(${background.overlay || 'rgba(0,0,0,0.28)'}, ${background.overlay || 'rgba(0,0,0,0.28)'}), url("${background.imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { background: resolveColor(background.color || 'bg', theme) };
}

// Merge user data over a surface definition and return a ready-to-render model.
// `data` shape: { content: { title, author, imageUrl, ... }, theme: { bg, fg, accent, font } }
export function resolveSurface(surface, data = {}) {
  if (!surface) return { base: SURFACE_BASE, backgroundStyle: {}, elements: [] };
  const theme = { ...(surface.theme || {}), ...(data.theme || {}) };
  const content = data.content || data || {};
  const base = surface.base || SURFACE_BASE;

  const background = data.content?.backgroundImageUrl
    ? { type: 'image', imageUrl: data.content.backgroundImageUrl, overlay: surface.background?.overlay }
    : surface.background;

  const elements = (surface.elements || []).map((el, index) => {
    const isText = el.type === 'text';
    const value = el.role ? content[el.role] : el.text;
    return {
      key: el.id || `${el.type}-${index}`,
      ...el,
      value: value != null && value !== '' ? value : (isText ? (PLACEHOLDERS[el.role] || '') : ''),
      isPlaceholder: !(value != null && value !== ''),
      imageUrl: el.role === 'image' ? content.imageUrl || '' : undefined,
      resolvedColor: resolveColor(el.color, theme),
      resolvedFont: resolveFont(el.font || theme.font),
    };
  });

  return { base, backgroundStyle: buildBackgroundStyle(background, theme), theme, elements };
}

// Default editable data derived from a template + the legend's metadata, used
// when a book is first created from a template.
export function buildDefaultCoverData(template, meta = {}) {
  const theme = template?.cover?.theme || {};
  return {
    theme: { ...theme },
    content: {
      title: meta.title || '',
      subtitle: meta.subtitle || '',
      author: meta.author || '',
      imageUrl: meta.coverUrl || '',
    },
  };
}

export function buildDefaultBackCoverData(template, meta = {}) {
  const theme = template?.backCover?.theme || template?.cover?.theme || {};
  return {
    theme: { ...theme },
    content: {
      sinopsis: meta.sinopsis || '',
      author: meta.author || '',
      bio: meta.bio || '',
      isbn: meta.isbn || '',
      credits: meta.credits || '',
    },
  };
}
