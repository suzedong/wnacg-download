/**
 * 适配器层类型定义
 * 为 Web 和 Tauri 提供统一的客户端接口
 */

import type { Comic, CompareResult, DownloadProgress, Config } from '../../types/index.js';

/**
 * 搜索客户端接口
 */
export interface ISearchClient {
  /**
   * 搜索漫画
   * @param keyword 关键字
   * @param options 搜索选项
   */
  search(keyword: string, options?: SearchOptions): Promise<Comic[]>;
  
  /**
   * 获取缓存的漫画
   * @param keyword 关键字
   */
  getCachedComics(keyword: string): Promise<Comic[]>;
  
  /**
   * 获取搜索结果列表
   */
  getSearchList(): Promise<SearchResultMetadata[]>;
  
  /**
   * 删除搜索结果
   */
  deleteSearch(keyword: string): Promise<void>;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  maxPages?: number;
  onlyChinese?: boolean;
  force?: boolean;
}

/**
 * 搜索结果元数据
 */
export interface SearchResultMetadata {
  keyword: string;
  searchTime: string;
  totalComics: number;
  fileSize: number;
}

/**
 * 对比客户端接口
 */
export interface ICompareClient {
  /**
   * 对比漫画
   * @param keyword 搜索关键字
   * @param localPath 本地路径
   */
  compare(keyword: string, localPath: string): Promise<CompareResult>;
}

/**
 * 下载客户端接口
 */
export interface IDownloadClient {
  /**
   * 下载漫画
   * @param comics 漫画列表
   * @param storagePath 存储路径
   */
  download(comics: Comic[], storagePath: string): Promise<DownloadResult>;
  
  /**
   * 取消下载
   * @param aid 漫画 ID
   */
  cancel(aid: string): Promise<void>;
  
  /**
   * 监听下载进度
   * @param callback 进度回调
   */
  onProgress(callback: (progress: DownloadProgress) => void): void;
}

/**
 * 下载结果
 */
export interface DownloadResult {
  success: boolean;
  downloaded: string[];
  failed: string[];
}

/**
 * 配置客户端接口
 */
export interface IConfigClient {
  /**
   * 获取所有配置
   */
  getAll(): Promise<Config>;
  
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
 * 客户端类型
 */
export type ClientType = 'web' | 'tauri';

/**
 * 客户端工厂接口
 */
export interface IClientFactory {
  search: ISearchClient;
  compare: ICompareClient;
  download: IDownloadClient;
  config: IConfigClient;
}
