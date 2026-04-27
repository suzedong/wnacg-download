<template>
  <div class="compare-view">
    <h2>📊 对比本地漫画</h2>

    <div v-if="!hasSearchResult" class="setup-section">
      <div class="setup-form">
        <div class="form-group">
          <label>选择搜索缓存文件</label>
          <div class="input-group">
            <input
              v-model="searchFile"
              type="text"
              placeholder="搜索缓存文件路径或点击浏览..."
              readonly
            />
            <button class="btn-secondary" @click="browseSearchFile">
              📂 浏览
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>选择本地漫画文件夹</label>
          <div class="input-group">
            <input
              v-model="localPath"
              type="text"
              placeholder="选择要扫描的文件夹路径..."
              readonly
            />
            <button class="btn-secondary" @click="browseLocalPath">
              📁 浏览
            </button>
          </div>
        </div>

        <button
          class="btn-primary"
          :disabled="isComparing || !searchFile || !localPath"
          @click="handleCompare"
        >
          {{ isComparing ? '对比中...' : '🔍 开始对比' }}
        </button>
      </div>
    </div>

    <div v-if="isComparing" class="progress-section">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${(progress / total) * 100}%` }"
        ></div>
      </div>
      <p class="progress-text">对比进度：{{ progress }}/{{ total }}</p>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="compareResult" class="results-section">
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">{{ compareResult.website_comics }}</div>
          <div class="stat-label">网站漫画</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ compareResult.local_comics }}</div>
          <div class="stat-label">本地漫画</div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-value">{{ compareResult.to_download }}</div>
          <div class="stat-label">需要下载</div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-value">{{ compareResult.already_have }}</div>
          <div class="stat-label">已拥有</div>
        </div>
      </div>

      <div v-if="needDownload.length > 0" class="result-section">
        <div class="section-header">
          <h3>📥 需要下载的漫画 ({{ needDownload.length }})</h3>
          <button class="btn-primary" @click="addAllToDownload">
            ➕ 全部下载
          </button>
        </div>
        <div class="comic-grid">
          <div
            v-for="detail in needDownload"
            :key="detail.website.aid"
            class="comic-card"
          >
            <div class="card-checkbox">
              <input type="checkbox" v-model="selectedForDownload" :value="detail.website.aid" />
            </div>
            <img :src="detail.website.cover_url" :alt="detail.website.title" />
            <h4>{{ detail.website.title }}</h4>
            <p class="comic-author">{{ detail.website.author }}</p>
            <p class="comic-category">{{ detail.website.category }}</p>
            <div class="match-info">
              <span class="confidence">匹配度: {{ (detail.confidence * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="alreadyHave.length > 0" class="result-section">
        <h3>✅ 已拥有的漫画 ({{ alreadyHave.length }})</h3>
        <div class="comic-grid">
          <div
            v-for="detail in alreadyHave"
            :key="detail.website.aid"
            class="comic-card owned"
          >
            <img :src="detail.website.cover_url" :alt="detail.website.title" />
            <h4>{{ detail.website.title }}</h4>
            <p class="comic-author">{{ detail.website.author }}</p>
            <p class="local-path">本地: {{ detail.local?.path }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="compareResult" class="actions">
      <button class="btn-secondary" @click="resetCompare">
        🔄 重新对比
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCompare } from '../composables/useCompare';
import { useDownloadQueue } from '../composables/useDownloadQueue';
import { CompareResult, MatchDetail, DownloadTask } from '../types/index';
import { open } from '@tauri-apps/plugin-dialog';

const { isComparing, progress, total, result, error, compare } = useCompare();
const { addToQueue } = useDownloadQueue();

const searchFile = ref('');
const localPath = ref('');
const selectedForDownload = ref<string[]>([]);

const compareResult = computed(() => result.value as CompareResult | null);

const hasSearchResult = computed(() => !!compareResult.value);

const needDownload = computed(() => {
  if (!compareResult.value) return [];
  return compareResult.value.match_details.filter(
    (d: MatchDetail) => d.match_type === 'need_download'
  );
});

const alreadyHave = computed(() => {
  if (!compareResult.value) return [];
  return compareResult.value.match_details.filter(
    (d: MatchDetail) => d.match_type === 'already_have'
  );
});

async function browseSearchFile() {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      const result = await open({
        multiple: false,
        filters: [
          { name: '搜索缓存文件', extensions: ['json'] }
        ],
        defaultPath: './cache'
      });
      if (result) {
        searchFile.value = result as string;
      }
    } else {
      console.log('非 Tauri 环境，跳过文件选择');
    }
  } catch (e: any) {
    error.value = `选择文件失败：${e.message}`;
  }
}

async function browseLocalPath() {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      const result = await open({
        multiple: false,
        directory: true
      });
      if (result) {
        localPath.value = result as string;
      }
    } else {
      console.log('非 Tauri 环境，跳过文件夹选择');
    }
  } catch (e: any) {
    error.value = `选择文件夹失败：${e.message}`;
  }
}

async function handleCompare() {
  if (!searchFile.value || !localPath.value) return;
  await compare(searchFile.value, localPath.value);
}

function addAllToDownload() {
  const toDownload = needDownload.value.map((d: MatchDetail) => {
    return {
      aid: d.website.aid,
      title: d.website.title,
      url: d.website.url,
      cover_url: d.website.cover_url,
      save_path: localPath.value // 使用选择的本地路径
    } as DownloadTask;
  });
  
  const addedCount = addToQueue(toDownload);
  console.log(`添加了 ${addedCount} 个任务到下载队列`);
  
  // 显示提示信息
  if (addedCount > 0) {
    alert(`已添加 ${addedCount} 个漫画到下载队列`);
  }
}

function resetCompare() {
  result.value = null;
  searchFile.value = '';
  localPath.value = '';
  selectedForDownload.value = [];
}
</script>

<style scoped>
.compare-view {
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

.setup-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
}

.btn-primary {
  padding: 12px 24px;
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
  padding: 12px 20px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: var(--border-color);
}

.progress-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.error-message {
  padding: 12px;
  background: #fee;
  color: #f56c6c;
  border-radius: 8px;
  margin-bottom: 16px;
}

.results-section {
  margin-top: 24px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-warning {
  border-left: 4px solid var(--warning);
}

.stat-success {
  border-left: 4px solid var(--success);
}

.result-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.comic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.comic-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: transform 0.2s;
}

.comic-card:hover {
  transform: translateY(-4px);
}

.comic-card.owned {
  opacity: 0.7;
}

.card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
}

.card-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.comic-card img {
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
}

.comic-card h4 {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.comic-author,
.comic-category {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.local-path {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.confidence {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
