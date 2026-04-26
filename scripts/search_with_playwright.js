// 使用 Playwright 搜索漫画
// 使用方法：node search_with_playwright.js "keyword"

import { chromium } from 'playwright';

async function search(keyword, pageNum = 1) {
  console.error('🌐 启动浏览器...');
  
  // 启动浏览器（使用 Playwright 内置的 Chromium）
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const context = await browser.newContext();
  const newPage = await context.newPage();

  try {
    // 打开搜索页面
    const searchUrl = `https://www.wnacg.com/search/index.php?q=${encodeURIComponent(keyword)}&m=&syn=yes&f=_all&s=create_time_DESC&p=${pageNum}`;
    console.error(`📄 打开搜索页面第 ${pageNum} 页...`);
    await newPage.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // 等待页面加载
    console.error('⏳ 等待页面加载...');
    await newPage.waitForTimeout(5000);

    // 提取漫画信息
    const comics = await newPage.evaluate(() => {
      const items = document.querySelectorAll('div.pic_box');
      const result = [];

      items.forEach(item => {
        const link = item.querySelector('a[href*="photos-index"]');
        const img = item.querySelector('img');
        const categoryElem = item.querySelector('[class*="cate-"]');

        if (link && img) {
          const href = link.getAttribute('href') || '';
          const aidMatch = href.match(/aid-(\d+)/);
          const aid = aidMatch ? aidMatch[1] : '';
          
          // 获取分类名称（cate-* 类名对应的文字）
          let category = '';
          if (categoryElem) {
            category = categoryElem.textContent.trim();
            // 如果 textContent 为空，尝试获取类名
            if (!category) {
              const classes = categoryElem.className.split(' ');
              const cateClass = classes.find(c => c.startsWith('cate-'));
              if (cateClass) {
                category = cateClass.replace('cate-', '');
              }
            }
          }
          
          // 获取标题，去除 <em> 标签
          let title = img.getAttribute('alt') || '';
          title = title.replace(/<\/?em>/gi, '').trim();

          result.push({
            aid,
            title,
            author: '',
            category,
            cover_url: img.getAttribute('src') || img.getAttribute('data-src') || '',
            url: 'https://www.wnacg.com' + href,
            pages: 0,
            tags: [],
            upload_date: ''
          });
        }
      });

      return result;
    });

    // 提取总页数
    const totalPages = await newPage.evaluate(() => {
      let maxPage = 1;
      const pageLinks = document.querySelectorAll('div.paginator a');
      pageLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const pMatch = href.match(/p=(\d+)/);
        if (pMatch) {
          const p = parseInt(pMatch[1]);
          if (p > maxPage) maxPage = p;
        }
      });
      return maxPage;
    });

    console.error(`📄 总页数：${totalPages}`);
    console.error(`📊 第 ${pageNum} 页找到 ${comics.length} 部漫画`);

    // 输出结果（JSON 格式）- 只有第一页需要总页数
    console.log(JSON.stringify({
      success: true,
      comics,
      total_pages: pageNum === 1 ? totalPages : 0,
      page: pageNum
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

// 运行
const keyword = process.argv[2];
const page = parseInt(process.argv[3]) || 1;

if (!keyword) {
  console.error('用法：node search_with_playwright.js <keyword> [page]');
  process.exit(1);
}

search(keyword, page);
