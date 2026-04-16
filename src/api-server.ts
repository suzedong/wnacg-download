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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 中间件
app.use(corsMiddleware({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// 注册路由
app.use('/api/search', searchRoutes);
app.use('/api/cache', cacheRoutes);
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
║  GET  /api/health         - 健康检查                   ║
╚════════════════════════════════════════════════════════╝
  `);
});
