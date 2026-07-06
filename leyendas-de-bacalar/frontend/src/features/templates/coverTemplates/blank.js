// Plantilla "En blanco" — lienzo neutro, mínima estructura, todo por definir.
export default {
  id: 'blank',
  name: 'En blanco',
  description: 'Lienzo neutro para diseñar desde cero: solo los campos esenciales.',
  category: 'Libre',
  cover: {
    theme: { bg: '#ffffff', fg: '#111827', accent: '#111827', font: 'sans' },
    background: { type: 'solid' },
    elements: [
      { role: 'title', type: 'text', x: 90, y: 130, w: 620, fontSize: 68, weight: 700, align: 'center', color: 'fg' },
      { role: 'image', type: 'image', x: 120, y: 300, w: 560, h: 560, radius: 8 },
      { role: 'author', type: 'text', x: 90, y: 980, w: 620, fontSize: 30, weight: 500, align: 'center', color: 'fg' },
    ],
  },
  backCover: {
    theme: { bg: '#ffffff', fg: '#111827', accent: '#111827', font: 'sans' },
    background: { type: 'solid' },
    elements: [
      { role: 'sinopsis', type: 'text', x: 90, y: 150, w: 620, fontSize: 28, weight: 400, align: 'left', color: 'fg', lineHeight: 1.6 },
      { role: 'author', type: 'text', x: 90, y: 820, w: 620, fontSize: 26, weight: 600, color: 'fg' },
      { type: 'qr', x: 560, y: 990, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 90, y: 1030, w: 400, fontSize: 22, weight: 500, color: 'fg' },
    ],
  },
};
