// Plantilla "Clásica" — editorial atemporal: serif, marco dorado, composición centrada.
export default {
  id: 'classic',
  name: 'Clásica',
  description: 'Editorial atemporal con serif elegante, marco dorado y composición centrada.',
  category: 'Editorial',
  cover: {
    theme: { bg: '#1e3a5f', fg: '#f6efdd', accent: '#c9a24b', font: 'serif' },
    background: { type: 'solid' },
    elements: [
      { type: 'shape', shape: 'rect-outline', x: 46, y: 46, w: 708, h: 1108, color: 'accent', stroke: 3 },
      { role: 'title', type: 'text', x: 110, y: 128, w: 580, fontSize: 74, weight: 700, align: 'center', color: 'fg' },
      { role: 'subtitle', type: 'text', x: 130, y: 254, w: 540, fontSize: 30, weight: 400, align: 'center', color: 'accent', italic: true },
      { role: 'image', type: 'image', x: 135, y: 335, w: 530, h: 470, radius: 6 },
      { type: 'shape', shape: 'line', x: 320, y: 905, w: 160, h: 3, color: 'accent' },
      { role: 'author', type: 'text', x: 110, y: 945, w: 580, fontSize: 36, weight: 600, align: 'center', color: 'fg' },
    ],
  },
  backCover: {
    theme: { bg: '#1e3a5f', fg: '#f6efdd', accent: '#c9a24b', font: 'serif' },
    background: { type: 'solid' },
    elements: [
      { type: 'shape', shape: 'rect-outline', x: 46, y: 46, w: 708, h: 1108, color: 'accent', stroke: 3 },
      { role: 'sinopsis', type: 'text', x: 110, y: 140, w: 580, fontSize: 27, weight: 400, align: 'left', color: 'fg', lineHeight: 1.6 },
      { type: 'shape', shape: 'line', x: 110, y: 720, w: 580, h: 2, color: 'accent' },
      { role: 'author', type: 'text', x: 110, y: 758, w: 580, fontSize: 28, weight: 600, color: 'accent' },
      { role: 'bio', type: 'text', x: 110, y: 808, w: 580, fontSize: 22, weight: 400, color: 'fg', lineHeight: 1.5, opacity: 0.9 },
      { type: 'qr', x: 558, y: 968, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 110, y: 1000, w: 400, fontSize: 22, weight: 500, color: 'fg' },
      { role: 'credits', type: 'text', x: 110, y: 1088, w: 430, fontSize: 17, color: 'fg', opacity: 0.75 },
    ],
  },
};
