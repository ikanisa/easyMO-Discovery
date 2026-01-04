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
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Note: Vite automatically exposes VITE_* env vars via import.meta.env
      // These explicit defines are for backwards compatibility with process.env usage
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('framer-motion')) return 'motion-vendor';
            if (id.includes('@supabase')) return 'supabase-vendor';
            if (id.includes('@google/genai')) return 'genai-vendor';
            if (id.includes('html5-qrcode') || id.includes('qrcode')) return 'qrcode-vendor';
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
