import { createApp } from 'vue';
import App from './App.vue';
import { createClient } from './adapters';

const app = createApp(App);

// 提供客户端实例（依赖注入）
app.provide('client', createClient());

app.mount('#app');
