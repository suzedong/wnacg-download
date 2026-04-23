/**
 * 缓存管理 API 路由
 */

import { Router } from 'express';
import { SearchManager } from '../../core/search-manager.js';
import path from 'path';

const router = Router();

/**
 * GET /api/cache/list
 * 获取缓存列表
 */
router.get('/', async (req, res) => {
  try {
    const cacheDir = path.join(process.cwd(), 'cache');
    const searchManager = new SearchManager(cacheDir);
    const metadataList = searchManager.list({ sortBy: 'time', order: 'desc' });

    res.json({
      success: true,
      files: metadataList.map(m => ({
        keyword: m.keyword,
        searchTime: m.searchTime,
        comicCount: m.totalComics,
        fileSize: m.fileSize,
      }))
    });
  } catch (error) {
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/cache/:keyword
 * 删除缓存
 */
router.delete('/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const cacheDir = path.join(process.cwd(), 'cache');
    const searchManager = new SearchManager(cacheDir);
    
    searchManager.delete(keyword);
    
    res.json({
      success: true,
      message: `已删除缓存：${keyword}`
    });
  } catch (error) {
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
