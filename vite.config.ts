import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    // Caminho correcto para publicar no GitHub Pages
    base: process.env.GITHUB_ACTIONS === 'true' ? '/Vagas/' : '/',

    envPrefix: 'VITE_',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        },
        manifest: {
          id: '/',
          name: 'CuneneVagas - Empregos e Marketplace',
          short_name: 'CuneneVagas',
          description: 'Plataforma oficial de Empregos, Prestação de Serviços, Negócios e Marketplace no Cunene, Angola.',
          theme_color: '#080808',
          background_color: '#080808',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Manter as configurações existentes do AI Studio
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
