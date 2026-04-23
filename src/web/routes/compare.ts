/**
 * 对比 API 路由
 */

import { Router } from 'express';
import { WNACGScraper } from '../../core/scraper.js';
import { SearchManager } from '../../core/search-manager.js';
import { Scanner } from '../../core/scanner.js';
import { Comparer } from '../../core/comparer.js';
import { configManager } from '../../config.js';
import { wnacgConfig } from '../../config/wnacg.config.js';
import path from 'path';

const router = Router();

/**
 * POST /api/compare
 * 对比网站和本地漫画
 */
router.post('/compare', async (req, res) => {
  const { keyword, localPath } = req.body;

  if (!keyword) {
    return res.json({ success: false, error: '请输入关键字' });
  }

  if (!localPath) {
    return res.json({ success: false, error: '请选择本地存储路径' });
  }

  try {
    console.log(`开始对比：${keyword}, 本地路径：${localPath}`);

    // 1. 获取网站漫画（从缓存加载）
    const cacheDir = path.join(process.cwd(), 'cache');
    const searchManager = new SearchManager(cacheDir);
    
    let websiteComics;
    if (searchManager.exists(keyword)) {
      websiteComics = searchManager.load(keyword);
      console.log(`从缓存加载搜索结果：${keyword}`);
    } else {
      // 如果缓存不存在，执行搜索
      console.log(`缓存不存在，执行搜索：${keyword}`);
      const scraper = new WNACGScraper(wnacgConfig, configManager.get('defaultProxy'), false);
      await scraper.initialize();
      
      websiteComics = await scraper.search({
        author: keyword,
        maxPages: configManager.get('defaultMaxPages'),
        onlyChinese: configManager.get('defaultOnlyChinese'),
        requestDelay: configManager.get('requestDelay'),
      });
      
      await scraper.close();
      
      // 保存结果
      searchManager.save(keyword, {
        keyword,
        searchTime: new Date().toISOString(),
        totalPages: 0,
        totalComics: websiteComics.length,
        comics: websiteComics,
      });
    }

    // 2. 扫描本地漫画
    const scanner = new Scanner();
    const localComics = await scanner.scan(localPath);
    console.log(`扫描到本地漫画：${localComics.length} 部`);

    // 3. 对比
    const comparer = new Comparer();
    const result = await comparer.compare(websiteComics, localComics);
    
    console.log(`对比完成：网站=${result.websiteComics.length}, 本地=${result.localComics.length}, 需要下载=${result.toDownload.length}, 已拥有=${result.alreadyHave.length}`);

    res.json({
      success: true,
      result: {
        websiteComics: result.websiteComics,
        localComics: result.localComics,
        toDownload: result.toDownload,
        alreadyHave: result.alreadyHave,
      }
    });

  } catch (error) {
    console.error('对比失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
