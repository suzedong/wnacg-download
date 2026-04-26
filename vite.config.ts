import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Tauri 配置
  build: {
    outDir: './dist',
  },
  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
  },
  // 解析配置
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
