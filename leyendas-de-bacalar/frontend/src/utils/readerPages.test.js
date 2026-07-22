import { describe, it, expect } from 'vitest';
import {
  buildReaderPagesFromBundle,
  getHotspotsForReaderPage,
} from './readerPages.js';

describe('readerPages (normalización del bundle del lector)', () => {
  describe('buildReaderPagesFromBundle', () => {
    it('prefiere las páginas PDF renderizadas sobre las páginas manuales', () => {
      const pages = buildReaderPagesFromBundle({
        sourceDocument: { id: 'doc-1' },
        renderedPages: [
          { pageNumber: 1, imageUrl: 'https://x/p1.png', width: 800, height: 1000 },
          { pageNumber: 2, imageUrl: 'https://x/p2.png' },
        ],
        legendPages: [{ pageNumber: 1, title: 'No usada' }],
      });

      expect(pages).toHaveLength(2);
      expect(pages[0].type).toBe('rendered_pdf');
      expect(pages[0].sourceDocumentId).toBe('doc-1');
      expect(pages[0].imageUrl).toBe('https://x/p1.png');
    });

    it('descarta páginas renderizadas sin imagen', () => {
      const pages = buildReaderPagesFromBundle({
        renderedPages: [
          { pageNumber: 1, imageUrl: 'https://x/p1.png' },
          { pageNumber: 2, imageUrl: null },
        ],
      });
      expect(pages).toHaveLength(1);
    });

    it('usa páginas manuales cuando no hay PDF renderizado', () => {
      const pages = buildReaderPagesFromBundle({
        legendPages: [
          { id: 'pg-1', pageNumber: 1, title: 'El pixán', textContent: 'texto' },
        ],
      });
      expect(pages[0].type).toBe('manual');
      expect(pages[0].pageId).toBe('pg-1');
      expect(pages[0].title).toBe('El pixán');
    });

    it('envuelve el contenido con portada y contraportada de plantilla', () => {
      const pages = buildReaderPagesFromBundle({
        legend: { coverTemplateId: 'tmpl-1', coverData: { t: 'a' }, backCoverData: { t: 'b' } },
        legendPages: [{ id: 'pg-1', pageNumber: 1, title: 'x' }],
      });
      expect(pages[0].type).toBe('template-cover');
      expect(pages.at(-1).type).toBe('template-back');
      // 1 página de contenido (impar) → se inserta una hoja en blanco antes de la
      // contraportada para que el total sea PAR y la contraportada cierre como un libro.
      expect(pages).toHaveLength(4);
      expect(pages.at(-2).type).toBe('template-blank');
    });

    it('mantiene el total PAR para que la contraportada cierre (relleno por paridad)', () => {
      const build = (n) =>
        buildReaderPagesFromBundle({
          legend: { coverTemplateId: 'tmpl-1' },
          legendPages: Array.from({ length: n }, (_, i) => ({ id: `pg-${i}`, pageNumber: i + 1 })),
        });
      // Contenido impar (1, 3) → agrega 1 hoja en blanco; par (2) → no agrega ninguna.
      expect(build(1)).toHaveLength(4);
      expect(build(2)).toHaveLength(4);
      expect(build(3)).toHaveLength(6);
      // El total siempre queda PAR y la contraportada es la última página.
      [build(1), build(2), build(3), build(4)].forEach((pages) => {
        expect(pages.length % 2).toBe(0);
        expect(pages.at(-1).type).toBe('template-back');
      });
    });

    it('no agrega portada si no hay contenido', () => {
      const pages = buildReaderPagesFromBundle({
        legend: { coverTemplateId: 'tmpl-1' },
        legendPages: [],
      });
      expect(pages).toEqual([]);
    });
  });

  describe('getHotspotsForReaderPage', () => {
    const hotspots = [
      { targetType: 'source_document', sourcePageNumber: 7, id: 'h1' },
      { targetType: 'source_document', sourcePageNumber: 8, id: 'h2' },
      { targetType: 'legend_page', pageId: 'pg-1', id: 'h3' },
    ];

    it('empareja hotspots de PDF por número de página', () => {
      const page = { type: 'rendered_pdf', pageNumber: 7 };
      expect(getHotspotsForReaderPage(page, hotspots).map((h) => h.id)).toEqual(['h1']);
    });

    it('empareja hotspots de página manual por pageId', () => {
      const page = { type: 'manual', pageId: 'pg-1' };
      expect(getHotspotsForReaderPage(page, hotspots).map((h) => h.id)).toEqual(['h3']);
    });

    it('acepta las variantes snake_case del backend', () => {
      const page = { type: 'rendered_pdf', pageNumber: 8 };
      const snake = [{ target_type: 'source_document', source_page_number: 8, id: 'hs' }];
      expect(getHotspotsForReaderPage(page, snake).map((h) => h.id)).toEqual(['hs']);
    });

    it('devuelve arreglo vacío para página nula', () => {
      expect(getHotspotsForReaderPage(null, hotspots)).toEqual([]);
    });
  });
});
