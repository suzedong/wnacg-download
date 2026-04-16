<template>
  <div class="search-section">
    <div class="search-form">
      <span class="form-label">关键字</span>
      <input 
        type="text" 
        v-model="searchKeyword" 
        placeholder="输入作者或关键字..." 
        @keyup.enter="performSearch"
      />
      <button @click="performSearch" :disabled="isSearching" class="primary-btn">
        <span v-if="isSearching">🔍 搜索中...</span>
        <span v-else>🔍 搜索</span>
      </button>
      <button @click="showSearchResultList" class="secondary-btn">
        📚 搜索结果列表
      </button>
    </div>

    <div v-if="searchError" class="error-message">
      ❌ {{ searchError }}
    </div>

    <!-- 搜索结果列表弹窗 -->
    <div v-if="showList" class="modal-overlay" @click="showList = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>📚 搜索结果列表</h2>
          <button class="close-btn" @click="showList = false">✕</button>
        </div>
        <SearchResultList
          @select="handleSearchResultSelect"
          @view="handleViewDetail"
          @delete="handleDelete"
        />
      </div>
    </div>

    <div v-if="comicsList.length > 0" class="comics-list">
      <div class="list-header">
        <h2>搜索结果 ({{ comicsList.length }})</h2>
        <button @click="addToDownloadQueue" class="primary-btn" :disabled="selectedComics.length === 0">
          添加选中到下载队列 ({{ selectedComics.length }})
        </button>
      </div>
      <div class="comics-grid">
        <ComicCard 
          v-for="comic in comicsList" 
          :key="comic.aid" 
          :comic="comic"
          :selected="selectedComics.includes(comic)"
          :show-checkbox="true"
          :show-actions="true"
          @select="handleComicSelect"
          @download="handleSingleDownload"
        />
      </div>
    </div>

    <div v-if="comicsList.length === 0 && !isSearching && searchKeyword" class="no-results">
      未找到漫画，请尝试其他关键字。
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, inject } from 'vue';
import ComicCard from '../components/ComicCard.vue';
import SearchResultList from '../components/SearchResultList.vue';
import { createClient } from '../adapters';

const emit = defineEmits(['add-to-queue', 'switch-tab']);

// 注入客户端实例
const client = inject('client') || createClient();

const searchKeyword = ref('');
const comicsList = ref([]);
const selectedComics = ref([]);
const isSearching = ref(false);
const searchError = ref('');
const showList = ref(false);

const performSearch = async () => {
  if (!searchKeyword.value) return;
  
  isSearching.value = true;
  searchError.value = '';
  comicsList.value = [];
  selectedComics.value = [];
  
  try {
    const response = await client.search(searchKeyword.value);
    comicsList.value = response;
  } catch (error) {
    searchError.value = error.message;
  } finally {
    isSearching.value = false;
  }
};

const showSearchResultList = () => {
  showList.value = true;
};

const handleSearchResultSelect = (result) => {
  // 使用选中的搜索结果
  console.log('使用搜索结果:', result);
  showList.value = false;
  // TODO: 加载该搜索结果的详情
};

const handleViewDetail = (result) => {
  console.log('查看详情:', result);
  // TODO: 显示搜索结果详情
};

const handleDelete = (result) => {
  console.log('删除结果:', result);
  // 删除后可能需要刷新当前显示
};

const handleComicSelect = (comic) => {
  const index = selectedComics.value.findIndex(c => c.aid === comic.aid);
  if (index > -1) {
    selectedComics.value.splice(index, 1);
  } else {
    selectedComics.value.push(comic);
  }
};

const addToDownloadQueue = () => {
  emit('add-to-queue', [...selectedComics.value]);
  selectedComics.value = [];
  emit('switch-tab', 'download');
};

const handleSingleDownload = (comic) => {
  emit('add-to-queue', [comic]);
  emit('switch-tab', 'download');
};
</script>

<style scoped>
.search-section {
  width: 100%;
}

.search-form {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.form-label {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
}

.search-form input {
  flex: 1;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-form input:focus {
  outline: none;
  border-color: #667eea;
}

.primary-btn {
  padding: 0.9rem 1.8rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 1.3rem;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn {
  padding: 0.9rem 1.5rem;
  background: #f0f0f0;
  color: #666;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  font-size: 1rem;
}

.secondary-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #c33;
}

.no-results {
  background: rgba(255, 255, 255, 0.9);
  color: #666;
  padding: 2rem;
  border-radius: 15px;
  text-align: center;
  font-size: 1.1rem;
}

.comics-list {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.list-header h2 {
  margin: 0;
  color: #333;
}

.comics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* 弹窗样式 */
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
  animation: fadeIn 0.2s;
}

.modal-content {
  background: white;
  border-radius: 15px;
  max-width: 900px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;
  animation: slideUp 0.3s;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid #f0f0f0;
}

.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .search-form {
    flex-direction: column;
    align-items: stretch;
  }

  .form-label {
    font-size: 1.1rem;
  }

  .comics-grid {
    grid-template-columns: 1fr;
  }

  .list-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>
