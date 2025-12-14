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
          registerType: 'prompt',
          includeAssets: ['favicon.ico', 'icon.svg', 'icons/*.png', 'screenshots/*.png'],
          manifest: {
            id: '/',
            name: 'easyMO Discovery',
            short_name: 'easyMO',
            description: 'Chat-first discovery for rides, marketplace, services & finance',
            start_url: '/?source=pwa',
            scope: '/',
            display: 'standalone',
            display_override: ['window-controls-overlay', 'standalone', 'browser'],
            background_color: '#0f172a',
            theme_color: '#0f172a',
            orientation: 'portrait-primary',
            categories: ['lifestyle', 'transportation', 'shopping'],
            icons: [
              {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: '/icons/icon-72.png',
                sizes: '72x72',
                type: 'image/png'
              },
              {
                src: '/icons/icon-96.png',
                sizes: '96x96',
                type: 'image/png'
              },
              {
                src: '/icons/icon-128.png',
                sizes: '128x128',
                type: 'image/png'
              },
              {
                src: '/icons/icon-144.png',
                sizes: '144x144',
                type: 'image/png'
              },
              {
                src: '/icons/icon-152.png',
                sizes: '152x152',
                type: 'image/png'
              },
              {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/icons/icon-384.png',
                sizes: '384x384',
                type: 'image/png'
              },
              {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: '/icons/maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ],
            screenshots: [
              {
                src: '/screenshots/home.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Home Screen'
              },
              {
                src: '/screenshots/discovery.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Discovery Mode'
              }
            ],
            shortcuts: [
              {
                name: 'Book a Ride',
                short_name: 'Rides',
                url: '/rides',
                description: 'Book transportation services',
                icons: [
                  {
                    src: '/icons/icon-96.png',
                    sizes: '96x96',
                    type: 'image/png'
                  }
                ]
              },
              {
                name: 'Marketplace',
                short_name: 'Shop',
                url: '/marketplace',
                description: 'Browse marketplace items',
                icons: [
                  {
                    src: '/icons/icon-96.png',
                    sizes: '96x96',
                    type: 'image/png'
                  }
                ]
              },
              {
                name: 'Services',
                short_name: 'Services',
                url: '/services',
                description: 'Find local services',
                icons: [
                  {
                    src: '/icons/icon-96.png',
                    sizes: '96x96',
                    type: 'image/png'
                  }
                ]
              }
            ],
            share_target: {
              action: '/share',
              method: 'POST',
              enctype: 'multipart/form-data',
              params: {
                title: 'title',
                text: 'text',
                url: 'url'
              }
            },
            launch_handler: {
              client_mode: 'navigate-existing'
            }
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                // Cache only public Supabase storage and edge functions, exclude auth endpoints
                urlPattern: /^https:\/\/.*\.supabase\.co\/(storage|functions)\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-public-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 5 // 5 minutes
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  }
                }
              }
            ]
          }
        })
      ],
      plugins: [react()],
      publicDir: 'public',
      build: {
        outDir: 'dist',
        rollupOptions: {
          output: {
            manualChunks: undefined,
          },
        },
      },
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
