import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Button from './Button.jsx';
import EmptyState from './EmptyState.jsx';

describe('Button', () => {
  it('renderiza el contenido y la variante por defecto', () => {
    render(<Button>Guardar</Button>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn', 'btn-primary');
  });

  it('aplica la variante y clases adicionales', () => {
    render(<Button variant="ghost" className="mt-2">X</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost', 'mt-2');
  });

  it('dispara onClick al hacer clic', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Crear borrador</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Crear borrador' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('usa los textos por defecto', () => {
    render(<EmptyState />);
    expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeInTheDocument();
    expect(screen.getByText(/Todavia no hay contenido/)).toBeInTheDocument();
  });

  it('respeta título y mensaje personalizados', () => {
    render(<EmptyState title="Sin leyendas" message="Aún no publicas ninguna leyenda." />);
    expect(screen.getByRole('heading', { name: 'Sin leyendas' })).toBeInTheDocument();
    expect(screen.getByText('Aún no publicas ninguna leyenda.')).toBeInTheDocument();
  });
});
