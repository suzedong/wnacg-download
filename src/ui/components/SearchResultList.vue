<template>
  <div class="search-result-list">
    <div class="list-header">
      <h2>📚 搜索结果列表</h2>
      <div class="filter-box">
        <input
          type="text"
          v-model="filterKeyword"
          placeholder="🔍 过滤关键字..."
          class="filter-input"
        />
      </div>
    </div>

    <div v-if="loading" class="loading">
      <span>🔄 加载中...</span>
    </div>

    <div v-else-if="searchResults.length === 0" class="no-results">
      <span>❌ 没有找到搜索结果</span>
    </div>

    <div v-else class="results-table">
      <div class="table-header">
        <div class="col-keyword">关键字</div>
        <div class="col-time">搜索时间</div>
        <div class="col-count">漫画数量</div>
        <div class="col-size">文件大小</div>
        <div class="col-actions">操作</div>
      </div>

      <div
        v-for="(item, index) in filteredResults"
        :key="item.keyword"
        class="table-row"
        :class="{ selected: selectedIndex === index }"
        @click="selectIndex(index)"
      >
        <div class="col-keyword">
          <input
            type="radio"
            :name="selectedIndex"
            :checked="selectedIndex === index"
            @change="selectIndex(index)"
          />
          <span class="keyword-text">{{ item.keyword }}</span>
        </div>
        <div class="col-time">{{ formatTime(item.searchTime) }}</div>
        <div class="col-count">{{ item.totalComics }} 部</div>
        <div class="col-size">{{ formatSize(item.fileSize) }}</div>
        <div class="col-actions">
          <button
            class="action-btn view-btn"
            @click.stop="viewDetail(item)"
            title="查看详情"
          >
            👁️ 查看
          </button>
          <button
            class="action-btn delete-btn"
            @click.stop="deleteResult(item)"
            title="删除"
          >
            🗑️ 删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="searchResults.length > 0" class="list-footer">
      <div class="stats">
        共 {{ searchResults.length }} 个搜索结果
        <span v-if="filterKeyword">（过滤后 {{ filteredResults.length }} 个）</span>
      </div>
      <div class="actions">
        <button
          class="primary-btn"
          :disabled="selectedIndex === -1"
          @click="useSelected"
        >
          ✅ 使用选中
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits(['select', 'view', 'delete']);

const loading = ref(true);
const searchResults = ref([]);
const filterKeyword = ref('');
const selectedIndex = ref(-1);

// 加载搜索结果列表
const loadResults = async () => {
  loading.value = true;
  try {
    const results = await window.electronAPI.getSearchResultList();
    searchResults.value = results;
    if (results.length > 0) {
      selectedIndex.value = 0; // 默认选中第一个
    }
  } catch (error) {
    console.error('加载搜索结果失败:', error);
  } finally {
    loading.value = false;
  }
};

// 过滤结果
const filteredResults = computed(() => {
  if (!filterKeyword.value) {
    return searchResults.value;
  }
  return searchResults.value.filter(item =>
    item.keyword.toLowerCase().includes(filterKeyword.value.toLowerCase())
  );
});

// 选择索引
const selectIndex = (index) => {
  selectedIndex.value = index;
};

// 查看详情
const viewDetail = (item) => {
  emit('view', item);
};

// 删除结果
const deleteResult = async (item) => {
  if (confirm(`确定要删除 "${item.keyword}" 的搜索结果吗？`)) {
    try {
      await window.electronAPI.deleteSearchResult(item.keyword);
      await loadResults(); // 重新加载列表
      emit('delete', item);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败：' + error.message);
    }
  }
};

// 使用选中的结果
const useSelected = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < filteredResults.value.length) {
    const selected = filteredResults.value[selectedIndex.value];
    emit('select', selected);
  }
};

// 格式化时间
const formatTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 格式化大小
const formatSize = (bytes) => {
  if (bytes < 1024) {
    return bytes + ' B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// 组件挂载时加载数据
onMounted(() => {
  loadResults();
});

// 暴露刷新方法给父组件
defineExpose({
  refresh: loadResults,
});
</script>

<style scoped>
.search-result-list {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.list-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.filter-box {
  flex: 1;
  max-width: 300px;
  margin-left: auto;
}

.filter-input {
  width: 100%;
  padding: 0.6rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: border-color 0.3s;
}

.filter-input:focus {
  outline: none;
  border-color: #667eea;
}

.loading,
.no-results {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
}

.results-table {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1.5fr;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1.5fr;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.table-row:hover {
  background: #f8f9ff;
}

.table-row.selected {
  background: #e6f0ff;
  border-left: 3px solid #667eea;
}

.col-keyword {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #333;
}

.keyword-text {
  flex: 1;
}

.col-time,
.col-count,
.col-size {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 0.9rem;
}

.col-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-start;
  align-items: center;
}

.action-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.view-btn {
  background: #e6f3ff;
  color: #409eff;
}

.view-btn:hover {
  background: #409eff;
  color: white;
}

.delete-btn {
  background: #fef0f0;
  color: #f56c6c;
}

.delete-btn:hover {
  background: #f56c6c;
  color: white;
}

.list-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 2px solid #f0f0f0;
}

.stats {
  color: #666;
  font-size: 0.95rem;
}

.primary-btn {
  padding: 0.7rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .table-header {
    display: none;
  }

  .table-row {
    border: 1px solid #e0e0e0;
    margin-bottom: 1rem;
    border-radius: 8px;
    padding: 1rem;
  }

  .col-actions {
    justify-content: space-between;
  }
}
</style>
