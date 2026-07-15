import { describe, it, expect } from 'vitest';
import {
  normalizeRoleName,
  normalizeRoleNames,
  isAdminRole,
  hasAdminRole,
} from './roleService.js';

// Estas funciones son puras (no tocan Supabase) y son la base de los permisos
// reales del proyecto: se derivan de roles + user_roles, no de active_role.
describe('roleService (lógica pura de roles)', () => {
  describe('normalizeRoleName', () => {
    it('normaliza cadenas a minúsculas sin espacios', () => {
      expect(normalizeRoleName('  ADMIN ')).toBe('admin');
    });

    it('extrae el nombre desde objetos de distintas formas', () => {
      expect(normalizeRoleName({ name: 'Creator' })).toBe('creator');
      expect(normalizeRoleName({ role_name: 'Reader' })).toBe('reader');
      expect(normalizeRoleName({ roles: { name: 'admin' } })).toBe('admin');
    });

    it('devuelve null para valores vacíos', () => {
      expect(normalizeRoleName(null)).toBe(null);
      expect(normalizeRoleName('')).toBe(null);
    });
  });

  describe('normalizeRoleNames', () => {
    it('aplana, normaliza y elimina duplicados', () => {
      const result = normalizeRoleNames([
        'Admin',
        { name: 'admin' },
        { role: 'creator' },
        'reader',
      ]);
      expect(result).toEqual(['admin', 'creator', 'reader']);
    });

    it('devuelve arreglo vacío para entradas vacías', () => {
      expect(normalizeRoleNames([])).toEqual([]);
      expect(normalizeRoleNames()).toEqual([]);
    });
  });

  describe('isAdminRole / hasAdminRole', () => {
    it('reconoce el rol admin en cualquier formato', () => {
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole({ name: 'ADMIN' })).toBe(true);
      expect(isAdminRole('reader')).toBe(false);
    });

    it('detecta admin dentro de una lista de roles', () => {
      expect(hasAdminRole(['reader', 'creator', 'admin'])).toBe(true);
      expect(hasAdminRole(['reader', 'creator'])).toBe(false);
    });
  });
});
