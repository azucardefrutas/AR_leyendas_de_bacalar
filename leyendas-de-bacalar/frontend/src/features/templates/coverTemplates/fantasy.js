// Plantilla "Fantasía" — nocturna, degradado violeta, tipografía de impacto.
export default {
  id: 'fantasy',
  name: 'Fantasía',
  description: 'Mágica y nocturna: degradado violeta profundo con tipografía de impacto.',
  category: 'Fantasía',
  cover: {
    theme: { bg: '#2e1065', fg: '#ede9fe', accent: '#f0abfc', font: 'display' },
    background: { type: 'gradient', from: '#3b0764', to: '#1e1b4b', angle: 150 },
    elements: [
      { type: 'shape', shape: 'circle', x: 520, y: -120, w: 420, h: 420, color: '#7c3aed', opacity: 0.45 },
      { type: 'shape', shape: 'circle', x: -140, y: 820, w: 460, h: 460, color: '#a21caf', opacity: 0.38 },
      { role: 'title', type: 'text', x: 70, y: 130, w: 660, fontSize: 96, weight: 400, align: 'center', color: 'fg', lineHeight: 0.98 },
      { role: 'subtitle', type: 'text', x: 110, y: 360, w: 580, fontSize: 30, align: 'center', color: 'accent' },
      { role: 'image', type: 'image', x: 150, y: 440, w: 500, h: 440, radius: 20 },
      { role: 'author', type: 'text', x: 90, y: 1030, w: 620, fontSize: 34, weight: 600, align: 'center', color: 'accent' },
    ],
  },
  backCover: {
    theme: { bg: '#2e1065', fg: '#ede9fe', accent: '#f0abfc', font: 'sans' },
    background: { type: 'gradient', from: '#3b0764', to: '#1e1b4b', angle: 150 },
    elements: [
      { type: 'shape', shape: 'circle', x: 560, y: -110, w: 320, h: 320, color: '#7c3aed', opacity: 0.4 },
      { role: 'sinopsis', type: 'text', x: 90, y: 150, w: 620, fontSize: 28, color: 'fg', lineHeight: 1.6 },
      { role: 'author', type: 'text', x: 90, y: 780, w: 620, fontSize: 28, weight: 700, color: 'accent' },
      { role: 'bio', type: 'text', x: 90, y: 832, w: 620, fontSize: 22, color: 'fg', lineHeight: 1.5, opacity: 0.9 },
      { type: 'qr', x: 560, y: 985, w: 150, h: 150 },
      { role: 'isbn', type: 'text', x: 90, y: 1015, w: 400, fontSize: 22, weight: 500, color: 'fg' },
      { role: 'credits', type: 'text', x: 90, y: 1095, w: 430, fontSize: 17, color: 'fg', opacity: 0.8 },
    ],
  },
};
