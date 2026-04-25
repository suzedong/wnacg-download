/**
 * 健康检查 API 路由
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/health
 * 健康检查
 */
router.get('/', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'WNACG Downloader API'
  });
});

export default router;
