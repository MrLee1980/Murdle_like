import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 相对基路径：保证 GitHub Pages 项目子路径 / Vercel / 本地预览均可直接运行
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '疑案簿 · 逻辑推理档案',
        short_name: '疑案簿',
        description: '原创逻辑网格推理游戏：嫌疑人 × 凶器 × 地点（× 时段），程序生成、唯一解、无需猜测。',
        lang: 'zh-CN',
        theme_color: '#b0c6b3',
        background_color: '#b0c6b3',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 单页应用离线兜底
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
