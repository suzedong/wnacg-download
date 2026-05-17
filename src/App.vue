<template>
  <div class="app-container">
    <div class="main-layout">
      <Sidebar :current-view="currentView" @view-change="handleViewChange" />
      <main class="main-content">
        <SearchView v-if="currentView === 'search'" />
        <CompareView v-else-if="currentView === 'compare'" />
        <DownloadView v-else-if="currentView === 'download'" />
        <ConfigView v-else-if="currentView === 'config'" />
      </main>
    </div>
    <ToastNotification />
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import SearchView from './views/SearchView.vue';
import CompareView from './views/CompareView.vue';
import DownloadView from './views/DownloadView.vue';
import ConfigView from './views/ConfigView.vue';
import ToastNotification from './components/ToastNotification.vue';
import { useToast } from './composables/useToast';

const currentView = ref('search');
const { success, error, info } = useToast();

function handleViewChange(viewId) {
  currentView.value = viewId;
}

// 提供给子组件切换页面的能力
provide('switchView', handleViewChange);

// 提供全局通知方法
provide('notify', { success, error, info });

// 快捷键支持
const viewOrder = ['search', 'compare', 'download', 'config'];

function handleKeydown(e) {
  // Ctrl+1/2/3/4 切换页面
  if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
    e.preventDefault();
    const index = parseInt(e.key) - 1;
    handleViewChange(viewOrder[index]);
  }
  // Ctrl+D 切换暗色模式（触发侧边栏主题按钮点击）
  if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) themeBtn.click();
  }
  // Ctrl+S 聚焦搜索框
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    handleViewChange('search');
    // 等待视图渲染后聚焦输入框
    setTimeout(() => {
      const searchView = document.querySelector('.search-view');
      if (searchView) {
        const input = searchView.querySelector('input[type="text"]');
        if (input) input.focus();
      }
    }, 50);
  }
  // Escape 关闭模态框 / 取消当前操作
  if (e.key === 'Escape') {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.click();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
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

[data-theme='dark'] {
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
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background: var(--bg-primary);
  min-height: 0;
}
</style>
