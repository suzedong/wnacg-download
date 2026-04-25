/**
 * Web UI 入口文件
 * 创建 Vue 应用并挂载到 #app
 */

// @ts-ignore - Vue 3 支持 createApp
import { createApp } from 'vue';
import App from './App.vue';

// 创建 Vue 应用
const app = createApp(App);

// 挂载到 DOM
app.mount('#app');
