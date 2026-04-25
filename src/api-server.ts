/**
 * Web API 服务器
 * 提供 Web 界面调用核心业务逻辑的接口
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsMiddleware } from './web/middleware/cors.js';
import searchRoutes from './web/routes/search.js';
import cacheRoutes from './web/routes/cache.js';
import healthRoutes from './web/routes/health.js';
import compareRoutes from './web/routes/compare.js';
import downloadRoutes from './web/routes/download.js';
import configRoutes from './web/routes/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// 从命令行参数获取端口，默认为 3000
const PORT = parseInt(process.argv[2] || '3000', 10);

// 中间件
app.use(corsMiddleware({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// 欢迎页面
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WNACG API 测试</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .container { background: rgba(255, 255, 255, 0.95); padding: 30px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); color: #333; }
    h1 { color: #667eea; text-align: center; }
    .status { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center; }
    .test-section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 10px; }
    button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; margin: 5px; }
    button:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
    .result { margin-top: 10px; padding: 10px; background: white; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; }
    .success { color: #28a745; } .error { color: #dc3545; }
    input { padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 5px; font-size: 14px; margin: 5px; width: 200px; }
    .endpoints { line-height: 2; } code { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 WNACG Downloader API</h1>
    <div class="status">✅ 服务器运行正常</div>
    <h2 style="color: #667eea;">📡 API 端点</h2>
    <div class="endpoints">
      <li><code>GET /api/health</code> - 健康检查</li>
      <li><code>POST /api/search</code> - 搜索漫画</li>
      <li><code>GET /api/cache</code> - 获取缓存列表</li>
      <li><code>POST /api/compare</code> - 对比漫画</li>
      <li><code>GET /api/config</code> - 获取配置</li>
    </div>
    <div class="test-section">
      <h3>🧪 快速测试</h3>
      <button onclick="testHealth()">健康检查</button>
      <button onclick="testConfig()">获取配置</button>
      <button onclick="testCache()">缓存列表</button>
      <div id="quick-result" class="result"></div>
    </div>
    <div class="test-section">
      <h3>🔍 搜索漫画</h3>
      <input type="text" id="search-keyword" placeholder="输入作者名..." value="TYPE90" />
      <button onclick="testSearch()">搜索</button>
      <div id="search-result" class="result"></div>
    </div>
  </div>
  <script>
    async function testHealth() {
      const resultDiv = document.getElementById('quick-result');
      try { resultDiv.innerHTML = '测试中...'; const response = await fetch('/api/health'); const data = await response.json(); resultDiv.innerHTML = '<pre class="success">' + JSON.stringify(data, null, 2) + '</pre>'; }
      catch (error) { resultDiv.innerHTML = '<pre class="error">错误：' + error.message + '</pre>'; }
    }
    async function testConfig() {
      const resultDiv = document.getElementById('quick-result');
      try { resultDiv.innerHTML = '加载中...'; const response = await fetch('/api/config'); const data = await response.json(); resultDiv.innerHTML = '<pre class="success">' + JSON.stringify(data, null, 2) + '</pre>'; }
      catch (error) { resultDiv.innerHTML = '<pre class="error">错误：' + error.message + '</pre>'; }
    }
    async function testCache() {
      const resultDiv = document.getElementById('quick-result');
      try { resultDiv.innerHTML = '加载中...'; const response = await fetch('/api/cache'); const data = await response.json(); if (data.success) { resultDiv.innerHTML = '<pre class="success">缓存文件数：' + data.files.length + '\\n\\n' + data.files.map(f => '- ' + f.keyword + ' (' + f.comicCount + '部)').join('\\n') + '</pre>'; } else { resultDiv.innerHTML = '<pre class="error">错误：' + data.error + '</pre>'; } }
      catch (error) { resultDiv.innerHTML = '<pre class="error">错误：' + error.message + '</pre>'; }
    }
    async function testSearch() {
      const resultDiv = document.getElementById('search-result'); const keyword = document.getElementById('search-keyword').value;
      if (!keyword) { resultDiv.innerHTML = '<pre class="error">请输入关键字</pre>'; return; }
      try { resultDiv.innerHTML = '搜索中...'; const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword, maxPages: 1, onlyChinese: true }) }); const data = await response.json(); if (data.success) { resultDiv.innerHTML = '<pre class="success">' + data.message + '\\n找到 ' + data.comics.length + ' 部漫画\\n\\n前 5 部:\\n' + data.comics.slice(0, 5).map(c => '- ' + c.title).join('\\n') + '</pre>'; } else { resultDiv.innerHTML = '<pre class="error">错误：' + data.error + '</pre>'; } }
      catch (error) { resultDiv.innerHTML = '<pre class="error">错误：' + error.message + '</pre>'; }
    }
  </script>
</body>
</html>
  `);
});

// 测试路由
app.get('/app/test', (_req, res) => {
  res.json({ message: 'Vue app static serving works!' });
});

// 静态文件服务
const staticPath = path.join(__dirname, '../dist/ui');
const fs = await import('fs');

if (fs.existsSync(staticPath)) {
  // Vue 应用
  app.use('/app', express.static(staticPath));
  // 资源文件（Vue 使用 /assets/ 路径）
  app.use('/assets', express.static(path.join(staticPath, 'assets')));
  console.log('✅ Vue 应用在 /app 路径下');
}

// API 路由
app.use('/api/health', healthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/config', configRoutes);

// 启动服务器
app.listen(PORT, () => {
  console.log(`
🚀 WNACG API 服务器已启动

📍 欢迎页面：http://localhost:${PORT}/
📍 Vue 应用：http://localhost:${PORT}/app/

📡 API 端点:
  POST /api/search    - 搜索漫画
  GET  /api/cache     - 获取缓存列表
  POST /api/compare   - 对比漫画
  POST /api/download  - 下载漫画
  GET  /api/config    - 获取配置
  GET  /api/health    - 健康检查
`);
});
