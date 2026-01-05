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
      // Disable manual chunking to prevent initialization order issues
      // Let Vite handle chunking automatically
      rollupOptions: {
        output: {
          // Remove manual chunking - let Vite optimize automatically
          // This prevents "Cannot access before initialization" errors
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@easymo/shared': path.resolve(__dirname, '../../packages/shared/src'),
      }
    }
  };
});
