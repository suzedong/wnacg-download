// 下载组合式函数

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface DownloadTask {
  aid: string;
  title: string;
  url: string;
  cover_url: string;
  save_path: string;
  pages: number;
}

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
    }
  ) {
    isDownloading.value = true;
    error.value = '';
    progress.value = 0;

    try {
      // 监听下载进度
      const unlistenProgress = await listen('download_progress', (event: any) => {
        const { progress: p, speed: s } = event.payload;
        progress.value = p;
        speed.value = s;
      });

      // 监听下载完成
      const unlistenComplete = await listen('download_complete', (event: any) => {
        console.log('下载完成：', event.payload);
      });

      // 调用 Tauri Command
      const downloadResult = await invoke('start_download', {
        tasks,
        concurrent: config.concurrent,
        retryTimes: config.retry_times,
        retryInterval: config.retry_interval,
        proxy: config.proxy,
        proxyEnabled: config.proxy_enabled,
      });

      result.value = downloadResult;

      await unlistenProgress();
      await unlistenComplete();
    } catch (e: any) {
      error.value = e.message || '下载失败';
      console.error('下载失败：', e);
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
