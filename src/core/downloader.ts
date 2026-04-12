import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Comic, DownloadOptions, DownloadProgress, DownloadResult } from '../types.js';
import { wnacgConfig } from '../config/wnacg.config.js';
import { configManager } from '../config.js';
import winston from 'winston';
import { WNACGScraper } from './scraper.js';

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * 漫画下载器
 * 支持并发下载、断点续传、重试机制和进度追踪
 */
export class Downloader {
  private scraper: WNACGScraper;
  private storagePath: string;
  private concurrentDownloads: number;
  private retryTimes: number;
  private retryDelay: number;
  private progressListeners: Map<string, Set<(progress: DownloadProgress) => void>>;

  constructor(options: DownloadOptions) {
    this.storagePath = options.storagePath;
    this.concurrentDownloads = options.concurrentDownloads || configManager.get('concurrentDownloads') || 3;
    this.retryTimes = options.retryTimes || configManager.get('downloadRetryTimes') || 3;
    this.retryDelay = options.retryInterval || configManager.get('downloadRetryDelay') || 30;
    this.scraper = new WNACGScraper(wnacgConfig, options.proxy);
    this.progressListeners = new Map();
  }

  /**
   * 注册进度监听器
   */
  onProgress(aid: string, callback: (progress: DownloadProgress) => void): void {
    if (!this.progressListeners.has(aid)) {
      this.progressListeners.set(aid, new Set());
    }
    this.progressListeners.get(aid)!.add(callback);
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(progress: DownloadProgress): void {
    const listeners = this.progressListeners.get(progress.aid);
    if (listeners) {
      listeners.forEach(callback => callback(progress));
    }
  }

  /**
   * 批量下载漫画
   */
  async downloadComics(comics: Comic[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    await fs.promises.mkdir(this.storagePath, { recursive: true });

    const batches = this.createBatches(comics, this.concurrentDownloads);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(comic => this.downloadComicWithRetry(comic))
      );

      results.forEach((result, index) => {
        const comic = batch[index];
        if (result.status === 'fulfilled') {
          const downloadResult = result.value;
          if (downloadResult.success) {
            success.push(comic.title);
            logger.info(`✅ 下载完成：${comic.title}`);
          } else {
            failed.push(comic.title);
            logger.error(`❌ 下载失败：${comic.title} - ${downloadResult.error?.message}`);
          }
        } else {
          failed.push(comic.title);
          logger.error(`❌ 下载异常：${comic.title} - ${result.reason}`);
        }
      });

      if (batches.length > 1) {
        await this.delay(2000);
      }
    }

    await this.scraper.close();

    return { success, failed };
  }

  /**
   * 下载单本漫画（带重试机制）
   */
  private async downloadComicWithRetry(comic: Comic): Promise<DownloadResult> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.retryTimes; attempt++) {
      try {
        // 初始化进度
        const progress: DownloadProgress = {
          aid: comic.aid,
          total: 0,
          downloaded: 0,
          speed: 0,
          status: 'fetching',
        };
        this.notifyProgress(progress);

        const result = await this.downloadComic(comic, progress);
        
        progress.status = 'completed';
        this.notifyProgress(progress);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`下载失败 ${comic.title} (尝试 ${attempt}/${this.retryTimes}): ${error}`);
        
        if (attempt < this.retryTimes) {
          const delayMs = this.retryDelay * 1000 * Math.pow(2, attempt - 1); // 指数退避
          logger.info(`等待 ${delayMs / 1000} 秒后重试...`);
          await this.delay(delayMs);
        }
      }
    }

    // 所有重试都失败
    const progress: DownloadProgress = {
      aid: comic.aid,
      total: 0,
      downloaded: 0,
      speed: 0,
      status: 'failed',
      error: lastError?.message,
    };
    this.notifyProgress(progress);

    return {
      success: false,
      comic,
      error: lastError,
      pages: 0,
      downloadedPages: 0,
    };
  }

  /**
   * 下载单本漫画（支持断点续传）
   */
  private async downloadComic(comic: Comic, progress: DownloadProgress): Promise<DownloadResult> {
    const details = await this.scraper.getComicDetails(comic.aid);
    
    if (!details || !details.pages) {
      throw new Error('获取漫画详情失败');
    }

    progress.total = details.pages;
    progress.status = 'downloading';
    this.notifyProgress(progress);

    const comicDir = path.join(
      this.storagePath,
      this.sanitizeTitle(comic.title)
    );
    await fs.promises.mkdir(comicDir, { recursive: true });

    const startTime = Date.now();
    let downloadedPages = 0;

    // 检查已下载的文件（断点续传）
    const existingPages = await this.getExistingPages(comicDir);
    downloadedPages = existingPages.length;
    progress.downloaded = downloadedPages;
    this.notifyProgress(progress);

    logger.info(`下载 ${comic.title}: 已存在 ${existingPages.length}/${details.pages} 页`);

    // 下载缺失的页面
    for (let page = 1; page <= details.pages; page++) {
      // 检查是否已存在
      if (existingPages.includes(page)) {
        logger.debug(`跳过已存在的页面 ${page}`);
        continue;
      }

      const pageUrl = `https://www.wnacg.com/photos-view-aid-${comic.aid}-page-${page}.html`;
      const imagePath = path.join(comicDir, `${String(page).padStart(3, '0')}.jpg`);
      
      try {
        // 提取图片 URL
        progress.status = 'fetching';
        this.notifyProgress(progress);
        
        const imageUrl = await this.extractImageUrl(pageUrl);
        if (!imageUrl) {
          throw new Error(`无法提取第 ${page} 页的图片 URL`);
        }

        // 下载图片（支持断点续传）
        progress.status = 'downloading';
        this.notifyProgress(progress);
        
        await this.downloadFileWithResume(imageUrl, imagePath);
        
        downloadedPages++;
        progress.downloaded = downloadedPages;
        
        // 计算下载速度
        const elapsed = (Date.now() - startTime) / 1000;
        progress.speed = elapsed > 0 ? downloadedPages / elapsed : 0;
        
        this.notifyProgress(progress);
        
        logger.debug(`下载完成 ${comic.title} 第 ${page} 页`);
      } catch (error) {
        logger.error(`下载 ${comic.title} 第 ${page} 页失败：${error}`);
        throw error;
      }

      await this.delay(500);
    }

    logger.info(`✅ 下载完成 ${comic.title}: ${downloadedPages}/${details.pages} 页`);

    return {
      success: true,
      comic,
      savedPath: comicDir,
      pages: details.pages,
      downloadedPages,
    };
  }

  /**
   * 获取已下载的页面
   */
  private async getExistingPages(comicDir: string): Promise<number[]> {
    const existingPages: number[] = [];
    
    try {
      const files = await fs.promises.readdir(comicDir);
      for (const file of files) {
        if (file.endsWith('.jpg')) {
          const pageNum = parseInt(file.replace('.jpg', ''), 10);
          if (!isNaN(pageNum)) {
            existingPages.push(pageNum);
          }
        }
      }
    } catch (error) {
      // 目录不存在或读取失败，返回空数组
    }
    
    return existingPages;
  }

  /**
   * 下载文件（支持断点续传）
   */
  private async downloadFileWithResume(url: string, filePath: string): Promise<void> {
    let startByte = 0;
    
    // 检查文件是否已部分下载
    try {
      const stats = await fs.promises.stat(filePath);
      startByte = stats.size;
      logger.debug(`断点续传：从 ${startByte} 字节开始`);
    } catch (error) {
      // 文件不存在，从头开始下载
      startByte = 0;
    }

    const config: any = {
      responseType: 'stream',
      timeout: 30000,
    };

    if (startByte > 0) {
      config.headers = {
        Range: `bytes=${startByte}-`,
      };
    }

    const response = await axios.get(url, config);

    const writer = fs.createWriteStream(filePath, {
      flags: startByte > 0 ? 'a' : 'w',
    });
    
    return new Promise<void>((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  /**
   * 提取图片 URL
   */
  private async extractImageUrl(pageUrl: string): Promise<string | null> {
    const page = await this.scraper['page'];
    if (!page) return null;

    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    const html = await page.content();
    
    const imgMatch = html.match(/<img[^>]+src="([^"]+\.jpg)"[^>]*>/i);
    return imgMatch ? imgMatch[1] : null;
  }

  /**
   * 分批处理
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 清理标题
   */
  private sanitizeTitle(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
