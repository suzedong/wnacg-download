// 全局下载队列管理组合式函数

import { ref } from 'vue';
import { DownloadTask } from '../types/index';

// 全局状态（所有组件共享）
const downloadQueue = ref<DownloadTask[]>([]);

export function useDownloadQueue() {
  function addToQueue(tasks: DownloadTask | DownloadTask[]) {
    const taskArray = Array.isArray(tasks) ? tasks : [tasks];
    // 避免重复添加
    const existingIds = new Set(downloadQueue.value.map((t) => t.aid));
    const newTasks = taskArray.filter((t) => !existingIds.has(t.aid));
    downloadQueue.value.push(...newTasks);
    return newTasks.length;
  }

  function removeFromQueue(aid: string) {
    const index = downloadQueue.value.findIndex((t) => t.aid === aid);
    if (index !== -1) {
      downloadQueue.value.splice(index, 1);
    }
  }

  function clearQueue() {
    downloadQueue.value = [];
  }

  function getQueue() {
    return downloadQueue;
  }

  function getQueueLength() {
    return downloadQueue.value.length;
  }

  return {
    downloadQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    getQueue,
    getQueueLength,
  };
}
