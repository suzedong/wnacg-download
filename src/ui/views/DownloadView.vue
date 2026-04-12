<template>
  <div class="download-section">
    <h2>下载队列</h2>
    <div v-if="downloadQueue.length === 0" class="empty-queue">
      <p>📭 下载队列为空</p>
      <p>请从搜索或对比页面添加漫画到下载队列</p>
    </div>
    <div v-else class="download-queue">
      <div class="queue-header">
        <span>共 {{ downloadQueue.length }} 个漫画</span>
        <button @click="handleClearQueue" class="danger-btn" :disabled="isDownloading">清空队列</button>
        <button @click="handleStartDownload" class="primary-btn" :disabled="isDownloading || downloadQueue.length === 0">
          {{ isDownloading ? '下载中...' : '开始下载' }}
        </button>
      </div>
      <div class="queue-list">
        <QueueItem
          v-for="(comic, index) in downloadQueue"
          :key="comic.aid"
          :comic="comic"
          :index="index"
          :disabled="isDownloading"
          @remove="handleRemoveFromQueue"
        />
      </div>
    </div>

    <div v-if="downloadResult" class="download-result">
      <h3>下载结果</h3>
      <div class="result-summary">
        <p class="success-count">✅ 成功：{{ downloadResult.success.length }}</p>
        <p class="failed-count" v-if="downloadResult.failed.length > 0">❌ 失败：{{ downloadResult.failed.length }}</p>
      </div>
      <div v-if="downloadResult.success.length > 0" class="success-list">
        <h4>成功下载:</h4>
        <ul>
          <li v-for="title in downloadResult.success" :key="title">{{ title }}</li>
        </ul>
      </div>
      <div v-if="downloadResult.failed.length > 0" class="failed-list">
        <h4>下载失败:</h4>
        <ul>
          <li v-for="title in downloadResult.failed" :key="title">{{ title }}</li>
        </ul>
      </div>
    </div>

    <div v-if="downloadError" class="error-message">
      ❌ {{ downloadError }}
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import QueueItem from '../components/QueueItem.vue';

const props = defineProps({
  queue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['update:queue', 'start-download', 'clear-queue']);

const downloadQueue = ref(props.queue);
const isDownloading = ref(false);
const downloadResult = ref(null);
const downloadError = ref('');

const handleRemoveFromQueue = (index) => {
  downloadQueue.value.splice(index, 1);
  emit('update:queue', [...downloadQueue.value]);
};

const handleClearQueue = () => {
  downloadQueue.value = [];
  downloadResult.value = null;
  downloadError.value = '';
  emit('update:queue', []);
};

const handleStartDownload = async () => {
  if (downloadQueue.value.length === 0) return;
  
  isDownloading.value = true;
  downloadError.value = '';
  downloadResult.value = null;
  
  try {
    await emit('start-download', [...downloadQueue.value]);
  } catch (error) {
    downloadError.value = error.message;
  } finally {
    isDownloading.value = false;
  }
};
</script>

<style scoped>
.download-section {
  width: 100%;
}

.download-section h2 {
  color: white;
  margin-bottom: 1.5rem;
}

.empty-queue {
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem;
  border-radius: 15px;
  text-align: center;
  color: #666;
}

.empty-queue p {
  margin: 0.5rem 0;
}

.download-queue {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.queue-header {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.queue-header span {
  flex: 1;
  color: #666;
  font-weight: 500;
}

.danger-btn {
  padding: 0.7rem 1.5rem;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.danger-btn:hover:not(:disabled) {
  background: #ff3838;
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn {
  padding: 0.7rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.download-result {
  margin-top: 2rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.download-result h3 {
  margin-top: 0;
  color: #333;
}

.result-summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.success-count {
  color: #38ef7d;
  font-weight: 600;
  font-size: 1.1rem;
}

.failed-count {
  color: #ff4757;
  font-weight: 600;
  font-size: 1.1rem;
}

.success-list,
.failed-list {
  margin-top: 1rem;
}

.success-list h4,
.failed-list h4 {
  color: #555;
  margin-bottom: 0.5rem;
}

.success-list ul,
.failed-list ul {
  margin: 0;
  padding-left: 1.5rem;
}

.success-list li,
.failed-list li {
  padding: 0.3rem 0;
  color: #666;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  margin-top: 1.5rem;
  border-left: 4px solid #c33;
}
</style>
