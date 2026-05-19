// 配置组合式函数

import { ref, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AppConfig } from '../types';

const DEBOUNCE_DELAY = 800;
const AI_PROMPT_DEBOUNCE_DELAY = 1500;

export function useConfig() {
  const config = ref<AppConfig | null>(null);
  const error = ref('');
  const isDirty = ref(false);
  const isSaving = ref(false);
  const lastSavedAt = ref<Date | null>(null);
  const validationErrors = ref<Record<string, string>>({});

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function validateField(key: string, value: unknown): string | null {
    switch (key) {
      case 'storage_path':
        return !value || (value as string).trim() === '' ? '存储路径不能为空' : null;
      case 'proxy':
        if (config.value?.proxy_enabled && value && !(value as string).match(/^(http|https|socks5):\/\//)) {
          return '代理地址格式不正确，需以 http://、https:// 或 socks5:// 开头';
        }
        return null;
      case 'ai_api_url':
        if (value && !(value as string).startsWith('http')) {
          return 'AI API 地址需以 http:// 或 https:// 开头';
        }
        return null;
      case 'max_pages': {
        const v = value as number;
        if (v < 0 || v > 100) return '范围：0-100（0 = 不限制）';
        return null;
      }
      case 'request_interval': {
        const v = value as number;
        if (v < 100 || v > 10000) return '范围：100-10000 毫秒';
        return null;
      }
      case 'concurrent_downloads': {
        const v = value as number;
        if (v < 1 || v > 10) return '范围：1-10';
        return null;
      }
      case 'retry_times': {
        const v = value as number;
        if (v < 0 || v > 10) return '范围：0-10';
        return null;
      }
      case 'retry_interval': {
        const v = value as number;
        if (v < 1 || v > 120) return '范围：1-120 秒';
        return null;
      }
      case 'ai_temperature': {
        const v = value as number;
        if (v < 0 || v > 2) return '范围：0-2';
        return null;
      }
      case 'match_threshold': {
        const v = value as number;
        if (v < 0 || v > 1) return '范围：0-1';
        return null;
      }
      default:
        return null;
    }
  }

  function performSave() {
    if (isSaving.value || !config.value) return;
    isSaving.value = true;
    invoke('save_config', { config: config.value })
      .then(() => {
        isDirty.value = false;
        lastSavedAt.value = new Date();
        error.value = '';
      })
      .catch((e: any) => {
        error.value = e.message || '保存配置失败';
        console.error('保存配置失败：', e);
      })
      .finally(() => {
        isSaving.value = false;
      });
  }

  function scheduleAutoSave(fieldKey?: string) {
    if (!config.value) return;
    isDirty.value = true;

    if (debounceTimer) clearTimeout(debounceTimer);

    const delay = fieldKey === 'ai_prompt' ? AI_PROMPT_DEBOUNCE_DELAY : DEBOUNCE_DELAY;
    debounceTimer = setTimeout(() => {
      if (Object.keys(validationErrors.value).length === 0) {
        performSave();
      }
    }, delay);
  }

  function updateField<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    if (!config.value) return;
    (config.value as Record<string, unknown>)[key] = value;

    const err = validateField(key as string, value);
    if (err) {
      validationErrors.value[key as string] = err;
    } else {
      delete validationErrors.value[key as string];
    }

    scheduleAutoSave(key as string);
  }

  function flushPendingSave() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (isDirty.value && Object.keys(validationErrors.value).length === 0) {
      performSave();
    }
  }

  async function loadConfig() {
    try {
      const result = await invoke('get_config');
      config.value = result as AppConfig;
    } catch (e: any) {
      error.value = e.message || '加载配置失败';
      console.error('加载配置失败：', e);
    }
  }

  async function saveConfig(newConfig: AppConfig) {
    try {
      await invoke('save_config', { config: newConfig });
      config.value = newConfig;
    } catch (e: any) {
      error.value = e.message || '保存配置失败';
      console.error('保存配置失败：', e);
    }
  }

  async function resetConfig() {
    try {
      const result = await invoke('reset_config');
      config.value = result as AppConfig;
      validationErrors.value = {};
      scheduleAutoSave();
    } catch (e: any) {
      error.value = e.message || '重置配置失败';
      console.error('重置配置失败：', e);
    }
  }

  onUnmounted(() => {
    flushPendingSave();
  });

  return {
    config,
    error,
    isDirty,
    isSaving,
    lastSavedAt,
    validationErrors,
    loadConfig,
    saveConfig,
    resetConfig,
    updateField,
    flushPendingSave,
  };
}
