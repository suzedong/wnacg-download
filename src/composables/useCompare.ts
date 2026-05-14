// 对比组合式函数

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function useCompare() {
  const isComparing = ref(false);
  const result = ref<any>(null);
  const error = ref('');
  const aiLog = ref<string[]>([]);
  const aiStreamingContent = ref('');

  let unlistenAiProgress: (() => void) | null = null;

  async function compare(searchFile: string, localPath: string) {
    isComparing.value = true;
    error.value = '';
    aiLog.value = [];
    aiStreamingContent.value = '';

    try {
      // 监听 AI 流式进度
      unlistenAiProgress = await listen('ai_progress', (event: any) => {
        const { message, received_bytes: _bytes, streaming_content } = event.payload;

        // 添加日志消息
        if (message) {
          aiLog.value.push(message);
        }

        // 累积流式内容（用于显示 AI 生成的实时文字）
        if (streaming_content) {
          aiStreamingContent.value += streaming_content;
        }

        console.log('AI 进度:', message, '内容:', streaming_content || '');
      });

      // 调用 Tauri Command
      const compareResult = await invoke('compare_comics', {
        searchFile,
        localPath,
      });

      result.value = compareResult;
    } catch (e: any) {
      // Tauri 返回的错误可能是字符串或对象
      if (typeof e === 'string') {
        error.value = e;
      } else if (e && e.message) {
        error.value = e.message;
      } else {
        error.value = String(e);
      }
      console.error('对比失败：', e);
    } finally {
      isComparing.value = false;
    }
  }

  function cleanup() {
    if (unlistenAiProgress) {
      unlistenAiProgress();
      unlistenAiProgress = null;
    }
    isComparing.value = false;
    aiLog.value = [];
    aiStreamingContent.value = '';
    result.value = null;
    error.value = '';
  }

  return {
    isComparing,
    aiLog,
    aiStreamingContent,
    result,
    error,
    compare,
    cleanup,
  };
}
