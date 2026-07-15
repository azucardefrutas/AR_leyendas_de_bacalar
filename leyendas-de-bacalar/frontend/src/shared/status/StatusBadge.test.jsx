import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import StatusBadge from './StatusBadge.jsx';
import { normalizeStatus, getStatusTone, getStatusLabel } from './statusMeta.js';

describe('statusMeta (lógica pura de estados)', () => {
  it('normaliza alias de una sola palabra a la clave canónica', () => {
    expect(normalizeStatus('Borrador')).toBe('draft');
    expect(normalizeStatus('PUBLICADA')).toBe('published');
    expect(normalizeStatus('Rechazada')).toBe('rejected');
  });

  // DEF-001 (característica del comportamiento actual, no del deseado):
  // normalizeStatus() convierte los espacios en "_" ANTES de consultar el mapa
  // de alias, pero las claves multi-palabra del mapa usan espacios
  // ('en revisión'), así que nunca coinciden. Este test fija el comportamiento
  // actual (defectuoso) para detectar si cambia. Ver Informe de defectos.
  it('DEF-001: los alias multi-palabra NO se resuelven (defecto conocido)', () => {
    expect(normalizeStatus('En revisión')).toBe('en_revisión');
    expect(normalizeStatus('En revision')).toBe('en_revision');
    // Consecuencia: el tono cae al default 'info' en vez de 'warning'.
    expect(getStatusTone('En revisión')).toBe('info');
  });

  it('asigna el tono correcto por estado', () => {
    expect(getStatusTone('published')).toBe('success');
    expect(getStatusTone('in_review')).toBe('warning');
    expect(getStatusTone('rejected')).toBe('danger');
    expect(getStatusTone('draft')).toBe('info');
  });

  it('usa etiquetas según el contexto', () => {
    expect(getStatusLabel('draft', 'legend')).toBe('Borrador');
    expect(getStatusLabel('submitted', 'legend_version')).toBe('En revision');
  });
});

describe('StatusBadge (componente)', () => {
  it('renderiza la etiqueta y la clase de tono del estado', () => {
    render(<StatusBadge status="published" context="legend" />);
    const badge = screen.getByText('Publicada');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge', 'status-badge-success');
  });

  it('permite sobreescribir la etiqueta manualmente', () => {
    render(<StatusBadge status="draft" label="Nuevo" />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });
});
