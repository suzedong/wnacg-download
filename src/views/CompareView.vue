<template>
  <div class="compare-view">
    <h2>📊 对比本地漫画</h2>

    <div v-if="!hasSearchResult" class="setup-section">
      <div class="setup-form">
        <div class="form-group">
          <label>选择搜索缓存文件</label>
          <div class="input-group">
            <select v-model="searchFile" class="select-input">
              <option value="" disabled>请选择搜索缓存文件</option>
              <option v-for="file in cacheFiles" :key="file.path" :value="file.path">
                {{ file.label }}
              </option>
            </select>
            <button class="btn-secondary" @click="loadCacheFiles">
              🔄 刷新
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>选择本地漫画文件夹</label>
          <div class="input-group">
            <input
              v-model="localPath"
              type="text"
              placeholder="输入文件夹路径或 SMB 地址..."
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
      <p>{{ error }}</p>
      <div v-if="error.includes('SMB')" class="smb-help">
        <p><strong>macOS SMB 网络路径使用说明：</strong></p>
        <ol>
          <li>打开 Finder</li>
          <li>按 <kbd>Cmd + K</kbd>（或点击「前往」→「连接服务器」）</li>
          <li>输入 <code>smb://192.168.21.100/Comic</code></li>
          <li>连接成功后，共享会挂载到 <code>/Volumes/Comic/</code></li>
          <li>重新选择 <code>/Volumes/Comic/Type-90</code> 路径</li>
        </ol>
      </div>
      <button class="btn-primary" @click="handleRetry">
        🔄 重试
      </button>
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
          <div class="header-actions">
            <label class="select-all-label">
              <input 
                type="checkbox" 
                :checked="isAllSelected" 
                @change="toggleSelectAll" 
              />
              全选
            </label>
            <button 
              class="btn-primary" 
              :disabled="selectedForDownload.length === 0"
              @click="addSelectedToDownload"
            >
              ➕ 添加选中 ({{ selectedForDownload.length }})
            </button>
            <button class="btn-secondary" @click="addAllToDownload">
              ➕ 全部下载
            </button>
          </div>
        </div>
        <div class="comic-grid">
          <div
            v-for="detail in needDownload"
            :key="detail.website.aid"
            class="comic-card"
          >
            <div class="card-checkbox">
              <input 
                type="checkbox" 
                :checked="selectedForDownload.includes(detail.website.aid)"
                @change="toggleSelect(detail.website.aid)" 
              />
            </div>
            <div class="comic-cover-wrapper">
              <img :src="detail.website.cover_url" :alt="detail.website.title" />
              <span v-if="detail.website.category" class="category-badge">{{ detail.website.category }}</span>
            </div>
            <h4>{{ detail.website.title }}</h4>
            <p class="cleaned-names" v-if="detail.algorithm === '本地'">{{ cleanTitle(detail.website.title) }}</p>
            <div class="comic-info">
              <span class="comic-pages" v-if="detail.website.pages > 0">{{ detail.website.pages }} 张</span>
              <span class="comic-date" v-if="detail.website.upload_date">{{ detail.website.upload_date }}</span>
            </div>
            <div class="match-info">
              <span class="confidence">匹配度: {{ (detail.confidence * 100).toFixed(0) }}%</span>
              <span class="algorithm-badge">{{ detail.algorithm }}</span>
            </div>
            <p class="local-title" v-if="detail.local">
              本地: {{ detail.local.title }}
            </p>
            <p class="cleaned-names" v-if="detail.local && detail.algorithm === '本地'">
              清理后: {{ cleanTitle(detail.local.title) }}
            </p>
            <p class="match-reason" v-if="detail.reason">{{ detail.reason }}</p>
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
            <div class="comic-cover-wrapper">
              <img :src="detail.website.cover_url" :alt="detail.website.title" />
              <span v-if="detail.website.category" class="category-badge">{{ detail.website.category }}</span>
            </div>
            <h4>{{ detail.website.title }}</h4>
            <p class="cleaned-names" v-if="detail.algorithm === '本地'">清理后：{{ cleanTitle(detail.website.title) }}</p>
            <div class="comic-info">
              <span class="comic-pages" v-if="detail.website.pages > 0">{{ detail.website.pages }} 张</span>
              <span class="comic-date" v-if="detail.website.upload_date">{{ detail.website.upload_date }}</span>
            </div>
            <div class="match-info">
              <span class="confidence">匹配度: {{ (detail.confidence * 100).toFixed(0) }}%</span>
              <span class="algorithm-badge">{{ detail.algorithm }}</span>
            </div>
            <p class="local-title" v-if="detail.local">
              本地: {{ detail.local.title }}
            </p>
            <p class="cleaned-names" v-if="detail.local && detail.algorithm === '本地'">
              清理后: {{ cleanTitle(detail.local.title) }}
            </p>
            <p class="match-reason" v-if="detail.reason">{{ detail.reason }}</p>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCompare } from '../composables/useCompare';
import { useDownloadQueue } from '../composables/useDownloadQueue';
import { CompareResult, MatchDetail, DownloadTask } from '../types/index';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { resourceDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';

const { isComparing, progress, total, result, error, compare, cleanup } = useCompare();
const { addToQueue } = useDownloadQueue();

const searchFile = ref('');
const localPath = ref('');
const selectedForDownload = ref<string[]>([]);
const cacheFiles = ref<Array<{ path: string; label: string }>>([]);

let isComponentMounted = true;

// 从 localStorage 加载上次选择的本地路径
onMounted(() => {
  const savedLocalPath = localStorage.getItem('compare-local-path');
  if (savedLocalPath) {
    localPath.value = savedLocalPath;
  }
  loadCacheFiles();
});

onUnmounted(() => {
  isComponentMounted = false;
  cleanup(); // 清理事件监听和状态
});

// 保存本地路径到 localStorage
function saveLocalPath() {
  if (localPath.value) {
    localStorage.setItem('compare-local-path', localPath.value);
  }
}

// 清理漫画名前缀：去除 [], (), ()[], []() 等前缀
function cleanTitle(title: string): string {
  const re = /^(?:\[.*?\]|\(.*?\)|\[.*?\]\(.*?\)|\(.*?\)\[.*?\])*\s*/g;
  return title.replace(re, '').trim();
}

const compareResult = computed(() => result.value as CompareResult | null);

const hasSearchResult = computed(() => !!compareResult.value);

const needDownload = computed(() => {
  if (!compareResult.value) return [];
  return compareResult.value.match_details
    .filter((d: MatchDetail) => d.match_type === 'need_download')
    .sort((a: MatchDetail, b: MatchDetail) => a.confidence - b.confidence);
});

const alreadyHave = computed(() => {
  if (!compareResult.value) return [];
  return compareResult.value.match_details
    .filter((d: MatchDetail) => d.match_type === 'already_have')
    .sort((a: MatchDetail, b: MatchDetail) => b.confidence - a.confidence);
});

const selectedNeedDownload = computed(() => {
  return needDownload.value.filter(
    (d: MatchDetail) => selectedForDownload.value.includes(d.website.aid)
  );
});

const isAllSelected = computed(() => {
  return needDownload.value.length > 0 && 
         selectedForDownload.value.length === needDownload.value.length;
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedForDownload.value = [];
  } else {
    selectedForDownload.value = needDownload.value.map((d: MatchDetail) => d.website.aid);
  }
}

async function loadCacheFiles() {
  try {
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      const resourceDirPath = await resourceDir();
      const possibleCacheDirs = [
        'cache',
        'src-tauri/target/debug/cache',
        'target/debug/cache'
      ];
      
      for (const dir of possibleCacheDirs) {
        try {
          const cacheDir = await join(resourceDirPath, dir);
          const files = await readDir(cacheDir);
          
          const file_list: Array<{ path: string; label: string }> = [];
          
          for (const file of files) {
            if (file.name.endsWith('.json') && file.name.startsWith('search_')) {
              const filePath = await join(cacheDir, file.name);
              const keywordMatch = file.name.match(/search_(.+?)\.json/);
              const keyword = keywordMatch ? keywordMatch[1].replace(/_/g, ' ') : '未知';
              
              try {
                const content = await readTextFile(filePath);
                const comics = JSON.parse(content);
                const count = comics.length;
                const timeStr = new Date().toLocaleString();
                
                file_list.push({
                  path: filePath,
                  label: `${keyword} (${count} 部)`
                });
              } catch (e) {
                console.error('读取缓存文件失败：', e);
              }
            }
          }
          
          if (isComponentMounted) {
            cacheFiles.value = file_list;
          }
          return;
        } catch (e) {
          continue;
        }
      }
    }
  } catch (e: any) {
    if (isComponentMounted) {
      error.value = `加载缓存文件失败：${e.message}`;
    }
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
      if (result && isComponentMounted) {
        localPath.value = result as string;
        saveLocalPath(); // 保存选择的本地路径
      }
    } else {
      console.log('非 Tauri 环境，跳过文件夹选择');
    }
  } catch (e: any) {
    if (isComponentMounted) {
      error.value = `选择文件夹失败：${e.message}`;
    }
  }
}

async function handleCompare() {
  if (!searchFile.value || !localPath.value) return;
  saveLocalPath(); // 保存本地路径
  await compare(searchFile.value, localPath.value);
}

function toggleSelect(aid: string) {
  const index = selectedForDownload.value.indexOf(aid);
  if (index === -1) {
    selectedForDownload.value.push(aid);
  } else {
    selectedForDownload.value.splice(index, 1);
  }
}

function addSelectedToDownload() {
  const toDownload = selectedNeedDownload.value.map((d: MatchDetail) => {
    return {
      aid: d.website.aid,
      title: d.website.title,
      url: d.website.url,
      cover_url: d.website.cover_url,
      save_path: localPath.value
    } as DownloadTask;
  });
  
  const addedCount = addToQueue(toDownload);
  console.log(`添加了 ${addedCount} 个任务到下载队列`);
  
  if (addedCount > 0) {
    alert(`已添加 ${addedCount} 个漫画到下载队列`);
  }
}

function addAllToDownload() {
  const toDownload = needDownload.value.map((d: MatchDetail) => {
    return {
      aid: d.website.aid,
      title: d.website.title,
      url: d.website.url,
      cover_url: d.website.cover_url,
      save_path: localPath.value
    } as DownloadTask;
  });
  
  const addedCount = addToQueue(toDownload);
  console.log(`添加了 ${addedCount} 个任务到下载队列`);
  
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

async function handleRetry() {
  error.value = '';
  await handleCompare();
}

onMounted(() => {
  loadCacheFiles();
});
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

.form-group .btn-sm {
  align-self: flex-start;
  margin-top: 4px;
}

.select-input {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  width: 100%;
}

.select-input:focus {
  outline: none;
  border-color: #667eea;
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
  white-space: nowrap;
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
  padding: 16px;
  background: #fee;
  color: #f56c6c;
  border-radius: 8px;
  margin-bottom: 16px;
}

.error-message > p {
  margin: 0 0 12px 0;
}

.error-message .btn-primary {
  padding: 8px 16px;
  font-size: 13px;
  white-space: nowrap;
}

.smb-help {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.smb-help p {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 13px;
}

.smb-help ol {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
}

.smb-help li {
  margin-bottom: 4px;
}

.smb-help kbd {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 12px;
  font-family: monospace;
}

.smb-help code {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 12px;
  font-family: monospace;
  color: #667eea;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.select-all-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
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
  z-index: 2;
}

.card-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.comic-cover-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.comic-cover-wrapper img {
  width: 100%;
  height: 260px;
  object-fit: cover;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.comic-cover-wrapper:hover img {
  opacity: 0.85;
}

.category-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comic-card h4 {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.comic-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comic-pages {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.comic-date {
  font-size: 11px;
  color: var(--text-secondary);
}

.local-path {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
}

.match-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confidence {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.algorithm-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--primary-gradient);
  color: #fff;
  font-weight: 600;
}

.match-reason {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-bottom: 0;
}

.matched-local {
  font-size: 11px;
  color: var(--success);
  margin-top: 4px;
  margin-bottom: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.local-title {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-bottom: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.cleaned-names {
  font-size: 11px;
  color: var(--primary);
  display: block;
  margin-top: 2px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
