<template>
  <div class="config-view">
    <div class="config-header">
      <h2>⚙️ 配置设置</h2>
      <div class="save-status" :class="statusClass">
        <span v-if="isSaving" class="saving-spinner"></span>
        <span v-if="isSaving">正在保存...</span>
        <span v-else-if="lastSavedAt">已同步 {{ formatTime(lastSavedAt) }}</span>
        <span v-else-if="isDirty">未保存</span>
        <span v-else>已同步</span>
      </div>
    </div>

    <div v-if="config" class="config-form">
      <!-- 存储设置 -->
      <section class="config-section">
        <h3 class="section-title"><span class="section-icon">📁</span>存储设置</h3>
        <div class="form-group">
          <label>默认存储路径</label>
          <div class="path-input-row">
            <input
              :value="config.storage_path"
              type="text"
              placeholder="选择或输入保存路径"
              @input="updateField('storage_path', ($event.target as HTMLInputElement).value)"
            />
            <button class="btn-browse" @click="selectFolder">📁 浏览</button>
          </div>
          <span v-if="validationErrors.storage_path" class="field-error">{{ validationErrors.storage_path }}</span>
        </div>
      </section>

      <!-- 搜索设置 -->
      <section class="config-section">
        <h3 class="section-title"><span class="section-icon">🔍</span>搜索设置</h3>
        <div class="form-group">
          <label>只搜索汉化版</label>
          <div class="toggle-row">
            <button
              class="toggle-switch"
              :class="{ active: config.search_chinese_only }"
              @click="updateField('search_chinese_only', !config.search_chinese_only)"
            >
              <span class="toggle-knob"></span>
            </button>
            <span class="toggle-label">{{ config.search_chinese_only ? '仅汉化版' : '全部漫画' }}</span>
          </div>
        </div>
        <div class="form-group">
          <label>最大爬取页数</label>
          <div class="number-input-group">
            <input
              :value="config.max_pages"
              type="number"
              min="0"
              max="100"
              step="1"
              @input="updateField('max_pages', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="number-hint">{{ config.max_pages === 0 ? '不限制' : `${config.max_pages} 页` }}</span>
          </div>
          <span v-if="validationErrors.max_pages" class="field-error">{{ validationErrors.max_pages }}</span>
        </div>
        <div class="form-group">
          <label>请求间隔</label>
          <div class="number-input-group">
            <input
              :value="config.request_interval"
              type="number"
              min="100"
              max="10000"
              step="100"
              @input="updateField('request_interval', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="number-hint">{{ config.request_interval }} ms</span>
          </div>
          <span class="hint">建议 ≥ 1000ms，间隔太短可能被封禁</span>
          <span v-if="validationErrors.request_interval" class="field-error">{{ validationErrors.request_interval }}</span>
        </div>
      </section>

      <!-- 浏览器设置 -->
      <section class="config-section">
        <h3 class="section-title"><span class="section-icon">🌐</span>浏览器设置</h3>
        <div class="form-group">
          <label>使用系统 Chrome</label>
          <div class="toggle-row">
            <button
              class="toggle-switch"
              :class="{ active: config.use_system_chrome }"
              @click="updateField('use_system_chrome', !config.use_system_chrome)"
            >
              <span class="toggle-knob"></span>
            </button>
            <span class="toggle-label">{{ config.use_system_chrome ? '已启用' : '未启用' }}</span>
          </div>
          <span class="hint">{{ config.use_system_chrome ? '使用系统已安装的 Chrome 浏览器' : '使用内置的 Chromium 浏览器（需要下载）' }}</span>
        </div>
        <div class="form-group">
          <label>Playwright 浏览器状态</label>
          <div class="status-indicator">
            <span class="status-dot" :class="{ installed: playwrightInstalled, notInstalled: !playwrightInstalled }"></span>
            <span class="status-text">{{ playwrightInstalled ? '✅ 已安装' : '❌ 未安装' }}</span>
          </div>
          <button
            v-if="!playwrightInstalled && !config.use_system_chrome"
            class="btn-install"
            @click="installPlaywright"
            :disabled="isInstalling"
          >
            {{ isInstalling ? '安装中...' : '📥 安装 Chromium' }}
          </button>
        </div>
      </section>

      <!-- 网络设置 -->
      <section class="config-section">
        <h3 class="section-title"><span class="section-icon">🌐</span>网络设置</h3>
        <div class="form-group">
          <label>启用代理</label>
          <div class="toggle-row">
            <button
              class="toggle-switch"
              :class="{ active: config.proxy_enabled }"
              @click="updateField('proxy_enabled', !config.proxy_enabled)"
            >
              <span class="toggle-knob"></span>
            </button>
            <span class="toggle-label">{{ config.proxy_enabled ? '已启用' : '未启用' }}</span>
          </div>
        </div>
        <div v-if="config.proxy_enabled" class="form-group">
          <label>代理地址</label>
          <input
            :value="config.proxy || ''"
            type="text"
            placeholder="http://127.0.0.1:7890"
            @input="updateField('proxy', ($event.target as HTMLInputElement).value)"
          />
          <span v-if="validationErrors.proxy" class="field-error">{{ validationErrors.proxy }}</span>
        </div>
      </section>

      <!-- 下载设置 -->
      <section class="config-section">
        <h3 class="section-title"><span class="section-icon">⬇️</span>下载设置</h3>
        <div class="form-group">
          <label>并发下载数</label>
          <div class="number-input-group">
            <input
              :value="config.concurrent_downloads"
              type="number"
              min="1"
              max="10"
              step="1"
              @input="updateField('concurrent_downloads', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="number-hint">{{ config.concurrent_downloads }} 个</span>
          </div>
          <span v-if="validationErrors.concurrent_downloads" class="field-error">{{ validationErrors.concurrent_downloads }}</span>
        </div>
        <div class="form-group">
          <label>下载源优先策略</label>
          <select
            :value="config.download_source_preference"
            class="source-select"
            @change="updateField('download_source_preference', ($event.target as HTMLSelectElement).value)"
          >
            <option value="server2">Server 2 直链（dl1.wn01.download）</option>
            <option value="worker_api">Worker API 临时链接（d1.wcdn.date）</option>
          </select>
          <span class="hint">推荐 Server 2，稳定且无需浏览器；Worker API 需非 headless 浏览器</span>
        </div>
        <div class="form-group">
          <label>下载重试次数</label>
          <div class="number-input-group">
            <input
              :value="config.retry_times"
              type="number"
              min="0"
              max="10"
              step="1"
              @input="updateField('retry_times', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="number-hint">{{ config.retry_times === 0 ? '不重试' : `${config.retry_times} 次` }}</span>
          </div>
          <span v-if="validationErrors.retry_times" class="field-error">{{ validationErrors.retry_times }}</span>
        </div>
        <div class="form-group">
          <label>重试间隔</label>
          <div class="number-input-group">
            <input
              :value="config.retry_interval"
              type="number"
              min="1"
              max="120"
              step="1"
              @input="updateField('retry_interval', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="number-hint">{{ config.retry_interval }} 秒</span>
          </div>
          <span v-if="validationErrors.retry_interval" class="field-error">{{ validationErrors.retry_interval }}</span>
        </div>
      </section>

      <!-- 外观设置 -->
      <section class="config-section">
        <h3 class="section-title"><span class="section-icon">🎨</span>外观设置</h3>
        <div class="form-group">
          <label>主题模式</label>
          <div class="segmented-control">
            <button
              class="segment-btn"
              :class="{ active: config.theme === 'auto' }"
              @click="updateField('theme', 'auto')"
            >
              🖥️ 跟随系统
            </button>
            <button
              class="segment-btn"
              :class="{ active: config.theme === 'dark' }"
              @click="updateField('theme', 'dark')"
            >
              🌙 暗色
            </button>
            <button
              class="segment-btn"
              :class="{ active: config.theme === 'light' }"
              @click="updateField('theme', 'light')"
            >
              ☀️ 亮色
            </button>
          </div>
        </div>
      </section>

      <!-- AI 设置 -->
      <section class="config-section">
        <h3 class="section-title"><span class="section-icon">🤖</span>AI 设置</h3>
        <div class="form-group">
          <label>AI API 地址</label>
          <input
            :value="config.ai_api_url"
            type="text"
            placeholder="https://coding.dashscope.aliyuncs.com/v1/chat/completions"
            @input="updateField('ai_api_url', ($event.target as HTMLInputElement).value)"
          />
          <span v-if="validationErrors.ai_api_url" class="field-error">{{ validationErrors.ai_api_url }}</span>
        </div>
        <div class="form-group">
          <label>AI API Key</label>
          <div class="password-input-row">
            <input
              :value="config.ai_api_key || ''"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="sk-..."
              @input="updateField('ai_api_key', ($event.target as HTMLInputElement).value)"
            />
            <button class="btn-toggle-visibility" @click="showApiKey = !showApiKey" type="button">
              {{ showApiKey ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>AI 模型</label>
          <input
            :value="config.ai_model"
            type="text"
            placeholder="qwen3.5-plus"
            @input="updateField('ai_model', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="form-group">
          <label>AI Prompt 模板</label>
          <textarea
            :value="config.ai_prompt"
            rows="8"
            class="prompt-textarea"
            placeholder="你是一个专业的漫画匹配助手..."
            @input="updateField('ai_prompt', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </div>
        <div class="form-group">
          <label>AI 温度参数</label>
          <div class="number-input-group">
            <input
              :value="config.ai_temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              @input="updateField('ai_temperature', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="number-hint">{{ config.ai_temperature === 0 ? '确定性输出（无推理）' : config.ai_temperature.toFixed(1) }}</span>
          </div>
          <span class="hint">0 = 确定性输出，2 = 高随机性</span>
          <span v-if="validationErrors.ai_temperature" class="field-error">{{ validationErrors.ai_temperature }}</span>
        </div>
        <div class="form-group">
          <label>匹配阈值</label>
          <div class="number-input-group">
            <input
              :value="config.match_threshold"
              type="number"
              step="0.05"
              min="0"
              max="1"
              @input="updateField('match_threshold', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="number-hint">{{ (config.match_threshold * 100).toFixed(0) }}%</span>
          </div>
          <span v-if="validationErrors.match_threshold" class="field-error">{{ validationErrors.match_threshold }}</span>
        </div>
      </section>

      <div class="form-actions">
        <button class="reset-btn" @click="handleReset">重置为默认配置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, inject } from 'vue';
import { useConfig } from '../composables/useConfig';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const { config, error, isDirty, isSaving, lastSavedAt, validationErrors, loadConfig, resetConfig, updateField, flushPendingSave } = useConfig();

const showApiKey = ref(false);
const playwrightInstalled = ref(false);
const isInstalling = ref(false);

// 全局通知
const notify = inject<{ success: (msg: string) => void; error: (msg: string, duration?: number, action?: { label: string; onClick: () => void }) => void; info: (msg: string) => void }>('notify');

const statusClass = computed(() => {
  if (isSaving.value) return 'saving';
  if (error.value) return 'error';
  return 'synced';
});

onMounted(async () => {
  await loadConfig();
  await checkPlaywrightInstallation();
});

onUnmounted(() => {
  flushPendingSave();
});

async function checkPlaywrightInstallation() {
  try {
    playwrightInstalled.value = await invoke('check_playwright_installed');
  } catch (e) {
    console.error('检查 Playwright 失败：', e);
    playwrightInstalled.value = false;
  }
}

async function installPlaywright() {
  if (isInstalling.value) return;
  
  isInstalling.value = true;
  notify?.info('正在安装 Chromium，请耐心等待...');
  
  try {
    // 监听安装进度
    const unlisten = await listen('playwright_install_progress', (event: any) => {
      const { message, status } = event.payload;
      console.log('[安装]', message);
    });
    
    await invoke('install_playwright');
    
    notify?.success('Chromium 安装成功！');
    await checkPlaywrightInstallation();
    
    unlisten();
  } catch (e: any) {
    console.error('安装 Playwright 失败：', e);
    notify?.error(`安装失败：${e.message || e}`);
  } finally {
    isInstalling.value = false;
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 5000) return '刚刚';
  if (diff < 60000) return `${Math.floor(diff / 1000)} 秒前`;
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

async function selectFolder() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择默认存储路径',
    });
    if (selected && typeof selected === 'string') {
      updateField('storage_path', selected);
      notify?.success(`保存路径已更新：${selected}`);
    }
  } catch (e: any) {
    notify?.error(`选择文件夹失败：${e.message || e}`);
  }
}

async function handleReset() {
  try {
    await resetConfig();
    showApiKey.value = false;
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

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.config-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.save-status.synced {
  color: var(--success);
}

.save-status.saving {
  color: var(--warning);
}

.save-status.error {
  color: var(--danger);
}

.saving-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--warning);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

h2 {
  color: var(--text-primary);
}

.config-form {
  background: var(--bg-card);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.config-section {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.config-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.section-icon {
  font-size: 18px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.form-group input[type='text'],
.form-group input[type='number'],
.form-group input[type='password'],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group textarea {
  font-family: monospace;
  resize: vertical;
}

.prompt-textarea {
  font-size: 13px;
  line-height: 1.5;
}

.number-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input-group input {
  flex: 0 0 120px;
}

.number-hint {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.path-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.path-input-row input {
  flex: 1;
}

.password-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.password-input-row input {
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

.btn-toggle-visibility {
  padding: 10px 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-toggle-visibility:hover {
  background: var(--border-color);
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--border-color);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.toggle-switch.active .toggle-knob {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.installed {
  background: #67c23a;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.5);
}

.status-dot.notInstalled {
  background: #f56c6c;
  box-shadow: 0 0 6px rgba(245, 108, 108, 0.5);
}

.status-text {
  font-size: 14px;
  color: var(--text-primary);
}

.btn-install {
  margin-top: 8px;
  padding: 8px 16px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.btn-install:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-install:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.source-select {
  cursor: pointer;
}

.segmented-control {
  display: flex;
  gap: 4px;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid var(--border-color);
}

.segment-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.segment-btn.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.segment-btn:hover:not(.active) {
  background: var(--border-color);
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.reset-btn {
  padding: 12px 32px;
  background: #909399;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.reset-btn:hover {
  opacity: 0.85;
}

.hint {
  display: block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.field-error {
  display: block;
  margin-top: 6px;
  color: var(--danger);
  font-size: 12px;
}
</style>
