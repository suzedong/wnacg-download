<template>
  <div class="config-view">
    <h2>⚙️ 配置设置</h2>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="config" class="config-form">
      <h3>存储设置</h3>
      <div class="form-group">
        <label>默认存储路径：</label>
        <input v-model="config.storage_path" type="text" />
      </div>

      <h3>网络设置</h3>
      <div class="form-group">
        <label>
          <input v-model="config.proxy_enabled" type="checkbox" />
          启用代理
        </label>
      </div>
      <div v-if="config.proxy_enabled" class="form-group">
        <label>代理地址：</label>
        <input v-model="config.proxy" type="text" placeholder="http://127.0.0.1:7890" />
      </div>
      <div class="form-group">
        <label>请求间隔（毫秒）：</label>
        <input v-model.number="config.request_interval" type="number" />
      </div>

      <h3>下载设置</h3>
      <div class="form-group">
        <label>并发下载数：</label>
        <input v-model.number="config.concurrent_downloads" type="number" min="1" max="10" />
      </div>
      <div class="form-group">
        <label>下载重试次数：</label>
        <input v-model.number="config.retry_times" type="number" />
      </div>

      <h3>AI 设置</h3>
      <div class="form-group">
        <label>AI API 地址：</label>
        <input v-model="config.ai_api_url" type="text" placeholder="https://api.openai.com/v1/chat/completions" />
      </div>
      <div class="form-group">
        <label>匹配阈值：</label>
        <input v-model.number="config.match_threshold" type="number" step="0.1" min="0" max="1" />
      </div>

      <div class="form-actions">
        <button @click="handleSave">保存配置</button>
        <button class="reset-btn" @click="handleReset">重置配置</button>
      </div>

      <p class="hint">💡 配置会自动保存，无需手动保存</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useConfig } from '../composables/useConfig';

const { config, error, loadConfig, saveConfig, resetConfig } = useConfig();

onMounted(async () => {
  await loadConfig();
});

async function handleSave() {
  if (config.value) {
    await saveConfig(config.value);
  }
}

async function handleReset() {
  await resetConfig();
}
</script>

<style scoped>
.config-view {
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: var(--text-primary);
}

h3 {
  margin: 24px 0 12px;
  color: var(--text-primary);
}

.config-form {
  background: var(--bg-card);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.form-actions button {
  padding: 12px 32px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.reset-btn {
  background: #909399 !important;
}

.hint {
  margin-top: 16px;
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
</style>
