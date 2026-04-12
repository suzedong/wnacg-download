import fs from 'fs';
import path from 'path';
import { Comic, SearchResult } from '../types/index.js';

/**
 * 搜索结果元数据
 */
export interface SearchMetadata {
  keyword: string;
  filePath: string;
  searchTime: string;
  fileSize: number;
  totalComics: number;
  totalPages: number;
}

/**
 * 搜索结果管理器
 * 负责管理 cache/ 目录中的搜索结果文件
 */
export class SearchManager {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    // 确保 cache 目录存在
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * 获取搜索结果文件路径
   * @param keyword 关键字
   * @returns 文件路径
   */
  private getFilePath(keyword: string): string {
    // 清理关键字中的非法字符
    const safeKeyword = keyword.replace(/[<>:"/\\|?*]/g, '_');
    return path.join(this.cacheDir, `search_${safeKeyword}.json`);
  }

  /**
   * 保存搜索结果
   * @param keyword 关键字
   * @param result 搜索结果
   */
  save(keyword: string, result: SearchResult): void {
    const filePath = this.getFilePath(keyword);
    fs.writeFileSync(filePath, JSON.stringify(result.comics, null, 2), 'utf-8');
  }

  /**
   * 加载搜索结果
   * @param keyword 关键字
   * @returns 搜索结果，不存在返回 null
   */
  load(keyword: string): Comic[] | null {
    const filePath = this.getFilePath(keyword);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Comic[];
  }

  /**
   * 检查搜索结果是否存在
   * @param keyword 关键字
   * @returns 是否存在
   */
  exists(keyword: string): boolean {
    const filePath = this.getFilePath(keyword);
    return fs.existsSync(filePath);
  }

  /**
   * 删除搜索结果
   * @param keyword 关键字
   */
  delete(keyword: string): void {
    const filePath = this.getFilePath(keyword);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * 获取所有搜索结果列表
   * @param options 选项
   * @returns 搜索结果元数据列表
   */
  list(options?: {
    keyword?: string;
    sortBy?: 'time' | 'size' | 'count';
    order?: 'asc' | 'desc';
  }): SearchMetadata[] {
    const {
      keyword,
      sortBy = 'time',
      order = 'desc',
    } = options || {};

    // 扫描 cache 目录
    const files = fs.readdirSync(this.cacheDir);
    const searchFiles = files.filter(file => file.startsWith('search_') && file.endsWith('.json'));

    const metadataList: SearchMetadata[] = [];

    for (const file of searchFiles) {
      const filePath = path.join(this.cacheDir, file);
      const stats = fs.statSync(filePath);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const comics = JSON.parse(content) as Comic[];

        // 提取关键字（从文件名）
        const keywordMatch = file.match(/search_(.+)\.json/);
        if (!keywordMatch) continue;

        const fileKeyword = keywordMatch[1];

        // 如果指定了关键字过滤，只返回匹配的结果
        if (keyword && !fileKeyword.toLowerCase().includes(keyword.toLowerCase())) {
          continue;
        }

        metadataList.push({
          keyword: fileKeyword,
          filePath,
          searchTime: stats.mtime.toISOString(),
          fileSize: stats.size,
          totalComics: comics.length,
          totalPages: 0, // 搜索结果不存储总页数
        });
      } catch (error) {
        // 跳过损坏的文件
        console.warn(`无法解析搜索结果文件：${file}`, error);
      }
    }

    // 排序
    metadataList.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'time':
          comparison = new Date(a.searchTime).getTime() - new Date(b.searchTime).getTime();
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'count':
          comparison = a.totalComics - b.totalComics;
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return metadataList;
  }

  /**
   * 获取搜索结果详情
   * @param keyword 关键字
   * @returns 搜索结果详情
   */
  getDetail(keyword: string): {
    metadata: SearchMetadata;
    comics: Comic[];
  } | null {
    const filePath = this.getFilePath(keyword);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const comics = JSON.parse(content) as Comic[];

    return {
      metadata: {
        keyword,
        filePath,
        searchTime: stats.mtime.toISOString(),
        fileSize: stats.size,
        totalComics: comics.length,
        totalPages: 0,
      },
      comics,
    };
  }

  /**
   * 清理旧的搜索结果（可选功能）
   * @param maxAge 最大保存时间（毫秒），默认 7 天
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    const files = fs.readdirSync(this.cacheDir);
    const searchFiles = files.filter(file => file.startsWith('search_') && file.endsWith('.json'));

    for (const file of searchFiles) {
      const filePath = path.join(this.cacheDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}
