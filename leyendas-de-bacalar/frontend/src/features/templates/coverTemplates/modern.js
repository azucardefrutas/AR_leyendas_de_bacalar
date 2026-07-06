// Plantilla "Moderna" — degradado, sans grande, imagen dominante, alineación izquierda.
export default {
  id: 'modern',
  name: 'Moderna',
  description: 'Contemporánea: degradado vibrante, tipografía sans grande e imagen a sangre.',
  category: 'Contemporánea',
  cover: {
    theme: { bg: '#0f766e', fg: '#ffffff', accent: '#5eead4', font: 'sans' },
    background: { type: 'gradient', from: 'bg', to: '#155e75', angle: 145 },
    elements: [
      { role: 'image', type: 'image', x: 0, y: 0, w: 800, h: 640, radius: 0, fit: 'cover' },
      { type: 'shape', shape: 'rect', x: 0, y: 560, w: 800, h: 80, color: 'bg', opacity: 0.0 },
      { role: 'title', type: 'text', x: 70, y: 720, w: 660, fontSize: 84, weight: 800, align: 'left', color: 'fg', lineHeight: 1.02 },
      { role: 'subtitle', type: 'text', x: 72, y: 960, w: 640, fontSize: 32, weight: 400, align: 'left', color: 'accent' },
      { type: 'shape', shape: 'rect', x: 72, y: 1050, w: 90, h: 8, color: 'accent', radius: 4 },
      { role: 'author', type: 'text', x: 72, y: 1080, w: 640, fontSize: 30, weight: 600, align: 'left', color: 'fg' },
    ],
  },
  backCover: {
    theme: { bg: '#0f766e', fg: '#ffffff', accent: '#5eead4', font: 'sans' },
    background: { type: 'gradient', from: 'bg', to: '#155e75', angle: 145 },
    elements: [
      { role: 'sinopsis', type: 'text', x: 72, y: 130, w: 640, fontSize: 28, weight: 400, align: 'left', color: 'fg', lineHeight: 1.6 },
      { type: 'shape', shape: 'rect', x: 72, y: 720, w: 90, h: 8, color: 'accent', radius: 4 },
      { role: 'author', type: 'text', x: 72, y: 760, w: 640, fontSize: 30, weight: 700, color: 'accent' },
      { role: 'bio', type: 'text', x: 72, y: 812, w: 640, fontSize: 22, weight: 400, color: 'fg', lineHeight: 1.5, opacity: 0.92 },
      { type: 'qr', x: 560, y: 980, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 72, y: 1010, w: 400, fontSize: 22, weight: 500, color: 'fg' },
      { role: 'credits', type: 'text', x: 72, y: 1092, w: 430, fontSize: 17, color: 'fg', opacity: 0.8 },
    ],
  },
};
