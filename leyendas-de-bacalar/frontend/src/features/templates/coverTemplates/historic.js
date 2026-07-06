// Plantilla "Histórica" — sepia/vintage, serif, imagen con marco interior.
export default {
  id: 'historic',
  name: 'Histórica',
  description: 'Vintage y solemne: paleta sepia, serif con carácter y marco interior.',
  category: 'Histórica',
  cover: {
    theme: { bg: '#3b2f2a', fg: '#f3e9d6', accent: '#b08d57', font: 'serif' },
    background: { type: 'gradient', from: '#4a3b32', to: '#2a211d', angle: 160 },
    elements: [
      { type: 'shape', shape: 'rect-outline', x: 60, y: 60, w: 680, h: 1080, color: 'accent', stroke: 2 },
      { role: 'subtitle', type: 'text', x: 120, y: 120, w: 560, fontSize: 26, weight: 500, align: 'center', color: 'accent', letterSpacing: 4, uppercase: true },
      { role: 'title', type: 'text', x: 110, y: 176, w: 580, fontSize: 70, weight: 700, align: 'center', color: 'fg' },
      { role: 'image', type: 'image', x: 150, y: 340, w: 500, h: 460, radius: 2 },
      { type: 'shape', shape: 'rect-outline', x: 150, y: 340, w: 500, h: 460, color: 'accent', stroke: 4 },
      { type: 'shape', shape: 'line', x: 300, y: 900, w: 200, h: 2, color: 'accent' },
      { role: 'author', type: 'text', x: 110, y: 940, w: 580, fontSize: 34, weight: 600, align: 'center', color: 'fg', italic: true },
    ],
  },
  backCover: {
    theme: { bg: '#3b2f2a', fg: '#f3e9d6', accent: '#b08d57', font: 'serif' },
    background: { type: 'gradient', from: '#4a3b32', to: '#2a211d', angle: 160 },
    elements: [
      { type: 'shape', shape: 'rect-outline', x: 60, y: 60, w: 680, h: 1080, color: 'accent', stroke: 2 },
      { role: 'sinopsis', type: 'text', x: 120, y: 150, w: 560, fontSize: 26, weight: 400, align: 'left', color: 'fg', lineHeight: 1.65 },
      { type: 'shape', shape: 'line', x: 120, y: 720, w: 560, h: 2, color: 'accent' },
      { role: 'author', type: 'text', x: 120, y: 758, w: 560, fontSize: 27, weight: 600, color: 'accent', italic: true },
      { role: 'bio', type: 'text', x: 120, y: 806, w: 560, fontSize: 21, weight: 400, color: 'fg', lineHeight: 1.5, opacity: 0.9 },
      { role: 'institution', type: 'text', x: 120, y: 960, w: 400, fontSize: 22, weight: 500, color: 'accent' },
      { type: 'qr', x: 550, y: 970, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 120, y: 1010, w: 380, fontSize: 21, weight: 500, color: 'fg' },
      { role: 'credits', type: 'text', x: 120, y: 1090, w: 420, fontSize: 16, color: 'fg', opacity: 0.75 },
    ],
  },
};
