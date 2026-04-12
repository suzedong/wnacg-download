import Conf from 'conf';
import { Config } from './types/index.js';
import path from 'path';
import os from 'os';

/**
 * 默认配置
 * 根据需求规格说明书 v2.0 设置默认值
 */
const defaultConfig: Config = {
  defaultStoragePath: path.join(os.homedir(), 'comics'),
  defaultProxy: undefined,
  defaultMaxPages: 5,
  defaultOnlyChinese: true,
  requestDelay: 1000, // 默认 1000ms，平衡速度和礼貌爬取
  concurrentDownloads: 3,
  downloadRetryTimes: 3, // 下载失败重试次数
  downloadRetryDelay: 30, // 重试间隔（秒）
  aiModelType: 'local', // AI 模型类型：local 或 remote
  aiModelApiUrl: undefined, // 远程 API 地址
  matchThreshold: 0.8, // AI 匹配相似度阈值
};

/**
 * 配置管理器
 * 支持配置的读取、设置、监听和持久化
 */
export class ConfigManager {
  private config: Conf<Config>;
  private listeners: Map<keyof Config, Set<(value: any) => void>>;

  constructor() {
    this.config = new Conf<Config>({
      projectName: 'wnacg-downloader',
      defaults: defaultConfig,
    });
    this.listeners = new Map();
  }

  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值
   */
  get<K extends keyof Config>(key: K): Config[K] {
    return this.config.get(key);
  }

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<K extends keyof Config>(key: K, value: Config[K]): void {
    if (value === undefined) {
      this.config.delete(key);
    } else {
      this.config.set(key, value);
      this.notifyListeners(key, value);
    }
  }

  /**
   * 获取所有配置
   * @returns 完整配置对象
   */
  getAll(): Config {
    return this.config.store;
  }

  /**
   * 重置所有配置为默认值
   */
  reset(): void {
    this.config.clear();
  }

  /**
   * 监听配置变更
   * @param key 配置键
   * @param callback 回调函数
   */
  onUpdate<K extends keyof Config>(
    key: K,
    callback: (value: Config[K]) => void
  ): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as any);
  }

  /**
   * 通知配置变更监听器
   * @param key 配置键
   * @param value 新值
   */
  private notifyListeners<K extends keyof Config>(
    key: K,
    value: Config[K]
  ): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(value));
    }
  }
}

export const configManager = new ConfigManager();
