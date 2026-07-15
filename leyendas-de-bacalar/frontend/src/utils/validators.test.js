import { describe, it, expect } from 'vitest';
import { isEmail, isRequired } from './validators.js';

describe('validators', () => {
  describe('isEmail', () => {
    it('acepta correos válidos', () => {
      expect(isEmail('uhleidy22@gmail.com')).toBe(true);
      expect(isEmail('autor.bacalar@dominio.mx')).toBe(true);
    });

    it('rechaza correos sin @ o sin dominio', () => {
      expect(isEmail('sinarroba.com')).toBe(false);
      expect(isEmail('sin@dominio')).toBe(false);
      expect(isEmail('con espacio@x.com')).toBe(false);
      expect(isEmail('')).toBe(false);
    });
  });

  describe('isRequired', () => {
    it('es verdadero para valores con contenido', () => {
      expect(isRequired('Bacalar')).toBe(true);
      expect(isRequired(0)).toBe(true);
      expect(isRequired('  x  ')).toBe(true);
    });

    it('es falso para vacío, null, undefined o solo espacios', () => {
      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
    });
  });
});
