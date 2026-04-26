// 配置组合式函数

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AppConfig } from '../types';

export function useConfig() {
  const config = ref<AppConfig | null>(null);
  const error = ref('');

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
    } catch (e: any) {
      error.value = e.message || '重置配置失败';
      console.error('重置配置失败：', e);
    }
  }

  return {
    config,
    error,
    loadConfig,
    saveConfig,
    resetConfig,
  };
}
