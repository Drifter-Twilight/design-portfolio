import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    // 作品图原图直引，素材不走打包，这里只控制 JS/CSS 体积
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Vite 8 / rolldown 只接受函数形式的 manualChunks
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/gsap/') || id.includes('@gsap')) return 'gsap';
          if (id.includes('i18next')) return 'i18n';
          if (id.includes('motion')) return 'motion';
          if (id.includes('lenis')) return 'lenis';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
