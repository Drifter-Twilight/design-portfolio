import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * GitHub Pages 项目站点：https://<用户名>.github.io/design-portfolio/
 * 构建时资源必须带仓库前缀，开发与本地预览仍用根路径。
 * 换仓库名 / 换自定义域名时只改这一行。
 */
const REPO_BASE = '/design-portfolio/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    // 作品图不走打包，这里只控制 JS/CSS 体积
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
}));
