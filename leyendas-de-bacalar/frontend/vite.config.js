import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // three-vendor legitimately needs ~900KB and is fully lazy-loaded, so the default
    // 500KB warning is noise; raise it so real regressions stand out.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split large, independent vendors into their own cacheable chunks so the
        // initial bundle stays small and each downloads only with the lazy routes /
        // components that actually use it. Keeping each vendor separate also improves
        // long-term caching (app code changes far more often than these libs).
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'charts-vendor': ['recharts'],
          // pdfjs (creator document preview) and react-pageflip (public reader) are used
          // on DIFFERENT routes — keep them apart so opening a book no longer pulls the
          // heavy pdfjs bundle the reader never runs.
          'pdf-vendor': ['pdfjs-dist'],
          'flipbook-vendor': ['react-pageflip'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'motion-vendor': ['motion'],
          'editor-vendor': [
            '@editorjs/editorjs',
            '@editorjs/header',
            '@editorjs/list',
            '@editorjs/quote',
            '@editorjs/delimiter',
            '@editorjs/checklist',
            '@editorjs/table',
            '@editorjs/image',
          ],
          'swiper-vendor': ['swiper'],
          'anime-vendor': ['animejs'],
          'mediapipe-vendor': ['@mediapipe/tasks-vision'],
        },
      },
    },
  },
});
