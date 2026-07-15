import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuración de pruebas de desarrollo (unitarias + de componentes).
// Se mantiene separada de vite.config para no afectar el build de producción.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // Vitest maneja las pruebas que necesitan el entorno Vite (import.meta.env)
    // o el DOM (componentes React). La suite pura en .mjs corre con `node --test`.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
      // Cobertura acotada a los módulos ejercitados por Vitest en esta fase.
      // La suite pura en .mjs se mide con `node --test --experimental-test-coverage`.
      // Los módulos restantes de services/utils quedan como pendiente documentado.
      include: [
        'src/utils/validators.js',
        'src/utils/formatters.js',
        'src/utils/readerPages.js',
        'src/services/roleService.js',
        'src/shared/status/statusMeta.js',
        'src/components/ui/Button.jsx',
        'src/components/ui/EmptyState.jsx',
        'src/shared/status/StatusBadge.jsx',
      ],
      exclude: ['**/*.{test,spec}.*', 'src/test/**'],
    },
  },
});
