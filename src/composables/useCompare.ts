// 对比组合式函数

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function useCompare() {
  const isComparing = ref(false);
  const progress = ref(0);
  const total = ref(0);
  const result = ref<any>(null);
  const error = ref('');

  async function compare(searchFile: string, localPath: string) {
    isComparing.value = true;
    error.value = '';
    progress.value = 0;

    try {
      // 监听对比进度
      const unlisten = await listen('compare_progress', (event: any) => {
        const { current, total: t } = event.payload;
        progress.value = current;
        total.value = t;
      });

      // 调用 Tauri Command
      const compareResult = await invoke('compare_comics', {
        searchFile,
        localPath,
      });

      result.value = compareResult;

      await unlisten();
    } catch (e: any) {
      error.value = e.message || '对比失败';
      console.error('对比失败：', e);
    } finally {
      isComparing.value = false;
    }
  }

  return {
    isComparing,
    progress,
    total,
    result,
    error,
    compare,
  };
}
