// Plantilla "Elegante" — marfil y tinta, Playfair, mucho aire, línea fina.
export default {
  id: 'elegant',
  name: 'Elegante',
  description: 'Refinada y luminosa: marfil, tinta y Playfair con mucho aire.',
  category: 'Premium',
  cover: {
    theme: { bg: '#f4f1ea', fg: '#1c1917', accent: '#9a7b4f', font: 'elegant' },
    background: { type: 'solid' },
    elements: [
      { type: 'shape', shape: 'rect-outline', x: 60, y: 60, w: 680, h: 1080, color: 'accent', stroke: 1 },
      { role: 'subtitle', type: 'text', x: 120, y: 150, w: 560, fontSize: 24, weight: 500, align: 'center', color: 'accent', letterSpacing: 6, uppercase: true },
      { role: 'title', type: 'text', x: 110, y: 210, w: 580, fontSize: 82, weight: 600, align: 'center', color: 'fg', lineHeight: 1.05 },
      { type: 'shape', shape: 'line', x: 350, y: 430, w: 100, h: 1, color: 'accent' },
      { role: 'image', type: 'image', x: 150, y: 480, w: 500, h: 440, radius: 3 },
      { role: 'author', type: 'text', x: 110, y: 1000, w: 580, fontSize: 32, weight: 500, align: 'center', color: 'accent', italic: true },
    ],
  },
  backCover: {
    theme: { bg: '#f4f1ea', fg: '#1c1917', accent: '#9a7b4f', font: 'elegant' },
    background: { type: 'solid' },
    elements: [
      { type: 'shape', shape: 'rect-outline', x: 60, y: 60, w: 680, h: 1080, color: 'accent', stroke: 1 },
      { role: 'sinopsis', type: 'text', x: 120, y: 160, w: 560, fontSize: 26, weight: 400, align: 'left', color: '#3f3a34', lineHeight: 1.65 },
      { type: 'shape', shape: 'line', x: 120, y: 720, w: 560, h: 1, color: 'accent' },
      { role: 'author', type: 'text', x: 120, y: 758, w: 560, fontSize: 27, weight: 600, color: 'accent', italic: true },
      { role: 'bio', type: 'text', x: 120, y: 806, w: 560, fontSize: 21, weight: 400, color: '#3f3a34', lineHeight: 1.5 },
      { type: 'qr', x: 550, y: 970, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 120, y: 1010, w: 380, fontSize: 21, weight: 500, color: '#3f3a34' },
      { role: 'credits', type: 'text', x: 120, y: 1090, w: 430, fontSize: 16, color: '#6b6459' },
    ],
  },
};
