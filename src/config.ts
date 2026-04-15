import { Config } from './types/index.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

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
  private config: Partial<Config>;
  private configPath: string;
  private listeners: Map<keyof Config, Set<(value: any) => void>>;

  constructor() {
    // 在项目目录下创建配置文件，避免权限问题
    this.configPath = path.join(process.cwd(), '.config', 'config.json');
    this.config = { ...defaultConfig };
    this.listeners = new Map();
    
    // 加载已有配置
    this.load();
  }
  
  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const savedConfig = JSON.parse(content);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      // 忽略加载错误，使用默认配置
    }
  }
  
  private save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      // 忽略保存错误
    }
  }

  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值
   */
  get<K extends keyof Config>(key: K): Config[K] {
    return (this.config as any)[key] as Config[K];
  }

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<K extends keyof Config>(key: K, value: Config[K]): void {
    if (value === undefined) {
      delete (this.config as any)[key];
    } else {
      (this.config as any)[key] = value;
      this.notifyListeners(key, value);
      this.save();
    }
  }

  /**
   * 获取所有配置
   * @returns 完整配置对象
   */
  getAll(): Config {
    return this.config as Config;
  }

  /**
   * 重置所有配置为默认值
   */
  reset(): void {
    this.config = { ...defaultConfig };
    this.save();
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
