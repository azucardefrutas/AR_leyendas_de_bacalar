// Plantilla "Minimalista" — mucho espacio, sans, un acento sutil.
export default {
  id: 'minimal',
  name: 'Minimalista',
  description: 'Limpia y editorial: fondo claro, mucho aire, tipografía sans y un acento.',
  category: 'Minimalista',
  cover: {
    theme: { bg: '#f8fafc', fg: '#0f172a', accent: '#2563eb', font: 'sans' },
    background: { type: 'solid' },
    elements: [
      { type: 'shape', shape: 'rect', x: 90, y: 150, w: 90, h: 10, color: 'accent', radius: 5 },
      { role: 'title', type: 'text', x: 88, y: 200, w: 620, fontSize: 82, weight: 800, align: 'left', color: 'fg', lineHeight: 1.02 },
      { role: 'subtitle', type: 'text', x: 90, y: 430, w: 560, fontSize: 30, weight: 400, align: 'left', color: '#475569' },
      { role: 'image', type: 'image', x: 90, y: 540, w: 620, h: 470, radius: 14 },
      { role: 'author', type: 'text', x: 90, y: 1070, w: 620, fontSize: 28, weight: 600, align: 'left', color: 'fg' },
    ],
  },
  backCover: {
    theme: { bg: '#f8fafc', fg: '#0f172a', accent: '#2563eb', font: 'sans' },
    background: { type: 'solid' },
    elements: [
      { type: 'shape', shape: 'rect', x: 90, y: 150, w: 90, h: 10, color: 'accent', radius: 5 },
      { role: 'sinopsis', type: 'text', x: 88, y: 200, w: 624, fontSize: 28, weight: 400, align: 'left', color: '#334155', lineHeight: 1.65 },
      { role: 'author', type: 'text', x: 90, y: 780, w: 620, fontSize: 26, weight: 700, color: 'fg' },
      { role: 'bio', type: 'text', x: 90, y: 830, w: 620, fontSize: 22, weight: 400, color: '#475569', lineHeight: 1.55 },
      { type: 'qr', x: 560, y: 985, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 90, y: 1015, w: 400, fontSize: 22, weight: 500, color: '#475569' },
      { role: 'credits', type: 'text', x: 90, y: 1095, w: 430, fontSize: 17, color: '#64748b' },
    ],
  },
};
