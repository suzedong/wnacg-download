// ==================== 漫画基础类型 ====================

/**
 * 漫画基础信息
 */
export interface Comic {
  aid: string;
  title: string;
  author: string;
  category: string;
  url: string;
  coverUrl?: string;
  pages?: number;
  imageCount?: number;
  createdAt?: string;
  tags?: string[];
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

// ==================== 搜索相关类型 ====================

/**
 * 搜索选项
 */
export interface SearchOptions {
  author: string;
  proxy?: string;
  maxPages?: number;
  onlyChinese?: boolean;
  requestDelay?: number;
  useCache?: boolean;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  keyword: string;
  searchTime: string;
  totalPages: number;
  totalComics: number;
  comics: Comic[];
}

// ==================== 下载相关类型 ====================

/**
 * 下载选项
 */
export interface DownloadOptions {
  storagePath: string;
  subdir?: string;
  maxPages?: number;
  proxy?: string;
  onlyChinese?: boolean;
  concurrentDownloads?: number;
  retryTimes?: number;
  retryInterval?: number;
}

/**
 * 下载进度
 */
export interface DownloadProgress {
  aid: string;
  total: number;
  downloaded: number;
  speed: number; // 页/秒
  status: 'pending' | 'fetching' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

/**
 * 下载结果
 */
export interface DownloadResult {
  success: boolean;
  comic: Comic;
  savedPath?: string;
  error?: Error;
  pages: number;
  downloadedPages: number;
}

/**
 * 下载队列项
 */
export interface DownloadQueueItem extends Comic {
  selected: boolean;
  progress?: DownloadProgress;
}

// ==================== 对比相关类型 ====================

/**
 * 对比结果
 */
export interface CompareResult {
  websiteComics: Comic[];
  localComics: LocalComic[];
  toDownload: Comic[];
  alreadyHave: { website: Comic; local?: LocalComic }[];
}

/**
 * AI 匹配结果
 */
export interface MatchResult {
  websiteComic: Comic;
  localComic?: LocalComic;
  similarity: number;
  matched: boolean;
}

/**
 * 对比选项
 */
export interface CompareOptions {
  searchFile: string;
  localPath?: string;
  thirdPartySource?: string;
  threshold?: number;
  useAI?: boolean;
}

// ==================== 配置相关类型 ====================

/**
 * 应用配置
 */
export interface Config {
  defaultStoragePath: string;
  defaultProxy?: string;
  defaultMaxPages: number;
  defaultOnlyChinese: boolean;
  requestDelay: number;
  concurrentDownloads: number;
  downloadRetryTimes: number;
  downloadRetryDelay: number;
  aiModelType: 'local' | 'remote';
  aiModelApiUrl?: string;
  matchThreshold: number;
}

/**
 * 站点配置
 */
export interface SiteConfig {
  name: string;
  baseUrl: string;
  urls: UrlTemplates;
  selectors: PageSelectors;
  categoryMap: CategoryMapping;
}

export interface UrlTemplates {
  search: string;
  comicDetail: string;
}

export interface PageSelectors {
  searchResult: {
    comicBox: string[];
    fallbackSelectors: string[];
    titleLink: string;
    coverImage: string;
    categoryClass: string;
  };
  comicDetail: {
    title: string;
    category: string;
    pageLink: string;
  };
}

export interface CategoryMapping {
  [cateId: string]: string;
}

// ==================== 错误处理类型 ====================

/**
 * 错误码常量
 */
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_CONFIG: 'INVALID_CONFIG',
  AI_MODEL_ERROR: 'AI_MODEL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * 统一错误类
 */
export class WnacgError extends Error {
  code: ErrorCode;
  retryable: boolean;
  originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.UNKNOWN_ERROR,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'WnacgError';
    this.code = code;
    this.retryable = retryable;
    this.originalError = originalError;
  }

  /**
   * 创建网络错误
   */
  static networkError(originalError: Error): WnacgError {
    return new WnacgError(
      `网络错误：${originalError.message}`,
      ErrorCodes.NETWORK_ERROR,
      true,
      originalError
    );
  }

  /**
   * 创建验证码错误
   */
  static verificationRequired(): WnacgError {
    return new WnacgError(
      '需要完成验证码验证',
      ErrorCodes.VERIFICATION_REQUIRED,
      false
    );
  }

  /**
   * 创建页面未找到错误
   */
  static pageNotFound(url: string): WnacgError {
    return new WnacgError(
      `页面未找到：${url}`,
      ErrorCodes.PAGE_NOT_FOUND,
      true
    );
  }

  /**
   * 创建下载失败错误
   */
  static downloadFailed(originalError: Error): WnacgError {
    return new WnacgError(
      `下载失败：${originalError.message}`,
      ErrorCodes.DOWNLOAD_FAILED,
      true,
      originalError
    );
  }

  /**
   * 创建文件未找到错误
   */
  static fileNotFound(path: string): WnacgError {
    return new WnacgError(
      `文件未找到：${path}`,
      ErrorCodes.FILE_NOT_FOUND,
      false
    );
  }

  /**
   * 创建配置错误
   */
  static invalidConfig(message: string): WnacgError {
    return new WnacgError(
      `配置错误：${message}`,
      ErrorCodes.INVALID_CONFIG,
      false
    );
  }

  /**
   * 创建 AI 模型错误
   */
  static aiModelError(originalError: Error): WnacgError {
    return new WnacgError(
      `AI 模型错误：${originalError.message}`,
      ErrorCodes.AI_MODEL_ERROR,
      false,
      originalError
    );
  }
}

// ==================== 工具类型 ====================

/**
 * 事件处理器类型
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * 进度回调类型
 */
export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * 可取消任务
 */
export interface CancellableTask {
  cancel(): Promise<void>;
  isCancelled(): boolean;
}
