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
      <p>搜索结果：{{ results.length }} 部漫画</p>
      <div class="comic-grid">
        <div v-for="comic in results" :key="comic.aid" class="comic-card">
          <img :src="comic.cover_url" :alt="comic.title" />
          <h4>{{ comic.title }}</h4>
          <p>{{ comic.category }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSearch } from '../composables/useSearch';

const keyword = ref('');

const {
  results,
  isSearching,
  progress,
  total,
  error,
  search,
} = useSearch();

async function handleSearch() {
  if (!keyword.value.trim()) return;

  const options = {
    max_pages: 0,
    request_interval: 1000,
    search_chinese_only: true,
    proxy: null,
    proxy_enabled: false,
  };

  await search(keyword.value, options);
}
</script>

<style scoped>
.search-view {
  max-width: 1200px;
  margin: 0 auto;
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

.comic-card p {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
