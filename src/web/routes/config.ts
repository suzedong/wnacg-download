/**
 * 配置 API 路由
 */

import { Router } from 'express';
import { configManager } from '../../config.js';

const router = Router();

/**
 * GET /
 * 获取所有配置
 */
router.get('/', (req, res) => {
  try {
    const config = configManager.getAll();

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('获取配置失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /:key
 * 获取单个配置项
 */
router.get('/:key', (req, res) => {
  try {
    const { key } = req.params;
    // 使用 any 类型绕过类型检查
    const value = configManager.get(key as any);

    res.json({
      success: true,
      key,
      value
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /
 * 设置配置项
 */
router.post('/', (req, res) => {
  const { key, value } = req.body;

  if (!key) {
    res.json({ success: false, error: '缺少配置键' });
    return;
  }

  try {
    // 使用 any 类型绕过类型检查
    configManager.set(key as any, value);
    
    console.log(`设置配置：${key} = ${JSON.stringify(value)}`);

    res.json({
      success: true,
      message: `配置已更新：${key}`
    });
  } catch (error) {
    console.error('设置配置失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
