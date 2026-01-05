import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// Image optimization plugin (install with: npm install -D vite-imagetools)
// import { imagetools } from 'vite-imagetools';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'pwa',
        filename: 'service-worker.ts',
        injectRegister: false,
        registerType: 'prompt',
        devOptions: {
          enabled: false,
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json,woff2}'],
        },
      }),
      // Image optimization (uncomment after installing vite-imagetools)
      // imagetools({
      //   defaultDirectives: (url) => {
      //     if (url.searchParams.has('unoptimized')) {
      //       return new URLSearchParams();
      //     }
      //     return new URLSearchParams({
      //       format: 'avif;webp', // AVIF preferred, WebP fallback
      //       quality: '80',
      //     });
      //   },
      // }),
    ],
    // SECURITY FIX: Removed API key defines to prevent client-side exposure
    // All Gemini calls must go through Supabase Edge Functions (secure backend)
    // Note: Vite automatically exposes VITE_* env vars via import.meta.env
    // These are safe to use for non-sensitive config (e.g., VITE_SUPABASE_URL)
    build: {
      // Route-level code splitting with vendor chunking
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor chunks for better caching
            if (id.includes('node_modules')) {
              // React core (small, frequently updated)
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              // UI libraries (larger, less frequently updated)
              if (id.includes('framer-motion')) {
                return 'motion-vendor';
              }
              // Data fetching
              if (id.includes('@tanstack/react-query')) {
                return 'query-vendor';
              }
              // Supabase (large, stable)
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // AI/ML libraries (large, can be lazy-loaded)
              if (id.includes('@google/genai')) {
                return 'genai-vendor';
              }
              // QR/Scanner (large, only needed on specific pages)
              if (id.includes('html5-qrcode') || id.includes('qrcode')) {
                return 'qrcode-vendor';
              }
              // Everything else
              return 'vendor';
            }
          },
          // Chunk size warning threshold (500KB)
          chunkSizeWarningLimit: 500,
        },
      },
      // Target modern browsers for smaller bundles
      target: 'es2022',
      // Minify for production
      minify: 'esbuild',
      // Source maps for debugging (disable in production for smaller bundles)
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@easymo/shared': path.resolve(__dirname, '../../packages/shared/src'),
      }
    }
  };
});
