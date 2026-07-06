// Plantilla "Maya" — tierra y jade, cenefas geométricas, carácter cultural.
export default {
  id: 'maya',
  name: 'Maya',
  description: 'Raíz cultural: tierra y jade, cenefas geométricas y serif con carácter.',
  category: 'Cultural',
  cover: {
    theme: { bg: '#14342b', fg: '#f5efe0', accent: '#e0a458', font: 'elegant' },
    background: { type: 'gradient', from: '#14342b', to: '#0b241d', angle: 160 },
    elements: [
      { type: 'shape', shape: 'rect', x: 0, y: 96, w: 800, h: 14, color: 'accent' },
      { type: 'shape', shape: 'rect', x: 0, y: 130, w: 800, h: 6, color: 'accent', opacity: 0.6 },
      { role: 'subtitle', type: 'text', x: 100, y: 168, w: 600, fontSize: 26, weight: 600, align: 'center', color: 'accent', letterSpacing: 6, uppercase: true },
      { role: 'title', type: 'text', x: 100, y: 220, w: 600, fontSize: 76, weight: 700, align: 'center', color: 'fg' },
      { role: 'image', type: 'image', x: 140, y: 380, w: 520, h: 440, radius: 4 },
      { type: 'shape', shape: 'rect-outline', x: 140, y: 380, w: 520, h: 440, color: 'accent', stroke: 6 },
      { type: 'shape', shape: 'rect', x: 0, y: 1076, w: 800, h: 14, color: 'accent' },
      { role: 'author', type: 'text', x: 100, y: 940, w: 600, fontSize: 34, weight: 600, align: 'center', color: 'fg' },
    ],
  },
  backCover: {
    theme: { bg: '#14342b', fg: '#f5efe0', accent: '#e0a458', font: 'serif' },
    background: { type: 'gradient', from: '#14342b', to: '#0b241d', angle: 160 },
    elements: [
      { type: 'shape', shape: 'rect', x: 0, y: 96, w: 800, h: 12, color: 'accent' },
      { role: 'sinopsis', type: 'text', x: 100, y: 160, w: 600, fontSize: 27, color: 'fg', lineHeight: 1.62 },
      { role: 'author', type: 'text', x: 100, y: 770, w: 600, fontSize: 27, weight: 600, color: 'accent' },
      { role: 'bio', type: 'text', x: 100, y: 818, w: 600, fontSize: 21, color: 'fg', lineHeight: 1.5, opacity: 0.9 },
      { role: 'institution', type: 'text', x: 100, y: 960, w: 420, fontSize: 22, weight: 500, color: 'accent' },
      { type: 'qr', x: 550, y: 968, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 100, y: 1005, w: 380, fontSize: 21, weight: 500, color: 'fg' },
      { type: 'shape', shape: 'rect', x: 0, y: 1092, w: 800, h: 12, color: 'accent' },
    ],
  },
};
