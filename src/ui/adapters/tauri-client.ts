/**
 * Tauri IPC 客户端
 * 通过 Tauri Commands 与 Rust 后端通信
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { 
  IApiClient, 
  ISearchClient, 
  IDownloadClient, 
  ICompareClient, 
  IConfigClient,
  SearchCacheItem,
  DownloadProgress 
} from './types';
import type { Comic, SearchOptions, DownloadOptions, DownloadResult, CompareResult } from '../../types';

/**
 * Tauri IPC 客户端实现
 */
export class TauriClient implements IApiClient, ISearchClient, IDownloadClient, ICompareClient, IConfigClient {
  
  // ==================== 搜索 ====================
  
  async search(keyword: string, options?: Partial<SearchOptions>): Promise<Comic[]> {
    const comics = await invoke<any[]>('search_comics', { keyword });
    return comics.map(this.mapComicData);
  }
  
  async getCacheList(): Promise<SearchCacheItem[]> {
    return await invoke<any[]>('get_cache_list');
  }
  
  async deleteCache(keyword: string): Promise<void> {
    await invoke('delete_cache', { keyword });
  }
  
  // ==================== 对比 ====================
  
  async compare(keyword: string, localPath?: string, options?: any): Promise<CompareResult> {
    const result = await invoke<any>('compare_comics', { 
      keyword, 
      localPath 
    });
    return this.mapCompareResult(result);
  }
  
  // ==================== 下载 ====================
  
  async download(comics: Comic[], options?: Partial<DownloadOptions>): Promise<DownloadResult> {
    const result = await invoke<any>('download_comics', {
      comics: comics.map(c => ({
        aid: c.aid,
        title: c.title,
        coverUrl: c.coverUrl,
        category: c.category,
      })),
      storagePath: options?.storagePath,
    });
    return this.mapDownloadResult(result);
  }
  
  async cancel(aid: string): Promise<void> {
    await invoke('cancel_download', { aid });
  }
  
  onProgress(callback: (progress: DownloadProgress) => void): void {
    listen<DownloadProgress>('download-progress', (event) => {
      callback(event.payload);
    });
  }
  
  onCompleted(callback: (result: DownloadResult) => void): void {
    listen<DownloadResult>('download-completed', (event) => {
      callback(this.mapDownloadResult(event.payload));
    });
  }
  
  onError(callback: (error: Error) => void): void {
    listen<string>('download-error', (event) => {
      callback(new Error(event.payload));
    });
  }
  
  // ==================== 配置 ====================
  
  async getAll(): Promise<any> {
    return await invoke<any>('get_config');
  }
  
  async get<T>(key: string): Promise<T> {
    const config = await invoke<any>('get_config');
    return config[key];
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    await invoke('set_config', { key, value });
  }
  
  // ==================== 辅助方法 ====================
  
  private mapComicData(data: any): Comic {
    return {
      aid: data.aid,
      title: data.title,
      coverUrl: data.coverUrl,
      category: data.category,
      author: data.author,
    };
  }
  
  private mapCompareResult(data: any): CompareResult {
    return {
      searchComic: data.searchComic,
      localComic: data.localComic,
      matchScore: data.matchScore,
      status: data.status,
    };
  }
  
  private mapDownloadResult(data: any): DownloadResult {
    return {
      success: data.success,
      comic: this.mapComicData(data.comic),
      savedPath: data.savedPath,
      pages: data.pages,
      downloadedPages: data.downloadedPages,
    };
  }
}
