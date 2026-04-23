<template>
  <div class="compare-section">
    <h2>对比本地漫画</h2>
    <div class="compare-form">
      <div class="form-group">
        <label>搜索关键字</label>
        <input 
          type="text" 
          v-model="compareKeyword" 
          placeholder="输入作者或关键字..."
        />
      </div>
      <div class="form-group">
        <label>本地存储路径</label>
        <div class="path-input">
          <input type="text" v-model="compareStoragePath" placeholder="选择存储路径..." />
          <button @click="selectComparePath" class="browse-btn">浏览</button>
        </div>
      </div>
      <button @click="compareComics" :disabled="isComparing || !compareKeyword || !compareStoragePath" class="primary-btn">
        {{ isComparing ? '对比中...' : '开始对比' }}
      </button>
    </div>

    <div v-if="compareError" class="error-message">
      ❌ {{ compareError }}
    </div>

    <div v-if="compareResult" class="compare-results">
      <div class="result-stats">
        <StatCard 
          :number="compareResult.websiteComics.length" 
          label="网站漫画" 
          variant="default"
        />
        <StatCard 
          :number="compareResult.localComics.length" 
          label="本地漫画" 
          variant="default"
        />
        <StatCard 
          :number="compareResult.toDownload.length" 
          label="需要下载" 
          variant="to-download"
        />
        <StatCard 
          :number="compareResult.alreadyHave.length" 
          label="已拥有" 
          variant="already-have"
        />
      </div>

      <div v-if="compareResult.toDownload.length > 0" class="to-download-section">
        <div class="section-header">
          <h3>📥 需要下载的漫画 ({{ compareResult.toDownload.length }})</h3>
          <button @click="handleDownloadCompared" class="primary-btn" :disabled="isDownloading">
            {{ isDownloading ? '下载中...' : '全部下载' }}
          </button>
        </div>
        <div class="comics-grid">
          <ComicCard 
            v-for="comic in compareResult.toDownload" 
            :key="comic.aid" 
            :comic="comic"
            :show-actions="false"
          />
        </div>
      </div>

      <div v-if="compareResult.alreadyHave.length > 0" class="already-have-section">
        <h3>✅ 已拥有的漫画 ({{ compareResult.alreadyHave.length }})</h3>
        <div class="comics-grid">
          <ComicCard 
            v-for="item in compareResult.alreadyHave" 
            :key="item.website.aid" 
            :comic="item.website"
            :show-actions="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import ComicCard from '../components/ComicCard.vue';
import StatCard from '../components/StatCard.vue';
import { createClient } from '../adapters';

const emit = defineEmits(['download-comics']);

// 注入客户端实例
const client = inject('client') || createClient();

const compareKeyword = ref('');
const compareStoragePath = ref('');
const compareResult = ref(null);
const isComparing = ref(false);
const isDownloading = ref(false);
const compareError = ref('');

const selectComparePath = async () => {
  // Web 环境暂不支持文件选择器，需要用户手动输入
  console.warn('Web 环境：请手动输入路径');
  alert('Web 环境暂不支持文件选择器，请手动输入本地存储路径');
};

const compareComics = async () => {
  if (!compareKeyword.value || !compareStoragePath.value) return;
  
  isComparing.value = true;
  compareError.value = '';
  compareResult.value = null;
  
  try {
    const response = await client.compare(compareKeyword.value, compareStoragePath.value);
    compareResult.value = response;
  } catch (error) {
    compareError.value = error.message;
  } finally {
    isComparing.value = false;
  }
};

const handleDownloadCompared = async () => {
  if (!compareResult.value || compareResult.value.toDownload.length === 0) return;
  
  isDownloading.value = true;
  compareError.value = '';
  
  try {
    await emit('download-comics', compareResult.value.toDownload, compareStoragePath.value);
  } catch (error) {
    compareError.value = error.message;
  } finally {
    isDownloading.value = false;
  }
};
</script>

<style scoped>
.compare-section {
  width: 100%;
}

.compare-section h2 {
  color: white;
  margin-bottom: 1.5rem;
}

.compare-form {
  background: white;
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.compare-form input {
  flex: 1;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.3s;
  width: 100%;
  box-sizing: border-box;
}

.compare-form input:focus {
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
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #c33;
}

.compare-results {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  color: #333;
}

.to-download-section,
.already-have-section {
  margin-bottom: 2rem;
}

.comics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.path-input {
  display: flex;
  gap: 0.5rem;
}

.browse-btn {
  padding: 0.9rem 1.5rem;
  background: #f0f0f0;
  color: #555;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.browse-btn:hover {
  background: #e0e0e0;
  border-color: #ccc;
}

.already-have-section h3 {
  margin-bottom: 1rem;
  color: #333;
}

@media (max-width: 768px) {
  .result-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .path-input {
    flex-direction: column;
  }
}
</style>
