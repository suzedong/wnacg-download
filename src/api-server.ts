/**
 * Web API 服务器
 * 提供 Web 界面调用核心业务逻辑的接口
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsMiddleware } from './web/middleware/cors.js';
import { errorHandler, notFoundHandler } from './web/middleware/error.js';
import searchRoutes from './web/routes/search.js';
import cacheRoutes from './web/routes/cache.js';
import healthRoutes from './web/routes/health.js';
import compareRoutes from './web/routes/compare.js';
import downloadRoutes from './web/routes/download.js';
import configRoutes from './web/routes/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 中间件
app.use(corsMiddleware({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../src/ui')));

// 根路由 - 欢迎页面（简化版）
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WNACG API</title>
</head>
<body style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
  <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 600px;">
    <h1 style="color: #667eea; text-align: center;">🚀 WNACG Downloader API</h1>
    <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
      ✅ 服务器运行正常
    </div>
    <h2 style="color: #667eea;">🧪 测试页面</h2>
    <p><a href="/test-api.html" style="color: #667eea; font-size: 18px;">👉 点击打开 API 测试页面</a></p>
    <h2 style="color: #667eea;">📡 API 端点</h2>
    <ul style="line-height: 2;">
      <li><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">GET /api/health</code> - 健康检查</li>
      <li><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">POST /api/search</code> - 搜索漫画</li>
      <li><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">GET /api/config</code> - 获取配置</li>
    </ul>
  </div>
</body>
</html>
  `);
});

// 注册路由
app.use('/api/search', searchRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/config', configRoutes);
app.use('/api', healthRoutes);

// 错误处理
app.use(errorHandler);
app.use(notFoundHandler);

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
║  POST /api/compare        - 对比漫画                   ║
║  POST /api/download       - 下载漫画                   ║
║  POST /api/download/cancel - 取消下载                  ║
║  GET  /api/config         - 获取所有配置               ║
║  GET  /api/config/:key    - 获取配置项                 ║
║  POST /api/config         - 设置配置项                 ║
║  GET  /api/health         - 健康检查                   ║
╚════════════════════════════════════════════════════════╝
  `);
});
