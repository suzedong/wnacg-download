<template>
  <div class="config-view">
    <h2>⚙️ 配置设置</h2>

    <div v-if="config" class="config-form">
      <h3>存储设置</h3>
      <div class="form-group">
        <label>默认存储路径：</label>
        <div class="path-input-row">
          <input v-model="config.storage_path" type="text" placeholder="选择或输入保存路径" />
          <button class="btn-browse" @click="selectFolder">📁 选择文件夹</button>
        </div>
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
        <input
          v-model="config.proxy"
          type="text"
          placeholder="http://127.0.0.1:7890"
        />
      </div>
      <div class="form-group">
        <label>请求间隔（毫秒）：</label>
        <input v-model.number="config.request_interval" type="number" />
      </div>

      <h3>下载设置</h3>
      <div class="form-group">
        <label>并发下载数：</label>
        <input
          v-model.number="config.concurrent_downloads"
          type="number"
          min="1"
          max="10"
        />
      </div>
      <div class="form-group">
        <label>下载源优先策略：</label>
        <select v-model="config.download_source_preference" class="source-select">
          <option value="server2">Server 2 直链（dl1.wn01.download）</option>
          <option value="worker_api">Worker API 临时链接（d1.wcdn.date）</option>
        </select>
        <span class="hint">推荐 Server 2，稳定且无需浏览器；Worker API 需非 headless 浏览器（短暂可见）</span>
      </div>
      <div class="form-group">
        <label>下载重试次数：</label>
        <input v-model.number="config.retry_times" type="number" />
      </div>
      <div class="form-group">
        <label>重试间隔（秒）：</label>
        <input v-model.number="config.retry_interval" type="number" />
      </div>

      <h3>外观设置</h3>
      <div class="form-group">
        <label>主题模式：</label>
        <select v-model="config.theme" class="theme-select">
          <option value="auto">🖥️ 跟随系统（自动切换）</option>
          <option value="dark">🌙 暗色模式</option>
          <option value="light">☀️ 亮色模式</option>
        </select>
      </div>

      <h3>AI 设置</h3>
      <div class="form-group">
        <label>AI API 地址：</label>
        <input
          v-model="config.ai_api_url"
          type="text"
          placeholder="https://coding.dashscope.aliyuncs.com/v1/chat/completions"
        />
      </div>
      <div class="form-group">
        <label>AI API Key：</label>
        <input
          v-model="config.ai_api_key"
          type="password"
          placeholder="sk-..."
        />
      </div>
      <div class="form-group">
        <label>AI 模型：</label>
        <input
          v-model="config.ai_model"
          type="text"
          placeholder="qwen3.5-plus"
        />
      </div>
      <div class="form-group">
        <label>AI Prompt 模板：</label>
        <textarea
          v-model="config.ai_prompt"
          rows="8"
          placeholder="你是一个专业的漫画匹配助手..."
        ></textarea>
      </div>
      <div class="form-group">
        <label>AI 温度参数：</label>
        <input
          v-model.number="config.ai_temperature"
          type="number"
          step="0.1"
          min="0"
          max="2"
          placeholder="0（关闭推理）"
        />
        <span class="hint">0 = 确定性输出（无推理），2 = 高随机性</span>
      </div>
      <div class="form-group">
        <label>匹配阈值：</label>
        <input
          v-model.number="config.match_threshold"
          type="number"
          step="0.1"
          min="0"
          max="1"
        />
      </div>

      <div class="form-actions">
        <button @click="handleSave">保存配置</button>
        <button class="reset-btn" @click="handleReset">重置配置</button>
      </div>

      <p class="hint">💡 配置会自动保存，无需手动保存</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, inject } from 'vue';
import { useConfig } from '../composables/useConfig';
import { open } from '@tauri-apps/plugin-dialog';

const { config, loadConfig, saveConfig, resetConfig } = useConfig();

// 全局通知
const notify = inject<{ success: (msg: string) => void; error: (msg: string, duration?: number, action?: { label: string; onClick: () => void }) => void; info: (msg: string) => void }>('notify');

onMounted(async () => {
  await loadConfig();
});

async function selectFolder() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择默认存储路径',
    });
    if (selected && typeof selected === 'string') {
      config.value!.storage_path = selected;
      // 自动保存
      await saveConfig(config.value!);
      notify?.success(`保存路径已更新：${selected}`);
    }
  } catch (e: any) {
    notify?.error(`选择文件夹失败：${e.message || e}`);
  }
}

async function handleSave() {
  if (config.value) {
    // 验证存储路径
    if (!config.value.storage_path || config.value.storage_path.trim() === '') {
      notify?.error('存储路径不能为空，请选择或输入一个有效的文件夹路径', 0);
      return;
    }

    // 验证代理格式
    if (config.value.proxy_enabled && config.value.proxy) {
      const proxyPattern = /^(http|https|socks5):\/\//;
      if (!proxyPattern.test(config.value.proxy)) {
        notify?.error('代理地址格式不正确，请以 http://、https:// 或 socks5:// 开头', 0);
        return;
      }
    }

    // 验证 AI API 地址
    if (config.value.ai_api_url && !config.value.ai_api_url.startsWith('http')) {
      notify?.error('AI API 地址必须以 http:// 或 https:// 开头', 0);
      return;
    }

    await saveConfig(config.value);
    notify?.success('配置已保存');
  }
}

async function handleReset() {
  try {
    await resetConfig();
    notify?.success('配置已重置为默认值');
  } catch (e: any) {
    notify?.error(`重置配置失败：${e.message || e}`);
  }
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

.form-group input[type='text'],
.form-group input[type='number'],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.form-group textarea {
  font-family: monospace;
  resize: vertical;
}

.source-select {
  cursor: pointer;
}

.theme-select {
  cursor: pointer;
}

.path-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.path-input-row input {
  flex: 1;
}

.btn-browse {
  padding: 10px 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-browse:hover {
  background: var(--border-color);
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
</style>

