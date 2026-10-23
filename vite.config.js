import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { NETWORKS } from './src/config.js';

// Режим сборки = рекламная сеть: `vite build --mode meta` подставляет src/networks/meta.js вместо '@network'.
// В итоговый файл попадает ровно один адаптер. Склейку в один HTML делает scripts/build.mjs.
export default defineConfig(({ mode }) => {
  const network = NETWORKS.includes(mode) ? mode : 'preview';
  return {
    base: './',
    resolve: {
      alias: { '@network': fileURLToPath(new URL(`./src/networks/${network}.js`, import.meta.url)) },
    },
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
    build: {
      outDir: `dist/play/${network}`,
      emptyOutDir: true,
      target: 'es2020', // WebView старых телефонов: без синтаксиса новее ES2020
      modulePreload: false,
      cssCodeSplit: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 700, // three.js после tree-shaking — около 560 КБ
      rollupOptions: { output: { format: 'iife' } }, // обычный <script>: без модулей, понятно любому WebView
    },
  };
});
