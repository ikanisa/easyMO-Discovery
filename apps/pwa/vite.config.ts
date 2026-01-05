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
      // Conservative chunking to avoid circular dependency and initialization order issues
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Only chunk large, stable dependencies that are unlikely to have circular deps
            if (id.includes('node_modules')) {
              // React core and scheduler (must stay together)
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'react-vendor';
              }
              // Supabase (large, stable, self-contained)
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // QR/Scanner (large, only needed on specific pages, can be lazy-loaded)
              if (id.includes('html5-qrcode') || id.includes('qrcode')) {
                return 'qrcode-vendor';
              }
              // AI/ML libraries (large, can be lazy-loaded)
              if (id.includes('@google/genai')) {
                return 'genai-vendor';
              }
              // For everything else, let Vite handle chunking automatically
              // This prevents circular dependency issues from manual chunking
              // Vite will still create vendor chunks automatically based on size and dependencies
            }
          },
        },
      },
      // Target modern browsers for smaller bundles
      target: 'es2022',
      // Minify for production
      minify: 'esbuild',
      // Source maps for debugging (disable in production for smaller bundles)
      sourcemap: false,
      // Chunk size warning threshold (500KB) - Vite-specific option
      chunkSizeWarningLimit: 500,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@easymo/shared': path.resolve(__dirname, '../../packages/shared/src'),
      }
    }
  };
});
