/**
 * Web UI 入口文件
 * 初始化 Web 应用并提供客户端实例
 */

import { createClient } from './adapters/index.js';
import type { IClientFactory } from './adapters/types.js';

// 全局客户端实例
let clientInstance: IClientFactory | null = null;

/**
 * 获取客户端实例
 * 如果未初始化则自动创建
 */
export function getClient(): IClientFactory {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

/**
 * 初始化 Web 应用
 */
export function initApp(): void {
  console.log('🚀 WNACG Downloader Web UI 初始化中...');
  
  // 创建客户端实例
  const client = getClient();
  
  // 提供给全局使用
  // @ts-ignore - 挂载到 window 对象供 Vue 组件使用
  window.wnacgClient = client;
  
  console.log('✅ Web UI 初始化完成');
  console.log('📡 客户端类型：Web API');
  console.log('🌐 API 地址：http://localhost:3000/api');
}

// 自动初始化
if (typeof document !== 'undefined') {
  // 在浏览器环境中
  document.addEventListener('DOMContentLoaded', initApp);
}

// 导出工具函数
export { createClient } from './adapters/index.js';
export type { IClientFactory } from './adapters/types.js';
