/**
 * 简易 API 服务器
 * 提供 Web 界面调用核心业务逻辑的接口
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WNACGScraper } from './core/scraper.js';
import { SearchManager } from './core/search-manager.js';
import { configManager } from './config.js';
import { wnacgConfig } from './config/wnacg.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// 搜索 API
app.post('/api/search', async (req, res) => {
  const { keyword, maxPages = 1, onlyChinese = true, force = false } = req.body;

  if (!keyword) {
    return res.json({ success: false, error: '请输入关键字' });
  }

  try {
    const cacheDir = path.join(process.cwd(), 'cache');
    const searchManager = new SearchManager(cacheDir);

    // 检查缓存
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
      comics,
      totalPages: parseInt(maxPages.toString()),
      totalComics: comics.length,
    });

    console.log(`搜索完成：找到 ${comics.length} 部漫画`);
    res.json({
      success: true,
      comics,
      cached: false,
      message: `找到 ${comics.length} 部漫画`
    });

  } catch (error) {
    console.error('搜索失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 获取缓存列表 API
app.get('/api/cache/list', async (req, res) => {
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

// 删除缓存 API
app.delete('/api/cache/:keyword', async (req, res) => {
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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║          WNACG API 服务器已启动                        ║
╠════════════════════════════════════════════════════════╣
║  本地访问：http://localhost:${PORT}                    ║
║  测试页面：http://localhost:${PORT}/test-search.html   ║
║                                                        ║
║  API 端点:                                             ║
║  POST /api/search         - 搜索漫画                   ║
║  GET  /api/cache/list     - 获取缓存列表               ║
║  DELETE /api/cache/:key   - 删除缓存                   ║
║  GET  /api/health         - 健康检查                   ║
╚════════════════════════════════════════════════════════╝
  `);
});
