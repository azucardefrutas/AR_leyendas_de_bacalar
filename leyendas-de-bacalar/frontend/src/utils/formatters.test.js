import { describe, it, expect } from 'vitest';
import {
  formatPageTitle,
  formatMoney,
  formatDate,
  splitPrice,
} from './formatters.js';

describe('formatters', () => {
  describe('formatPageTitle', () => {
    it('antepone el título a la marca del sitio', () => {
      expect(formatPageTitle('Catálogo')).toBe('Catálogo | Leyendas de Bacalar');
    });

    it('usa solo la marca cuando no hay título', () => {
      expect(formatPageTitle('')).toBe('Leyendas de Bacalar');
      expect(formatPageTitle(undefined)).toBe('Leyendas de Bacalar');
    });
  });

  describe('formatMoney', () => {
    it('formatea un número como moneda MXN', () => {
      const out = formatMoney(49);
      // El símbolo/agrupador puede variar por entorno; validamos las partes estables.
      expect(out).toMatch(/49/);
      expect(out).toMatch(/\$/);
    });

    it('devuelve cadena vacía para valores no numéricos', () => {
      expect(formatMoney('no-es-numero')).toBe('');
      expect(formatMoney(NaN)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('devuelve cadena vacía para valores vacíos o inválidos', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate('fecha-invalida')).toBe('');
      expect(formatDate(null)).toBe('');
    });

    it('formatea una fecha ISO válida', () => {
      const out = formatDate('2026-07-14T00:00:00.000Z');
      expect(out).toMatch(/2026/);
    });
  });

  describe('splitPrice', () => {
    it('separa la parte entera de los centavos', () => {
      expect(splitPrice(49)).toEqual({ whole: '49', cents: '00' });
      expect(splitPrice(120.5)).toEqual({ whole: '120', cents: '50' });
    });

    it('devuelve un valor por defecto seguro para entradas inválidas', () => {
      expect(splitPrice('x')).toEqual({ whole: '0', cents: '00' });
    });
  });
});
