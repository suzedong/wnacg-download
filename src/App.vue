<template>
  <div class="app-container">
    <Header />
    <div class="main-layout">
      <Sidebar :current-view="currentView" @view-change="handleViewChange" />
      <main class="main-content">
        <SearchView v-if="currentView === 'search'" />
        <CompareView v-else-if="currentView === 'compare'" />
        <DownloadView v-else-if="currentView === 'download'" />
        <ConfigView v-else-if="currentView === 'config'" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Header from './components/Header.vue';
import Sidebar from './components/Sidebar.vue';
import SearchView from './views/SearchView.vue';
import CompareView from './views/CompareView.vue';
import DownloadView from './views/DownloadView.vue';
import ConfigView from './views/ConfigView.vue';

const currentView = ref('search');

function handleViewChange(viewId) {
  currentView.value = viewId;
}
</script>

<style>
/* 全局样式 */
:root {
  /* 亮色主题 */
  --bg-primary: #f5f7fa;
  --bg-sidebar: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.95);
  --text-primary: #303133;
  --text-secondary: #606266;
  --border-color: #e4e7ed;
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

[data-theme="dark"] {
  /* 暗色主题 */
  --bg-primary: #1a1a2e;
  --bg-sidebar: #16213e;
  --bg-card: rgba(30, 30, 50, 0.95);
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #2d2d44;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-primary);
}
</style>
