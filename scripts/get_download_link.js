// 使用 Playwright 获取临时下载链接（绕过 Cloudflare）
// 使用方法：node get_download_link.js <file_key> <file_name>

import { chromium } from 'playwright';

async function getDownloadLink(fileKey, fileName) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 先访问 wnacg.com 建立 cookie/信任，再请求 Worker API
    console.error(`[脚本] 打开浏览器获取下载链接...`);

    // 先加载一次 wnacg.com 建立会话
    await page.goto('https://www.wnacg.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // 使用 page.evaluate 在浏览器上下文调用 Worker API
    const result = await page.evaluate(({ key, name }) => {
      const workerUrl = 'https://d1.wcdn.date/api/generate-link';
      return fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_key: key, file_name: name })
      })
      .then(resp => {
        if (!resp.ok) {
          return { success: false, error: `HTTP ${resp.status}` };
        }
        return resp.json();
      })
      .then(json => json)
      .catch(e => ({ success: false, error: e.message }));
    }, { key: fileKey, name: fileName });

    console.error(`[脚本] Worker API 返回：${JSON.stringify(result)}`);

    if (result.success && result.url) {
      console.log(JSON.stringify({
        success: true,
        url: result.url
      }));
    } else {
      console.log(JSON.stringify({
        success: false,
        error: result.error || 'Worker API 未返回有效链接'
      }));
    }

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

if (!fileKey || !fileName) {
  console.error('用法：node get_download_link.js <file_key> <file_name>');
  process.exit(1);
}

getDownloadLink(fileKey, fileName);
