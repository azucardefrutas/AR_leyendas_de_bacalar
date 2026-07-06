// Plantilla "Infantil" — colores cálidos, formas redondeadas, tipografía amable.
export default {
  id: 'children',
  name: 'Infantil',
  description: 'Alegre y amigable: colores cálidos, formas redondeadas e imagen grande.',
  category: 'Infantil',
  cover: {
    theme: { bg: '#fef3c7', fg: '#7c2d12', accent: '#f97316', font: 'sans' },
    background: { type: 'gradient', from: '#fde68a', to: '#fdba74', angle: 160 },
    elements: [
      { type: 'shape', shape: 'circle', x: -80, y: -80, w: 320, h: 320, color: '#fb923c', opacity: 0.35 },
      { type: 'shape', shape: 'circle', x: 600, y: 940, w: 340, h: 340, color: '#fbbf24', opacity: 0.4 },
      { role: 'title', type: 'text', x: 70, y: 120, w: 660, fontSize: 78, weight: 800, align: 'center', color: 'fg', lineHeight: 1.05 },
      { role: 'image', type: 'image', x: 120, y: 330, w: 560, h: 520, radius: 40 },
      { role: 'subtitle', type: 'text', x: 90, y: 880, w: 620, fontSize: 32, weight: 600, align: 'center', color: 'accent' },
      { role: 'author', type: 'text', x: 90, y: 1050, w: 620, fontSize: 34, weight: 700, align: 'center', color: 'fg' },
    ],
  },
  backCover: {
    theme: { bg: '#fef3c7', fg: '#7c2d12', accent: '#f97316', font: 'sans' },
    background: { type: 'gradient', from: '#fde68a', to: '#fdba74', angle: 160 },
    elements: [
      { type: 'shape', shape: 'circle', x: 560, y: -70, w: 300, h: 300, color: '#fb923c', opacity: 0.35 },
      { role: 'sinopsis', type: 'text', x: 90, y: 150, w: 620, fontSize: 30, weight: 500, align: 'left', color: 'fg', lineHeight: 1.6 },
      { role: 'author', type: 'text', x: 90, y: 780, w: 620, fontSize: 30, weight: 700, color: 'accent' },
      { role: 'bio', type: 'text', x: 90, y: 832, w: 620, fontSize: 23, weight: 500, color: 'fg', lineHeight: 1.5 },
      { type: 'qr', x: 560, y: 985, w: 150, h: 150, radius: 24 },
      { role: 'isbn', type: 'text', x: 90, y: 1015, w: 400, fontSize: 22, weight: 600, color: 'fg' },
      { role: 'credits', type: 'text', x: 90, y: 1095, w: 430, fontSize: 18, weight: 500, color: 'fg', opacity: 0.8 },
    ],
  },
};
