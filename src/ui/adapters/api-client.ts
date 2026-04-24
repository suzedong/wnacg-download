/**
 * Web API 客户端
 * 通过 HTTP API 与后端通信
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

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Web 搜索客户端
 */
export class WebSearchClient implements ISearchClient {
  async search(keyword: string, options?: SearchOptions): Promise<Comic[]> {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword,
        maxPages: options?.maxPages,
        onlyChinese: options?.onlyChinese,
        force: options?.force,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '搜索失败');
    }

    const data = await response.json();
    return data.comics;
  }

  async getSearchList(): Promise<SearchResultMetadata[]> {
    const response = await fetch(`${API_BASE_URL}/cache`);
    
    if (!response.ok) {
      throw new Error('获取搜索结果列表失败');
    }

    const data = await response.json();
    return data.files;
  }

  async deleteSearch(keyword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/cache/${encodeURIComponent(keyword)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('删除搜索结果失败');
    }
  }
}

/**
 * Web 对比客户端
 */
export class WebCompareClient implements ICompareClient {
  async compare(keyword: string, localPath: string): Promise<CompareResult> {
    const response = await fetch(`${API_BASE_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword, localPath }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '对比失败');
    }

    return await response.json();
  }
}

/**
 * Web 下载客户端
 */
export class WebDownloadClient implements IDownloadClient {
  private progressCallback?: (progress: DownloadProgress) => void;

  async download(comics: Comic[], storagePath: string): Promise<DownloadResult> {
    const response = await fetch(`${API_BASE_URL}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comics, storagePath }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '下载失败');
    }

    return await response.json();
  }

  async cancel(aid: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/download/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ aid }),
    });

    if (!response.ok) {
      throw new Error('取消下载失败');
    }
  }

  onProgress(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
    
    // 在实际实现中，这里应该建立 WebSocket 或 EventSource 连接
    // 来接收服务器的进度推送
    // 暂时使用轮询方式
    this.startPolling();
  }

  private startPolling(): void {
    // 简单的轮询实现
    setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/download/progress`);
        if (response.ok) {
          const progress = await response.json();
          if (this.progressCallback) {
            this.progressCallback(progress);
          }
        }
      } catch (error) {
        // 忽略错误
      }
    }, 1000);
  }
}

/**
 * Web 配置客户端
 */
export class WebConfigClient implements IConfigClient {
  async getAll(): Promise<Config> {
    const response = await fetch(`${API_BASE_URL}/config`);
    
    if (!response.ok) {
      throw new Error('获取配置失败');
    }

    return await response.json();
  }

  async get<T>(key: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/config/${key}`);
    
    if (!response.ok) {
      throw new Error(`获取配置项 ${key} 失败`);
    }

    const data = await response.json();
    return data.value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, value }),
    });

    if (!response.ok) {
      throw new Error(`设置配置项 ${key} 失败`);
    }
  }
}
