/**
 * 核心业务模块接口定义
 * 为 CLI、Web、Electron 提供统一的调用接口
 */

import type { Comic, SearchOptions, DownloadOptions, DownloadProgress, DownloadResult, CompareOptions, CompareResult } from '../types/index.js';

/**
 * 搜索服务接口
 */
export interface ISearchService {
  /**
   * 搜索漫画
   * @param options 搜索选项
   * @returns 漫画列表
   */
  search(options: SearchOptions): Promise<Comic[]>;
  
  /**
   * 获取漫画详情
   * @param aid 漫画 ID
   * @returns 漫画详情
   */
  getComicDetails(aid: string): Promise<Comic | null>;
  
  /**
   * 关闭爬虫资源
   */
  close(): Promise<void>;
}

/**
 * 下载进度事件数据
 */
export interface DownloadProgressEvent {
  aid: string;
  total: number;
  downloaded: number;
  speed: number;
  status: 'pending' | 'fetching' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

/**
 * 下载完成事件数据
 */
export interface DownloadCompletedEvent {
  aid: string;
  savedPath: string;
  pages: number;
  downloadedPages: number;
}

/**
 * 下载错误事件数据
 */
export interface DownloadErrorEvent {
  aid: string;
  error: Error;
}

/**
 * 下载服务事件类型
 */
export type DownloadEventType = 
  | 'start'       // 开始下载
  | 'progress'    // 下载进度
  | 'completed'   // 下载完成
  | 'error'       // 下载错误
  | 'cancelled'   // 下载取消
  | 'retry'       // 重试下载
  ;

/**
 * 下载服务事件处理器
 */
export interface DownloadEventHandlers {
  start: (data: { total: number }) => void;
  progress: (data: DownloadProgressEvent) => void;
  completed: (data: DownloadCompletedEvent) => void;
  error: (data: DownloadErrorEvent) => void;
  cancelled: (data: { aid: string }) => void;
  retry: (data: { aid: string; attempt: number }) => void;
}

/**
 * 下载服务接口
 */
export interface IDownloadService {
  /**
   * 批量下载漫画
   * @param comics 漫画列表
   * @returns 下载结果
   */
  downloadComics(comics: Comic[]): Promise<{ success: string[]; failed: string[] }>;
  
  /**
   * 注册进度监听器
   * @param aid 漫画 ID
   * @param callback 进度回调
   */
  onProgress(aid: string, callback: (progress: DownloadProgress) => void): void;
  
  /**
   * 注册事件监听器
   * @param event 事件类型
   * @param handler 事件处理器
   */
  on<K extends DownloadEventType>(event: K, handler: DownloadEventHandlers[K]): void;
  
  /**
   * 取消下载
   * @param aid 漫画 ID
   */
  cancel(aid: string): Promise<void>;
}

/**
 * 扫描服务接口
 */
export interface IScannerService {
  /**
   * 扫描本地漫画目录
   * @param dirPath 目录路径
   * @returns 本地漫画列表
   */
  scanDirectory(dirPath: string): Promise<LocalComic[]>;
  
  /**
   * 计算目录大小
   * @param dirPath 目录路径
   * @returns 目录大小（字节）
   */
  getDirectorySize(dirPath: string): Promise<number>;
}

/**
 * 对比服务接口
 */
export interface ICompareService {
  /**
   * 对比网站和本地漫画
   * @param websiteComics 网站漫画列表
   * @param localComics 本地漫画列表
   * @returns 对比结果
   */
  compare(websiteComics: Comic[], localComics: LocalComic[]): Promise<CompareResult>;
}

/**
 * AI 匹配服务接口
 */
export interface IAIMatcherService {
  /**
   * 初始化 AI 匹配器
   */
  initialize(): Promise<void>;
  
  /**
   * 匹配两个漫画名称
   * @param title1 标题 1
   * @param title2 标题 2
   * @returns 相似度（0-1）
   */
  match(title1: string, title2: string): Promise<number>;
  
  /**
   * 匹配漫画列表
   * @param websiteComics 网站漫画列表
   * @param localComics 本地漫画列表
   * @returns 匹配结果列表
   */
  matchComics(websiteComics: Comic[], localComics: LocalComic[]): Promise<MatchResult[]>;
  
  /**
   * 校准漫画名称（以第三方为准）
   * @param searchName 搜索名称
   * @param thirdPartyName 第三方名称
   * @returns 标准名称
   */
  calibrateName(searchName: string, thirdPartyName: string): string;
  
  /**
   * 清理资源
   */
  cleanup(): void;
}

/**
 * 匹配结果
 */
export interface MatchResult {
  websiteComic: Comic;
  localComic?: LocalComic;
  similarity: number;
  matched: boolean;
}

/**
 * 本地漫画信息
 */
export interface LocalComic {
  title: string;
  path: string;
  size: number;
  createdAt: Date;
}
