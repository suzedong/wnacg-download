/**
 * 搜索 API 路由
 */

import { Router } from 'express';
import { WNACGScraper } from '../../core/scraper.js';
import { SearchManager } from '../../core/search-manager.js';
import { configManager } from '../../config.js';
import { wnacgConfig } from '../../config/wnacg.config.js';
import path from 'path';

const router = Router();

/**
 * POST /api/search
 * 搜索漫画
 */
router.post('/search', async (req, res) => {
  const { keyword, maxPages = 1, onlyChinese = true, force = false } = req.body;

  if (!keyword) {
    return res.json({ success: false, error: '请输入关键字' });
  }

  try {
    const cacheDir = path.join(process.cwd(), 'cache');
    const searchManager = new SearchManager(cacheDir);

    // 检查缓存（如果不需要强制刷新）
    if (!force && searchManager.exists(keyword)) {
      const comics = searchManager.load(keyword);
      if (comics) {
        console.log(`使用缓存：${keyword}`);
        return res.json({
          success: true,
          comics,
          cached: true,
          message: '使用缓存的搜索结果'
        });
      }
    }

    // 执行搜索
    console.log(`开始搜索：${keyword}`);
    const scraper = new WNACGScraper(wnacgConfig, configManager.get('defaultProxy'), false);
    await scraper.initialize();

    const comics = await scraper.search({
      author: keyword,
      maxPages: parseInt(maxPages.toString()),
      onlyChinese,
      requestDelay: configManager.get('requestDelay'),
    });

    await scraper.close();

    // 保存结果
    searchManager.save(keyword, {
      keyword,
      searchTime: new Date().toISOString(),
      totalPages: 0,
      totalComics: comics.length,
      comics,
    });

    return res.json({
      success: true,
      comics,
      cached: false,
      message: `找到 ${comics.length} 部漫画`
    });

  } catch (error) {
    console.error('搜索失败:', error);
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
