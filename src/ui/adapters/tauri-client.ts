/**
 * Tauri IPC 客户端
 * 通过 Tauri Commands 与后端通信
 * 
 * 注意：这是简化实现，完整的 Tauri 客户端需要 Tauri 环境支持
 */

import type {
  ISearchClient,
  ICompareClient,
  IDownloadClient,
  IConfigClient,
  SearchOptions,
  SearchResultMetadata,
  DownloadResult,
} from './types.js';
import type { Comic, CompareResult, DownloadProgress, Config } from '../../types/index.js';

/**
 * Tauri 搜索客户端（占位实现）
 */
export class TauriSearchClient implements ISearchClient {
  async search(keyword: string, options?: SearchOptions): Promise<Comic[]> {
    // TODO: 使用 Tauri invoke 调用 Rust 命令
    // const result = await invoke('search_comics', { keyword, ...options });
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }

  async getSearchList(): Promise<SearchResultMetadata[]> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }

  async deleteSearch(keyword: string): Promise<void> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }
}

/**
 * Tauri 对比客户端（占位实现）
 */
export class TauriCompareClient implements ICompareClient {
  async compare(keyword: string, localPath: string): Promise<CompareResult> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }
}

/**
 * Tauri 下载客户端（占位实现）
 */
export class TauriDownloadClient implements IDownloadClient {
  async download(comics: Comic[], storagePath: string): Promise<DownloadResult> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }

  async cancel(aid: string): Promise<void> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }

  onProgress(callback: (progress: DownloadProgress) => void): void {
    // TODO: 使用 Tauri 事件监听
    console.log('Tauri 下载进度监听（占位实现）');
  }
}

/**
 * Tauri 配置客户端（占位实现）
 */
export class TauriConfigClient implements IConfigClient {
  async getAll(): Promise<Config> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }

  async get<T>(key: string): Promise<T> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }

  async set<T>(key: string, value: T): Promise<void> {
    throw new Error('Tauri 客户端需要在 Tauri 环境中运行');
  }
}
