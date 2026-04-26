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
    </div>

    <div v-if="isSearching" class="progress-bar">
      <div class="progress-text">
        搜索进度：{{ progress }}/{{ total }}
      </div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
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
          <img :src="comic.cover_url" :alt="comic.title" />
          <h4>{{ comic.title }}</h4>
          <p class="comic-author">{{ comic.author }}</p>
          <p class="comic-category">{{ comic.category }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSearch } from '../composables/useSearch';
import { useDownloadQueue } from '../composables/useDownloadQueue';
import { Comic } from '../types/index';

const keyword = ref('');
const selectAll = ref(false);
const selectedComics = ref<string[]>([]);

const {
  results,
  isSearching,
  progress,
  total,
  error,
  search,
} = useSearch();

const { addToQueue } = useDownloadQueue();

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
</script>

<style scoped>
.search-view {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

h2 {
  margin-bottom: 24px;
  color: var(--text-primary);
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

.progress-bar {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-card);
  border-radius: 8px;
}

.progress-text {
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
  height: 260px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
}

.comic-card h4 {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.comic-author,
.comic-category {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
</style>
