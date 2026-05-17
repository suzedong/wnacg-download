// 使用 Playwright 浏览器直接下载文件（绕过 Cloudflare TLS 指纹验证）
// 流程：建立会话 → 调用 Worker API 获取链接 → 浏览器内下载
// 使用方法：node download_via_playwright.js <file_key> <file_name> <output_path>

import { chromium } from 'playwright';
import fs from 'fs';

async function downloadFile(fileKey, fileName, outputPath) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const context = await browser.newContext({
    acceptDownloads: true
  });
  const page = await context.newPage();

  try {
    // Step 1: 访问 wnacg.com 建立会话
    console.error('Step 1: 访问 wnacg.com 建立会话');
    await page.goto('https://www.wnacg.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Step 2: 调用 Worker API 获取临时下载链接
    console.error('Step 2: 调用 Worker API 获取下载链接');
    const result = await page.evaluate(({ key, name }) => {
      return fetch('https://d1.wcdn.date/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_key: key, file_name: name })
      })
      .then(r => r.json())
      .catch(e => ({ success: false, error: e.message }));
    }, { key: fileKey, name: fileName });

    if (!result.success || !result.url) {
      console.log(JSON.stringify({
        success: false,
        error: result.error || 'Worker API 未返回有效链接'
      }));
      return;
    }

    const downloadUrl = result.url;
    console.error('Step 3: 开始下载...');

    // Step 3: 触发下载
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    await page.goto(downloadUrl, { waitUntil: 'commit', timeout: 120000 }).catch(() => {});
    const download = await downloadPromise;

    // 保存到指定路径
    await download.saveAs(outputPath);
    const stat = fs.statSync(outputPath);

    console.error(`✅ 下载完成：${stat.size} 字节（${(stat.size / 1024 / 1024).toFixed(2)} MB）`);
    console.log(JSON.stringify({
      success: true,
      size: stat.size,
      path: outputPath
    }));
  } catch (error) {
    console.error(`❌ 错误：${error.message}`);
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
  } finally {
    await browser.close();
  }
}

const fileKey = process.argv[2];
const fileName = process.argv[3];
const outputPath = process.argv[4];

if (!fileKey || !fileName || !outputPath) {
  console.error('用法：node download_via_playwright.js <file_key> <file_name> <output_path>');
  process.exit(1);
}

downloadFile(fileKey, fileName, outputPath);
