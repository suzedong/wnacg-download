<template>
  <div class="search-preview">
    <!-- 统计信息 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">总漫画数</span>
        <span class="stat-value">{{ comics.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">去重后</span>
        <span class="stat-value">{{ deduplicatedCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总图片数</span>
        <span class="stat-value">{{ totalImages }}</span>
      </div>
      <div class="stat-item" v-if="searchTime">
        <span class="stat-label">搜索耗时</span>
        <span class="stat-value">{{ (searchTime / 1000).toFixed(1) }}s</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <button @click="$emit('re-search')" class="secondary-btn">
        🔍 重新搜索
      </button>
      <button @click="$emit('start-compare')" class="primary-btn" :disabled="comics.length === 0">
        📊 开始对比
      </button>
      <button @click="downloadSelected" class="primary-btn" :disabled="selectedComics.length === 0">
        ⬇️ 下载选中 ({{ selectedComics.length }})
      </button>
      <button @click="downloadAll" class="primary-btn" :disabled="comics.length === 0">
        ⬇️ 下载全部
      </button>
    </div>

    <!-- 漫画网格 -->
    <div class="comics-grid">
      <ComicCard 
        v-for="comic in comics" 
        :key="comic.aid" 
        :comic="comic"
        :selected="selectedComics.includes(comic)"
        :show-checkbox="true"
        :show-actions="true"
        @select="handleComicSelect"
        @download="handleSingleDownload"
      />
    </div>

    <!-- 覆盖确认弹窗 -->
    <div v-if="showOverwriteConfirm" class="modal-overlay" @click="showOverwriteConfirm = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>⚠️ 覆盖确认</h2>
          <button class="close-btn" @click="showOverwriteConfirm = false">✕</button>
        </div>
        <div class="modal-body">
          <p>相同关键字已存在搜索结果，是否覆盖？</p>
          <p class="keyword-highlight">关键字：{{ keyword }}</p>
        </div>
        <div class="modal-footer">
          <button @click="showOverwriteConfirm = false" class="secondary-btn">
            取消
          </button>
          <button @click="confirmOverwrite" class="primary-btn">
            确认覆盖
          </button>
        </div>
      </div>
    </div>

    <!-- Loading 弹窗 -->
    <div v-if="showLoading" class="modal-overlay">
      <div class="loading-modal">
        <div class="spinner"></div>
        <p>正在搜索...</p>
        <button v-if="searchError" @click="retrySearch" class="primary-btn">
          🔁 重试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ComicCard from './ComicCard.vue';

const props = defineProps({
  comics: {
    type: Array,
    required: true,
  },
  keyword: {
    type: String,
    required: true,
  },
  searchTime: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  're-search',
  'start-compare',
  'download-selected',
  'download-all',
  'confirm-overwrite',
]);

const selectedComics = ref([]);
const showOverwriteConfirm = ref(false);
const showLoading = ref(false);
const searchError = ref('');

const totalImages = computed(() => {
  return props.comics.reduce((sum, comic) => sum + (comic.imageCount || 0), 0);
});

const deduplicatedCount = computed(() => {
  const uniqueTitles = new Set(props.comics.map(c => c.title));
  return uniqueTitles.size;
});

const handleComicSelect = (comic) => {
  const index = selectedComics.value.findIndex(c => c.aid === comic.aid);
  if (index > -1) {
    selectedComics.value.splice(index, 1);
  } else {
    selectedComics.value.push(comic);
  }
};

const handleSingleDownload = (comic) => {
  emit('download-selected', [comic]);
};

const downloadSelected = () => {
  emit('download-selected', [...selectedComics.value]);
  selectedComics.value = [];
};

const downloadAll = () => {
  emit('download-all', [...props.comics]);
};

const confirmOverwrite = () => {
  showOverwriteConfirm.value = false;
  emit('confirm-overwrite', props.keyword);
};

const retrySearch = () => {
  searchError.value = '';
  showLoading.value = true;
  emit('re-search');
};
</script>

<style scoped>
.search-preview {
  width: 100%;
}

.stats-bar {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 1.5rem;
  color: white;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.stat-label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.action-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.primary-btn {
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 1rem;
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
  padding: 0.8rem 1.5rem;
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
  max-width: 500px;
  width: 90%;
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
  font-size: 1.3rem;
}

.modal-body {
  padding: 2rem;
}

.modal-body p {
  margin: 0.5rem 0;
  color: #666;
}

.keyword-highlight {
  background: #f0f0f0;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  color: #667eea;
  margin-top: 1rem !important;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 2px solid #f0f0f0;
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

/* Loading 弹窗 */
.loading-modal {
  background: white;
  padding: 3rem;
  border-radius: 15px;
  text-align: center;
  animation: slideUp 0.3s;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
  .stats-bar {
    gap: 1rem;
  }

  .stat-value {
    font-size: 1.2rem;
  }

  .action-bar {
    flex-direction: column;
  }

  .comics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
