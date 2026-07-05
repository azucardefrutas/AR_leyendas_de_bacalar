// Renders an editable cover design (config + fields) into a real PNG image using
// the native Canvas API — no external dependencies. The generated file is stored
// as the legend cover asset, so it shows everywhere covers already render
// (catalog card, detail, reader) through the existing legend_media pipeline.

const COVER_WIDTH = 1000;
const COVER_HEIGHT = 1500;

export const COVER_FONTS = {
  serif: "'Georgia', 'Times New Roman', serif",
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
};

// Built-in presets mirror the seeded system templates in public.cover_templates.
export function resolveCoverConfig(config = {}) {
  const palette = Array.isArray(config.palette) && config.palette.length >= 2
    ? config.palette
    : ['#1e3a5f', '#f5efe0'];
  return {
    preset: config.preset || 'classic',
    background: palette[0],
    foreground: palette[1],
    font: config.font === 'serif' ? 'serif' : 'sans',
    align: config.align === 'left' ? 'left' : 'center',
  };
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // fall back to a plain background on failure
    img.src = url;
  });
}

function drawImageCover(ctx, img, width, height) {
  const ratio = Math.max(width / img.width, height / img.height);
  const drawWidth = img.width * ratio;
  const drawHeight = img.height * ratio;
  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) / 2;
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Draws the cover and returns a PNG Blob. `fields` = { title, subtitle, author, imageUrl }.
export async function renderCoverToBlob(config, fields = {}) {
  const resolved = resolveCoverConfig(config);
  const canvas = document.createElement('canvas');
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const ctx = canvas.getContext('2d');

  // Background — gradient for the "modern" preset, solid otherwise.
  if (resolved.preset === 'modern') {
    const gradient = ctx.createLinearGradient(0, 0, COVER_WIDTH, COVER_HEIGHT);
    gradient.addColorStop(0, resolved.background);
    gradient.addColorStop(1, resolved.foreground);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = resolved.background;
  }
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  // Optional background image with a legibility overlay.
  const img = await loadImage(fields.imageUrl);
  if (img) {
    drawImageCover(ctx, img, COVER_WIDTH, COVER_HEIGHT);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
  }

  const fontFamily = COVER_FONTS[resolved.font];
  const textColor = img ? '#ffffff' : resolved.foreground;
  const isLeft = resolved.align === 'left';
  const margin = 90;
  const maxWidth = COVER_WIDTH - margin * 2;
  const x = isLeft ? margin : COVER_WIDTH / 2;
  ctx.textAlign = isLeft ? 'left' : 'center';
  ctx.fillStyle = textColor;

  // Title (wrapped), vertically anchored around the upper third.
  ctx.font = `700 92px ${fontFamily}`;
  const titleLines = wrapText(ctx, fields.title || 'Título de la leyenda', maxWidth);
  let y = 420;
  const titleLineHeight = 104;
  for (const line of titleLines) {
    ctx.fillText(line, x, y);
    y += titleLineHeight;
  }

  // Subtitle.
  if (fields.subtitle) {
    ctx.font = `400 44px ${fontFamily}`;
    y += 20;
    const subtitleLines = wrapText(ctx, fields.subtitle, maxWidth);
    for (const line of subtitleLines) {
      ctx.fillText(line, x, y);
      y += 58;
    }
  }

  // Author, anchored near the bottom.
  if (fields.author) {
    ctx.font = `600 40px ${fontFamily}`;
    ctx.fillText(fields.author, x, COVER_HEIGHT - 140);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo generar la imagen de portada.'));
    }, 'image/png', 0.95);
  });
}

// Convenience: turn the Blob into a File so it flows through the existing
// saveLegendResource / uploadLegendAsset cover pipeline unchanged.
export async function renderCoverToFile(config, fields = {}, fileName = 'portada.png') {
  const blob = await renderCoverToBlob(config, fields);
  return new File([blob], fileName, { type: 'image/png' });
}
