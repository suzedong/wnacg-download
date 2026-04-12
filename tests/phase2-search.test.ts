/**
 * Phase 2 集成测试
 * 测试搜索功能完善
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchManager } from '../src/core/search-manager.js';
import { configManager } from '../src/config.js';
import fs from 'fs';
import path from 'path';

describe('Phase 2: 搜索功能完善', () => {
  describe('SearchManager - 搜索结果管理', () => {
    let searchManager: SearchManager;
    const testCacheDir = path.join(process.cwd(), 'test-cache');

    beforeEach(() => {
      searchManager = new SearchManager(testCacheDir);
    });

    afterEach(async () => {
      // 清理测试缓存
      try {
        await fs.rm(testCacheDir, { recursive: true, force: true });
      } catch {
        // 忽略清理错误
      }
    });

    it('应该能正确初始化缓存目录', () => {
      expect(fs.existsSync(testCacheDir)).toBe(true);
    });

    it('应该能正确保存搜索结果', () => {
      const testComics = [
        {
          aid: '123',
          title: '测试漫画 1',
          author: '作者 A',
          category: '單行本／漢化',
          url: 'https://example.com/123',
          coverUrl: 'https://example.com/cover1.jpg',
        },
        {
          aid: '456',
          title: '测试漫画 2',
          author: '作者 B',
          category: '雜誌&短篇／漢化',
          url: 'https://example.com/456',
          coverUrl: 'https://example.com/cover2.jpg',
        },
      ];

      const result = { comics: testComics, totalPages: 5 };
      searchManager.save('测试关键字', result);
      
      // 验证文件存在
      const filePath = (searchManager as any).getFilePath('测试关键字');
      expect(fs.existsSync(filePath)).toBe(true);
      
      // 验证内容
      const data = fs.readFileSync(filePath, 'utf-8');
      const savedComics = JSON.parse(data);
      expect(savedComics).toHaveLength(2);
      expect(savedComics[0].title).toBe('测试漫画 1');
    });

    it('应该能正确检查缓存是否存在', () => {
      const testComics = [
        {
          aid: '123',
          title: '测试漫画',
          author: '作者',
          category: '單行本／漢化',
          url: 'https://example.com/123',
        },
      ];

      // 初始没有缓存
      expect(searchManager.exists('测试关键字')).toBe(false);

      // 保存后应该有缓存
      const result = { comics: testComics, totalPages: 5 };
      searchManager.save('测试关键字', result);
      expect(searchManager.exists('测试关键字')).toBe(true);
    });

    it('应该能正确加载缓存的搜索结果', () => {
      const testComics = [
        {
          aid: '123',
          title: '测试漫画',
          author: '作者',
          category: '單行本／漢化',
          url: 'https://example.com/123',
        },
      ];

      const result = { comics: testComics, totalPages: 5 };
      searchManager.save('测试关键字', result);
      const loaded = searchManager.load('测试关键字');

      expect(loaded).not.toBeNull();
      expect(loaded).toHaveLength(1);
      expect(loaded![0].title).toBe('测试漫画');
    });

    it('应该能列出所有搜索结果', () => {
      const testComics = [
        {
          aid: '123',
          title: '测试漫画',
          author: '作者',
          category: '單行本／漢化',
          url: 'https://example.com/123',
        },
      ];

      const result = { comics: testComics, totalPages: 5 };
      searchManager.save('关键字 1', result);
      searchManager.save('关键字 2', result);

      const metadataList = searchManager.list();
      
      expect(metadataList.length).toBeGreaterThanOrEqual(2);
    });

    it('应该能删除搜索结果', () => {
      const testComics = [
        {
          aid: '123',
          title: '测试漫画',
          author: '作者',
          category: '單行本／漢化',
          url: 'https://example.com/123',
        },
      ];

      const result = { comics: testComics, totalPages: 5 };
      searchManager.save('测试关键字', result);
      expect(searchManager.exists('测试关键字')).toBe(true);

      searchManager.delete('测试关键字');
      expect(searchManager.exists('测试关键字')).toBe(false);
    });
  });

  describe('配置管理 - 请求间隔', () => {
    it('应该能正确设置和获取请求间隔', () => {
      const originalDelay = configManager.get('requestDelay');
      
      // 设置新值
      configManager.set('requestDelay', 2000);
      expect(configManager.get('requestDelay')).toBe(2000);
      
      // 恢复原值
      configManager.set('requestDelay', originalDelay);
      expect(configManager.get('requestDelay')).toBe(originalDelay);
    });
  });
});
