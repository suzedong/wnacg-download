/**
 * 适配器层统一导出
 * 提供客户端工厂函数，自动检测环境并创建合适的客户端
 */

import type { IClientFactory } from './types.js';
import {
  WebSearchClient,
  WebCompareClient,
  WebDownloadClient,
  WebConfigClient,
} from './api-client.js';
import {
  TauriSearchClient,
  TauriCompareClient,
  TauriDownloadClient,
  TauriConfigClient,
} from './tauri-client.js';

/**
 * 检测当前运行环境
 */
function detectEnvironment(): 'web' | 'tauri' {
  // 检测是否在 Tauri 环境中
  // @ts-ignore - Tauri 的 __TAURI__ 全局变量
  if (typeof window !== 'undefined' && window.__TAURI__) {
    return 'tauri';
  }
  return 'web';
}

/**
 * 创建客户端工厂
 * 自动检测环境并返回合适的客户端实现
 */
export function createClient(): IClientFactory {
  const env = detectEnvironment();
  
  console.log(`当前环境：${env === 'web' ? 'Web' : 'Tauri'}`);
  
  if (env === 'tauri') {
    // Tauri 环境
    return {
      search: new TauriSearchClient(),
      compare: new TauriCompareClient(),
      download: new TauriDownloadClient(),
      config: new TauriConfigClient(),
    };
  } else {
    // Web 环境
    return {
      search: new WebSearchClient(),
      compare: new WebCompareClient(),
      download: new WebDownloadClient(),
      config: new WebConfigClient(),
    };
  }
}

/**
 * 手动创建 Web 客户端
 */
export function createWebClient(): IClientFactory {
  return {
    search: new WebSearchClient(),
    compare: new WebCompareClient(),
    download: new WebDownloadClient(),
    config: new WebConfigClient(),
  };
}

/**
 * 手动创建 Tauri 客户端
 */
export function createTauriClient(): IClientFactory {
  return {
    search: new TauriSearchClient(),
    compare: new TauriCompareClient(),
    download: new TauriDownloadClient(),
    config: new TauriConfigClient(),
  };
}

// 导出所有类型
export type {
  IClientFactory,
  ISearchClient,
  ICompareClient,
  IDownloadClient,
  IConfigClient,
  SearchOptions,
  SearchResultMetadata,
  DownloadResult,
  ClientType,
} from './types.js';

// 导出所有客户端类
export {
  WebSearchClient,
  WebCompareClient,
  WebDownloadClient,
  WebConfigClient,
} from './api-client.js';

export {
  TauriSearchClient,
  TauriCompareClient,
  TauriDownloadClient,
  TauriConfigClient,
} from './tauri-client.js';
