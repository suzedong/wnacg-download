<template>
  <header class="custom-header" data-tauri-drag-region>
    <div class="header-title">WNACG Downloader</div>
    <div class="window-controls">
      <button class="control-btn minimize" @click="minimize" title="最小化">─</button>
      <button class="control-btn maximize" @click="maximize" title="最大化/还原">□</button>
      <button class="control-btn close" @click="closeApp" title="关闭">×</button>
    </div>
  </header>
</template>

<script setup>
import { invoke } from '@tauri-apps/api/core';

async function minimize() {
  try {
    await invoke('window_minimize');
  } catch (e) {
    console.error('最小化失败：', e);
  }
}

async function maximize() {
  try {
    await invoke('window_maximize');
  } catch (e) {
    console.error('最大化失败：', e);
  }
}

async function closeApp() {
  try {
    await invoke('window_close');
  } catch (e) {
    console.error('关闭失败：', e);
  }
}
</script>

<style scoped>
.custom-header {
  height: 40px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  user-select: none;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.window-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 32px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  border-radius: 4px;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(102, 126, 234, 0.2);
}

.control-btn.close:hover {
  background: #f56c6c;
  color: #fff;
}
</style>
