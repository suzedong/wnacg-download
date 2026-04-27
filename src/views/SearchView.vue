<template>
  <div class="search-view">
    <h2>🔍 搜索漫画</h2>

    <div class="search-form">
      <input
        v-model="keyword"
        type="text"
        placeholder="输入作者名或关键字..."
        @keyup.enter="handleSearch"
      />
      <button :disabled="isSearching" @click="handleSearch">
        {{ isSearching ? '搜索中...' : '搜索' }}
      </button>
      <button class="btn-history" @click="toggleHistoryModal">
        📋 历史
      </button>
    </div>

    <!-- 搜索历史模态框 -->
    <div v-if="showHistoryModal" class="modal-overlay" @click="closeHistoryModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>搜索历史</h3>
          <button class="btn-close" @click="closeHistoryModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="searchHistory.length === 0" class="empty-history">
            暂无搜索历史
          </div>
          <div v-else class="history-list">
            <div
              v-for="item in searchHistory"
              :key="item.fileName"
              class="history-item"
              @click="loadSearchHistoryItem(item.filePath)"
            >
              <span class="history-keyword">{{ item.keyword }}</span>
              <span class="history-count">{{ item.count }} 部漫画</span>
              <span class="history-time">{{ item.time }}</span>
              <button class="btn-delete" @click.stop="showDeleteConfirm(item.filePath)">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirmModal" class="modal-overlay" @click="cancelDelete">
      <div class="confirm-dialog" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除这条搜索历史吗？</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="cancelDelete">取消</button>
          <button class="btn-confirm-delete" @click="executeDelete">确定</button>
        </div>
      </div>
    </div>

    <div v-if="isSearching" class="progress-section">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }"
        ></div>
      </div>
      <div class="progress-text">
        搜索进度：{{ progress }}/{{ total }}
      </div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <!-- 当前搜索信息 -->
    <div v-if="currentSearch" class="current-search">
      <div class="search-info">
        <span class="search-keyword">{{ currentSearch.keyword }}</span>
        <span class="search-time">{{ currentSearch.time }}</span>
        <button class="btn-sm" @click="handleSearch">
          🔄 重新搜索
        </button>
        <button class="btn-sm btn-danger" @click="clearSearch">
          🗑 清空
        </button>
      </div>
    </div>

    <div v-if="results.length > 0" class="results">
      <div class="results-header">
        <p>搜索结果：{{ results.length }} 部漫画</p>
        <div class="results-actions">
          <label class="select-all">
            <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
            全选
          </label>
          <button
            class="btn-add-queue"
            :disabled="selectedComics.length === 0"
            @click="addToDownloadQueue"
          >
            ➕ 添加到下载队列 ({{ selectedComics.length }})
          </button>
        </div>
      </div>
      <div class="comic-grid">
        <div v-for="comic in results" :key="comic.aid" class="comic-card">
          <div class="card-checkbox">
            <input
              type="checkbox"
              :checked="selectedComics.includes(comic.aid)"
              @change="toggleSelect(comic.aid)"
            />
          </div>
          <div class="comic-cover-wrapper" @click="previewComic(comic.url)">
            <img :src="comic.cover_url" :alt="comic.title" />
            <span v-if="comic.category" class="category-badge">{{ comic.category }}</span>
          </div>
          <h4>{{ comic.title }}</h4>
          <div class="comic-info">
            <span v-if="comic.pages > 0" class="comic-pages">{{ comic.pages }} 张</span>
            <span v-if="comic.upload_date" class="comic-date">{{ comic.upload_date }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSearch } from '../composables/useSearch';
import { useDownloadQueue } from '../composables/useDownloadQueue';
import { Comic } from '../types/index';
import { readDir, readTextFile, remove, stat } from '@tauri-apps/plugin-fs';
import { resourceDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-shell';

const keyword = ref('');
const selectAll = ref(false);
const selectedComics = ref<string[]>([]);
const searchHistory = ref<any[]>([]);
const currentSearch = ref<any>(null);
const showHistoryModal = ref(false);
const showDeleteConfirmModal = ref(false);
const deleteTargetPath = ref('');

const {
  results,
  isSearching,
  progress,
  total,
  error,
  search,
} = useSearch();

const { addToQueue } = useDownloadQueue();

// 加载搜索历史
async function loadSearchHistory() {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      console.log('开始加载搜索历史...');
      
      const resourceDirPath = await resourceDir();
      const possibleCacheDirs = [
        'cache',
        'src-tauri/target/debug/cache',
        'target/debug/cache'
      ];
      
      let cacheDir = null;
      for (const dir of possibleCacheDirs) {
        try {
          console.log(`尝试目录：${dir}`);
          const resolvedPath = await join(resourceDirPath, dir);
          const files = await readDir(resolvedPath);
          console.log(`目录 ${dir} 存在，包含 ${files.length} 个文件`);
          cacheDir = resolvedPath;
          break;
        } catch (e) {
          // 目录不存在，尝试下一个
          console.log(`目录不存在：${dir}`, e);
        }
      }
      
      if (cacheDir) {
        console.log(`使用缓存目录：${cacheDir}`);
        const files = await readDir(cacheDir);
        console.log(`缓存目录中的文件：`, files.map(f => f.name));
        
        const history = [];

        for (const file of files) {
          if (file.name.endsWith('.json') && file.name.startsWith('search_')) {
            try {
              console.log(`处理文件：${file.name}`);
              const filePath = await join(cacheDir, file.name);
              const content = await readTextFile(filePath);
              const comics = JSON.parse(content);
              
              // 提取关键字
              const keywordMatch = file.name.match(/search_(.+?)\.json/);
              const keyword = keywordMatch ? keywordMatch[1].replace(/_/g, ' ') : '未知';
              
              const fileInfo = await stat(filePath);
              const timeStr = fileInfo.mtime ? fileInfo.mtime.toLocaleString() : '未知时间';
              
              history.push({
                fileName: file.name,
                filePath,
                keyword,
                count: comics.length,
                time: timeStr
              });
              console.log(`添加搜索历史：${keyword} (${comics.length} 部漫画)`);
            } catch (e) {
              console.error('读取搜索历史失败：', e);
            }
          }
        }

        // 按时间倒序排序
        searchHistory.value = history.sort((a, b) => b.time.localeCompare(a.time));
        console.log(`搜索历史加载完成，共 ${history.length} 条记录`);
      } else {
        console.log('未找到缓存目录');
      }
    } else {
      console.log('非 Tauri 环境，跳过搜索历史加载');
    }
  } catch (e) {
    console.error('加载搜索历史失败：', e);
  }
}

// 加载历史搜索结果
async function loadSearchHistoryItem(filePath: string) {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      const content = await readTextFile(filePath);
      const comics = JSON.parse(content);
      results.value = comics;
      
      // 提取关键字
      const fileName = filePath.split('/').pop() || '';
      const keywordMatch = fileName.match(/search_(.+?)\.json/);
      const keyword = keywordMatch ? keywordMatch[1].replace(/_/g, ' ') : '未知';
      
      currentSearch.value = {
        keyword,
        time: new Date().toLocaleString()
      };
    } else {
      console.log('非 Tauri 环境，跳过加载历史搜索结果');
    }
  } catch (e) {
    error.value = `加载搜索历史失败：${e}`;
  }
}

// 显示删除确认对话框
function showDeleteConfirm(filePath: string) {
  deleteTargetPath.value = filePath;
  showDeleteConfirmModal.value = true;
}

// 取消删除
function cancelDelete() {
  showDeleteConfirmModal.value = false;
  deleteTargetPath.value = '';
}

// 执行删除
async function executeDelete() {
  if (deleteTargetPath.value) {
    await deleteSearchHistory(deleteTargetPath.value);
  }
  cancelDelete();
}

// 删除搜索历史
async function deleteSearchHistory(filePath: string) {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      await remove(filePath);
      // 重新加载历史
      await loadSearchHistory();
    } else {
      console.log('非 Tauri 环境，跳过删除搜索历史');
    }
  } catch (e) {
    error.value = `删除搜索历史失败：${e}`;
  }
}

// 预览漫画
async function previewComic(url: string) {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      await open(url);
    } else {
      // 在浏览器环境中直接打开
      window.open(url, '_blank');
    }
  } catch (e) {
    error.value = `打开预览失败：${e}`;
  }
}

// 清空搜索
function clearSearch() {
  results.value = [];
  currentSearch.value = null;
  selectedComics.value = [];
  selectAll.value = false;
}

// 切换搜索历史模态框
function toggleHistoryModal() {
  showHistoryModal.value = !showHistoryModal.value;
  // 加载搜索历史
  loadSearchHistory();
}

// 关闭搜索历史模态框
function closeHistoryModal() {
  showHistoryModal.value = false;
}

async function handleSearch() {
  if (!keyword.value.trim()) return;

  const options = {
    max_pages: 0,
    request_interval: 1000,
    search_chinese_only: true,
    proxy: null,
    proxy_enabled: false,
  };

  selectedComics.value = [];
  selectAll.value = false;
  await search(keyword.value, options);
  
  // 更新当前搜索信息
  currentSearch.value = {
    keyword: keyword.value,
    time: new Date().toLocaleString()
  };
  
  // 重新加载历史
  await loadSearchHistory();
}

function toggleSelect(aid: string) {
  const index = selectedComics.value.indexOf(aid);
  if (index === -1) {
    selectedComics.value.push(aid);
  } else {
    selectedComics.value.splice(index, 1);
  }
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedComics.value = results.value.map((c: Comic) => c.aid);
  } else {
    selectedComics.value = [];
  }
}

function addToDownloadQueue() {
  const selected = results.value.filter((c: Comic) =>
    selectedComics.value.includes(c.aid)
  );
  const tasks = selected.map((c: Comic) => ({
    aid: c.aid,
    title: c.title,
    url: c.url,
    cover_url: c.cover_url,
    save_path: '',
    pages: c.pages,
  }));

  const added = addToQueue(tasks);
  alert(`已添加 ${added} 部漫画到下载队列`);
}

// 组件挂载时加载搜索历史
onMounted(() => {
  loadSearchHistory();
});
</script>

<style scoped>
.search-view {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 24px;
}

h2 {
  margin-bottom: 24px;
  color: var(--text-primary);
}

h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
  font-size: 16px;
}

.search-form {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-form input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-card);
  color: var(--text-primary);
}

.search-form button {
  padding: 12px 32px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.search-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-history {
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

.btn-history:hover {
  background: var(--border-color);
}

/* 搜索历史模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: var(--border-color);
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.empty-history {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--border-color);
}

.history-keyword {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
  flex-shrink: 0;
}

.history-count {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  flex-shrink: 0;
}

.history-time {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
}

.btn-delete {
  background: #fee;
  border: none;
  font-size: 12px;
  color: #f56c6c;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: background 0.2s;
}

.btn-delete:hover {
  background: #f56c6c;
  color: #fff;
}

.confirm-dialog {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.confirm-dialog h3 {
  margin-bottom: 12px;
  color: var(--text-primary);
}

.confirm-dialog p {
  margin-bottom: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel {
  padding: 8px 24px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: var(--border-color);
}

.btn-confirm-delete {
  padding: 8px 24px;
  background: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-confirm-delete:hover {
  opacity: 0.9;
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

.error {
  padding: 12px;
  background: #fee;
  color: #f56c6c;
  border-radius: 8px;
  margin-bottom: 16px;
}

/* 搜索历史 */
.search-history {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 8px;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--border-color);
}

.history-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
}

.history-keyword {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.history-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.history-count {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.history-actions {
  display: flex;
  gap: 8px;
}

/* 当前搜索信息 */
.current-search {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.search-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-keyword {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.search-time {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 按钮样式 */
.btn-sm {
  padding: 6px 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-sm:hover {
  background: var(--border-color);
}

.btn-sm.btn-danger {
  background: #fee;
  color: #f56c6c;
  border-color: #f56c6c;
}

.btn-sm.btn-danger:hover {
  background: #f56c6c;
  color: #fff;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.results-header p {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.results-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.select-all input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.btn-add-queue {
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

.btn-add-queue:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-add-queue:hover:not(:disabled) {
  opacity: 0.9;
}

.comic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
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

.comic-cover-wrapper {
  position: relative;
  cursor: pointer;
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

.comic-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comic-author,
.comic-category {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
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

.comic-actions {
  display: flex;
  justify-content: center;
}
</style>
