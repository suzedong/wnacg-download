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
router.get('/', async (_req, res) => {
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
 * GET /api/cache/comics/:keyword
 * 获取缓存的漫画数据
 */
router.get('/comics/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const cacheDir = path.join(process.cwd(), 'cache');
    const searchManager = new SearchManager(cacheDir);
    const comics = searchManager.load(keyword);
    
    if (!comics) {
      return res.status(404).json({
        success: false,
        error: `未找到关键字 "${keyword}" 的缓存`,
      });
    }
    
    res.json({
      success: true,
      comics,
    });
  } catch (error: any) {
    console.error('获取缓存漫画失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取缓存漫画失败',
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
