// 使用 Playwright 获取下载页信息
// 使用方法：node get_download_info.js <aid>

import { chromium } from 'playwright';

async function getDownloadInfo(aid) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const downloadUrl = `https://www.wnacg.com/download-index-aid-${aid}.html`;
    await page.goto(downloadUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 等待页面关键元素加载完成
    try {
      await page.waitForSelector('#download-area, a[href*="dl1.wn"]', { timeout: 10000 });
    } catch (e) {
      // 即使没找到也继续尝试提取
      await page.waitForTimeout(3000);
    }

    // 提取下载信息
    const info = await page.evaluate(() => {
      // 从 script 标签中提取 FILE_KEY 和 FILE_NAME
      const scripts = document.querySelectorAll('script');
      let fileKey = '';
      let fileName = '';

      for (const script of scripts) {
        const text = script.textContent || '';
        const keyMatch = text.match(/FILE_KEY:\s*["']([^"']+)["']/);
        const nameMatch = text.match(/FILE_NAME:\s*["']([^"']+)["']/);
        if (keyMatch) fileKey = keyMatch[1];
        if (nameMatch) fileName = nameMatch[1];
      }

      // 提取备用线路（Server 2）直接下载链接
      const server2Link = document.querySelector('a[href*="dl1.wn"]');
      const server2Url = server2Link ? server2Link.getAttribute('href') : '';

      return { file_key: fileKey, file_name: fileName, server2_url: server2Url };
    });

    console.log(JSON.stringify({
      success: true,
      ...info
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

const aid = process.argv[2];

if (!aid) {
  console.error('用法：node get_download_info.js <aid>');
  process.exit(1);
}

getDownloadInfo(aid);
