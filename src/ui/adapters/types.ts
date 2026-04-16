/**
 * 适配器层类型定义
 * 定义 Web 和 Electron 共享的接口
 */

import type { Comic, SearchOptions, DownloadOptions, DownloadResult, CompareResult } from '../../types';

/**
 * 搜索客户端接口
 */
export interface ISearchClient {
  /**
   * 搜索漫画
   * @param keyword 关键字
   * @param options 搜索选项
   */
  search(keyword: string, options?: Partial<SearchOptions>): Promise<Comic[]>;
  
  /**
   * 获取缓存列表
   */
  getCacheList(): Promise<SearchCacheItem[]>;
  
  /**
   * 删除缓存
   * @param keyword 关键字
   */
  deleteCache(keyword: string): Promise<void>;
}

/**
 * 搜索缓存项
 */
export interface SearchCacheItem {
  keyword: string;
  searchTime: string;
  comicCount: number;
  fileSize: number;
}

/**
 * 下载客户端接口
 */
export interface IDownloadClient {
  /**
   * 下载漫画
   * @param comics 漫画列表
   * @param options 下载选项
   */
  download(comics: Comic[], options?: Partial<DownloadOptions>): Promise<DownloadResult>;
  
  /**
   * 监听下载进度
   * @param callback 进度回调
   */
  onProgress(callback: (progress: DownloadProgress) => void): void;
  
  /**
   * 监听下载完成
   * @param callback 完成回调
   */
  onCompleted(callback: (result: DownloadResult) => void): void;
  
  /**
   * 监听下载错误
   * @param callback 错误回调
   */
  onError(callback: (error: Error) => void): void;
  
  /**
   * 取消下载
   * @param aid 漫画 ID
   */
  cancel(aid: string): Promise<void>;
}

/**
 * 下载进度
 */
export interface DownloadProgress {
  aid: string;
  downloaded: number;
  total: number;
  speed?: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

/**
 * 对比客户端接口
 */
export interface ICompareClient {
  /**
   * 对比漫画
   * @param keyword 搜索关键字
   * @param localPath 本地路径
   * @param options 对比选项
   */
  compare(keyword: string, localPath?: string, options?: any): Promise<CompareResult>;
}

/**
 * 配置客户端接口
 */
export interface IConfigClient {
  /**
   * 获取所有配置
   */
  getAll(): Promise<any>;
  
  /**
   * 获取配置项
   * @param key 配置键
   */
  get<T>(key: string): Promise<T>;
  
  /**
   * 设置配置项
   * @param key 配置键
   * @param value 配置值
   */
  set<T>(key: string, value: T): Promise<void>;
}

/**
 * 通用客户端接口（所有客户端的集合）
 */
export interface IApiClient extends ISearchClient, IDownloadClient, ICompareClient, IConfigClient {}
