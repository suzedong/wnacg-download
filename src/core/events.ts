/**
 * 事件系统
 * 提供统一的事件发射和监听机制
 */

import { EventEmitter } from 'events';
import type { DownloadProgressEvent, DownloadCompletedEvent, DownloadErrorEvent } from './interfaces.js';

/**
 * 下载事件类型
 */
export const DownloadEventTypes = {
  START: 'start',
  PROGRESS: 'progress',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  RETRY: 'retry',
} as const;

export type DownloadEventType = typeof DownloadEventTypes[keyof typeof DownloadEventTypes];

/**
 * 下载事件数据
 */
export interface DownloadEventData {
  start: { total: number };
  progress: DownloadProgressEvent;
  completed: DownloadCompletedEvent;
  error: DownloadErrorEvent;
  cancelled: { aid: string };
  retry: { aid: string; attempt: number; delay: number };
}

/**
 * 下载事件发射器
 * 继承 Node.js EventEmitter，提供类型安全的事件发射
 */
export class DownloadEventEmitter extends EventEmitter {
  /**
   * 发射开始事件
   * @param total 总漫画数
   */
  emitStart(total: number): boolean {
    return this.emit(DownloadEventTypes.START, { total });
  }

  /**
   * 发射进度事件
   * @param data 进度数据
   */
  emitProgress(data: DownloadProgressEvent): boolean {
    return this.emit(DownloadEventTypes.PROGRESS, data);
  }

  /**
   * 发射完成事件
   * @param data 完成数据
   */
  emitCompleted(data: DownloadCompletedEvent): boolean {
    return this.emit(DownloadEventTypes.COMPLETED, data);
  }

  /**
   * 发射错误事件
   * @param data 错误数据
   */
  emitError(data: DownloadErrorEvent): boolean {
    return this.emit(DownloadEventTypes.ERROR, data);
  }

  /**
   * 发射取消事件
   * @param aid 漫画 ID
   */
  emitCancelled(aid: string): boolean {
    return this.emit(DownloadEventTypes.CANCELLED, { aid });
  }

  /**
   * 发射重试事件
   * @param aid 漫画 ID
   * @param attempt 重试次数
   * @param delay 延迟时间（毫秒）
   */
  emitRetry(aid: string, attempt: number, delay: number): boolean {
    return this.emit(DownloadEventTypes.RETRY, { aid, attempt, delay });
  }

  /**
   * 监听进度事件
   * @param handler 事件处理器
   * @returns this
   */
  onProgress(handler: (data: DownloadProgressEvent) => void): this {
    return this.on(DownloadEventTypes.PROGRESS, handler);
  }

  /**
   * 监听完成事件
   * @param handler 事件处理器
   * @returns this
   */
  onCompleted(handler: (data: DownloadCompletedEvent) => void): this {
    return this.on(DownloadEventTypes.COMPLETED, handler);
  }

  /**
   * 监听错误事件
   * @param handler 事件处理器
   * @returns this
   */
  onError(handler: (data: DownloadErrorEvent) => void): this {
    return this.on(DownloadEventTypes.ERROR, handler);
  }

  /**
   * 移除进度监听器
   * @param handler 事件处理器
   * @returns this
   */
  offProgress(handler: (data: DownloadProgressEvent) => void): this {
    return this.off(DownloadEventTypes.PROGRESS, handler);
  }

  /**
   * 移除所有监听器
   * @returns this
   */
  removeAllListeners(): this {
    return super.removeAllListeners();
  }
}

/**
 * 搜索事件类型
 */
export const SearchEventTypes = {
  START: 'search:start',
  PAGE_PROGRESS: 'search:page_progress',
  COMPLETED: 'search:completed',
  ERROR: 'search:error',
} as const;

export type SearchEventType = typeof SearchEventTypes[keyof typeof SearchEventTypes];

/**
 * 搜索事件数据
 */
export interface SearchEventData {
  start: { keyword: string; maxPages: number };
  page_progress: { currentPage: number; totalPages: number; comicsFound: number };
  completed: { keyword: string; totalComics: number; duration: number };
  error: { error: Error };
}

/**
 * 搜索事件发射器
 */
export class SearchEventEmitter extends EventEmitter {
  /**
   * 发射开始事件
   * @param keyword 关键字
   * @param maxPages 最大页数
   */
  emitStart(keyword: string, maxPages: number): boolean {
    return this.emit(SearchEventTypes.START, { keyword, maxPages });
  }

  /**
   * 发射页面进度事件
   * @param currentPage 当前页码
   * @param totalPages 总页数
   * @param comicsFound 已找到的漫画数
   */
  emitPageProgress(currentPage: number, totalPages: number, comicsFound: number): boolean {
    return this.emit(SearchEventTypes.PAGE_PROGRESS, { currentPage, totalPages, comicsFound });
  }

  /**
   * 发射完成事件
   * @param keyword 关键字
   * @param totalComics 总漫画数
   * @param duration 耗时（毫秒）
   */
  emitCompleted(keyword: string, totalComics: number, duration: number): boolean {
    return this.emit(SearchEventTypes.COMPLETED, { keyword, totalComics, duration });
  }

  /**
   * 发射错误事件
   * @param error 错误对象
   */
  emitError(error: Error): boolean {
    return this.emit(SearchEventTypes.ERROR, { error });
  }

  /**
   * 监听页面进度事件
   * @param handler 事件处理器
   * @returns this
   */
  onPageProgress(handler: (data: { currentPage: number; totalPages: number; comicsFound: number }) => void): this {
    return this.on(SearchEventTypes.PAGE_PROGRESS, handler);
  }

  /**
   * 监听完成事件
   * @param handler 事件处理器
   * @returns this
   */
  onCompleted(handler: (data: { keyword: string; totalComics: number; duration: number }) => void): this {
    return this.on(SearchEventTypes.COMPLETED, handler);
  }

  /**
   * 监听错误事件
   * @param handler 事件处理器
   * @returns this
   */
  onError(handler: (data: { error: Error }) => void): this {
    return this.on(SearchEventTypes.ERROR, handler);
  }
}

/**
 * 对比事件类型
 */
export const CompareEventTypes = {
  START: 'compare:start',
  SCANNING: 'compare:scanning',
  MATCHING: 'compare:matching',
  COMPLETED: 'compare:completed',
  ERROR: 'compare:error',
} as const;

export type CompareEventType = typeof CompareEventTypes[keyof typeof CompareEventTypes];

/**
 * 对比事件数据
 */
export interface CompareEventData {
  start: { websiteComics: number; localPath?: string };
  scanning: { progress: number; scanned: number };
  matching: { progress: number; matched: number };
  completed: { toDownload: number; alreadyHave: number; duration: number };
  error: { error: Error };
}

/**
 * 对比事件发射器
 */
export class CompareEventEmitter extends EventEmitter {
  /**
   * 发射开始事件
   * @param websiteComics 网站漫画数
   * @param localPath 本地路径
   */
  emitStart(websiteComics: number, localPath?: string): boolean {
    return this.emit(CompareEventTypes.START, { websiteComics, localPath });
  }

  /**
   * 发射扫描进度事件
   * @param progress 进度（0-100）
   * @param scanned 已扫描数量
   */
  emitScanning(progress: number, scanned: number): boolean {
    return this.emit(CompareEventTypes.SCANNING, { progress, scanned });
  }

  /**
   * 发射匹配进度事件
   * @param progress 进度（0-100）
   * @param matched 已匹配数量
   */
  emitMatching(progress: number, matched: number): boolean {
    return this.emit(CompareEventTypes.MATCHING, { progress, matched });
  }

  /**
   * 发射完成事件
   * @param toDownload 待下载数量
   * @param alreadyHave 已拥有数量
   * @param duration 耗时（毫秒）
   */
  emitCompleted(toDownload: number, alreadyHave: number, duration: number): boolean {
    return this.emit(CompareEventTypes.COMPLETED, { toDownload, alreadyHave, duration });
  }

  /**
   * 发射错误事件
   * @param error 错误对象
   */
  emitError(error: Error): boolean {
    return this.emit(CompareEventTypes.ERROR, { error });
  }

  /**
   * 监听扫描进度事件
   * @param handler 事件处理器
   * @returns this
   */
  onScanning(handler: (data: { progress: number; scanned: number }) => void): this {
    return this.on(CompareEventTypes.SCANNING, handler);
  }

  /**
   * 监听匹配进度事件
   * @param handler 事件处理器
   * @returns this
   */
  onMatching(handler: (data: { progress: number; matched: number }) => void): this {
    return this.on(CompareEventTypes.MATCHING, handler);
  }

  /**
   * 监听完成事件
   * @param handler 事件处理器
   * @returns this
   */
  onCompleted(handler: (data: { toDownload: number; alreadyHave: number; duration: number }) => void): this {
    return this.on(CompareEventTypes.COMPLETED, handler);
  }
}
