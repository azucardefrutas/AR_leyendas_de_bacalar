import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split large, independent vendors into their own cacheable chunks so the
        // initial bundle stays small. three / recharts / pdf only download together
        // with the lazy routes and components that actually use them.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'charts-vendor': ['recharts'],
          'pdf-vendor': ['pdfjs-dist', 'react-pageflip'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
