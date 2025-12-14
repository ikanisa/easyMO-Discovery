import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'copy-files',
          closeBundle() {
            // Copy service worker and manifest to dist
            try {
              copyFileSync('sw.js', 'dist/sw.js');
              copyFileSync('manifest.json', 'dist/manifest.json');
              copyFileSync('icon.svg', 'dist/icon.svg');
              console.log('✓ Copied sw.js, manifest.json, and icon.svg to dist');
            } catch (e) {
              console.warn('Warning: Could not copy files:', e.message);
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
