/**
 * 适配器层入口
 * 根据运行环境自动选择适配器
 */

import { WebSearchClient, WebCompareClient, WebDownloadClient, WebConfigClient } from './api-client.js';
import type {
  ISearchClient,
  ICompareClient,
  IDownloadClient,
  IConfigClient,
} from './types.js';

/**
 * 检测是否在 Tauri 环境中
 */
function isTauriEnvironment(): boolean {
  // @ts-ignore - window 在浏览器环境中存在
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Tauri 搜索客户端（使用全局 window.__TAURI__）
 */
class TauriSearchClient implements ISearchClient {
  private invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    // @ts-ignore - window.__TAURI__ 在 Tauri 环境中存在
    return window.__TAURI__.core.invoke(cmd, args);
  }

  async search(keyword: string, options?: any): Promise<any[]> {
    return this.invoke('search_comics', {
      keyword,
      options: {
        maxPages: options?.maxPages,
        onlyChinese: options?.onlyChinese,
        force: options?.force,
      },
    });
  }

  async getCachedComics(keyword: string): Promise<any[]> {
    return this.invoke('get_cached_comics', { keyword });
  }

  async getSearchList(): Promise<any[]> {
    return this.invoke('get_cache_list');
  }

  async deleteSearch(keyword: string): Promise<void> {
    return this.invoke('delete_cache', { keyword });
  }
}

/**
 * Tauri 对比客户端
 */
class TauriCompareClient implements ICompareClient {
  private invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    // @ts-ignore - window.__TAURI__ 在 Tauri 环境中存在
    return window.__TAURI__.core.invoke(cmd, args);
  }

  async compare(keyword: string, localPath: string): Promise<any> {
    return this.invoke('compare_comics', { keyword, localPath });
  }
}

/**
 * Tauri 下载客户端
 */
class TauriDownloadClient implements IDownloadClient {
  private invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    // @ts-ignore - window.__TAURI__ 在 Tauri 环境中存在
    return window.__TAURI__.core.invoke(cmd, args);
  }

  async download(comics: any[], storagePath: string): Promise<any> {
    return this.invoke('download_comics', { comics, storagePath });
  }

  async cancel(aid: string): Promise<void> {
    return this.invoke('cancel_download', { aid });
  }

  // @ts-ignore - callback 将在后续实现中使用
  onProgress(_callback: (progress: any) => void): void {
    // 将在后续实现
  }
}

/**
 * Tauri 配置客户端
 */
class TauriConfigClient implements IConfigClient {
  private invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    // @ts-ignore - window.__TAURI__ 在 Tauri 环境中存在
    return window.__TAURI__.core.invoke(cmd, args);
  }

  async getAll(): Promise<any> {
    return this.invoke('get_config');
  }

  async get<T>(key: string): Promise<T> {
    const config = await this.invoke<any>('get_config');
    return config[key];
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.invoke('set_config', { key, value });
  }
}

/**
 * 创建客户端实例
 * 根据运行环境自动选择 Web 或 Tauri 适配器
 */
export function createClient() {
  if (isTauriEnvironment()) {
    return {
      search: new TauriSearchClient(),
      compare: new TauriCompareClient(),
      download: new TauriDownloadClient(),
      config: new TauriConfigClient(),
    };
  } else {
    return {
      search: new WebSearchClient(),
      compare: new WebCompareClient(),
      download: new WebDownloadClient(),
      config: new WebConfigClient(),
    };
  }
}

// 导出类型
export type {
  ISearchClient,
  ICompareClient,
  IDownloadClient,
  IConfigClient,
  SearchOptions,
  SearchResultMetadata,
  DownloadResult,
} from './types.js';
