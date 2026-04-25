/**
 * WNACG Downloader API 服务器启动脚本
 * 使用 tsx 运行 TypeScript 文件
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔧 正在启动 API 服务器...');
console.log('📁 项目目录:', projectRoot);

// 使用 shell 模式运行 npx tsx
const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx tsx src/api-server.ts' : 'npx tsx src/api-server.ts';
const args = process.argv.slice(2).join(' ');
const fullCommand = `${command} ${args}`.trim();

const tsxProcess = spawn(fullCommand, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' },
});

tsxProcess.on('error', (err) => {
  console.error('❌ 启动 API 服务器失败:', err);
  process.exit(1);
});

tsxProcess.on('exit', (code, signal) => {
  console.log(`⚠️  API 服务器已退出，代码: ${code}, 信号: ${signal}`);
  if (code !== 0 && code !== null) {
    console.error('❌ API 服务器异常退出');
  }
  process.exit(code || 0);
});

// 转发信号
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM，正在关闭 API 服务器...');
  tsxProcess.kill('SIGTERM');
});
process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT，正在关闭 API 服务器...');
  tsxProcess.kill('SIGINT');
});
