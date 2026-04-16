/**
 * Web API 客户端
 * 通过 HTTP API 与后端通信
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

/**
 * Web API 客户端实现
 */
export class ApiClient implements ISearchClient, IDownloadClient, ICompareClient, IConfigClient {
  private baseUrl: string;
  private progressCallbacks: Array<(progress: DownloadProgress) => void> = [];
  private completedCallbacks: Array<(result: DownloadResult) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // ==================== 搜索接口 ====================

  async search(keyword: string, options?: any): Promise<Comic[]> {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '搜索失败');
    }

    return data.comics;
  }

  async getCacheList(): Promise<SearchCacheItem[]> {
    const response = await fetch(`${this.baseUrl}/api/cache/list`);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '获取缓存列表失败');
    }

    return data.files;
  }

  async deleteCache(keyword: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/cache/${encodeURIComponent(keyword)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '删除缓存失败');
    }
  }

  // ==================== 下载接口 ====================

  async download(comics: Comic[], options?: any): Promise<DownloadResult> {
    const response = await fetch(`${this.baseUrl}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comics,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '下载失败');
    }

    return data.result;
  }

  onProgress(callback: (progress: DownloadProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  onCompleted(callback: (result: DownloadResult) => void): void {
    this.completedCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  async cancel(aid: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/download/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aid }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  }

  // ==================== 对比接口 ====================

  async compare(keyword: string, localPath?: string, options?: any): Promise<CompareResult> {
    const response = await fetch(`${this.baseUrl}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        localPath,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '对比失败');
    }

    return data.result;
  }

  // ==================== 配置接口 ====================

  async getAll(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/config`);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '获取配置失败');
    }

    return data.config;
  }

  async get<T>(key: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/config/${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '获取配置失败');
    }

    return data.value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '设置配置失败');
    }
  }

  // ==================== 内部方法：触发事件 ====================

  protected emitProgress(progress: DownloadProgress): void {
    this.progressCallbacks.forEach(cb => cb(progress));
  }

  protected emitCompleted(result: DownloadResult): void {
    this.completedCallbacks.forEach(cb => cb(result));
  }

  protected emitError(error: Error): void {
    this.errorCallbacks.forEach(cb => cb(error));
  }
}
