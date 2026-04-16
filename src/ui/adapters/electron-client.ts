/**
 * Electron IPC 客户端
 * 通过 Electron IPC 与主进程通信
 */

import type { 
  ISearchClient, 
  IDownloadClient, 
  ICompareClient, 
  IConfigClient,
  Comic,
  SearchCacheItem,
  DownloadResult,
  DownloadProgress,
  CompareResult
} from './types';

// 声明 Electron API 类型
declare global {
  interface Window {
    electronAPI?: {
      searchComics: (keyword: string) => Promise<Comic[]>;
      getCacheList: () => Promise<SearchCacheItem[]>;
      deleteCache: (keyword: string) => Promise<void>;
      downloadComics: (comics: Comic[], storagePath: string) => Promise<DownloadResult>;
      cancelDownload: (aid: string) => Promise<void>;
      compareComics: (keyword: string, storagePath: string) => Promise<CompareResult>;
      getConfig: () => Promise<any>;
      setConfig: (key: string, value: any) => Promise<void>;
      onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
      onDownloadCompleted: (callback: (result: DownloadResult) => void) => void;
      onDownloadError: (callback: (error: Error) => void) => void;
    };
  }
}

/**
 * Electron IPC 客户端实现
 */
export class ElectronClient implements ISearchClient, IDownloadClient, ICompareClient, IConfigClient {
  
  // ==================== 搜索接口 ====================

  async search(keyword: string, options?: any): Promise<Comic[]> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    return window.electronAPI.searchComics(keyword);
  }

  async getCacheList(): Promise<SearchCacheItem[]> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    return window.electronAPI.getCacheList();
  }

  async deleteCache(keyword: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    return window.electronAPI.deleteCache(keyword);
  }

  // ==================== 下载接口 ====================

  async download(comics: Comic[], options?: any): Promise<DownloadResult> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    const storagePath = options?.storagePath || '';
    return window.electronAPI.downloadComics(comics, storagePath);
  }

  onProgress(callback: (progress: DownloadProgress) => void): void {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    window.electronAPI.onDownloadProgress(callback);
  }

  onCompleted(callback: (result: DownloadResult) => void): void {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    window.electronAPI.onDownloadCompleted(callback);
  }

  onError(callback: (error: Error) => void): void {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    window.electronAPI.onDownloadError(callback);
  }

  async cancel(aid: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    return window.electronAPI.cancelDownload(aid);
  }

  // ==================== 对比接口 ====================

  async compare(keyword: string, localPath?: string, options?: any): Promise<CompareResult> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    const storagePath = localPath || '';
    return window.electronAPI.compareComics(keyword, storagePath);
  }

  // ==================== 配置接口 ====================

  async getAll(): Promise<any> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    return window.electronAPI.getConfig();
  }

  async get<T>(key: string): Promise<T> {
    const config = await this.getAll();
    return config[key] as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API 不可用');
    }
    return window.electronAPI.setConfig(key, value);
  }
}
