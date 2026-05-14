// 下载组合式函数

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { DownloadTask } from '../types';

export function useDownload() {
  const isDownloading = ref(false);
  const progress = ref(0);
  const speed = ref(0);
  const error = ref('');
  const result = ref<any>(null);

  async function startDownload(
    tasks: DownloadTask[],
    config: {
      concurrent: number;
      retry_times: number;
      retry_interval: number;
      proxy: string | null;
      proxy_enabled: boolean;
      storage_path: string;
    }
  ) {
    isDownloading.value = true;
    error.value = '';
    progress.value = 0;

    try {
      // 监听下载进度
      const unlistenProgress = await listen(
        'download_progress',
        (event: any) => {
          const { progress: p, speed: s } = event.payload;
          progress.value = p;
          speed.value = s;
        }
      );

      // 监听下载完成
      const unlistenComplete = await listen(
        'download_complete',
        (event: any) => {
          console.log('下载完成：', event.payload);
        }
      );

      // 调用 Tauri Command
      const downloadResult = await invoke('start_download', {
        tasks,
        options: {
          concurrent: config.concurrent,
          retry_times: config.retry_times,
          retry_interval: config.retry_interval,
          proxy: config.proxy,
          proxy_enabled: config.proxy_enabled,
          storage_path: config.storage_path,
        },
      });

      result.value = downloadResult;

      await unlistenProgress();
      await unlistenComplete();
    } catch (e: any) {
      // Tauri 错误可能是字符串或对象
      let errorMsg = '下载失败';
      if (typeof e === 'string') {
        errorMsg = e;
      } else if (e?.message) {
        errorMsg = e.message;
      } else if (e) {
        errorMsg = JSON.stringify(e);
      }
      error.value = errorMsg;
      console.error('下载失败：', errorMsg);
    } finally {
      isDownloading.value = false;
    }
  }

  return {
    isDownloading,
    progress,
    speed,
    error,
    result,
    startDownload,
  };
}
