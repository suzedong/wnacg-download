/**
 * 下载 API 路由
 */

import { Router } from 'express';
import { Downloader } from '../../core/downloader.js';
import { configManager } from '../../config.js';
import { wnacgConfig } from '../../config/wnacg.config.js';

const router = Router();

// 存储当前下载器实例
const activeDownloaders = new Map<string, Downloader>();

/**
 * POST /api/download
 * 下载漫画
 */
router.post('/', async (req, res) => {
  const { comics, storagePath } = req.body;

  if (!comics || !Array.isArray(comics) || comics.length === 0) {
    res.json({ success: false, error: '请选择要下载的漫画' });
    return;
  }

  try {
    console.log(`开始下载 ${comics.length} 部漫画`);

    const downloader = new Downloader({
      storagePath: storagePath || configManager.get('defaultStoragePath'),
      concurrentDownloads: configManager.get('concurrentDownloads'),
      retryTimes: 3,
      retryInterval: 30,
      proxy: configManager.get('defaultProxy'),
    });

    // 存储下载器实例（用于取消）
    const downloadId = new Date().getTime().toString();
    activeDownloaders.set(downloadId, downloader);

    // 监听进度事件
    downloader.on('progress', (progress: any) => {
      console.log(`下载进度：${progress.aid} - ${progress.downloaded}/${progress.total}`);
      // TODO: 通过 WebSocket 或 SSE 推送进度到前端
    });

    // 监听完成事件
    downloader.on('completed', (result: any) => {
      console.log(`下载完成：成功=${result.success.length}, 失败=${result.failed.length}`);
      activeDownloaders.delete(downloadId);
    });

    // 监听错误事件
    downloader.on('error', (error: any) => {
      console.error(`下载错误：${error.message}`);
    });

    // 执行下载
    const result = await downloader.downloadComics(comics);

    res.json({
      success: true,
      result: {
        success: result.success,
        failed: result.failed,
      }
    });

  } catch (error) {
    console.error('下载失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /cancel
 * 取消下载
 */
router.post('/cancel', async (req, res) => {
  const { downloadId } = req.body;

  if (!downloadId) {
    res.json({ success: false, error: '缺少下载 ID' });
    return;
  }

  try {
    const downloader = activeDownloaders.get(downloadId);
    if (!downloader) {
      res.json({ success: false, error: '下载不存在' });
      return;
    }

    // TODO: 实现取消下载方法
    // await downloader.cancel();
    activeDownloaders.delete(downloadId);

    res.json({
      success: true,
      message: '已取消下载'
    });

  } catch (error) {
    console.error('取消下载失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
