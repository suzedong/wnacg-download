/**
 * 适配器层入口
 * 提供工厂函数创建合适的客户端
 */

import { ApiClient } from './api-client';
import { TauriClient } from './tauri-client';
import type { IApiClient } from './types';

/**
 * 检测当前运行环境
 */
function isTauriEnvironment(): boolean {
  // Tauri 环境检测：检查 __TAURI__ 全局对象
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * 创建客户端实例
 * 根据环境自动选择合适的客户端
 * 
 * @returns IApiClient 客户端实例
 */
export function createClient(): IApiClient {
  if (isTauriEnvironment()) {
    console.log('运行在 Tauri 环境，使用 TauriClient');
    return new TauriClient();
  } else {
    console.log('运行在 Web 环境，使用 ApiClient');
    return new ApiClient();
  }
}

// 导出类型
export type { IApiClient } from './types';
export type { 
  ISearchClient, 
  IDownloadClient, 
  ICompareClient, 
  IConfigClient,
  SearchCacheItem,
  DownloadProgress
} from './types';

// 导出具体实现（用于测试等场景）
export { ApiClient } from './api-client';
export { TauriClient } from './tauri-client';
