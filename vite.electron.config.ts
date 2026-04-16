/**
 * Vite 配置 for Electron 渲染进程
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as path from 'path';

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/ui'),
    },
  },
  
  build: {
    outDir: 'dist/ui',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/ui/index.html'),
      },
    },
  },
  
  base: './', // 使用相对路径，方便 Electron 加载
  
  server: {
    port: 5173,
    strictPort: true, // 端口被占用时退出而不是自动切换
  },
});
