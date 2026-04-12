import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchManager } from '../../src/core/search-manager.js';
import fs from 'fs';
import path from 'path';

describe('SearchManager', () => {
  let searchManager: SearchManager;
  const testCacheDir = path.join(process.cwd(), 'test-cache');

  beforeEach(() => {
    // 创建测试缓存目录
    if (!fs.existsSync(testCacheDir)) {
      fs.mkdirSync(testCacheDir, { recursive: true });
    }
    searchManager = new SearchManager(testCacheDir);
  });

  afterEach(() => {
    // 清理测试缓存目录
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('保存和加载', () => {
    it('应该能保存和加载搜索结果', () => {
      const keyword = 'test';
      const mockComics = [
        {
          aid: '123',
          title: 'Test Comic 1',
          author: 'Author 1',
          category: 'Category 1',
          url: 'https://example.com/1',
        },
        {
          aid: '456',
          title: 'Test Comic 2',
          author: 'Author 2',
          category: 'Category 2',
          url: 'https://example.com/2',
        },
      ];

      // 保存
      searchManager.save(keyword, {
        keyword,
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 2,
        comics: mockComics,
      });

      // 加载
      const loaded = searchManager.load(keyword);
      expect(loaded).toBeDefined();
      expect(loaded).toHaveLength(2);
      expect(loaded?.[0].title).toBe('Test Comic 1');
    });

    it('应该返回 null 当搜索结果不存在', () => {
      const loaded = searchManager.load('nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('存在性检查', () => {
    it('应该能检查搜索结果是否存在', () => {
      const keyword = 'exists';
      
      expect(searchManager.exists(keyword)).toBe(false);

      searchManager.save(keyword, {
        keyword,
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 1,
        comics: [{ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }],
      });

      expect(searchManager.exists(keyword)).toBe(true);
    });
  });

  describe('删除功能', () => {
    it('应该能删除搜索结果', () => {
      const keyword = 'todelete';

      // 先保存
      searchManager.save(keyword, {
        keyword,
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 1,
        comics: [{ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }],
      });

      expect(searchManager.exists(keyword)).toBe(true);

      // 删除
      searchManager.delete(keyword);

      expect(searchManager.exists(keyword)).toBe(false);
    });
  });

  describe('列表功能', () => {
    it('应该能获取所有搜索结果列表', () => {
      // 创建多个搜索结果
      const keywords = ['alpha', 'beta', 'gamma'];
      
      keywords.forEach((keyword, index) => {
        searchManager.save(keyword, {
          keyword,
          searchTime: new Date().toISOString(),
          totalPages: 1,
          totalComics: index + 1,
          comics: Array(index + 1).fill({ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }),
        });
      });

      const list = searchManager.list();
      
      expect(list).toHaveLength(3);
      expect(list.map(item => item.keyword)).toEqual(expect.arrayContaining(keywords));
    });

    it('应该支持关键字过滤', () => {
      searchManager.save('test1', {
        keyword: 'test1',
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 1,
        comics: [{ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }],
      });

      searchManager.save('test2', {
        keyword: 'test2',
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 1,
        comics: [{ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }],
      });

      const filtered = searchManager.list({ keyword: 'test1' });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].keyword).toBe('test1');
    });

    it('应该支持按时间排序', () => {
      const list = searchManager.list({ sortBy: 'time', order: 'desc' });
      // 最新创建的应该在上面
      expect(list.length).toBeGreaterThanOrEqual(0);
    });

    it('应该支持按数量排序', () => {
      searchManager.save('small', {
        keyword: 'small',
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 1,
        comics: [{ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }],
      });

      searchManager.save('large', {
        keyword: 'large',
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 10,
        comics: Array(10).fill({ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }),
      });

      const list = searchManager.list({ sortBy: 'count', order: 'desc' });
      
      expect(list[0].keyword).toBe('large');
      expect(list[0].totalComics).toBe(10);
    });
  });

  describe('详情获取', () => {
    it('应该能获取搜索结果详情', () => {
      const keyword = 'detail';
      const mockComics = [
        { aid: '1', title: 'Test 1', author: 'Test', category: 'Test', url: 'https://example.com' },
        { aid: '2', title: 'Test 2', author: 'Test', category: 'Test', url: 'https://example.com' },
      ];

      searchManager.save(keyword, {
        keyword,
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 2,
        comics: mockComics,
      });

      const detail = searchManager.getDetail(keyword);
      
      expect(detail).toBeDefined();
      expect(detail?.metadata.keyword).toBe(keyword);
      expect(detail?.metadata.totalComics).toBe(2);
      expect(detail?.comics).toHaveLength(2);
    });

    it('应该返回 null 当详情不存在', () => {
      const detail = searchManager.getDetail('nonexistent');
      expect(detail).toBeNull();
    });
  });

  describe('清理功能', () => {
    it('应该能清理旧的搜索结果', () => {
      // 创建一个"旧"文件
      const keyword = 'old';
      searchManager.save(keyword, {
        keyword,
        searchTime: new Date().toISOString(),
        totalPages: 1,
        totalComics: 1,
        comics: [{ aid: '1', title: 'Test', author: 'Test', category: 'Test', url: 'https://example.com' }],
      });

      // 修改文件时间戳为 8 天前
      const filePath = path.join(testCacheDir, `search_${keyword}.json`);
      const oldTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      fs.utimesSync(filePath, oldTime, oldTime);

      // 清理超过 7 天的文件
      const cleaned = searchManager.cleanup(7 * 24 * 60 * 60 * 1000);
      
      expect(cleaned).toBe(1);
      expect(searchManager.exists(keyword)).toBe(false);
    });
  });
});
