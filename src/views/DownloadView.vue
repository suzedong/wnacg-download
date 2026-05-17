<template>
  <div class="download-view">
    <h2>⬇️ 下载队列</h2>

    <div
      v-if="downloadQueue.length === 0 && !downloadResult"
      class="empty-state"
    >
      <p>暂无下载任务</p>
      <p class="hint">从搜索页面选择漫画并添加到下载队列</p>
    </div>

    <div v-if="downloadQueue.length > 0" class="queue-section">
      <div class="queue-header">
        <span class="queue-count">
          下载队列 ({{ downloadQueue.length }} 部漫画)
        </span>
        <div class="queue-actions">
          <button
            class="btn-secondary"
            @click="clearQueue"
            :disabled="isDownloading"
          >
            🗑 清空
          </button>
          <button
            v-if="isDownloading"
            class="btn-warning"
            @click="isPaused ? resumeDownload() : pauseDownload()"
          >
            {{ isPaused ? '▶ 恢复' : '⏸ 暂停' }}
          </button>
          <button
            class="btn-primary"
            @click="startDownload"
            :disabled="isDownloading || downloadQueue.length === 0"
          >
            {{ isDownloading ? (isPaused ? '已暂停' : '下载中...') : '▶ 开始下载' }}
          </button>
        </div>
      </div>

      <div class="save-path-bar">
        <span class="path-label">📁 保存路径:</span>
        <span class="path-value" :title="storagePath">{{ storagePath || '未配置' }}</span>
        <span class="path-source">{{ storagePathSource }}</span>
        <button
          class="btn-link"
          @click="goToConfig"
          :disabled="isDownloading"
        >
          修改设置
        </button>
      </div>

      <div class="task-list">
        <div
          v-for="(task, index) in downloadQueue"
          :key="task.aid"
          class="task-item"
        >
          <div class="task-info">
            <span class="task-index">{{ index + 1 }}.</span>
            <img :src="task.cover_url" :alt="task.title" class="task-cover" />
            <div class="task-details">
              <h4>{{ task.title }}</h4>
              <div v-if="taskProgress[task.aid]" class="task-progress-info">
                <div class="progress-bar-track">
                  <div
                    class="progress-bar-fill"
                    :style="{ width: `${taskProgress[task.aid]}%` }"
                  ></div>
                </div>
                <span class="progress-text">{{ taskProgress[task.aid] }}%</span>
              </div>
            </div>
          </div>
          <button
            class="btn-icon"
            @click="cancelTaskFromQueue(task.aid)"
            title="取消下载"
          >
            ❌
          </button>
        </div>
      </div>
    </div>

    <div v-if="isDownloading" class="download-status">
      <div class="status-item">
        <span class="label">总体进度:</span>
        <span class="value">{{ progress.toFixed(1) }}%</span>
      </div>
      <div class="status-item">
        <span class="label">速度:</span>
        <span class="value">{{ formatSpeed(speed) }}</span>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="downloadResult" class="result-section">
      <h3>下载结果</h3>
      <div class="result-stats">
        <div class="stat-card stat-success">
          <div class="stat-value">{{ downloadResult.success }}</div>
          <div class="stat-label">✅ 成功</div>
        </div>
        <div v-if="downloadResult.failed > 0" class="stat-card stat-error">
          <div class="stat-value">{{ downloadResult.failed }}</div>
          <div class="stat-label">❌ 失败</div>
        </div>
      </div>

      <div v-if="downloadResult.failed_list.length > 0" class="failed-list">
        <h4>失败的漫画 ({{ downloadResult.failed_list.length }})</h4>
        <div
          v-for="failed in downloadResult.failed_list"
          :key="failed.title"
          class="failed-item"
        >
          <div class="failed-content">
            <span class="failed-title">{{ failed.title }}</span>
            <span class="failed-reason">{{ failed.reason }}</span>
          </div>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn-secondary" @click="openDownloadFolder">
          📂 打开文件夹
        </button>
        <button
          v-if="downloadResult.failed > 0"
          class="btn-primary"
          @click="retryFailed"
        >
          🔄 重试失败
        </button>
        <button class="btn-secondary" @click="resetDownload">
          🔄 清空结果
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useDownload } from '../composables/useDownload';
import { useConfig } from '../composables/useConfig';
import { useDownloadQueue } from '../composables/useDownloadQueue';
import { DownloadResult, DownloadTask } from '../types/index';
import { invoke } from '@tauri-apps/api/core';

const {
  isDownloading,
  isPaused,
  progress,
  speed,
  error,
  result,
  taskProgress,
  startDownload: download,
  pauseDownload,
  resumeDownload,
  cancelTask,
} = useDownload();
const { config, loadConfig } = useConfig();
const { downloadQueue, removeFromQueue, clearQueue } = useDownloadQueue();

// 全局通知
const notify = inject<{ success: (msg: string) => void; error: (msg: string) => void; info: (msg: string) => void }>('notify');

const downloadResult = computed(() => result.value as DownloadResult | null);

// 记录下载时使用的存储路径
const lastSavePath = ref<string>('');

// 系统默认保存路径（当前工作目录）
const defaultSavePath = ref<string>('');

// 实际保存路径：优先使用配置路径，其次任务的 save_path，最后系统默认
const storagePath = computed(() => {
  if (config.value?.storage_path) {
    return config.value.storage_path;
  }
  const firstTask = downloadQueue.value[0];
  if (firstTask?.save_path) {
    return firstTask.save_path;
  }
  return defaultSavePath.value || '';
});

// 路径来源标注
const storagePathSource = computed(() => {
  if (config.value?.storage_path) return '（配置路径）';
  const firstTask = downloadQueue.value[0];
  if (firstTask?.save_path) return '（任务路径）';
  if (defaultSavePath.value) return '（默认路径）';
  return '';
});

const switchView = inject<(viewId: string) => void>('switchView');

function goToConfig() {
  switchView?.('config');
}

// 页面加载时读取配置和默认路径
onMounted(async () => {
  await loadConfig();
  try {
    defaultSavePath.value = await invoke('get_default_save_path');
  } catch (e: any) {
    console.error('获取默认路径失败：', e);
  }
});

async function startDownload() {
  if (downloadQueue.value.length === 0) return;

  await loadConfig();
  if (!config.value) {
    error.value = '配置未加载';
    return;
  }

  // 记录使用的存储路径
  lastSavePath.value = config.value.storage_path || downloadQueue.value[0]?.save_path || '';

  await download(downloadQueue.value, {
    concurrent: config.value.concurrent_downloads,
    retry_times: config.value.retry_times,
    retry_interval: config.value.retry_interval,
    proxy: config.value.proxy,
    proxy_enabled: config.value.proxy_enabled,
    storage_path: config.value.storage_path,
    download_source_preference: config.value.download_source_preference || 'server2',
  });
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
}

async function openDownloadFolder() {
  try {
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      // 优先使用下载时记录的存储路径
      let downloadPath = lastSavePath.value;

      // 如果为空，尝试从配置获取
      if (!downloadPath) {
        if (!config.value) {
          await loadConfig();
        }
        downloadPath = config.value?.storage_path || '';
      }

      // 最后尝试从队列任务中获取
      if (!downloadPath && downloadQueue.value.length > 0) {
        downloadPath = downloadQueue.value[0].save_path;
      }

      if (!downloadPath) {
        error.value = '存储路径未配置，请先在设置中配置保存路径';
        return;
      }

      await invoke('open_folder', { path: downloadPath });
    } else {
      console.log('非 Tauri 环境，跳过打开文件夹');
    }
  } catch (e: any) {
    error.value = `打开文件夹失败：${e.message || e}`;
  }
}

function retryFailed() {
  if (!downloadResult.value || downloadResult.value.failed_list.length === 0)
    return;

  // 将失败的任务重新添加到下载队列
  const failedTasks = downloadResult.value.failed_list.map(
    (failed) =>
      ({
        aid: failed.title, // 使用标题作为 aid（实际应该从原始任务中获取）
        title: failed.title,
        url: '', // 这里需要从原始任务中获取，暂时留空
        cover_url: '',
        save_path: config.value?.storage_path || './downloads',
        pages: 0,
      }) as DownloadTask
  );

  // 添加到队列
  const { addToQueue } = useDownloadQueue();
  const added = addToQueue(failedTasks);
  notify?.success(`已将 ${added} 个失败任务重新添加到下载队列`);
}

function resetDownload() {
  result.value = null;
  error.value = '';
}

function cancelTaskFromQueue(aid: string) {
  cancelTask(aid);
  removeFromQueue(aid);
}
</script>

<style scoped>
.download-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

h2 {
  margin-bottom: 24px;
  color: var(--text-primary);
}

h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-card);
  border-radius: 12px;
}

.empty-state p {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-state .hint {
  font-size: 14px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.queue-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.queue-count {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.queue-actions {
  display: flex;
  gap: 8px;
}

.save-path-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-primary);
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

.path-label {
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
}

.path-value {
  flex: 1;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
}

.path-source {
  color: var(--text-secondary);
  opacity: 0.7;
  font-size: 12px;
  white-space: nowrap;
}

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  text-decoration: underline;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.btn-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-link:hover:not(:disabled) {
  opacity: 0.8;
}

.btn-primary {
  padding: 10px 20px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  padding: 10px 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border-color);
}

.btn-warning {
  padding: 10px 16px;
  background: #f59e0b;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-warning:hover {
  opacity: 0.9;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  transition: opacity 0.2s;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 8px;
  transition: background 0.2s;
}

.task-item:hover {
  background: var(--border-color);
}

.task-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.task-index {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 24px;
}

.task-cover {
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
}

.task-details {
  flex: 1;
}

.task-details h4 {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.task-progress-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
}

.progress-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  max-width: 500px;
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}

.download-status {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  gap: 24px;
}

.status-item {
  display: flex;
  gap: 8px;
}

.status-item .label {
  color: var(--text-secondary);
  font-size: 14px;
}

.status-item .value {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 14px;
}

.error-message {
  padding: 12px;
  background: #fee;
  color: #f56c6c;
  border-radius: 8px;
  margin-bottom: 16px;
}

.result-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
}

.result-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-success .stat-value {
  color: var(--success);
}

.stat-error .stat-value {
  color: var(--danger);
}

.failed-list {
  margin-bottom: 20px;
}

.failed-list h4 {
  margin-bottom: 12px;
  color: var(--text-primary);
}

.failed-item {
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.failed-title {
  font-size: 14px;
  color: var(--text-primary);
}

.failed-reason {
  font-size: 12px;
  color: var(--danger);
}

.result-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
