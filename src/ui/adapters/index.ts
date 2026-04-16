/**
 * 适配器层入口
 * 提供工厂函数创建合适的客户端
 */

import { ApiClient } from './api-client';
import { ElectronClient } from './electron-client';
import type { IApiClient } from './types';

/**
 * 检测当前运行环境
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * 创建客户端实例
 * 根据环境自动选择合适的客户端
 * 
 * @returns IApiClient 客户端实例
 */
export function createClient(): IApiClient {
  if (isElectronEnvironment()) {
    console.log('运行在 Electron 环境，使用 ElectronClient');
    return new ElectronClient();
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
export { ElectronClient } from './electron-client';
