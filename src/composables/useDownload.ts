// 下载组合式函数

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { DownloadTask } from '../types';

export function useDownload() {
  const isDownloading = ref(false);
  const isPaused = ref(false);
  const progress = ref(0);
  const speed = ref(0);
  const error = ref('');
  const result = ref<any>(null);
  const sessionId = ref<string>('');
  // 每个任务的实时进度（aid -> 进度百分比）
  const taskProgress = ref<Record<string, number>>({});

  async function startDownload(
    tasks: DownloadTask[],
    config: {
      concurrent: number;
      retry_times: number;
      retry_interval: number;
      proxy: string | null;
      proxy_enabled: boolean;
      storage_path: string;
      download_source_preference?: string;
    }
  ) {
    isDownloading.value = true;
    isPaused.value = false;
    error.value = '';
    progress.value = 0;
    result.value = null;
    taskProgress.value = {};

    // 先注册事件监听（在启动下载前），防止快速下载事件丢失
    console.log('👂 正在注册事件监听器...');
    const unlistenProgress = await listen(
      'download_progress',
      (event: any) => {
        const { task_id, progress: p, speed: s } = event.payload;
        progress.value = p;
        speed.value = s;
        if (task_id) {
          taskProgress.value[task_id] = Math.round(p * 100) / 100;
        }
      }
    );

    const unlistenComplete = await listen(
      'download_complete',
      (event: any) => {
        console.log('🔔 收到 download_complete 事件：', JSON.stringify(event.payload));
        result.value = event.payload;
        isDownloading.value = false;
        isPaused.value = false;
        unlistenProgress();
        unlistenComplete();
        unlistenError();
      }
    );

    // 注意：unlistenError 必须在声明后才能被 unlistenComplete 引用
    let unlistenError: () => void = () => {};
    unlistenError = await listen(
      'download_error',
      (event: any) => {
        console.log('🔔 收到 download_error 事件：', JSON.stringify(event.payload));
        error.value = event.payload || '下载失败';
        isDownloading.value = false;
        isPaused.value = false;
        unlistenProgress();
        unlistenComplete();
        unlistenError();
      }
    );
    console.log('✅ 事件监听器已注册');

    try {
      // 启动下载（立即返回 session_id）
      console.log('🚀 调用 start_download invoke...');
      sessionId.value = await invoke('start_download', {
        tasks,
        options: {
          concurrent: config.concurrent,
          retry_times: config.retry_times,
          retry_interval: config.retry_interval,
          proxy: config.proxy,
          proxy_enabled: config.proxy_enabled,
          storage_path: config.storage_path,
          download_source_preference: config.download_source_preference || null,
        },
      });

      console.log('下载会话已创建：', sessionId.value);
    } catch (e: any) {
      let errorMsg = '下载失败';
      if (typeof e === 'string') {
        errorMsg = e;
      } else if (e?.message) {
        errorMsg = e.message;
      } else if (e) {
        errorMsg = JSON.stringify(e);
      }
      error.value = errorMsg;
      isDownloading.value = false;
      unlistenProgress();
      unlistenComplete();
      unlistenError();
      console.error('下载失败：', errorMsg);
    }
  }

  async function pauseDownload() {
    if (!sessionId.value) return;
    try {
      await invoke('pause_download', { sessionId: sessionId.value });
      isPaused.value = true;
      console.log('已暂停下载');
    } catch (e: any) {
      console.error('暂停失败：', e);
    }
  }

  async function resumeDownload() {
    if (!sessionId.value) return;
    try {
      await invoke('resume_download', { sessionId: sessionId.value });
      isPaused.value = false;
      console.log('已恢复下载');
    } catch (e: any) {
      console.error('恢复失败：', e);
    }
  }

  async function cancelTask(aid: string) {
    if (!sessionId.value) return;
    try {
      await invoke('cancel_task', { sessionId: sessionId.value, aid });
      console.log('已取消任务：', aid);
    } catch (e: any) {
      console.error('取消失败：', e);
    }
  }

  function resetDownload() {
    sessionId.value = '';
    isDownloading.value = false;
    isPaused.value = false;
    progress.value = 0;
    speed.value = 0;
    result.value = null;
    error.value = '';
    taskProgress.value = {};
  }

  return {
    isDownloading,
    isPaused,
    progress,
    speed,
    error,
    result,
    sessionId,
    taskProgress,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelTask,
    resetDownload,
  };
}
