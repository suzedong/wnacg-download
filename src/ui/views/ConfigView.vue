<template>
  <div class="config-section">
    <h2>配置设置</h2>
    <div class="config-form">
      <div class="config-item">
        <label>默认存储路径</label>
        <div class="path-input">
          <input 
            type="text" 
            v-model="localConfig.defaultStoragePath" 
            @change="saveConfig('defaultStoragePath', localConfig.defaultStoragePath)" 
          />
          <button @click="selectStoragePath" class="browse-btn">浏览</button>
        </div>
      </div>
      <div class="config-item">
        <label>代理地址 (可选)</label>
        <input 
          type="text" 
          v-model="localConfig.defaultProxy" 
          @change="saveConfig('defaultProxy', localConfig.defaultProxy)"
          placeholder="例如：http://127.0.0.1:7890"
        />
      </div>
      <div class="config-item">
        <label>最大爬取页数</label>
        <input 
          type="number" 
          v-model.number="localConfig.defaultMaxPages" 
          @change="saveConfig('defaultMaxPages', localConfig.defaultMaxPages)"
          min="1"
        />
      </div>
      <div class="config-item">
        <label>请求间隔 (毫秒)</label>
        <input 
          type="number" 
          v-model.number="localConfig.requestDelay" 
          @change="saveConfig('requestDelay', localConfig.requestDelay)"
          min="0"
        />
      </div>
      <div class="config-item">
        <label>并发下载数</label>
        <input 
          type="number" 
          v-model.number="localConfig.concurrentDownloads" 
          @change="saveConfig('concurrentDownloads', localConfig.concurrentDownloads)"
          min="1"
          max="10"
        />
      </div>
      <div class="config-item checkbox-item">
        <label>
          <input 
            type="checkbox" 
            v-model="localConfig.defaultOnlyChinese" 
            @change="saveConfig('defaultOnlyChinese', localConfig.defaultOnlyChinese)"
          />
          只搜索汉化版漫画
        </label>
      </div>
    </div>
    <div v-if="configError" class="error-message">
      ❌ {{ configError }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject } from 'vue';
import { createClient } from '../adapters';

// 注入客户端实例
const client = inject('client') || createClient();

const localConfig = ref({
  defaultStoragePath: '',
  defaultProxy: '',
  defaultMaxPages: 5,
  defaultOnlyChinese: true,
  requestDelay: 2000,
  concurrentDownloads: 3,
});

const configError = ref('');

const loadConfig = async () => {
  try {
    const response = await client.getAll();
    localConfig.value = response;
  } catch (error) {
    configError.value = error.message;
  }
};

const saveConfig = async (key, value) => {
  try {
    await client.set(key, value);
  } catch (error) {
    configError.value = error.message;
  }
};

const selectStoragePath = async () => {
  // Web 环境暂不支持文件选择器，需要用户手动输入
  console.warn('Web 环境：请手动输入路径');
  alert('Web 环境暂不支持文件选择器，请手动输入存储路径');
};

watch(() => localConfig.value, (newVal) => {
  loadConfig();
}, { deep: true });

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.config-section {
  width: 100%;
}

.config-section h2 {
  color: white;
  margin-bottom: 1.5rem;
}

.config-form {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.config-item {
  margin-bottom: 1.5rem;
}

.config-item label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.config-item input[type="text"],
.config-item input[type="number"] {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.config-item input:focus {
  outline: none;
  border-color: #667eea;
}

.path-input {
  display: flex;
  gap: 0.5rem;
}

.path-input input {
  flex: 1;
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

.checkbox-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
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
