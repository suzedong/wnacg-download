import { modelManager } from './model.js';
import type { Comic, LocalComic } from '../../types.js';

interface MatchResult {
  websiteComic: Comic;
  localComic?: LocalComic;
  similarity: number;
  matched: boolean;
}

interface MatcherOptions {
  threshold?: number;
  useAI?: boolean;
  enableCache?: boolean;
  cacheSize?: number;
}

export class ComicMatcher {
  private options: MatcherOptions;
  private similarityCache: Map<string, number>;

  constructor(options: Partial<MatcherOptions> = {}) {
    this.options = {
      threshold: options.threshold || 0.8,
      useAI: options.useAI !== false, // 默认使用 AI
      enableCache: options.enableCache !== false, // 默认启用缓存
      cacheSize: options.cacheSize || 1000, // 默认缓存大小
    };
    this.similarityCache = new Map();
  }

  async initialize(): Promise<void> {
    if (this.options.useAI) {
      await modelManager.loadModel();
    }
  }

  // 标准化漫画名
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 增强的相似度计算，考虑漫画名的主要部分
  private enhancedSimilarity(title1: string, title2: string): number {
    const normalized1 = this.normalizeTitle(title1);
    const normalized2 = this.normalizeTitle(title2);

    // 计算基本相似度
    const baseSimilarity = modelManager.calculateSimilarity(normalized1, normalized2);

    // 提取主要部分进行比较
    const mainPart1 = this.extractMainPart(normalized1);
    const mainPart2 = this.extractMainPart(normalized2);

    if (mainPart1 && mainPart2) {
      const mainPartSimilarity = modelManager.calculateSimilarity(mainPart1, mainPart2);
      // 综合考虑基本相似度和主要部分相似度
      return (baseSimilarity + mainPartSimilarity) / 2;
    }

    return baseSimilarity;
  }

  // 提取漫画名的主要部分（去除前缀和后缀）
  private extractMainPart(title: string): string {
    // 去除常见前缀
    let mainPart = title
      .replace(/^\[.*?\]/g, '') // 去除 [...] 前缀
      .replace(/^\(.*?\)/g, '') // 去除 (...) 前缀
      .trim();

    // 去除常见后缀
    mainPart = mainPart
      .replace(/\[.*?\]$/g, '') // 去除 [...] 后缀
      .replace(/\(.*?\)$/g, '') // 去除 (...) 后缀
      .trim();

    return mainPart;
  }

  // 生成缓存键
  private generateCacheKey(title1: string, title2: string): string {
    // 确保缓存键是唯一的，并且与顺序无关
    const sortedTitles = [title1, title2].sort().join('||');
    return `similarity:${sortedTitles}`;
  }

  // 计算两个漫画名的相似度
  calculateSimilarity(title1: string, title2: string): number {
    // 检查缓存
    if (this.options.enableCache) {
      const cacheKey = this.generateCacheKey(title1, title2);
      if (this.similarityCache.has(cacheKey)) {
        return this.similarityCache.get(cacheKey)!;
      }
    }

    let similarity: number;
    if (this.options.useAI && modelManager.getModel()) {
      // 使用 AI 模型计算相似度
      // 这里使用增强的相似度计算
      similarity = this.enhancedSimilarity(title1, title2);
    } else {
      // 使用内置的增强相似度算法
      similarity = this.enhancedSimilarity(title1, title2);
    }

    // 缓存结果
    if (this.options.enableCache) {
      const cacheKey = this.generateCacheKey(title1, title2);
      // 检查缓存大小
      if (this.similarityCache.size >= (this.options.cacheSize || 1000)) {
        // 移除最早的缓存项
        const firstKey = this.similarityCache.keys().next().value;
        if (firstKey) {
          this.similarityCache.delete(firstKey);
        }
      }
      this.similarityCache.set(cacheKey, similarity);
    }

    return similarity;
  }

  // 匹配单个漫画
  matchComic(websiteComic: Comic, localComics: LocalComic[]): MatchResult {
    let bestMatch: LocalComic | undefined;
    let highestSimilarity = 0;

    for (const localComic of localComics) {
      const similarity = this.calculateSimilarity(websiteComic.title, localComic.title);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = localComic;
      }
    }

    const matched = highestSimilarity >= (this.options.threshold || 0.8);

    return {
      websiteComic,
      localComic: bestMatch,
      similarity: highestSimilarity,
      matched,
    };
  }

  // 批量匹配漫画
  matchComics(websiteComics: Comic[], localComics: LocalComic[]): MatchResult[] {
    return websiteComics.map(websiteComic => this.matchComic(websiteComic, localComics));
  }

  // 清理资源
  cleanup(): void {
    modelManager.cleanup();
    // 清理缓存
    this.similarityCache.clear();
  }
}

export const comicMatcher = new ComicMatcher();
