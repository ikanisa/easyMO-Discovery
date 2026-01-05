import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
    ],
    // SECURITY FIX: Removed API key defines to prevent client-side exposure
    // All Gemini calls must go through Supabase Edge Functions (secure backend)
    // Note: Vite automatically exposes VITE_* env vars via import.meta.env
    // These are safe to use for non-sensitive config (e.g., VITE_SUPABASE_URL)
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Skip manual chunking for problematic dependencies
            // Let Vite handle chunking automatically to avoid initialization issues
            if (!id.includes('node_modules')) return;
            
            // Only chunk large, stable dependencies
            if (id.includes('react') && !id.includes('react-dom')) return 'react-vendor';
            if (id.includes('react-dom')) return 'react-dom-vendor';
            
            // Keep other dependencies together to avoid circular dependency issues
            return 'vendor';
          },
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
