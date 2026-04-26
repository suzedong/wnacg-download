// 搜索组合式函数

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface Comic {
  aid: string;
  title: string;
  author: string;
  category: string;
  cover_url: string;
  url: string;
  pages: number;
  tags: string[];
  upload_date: string;
}

export interface SearchOptions {
  max_pages: number;
  request_interval: number;
  search_chinese_only: boolean;
  proxy: string | null;
  proxy_enabled: boolean;
}

export function useSearch() {
  const results = ref<Comic[]>([]);
  const isSearching = ref(false);
  const progress = ref(0);
  const total = ref(0);
  const error = ref('');

  async function search(keyword: string, options: SearchOptions) {
    isSearching.value = true;
    error.value = '';
    progress.value = 0;

    try {
      // 监听搜索进度
      const unlisten = await listen('search_progress', (event: any) => {
        const { current, total: totalPages } = event.payload;
        progress.value = current;
        total.value = totalPages;
      });

      // 调用 Tauri Command
      const result = await invoke('search_comics', {
        keyword,
        options,
      });

      // 解析结果
      if (result && typeof result === 'object' && 'comics' in result) {
        results.value = (result as any).comics;
      }

      await unlisten();
    } catch (e: any) {
      error.value = e.message || '搜索失败';
      console.error('搜索失败：', e);
    } finally {
      isSearching.value = false;
    }
  }

  return {
    results,
    isSearching,
    progress,
    total,
    error,
    search,
  };
}
