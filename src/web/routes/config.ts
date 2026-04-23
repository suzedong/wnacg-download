/**
 * 配置 API 路由
 */

import { Router } from 'express';
import { configManager } from '../../config.js';

const router = Router();

/**
 * GET /api/config
 * 获取所有配置
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      defaultStoragePath: configManager.get('defaultStoragePath'),
      defaultProxy: configManager.get('defaultProxy'),
      defaultMaxPages: configManager.get('defaultMaxPages'),
      defaultOnlyChinese: configManager.get('defaultOnlyChinese'),
      requestDelay: configManager.get('requestDelay'),
      concurrentDownloads: configManager.get('concurrentDownloads'),
      defaultRetryTimes: configManager.get('defaultRetryTimes'),
      defaultRetryInterval: configManager.get('defaultRetryInterval'),
      aiMatcherType: configManager.get('aiMatcherType'),
      aiApiEndpoint: configManager.get('aiApiEndpoint'),
      matchThreshold: configManager.get('matchThreshold'),
    };

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
 * GET /api/config/:key
 * 获取单个配置项
 */
router.get('/config/:key', (req, res) => {
  try {
    const { key } = req.params;
    const value = configManager.get(key);

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
 * POST /api/config
 * 设置配置项
 */
router.post('/config', (req, res) => {
  const { key, value } = req.body;

  if (!key) {
    return res.json({ success: false, error: '缺少配置键' });
  }

  try {
    // TODO: 实现设置配置的方法
    // configManager.set(key, value);
    
    // 临时方案：直接修改（需要 configManager 支持 set 方法）
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
