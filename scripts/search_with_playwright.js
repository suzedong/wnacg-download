// 使用 Playwright 搜索漫画
// 使用方法：node search_with_playwright.js "keyword"

import { chromium } from 'playwright';

// 分类映射表
const CATEGORY_MAP = {
  'cate-1': '同人誌／漢化',
  'cate-2': '同人誌／CG畫集',
  'cate-3': '寫真 & Cosplay',
  'cate-4': '',
  'cate-5': '同人誌',
  'cate-6': '單行本',
  'cate-7': '雜誌&短篇',
  'cate-8': '',
  'cate-9': '單行本／漢化',
  'cate-10': '雜誌&短篇／漢化',
  'cate-11': '',
  'cate-12': '同人誌／日語',
  'cate-13': '單行本／日語',
  'cate-14': '雜誌&短篇／日語',
  'cate-15': '',
  'cate-16': '同人誌／English',
  'cate-17': '單行本／English',
  'cate-18': '雜誌&短篇／English',
  'cate-19': '韓漫',
  'cate-20': '韓漫／漢化',
  'cate-21': '韓漫／生肉',
  'cate-22': '3D&漫畫',
  'cate-23': '3D&漫畫／漢化',
  'cate-24': '3D&漫畫／其他',
  'cate-37': 'AI&圖集'
};

function getCategoryFromElement(element) {
  const categoryElem = element.querySelector('[class*="cate-"]');
  if (!categoryElem) return '';
  
  const classes = categoryElem.className.split(' ');
  const cateClass = classes.find(c => c.startsWith('cate-'));
  if (!cateClass) return '';
  
  return CATEGORY_MAP[cateClass] || '';
}

async function search(keyword, pageNum = 1) {
  console.error(`[脚本] 启动浏览器...`);
  
  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const context = await browser.newContext();
  const newPage = await context.newPage();

  try {
    // 打开搜索页面
    const searchUrl = `https://www.wnacg.com/search/index.php?q=${encodeURIComponent(keyword)}&m=&syn=yes&f=_all&s=create_time_DESC&p=${pageNum}`;
    console.error(`[脚本] 爬取第 ${pageNum} 页...`);
    await newPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待页面关键元素加载完成
    try {
      await newPage.waitForSelector('div.pic_box', { timeout: 10000 });
    } catch (e) {
      // 如果没有找到元素，等待一小段时间后继续
      await newPage.waitForTimeout(3000);
    }

    // 提取漫画信息
    const comics = await newPage.evaluate(() => {
      const CATEGORY_MAP = {
        'cate-1': '同人誌／漢化',
        'cate-2': '同人誌／CG畫集',
        'cate-3': '寫真 & Cosplay',
        'cate-4': '',
        'cate-5': '同人誌',
        'cate-6': '單行本',
        'cate-7': '雜誌&短篇',
        'cate-8': '',
        'cate-9': '單行本／漢化',
        'cate-10': '雜誌&短篇／漢化',
        'cate-11': '',
        'cate-12': '同人誌／日語',
        'cate-13': '單行本／日語',
        'cate-14': '雜誌&短篇／日語',
        'cate-15': '',
        'cate-16': '同人誌／English',
        'cate-17': '單行本／English',
        'cate-18': '雜誌&短篇／English',
        'cate-19': '韓漫',
        'cate-20': '韓漫／漢化',
        'cate-21': '韓漫／生肉',
        'cate-22': '3D&漫畫',
        'cate-23': '3D&漫畫／漢化',
        'cate-24': '3D&漫畫／其他',
        'cate-37': 'AI&圖集'
      };

      const items = document.querySelectorAll('div.pic_box');
      const result = [];

      items.forEach(item => {
        const link = item.querySelector('a[href*="photos-index"]');
        const img = item.querySelector('img');
        const infoCol = item.parentElement?.querySelector('.info_col');

        if (link && img) {
          const href = link.getAttribute('href') || '';
          const aidMatch = href.match(/aid-(\d+)/);
          const aid = aidMatch ? aidMatch[1] : '';
          
          // 获取分类名称（cate-* 类名在 div.pic_box 元素本身上）
          let category = '';
          const classes = item.className.split(' ');
          const cateClass = classes.find(c => c.startsWith('cate-'));
          if (cateClass) {
            category = CATEGORY_MAP[cateClass] || '';
          }
          
          // 获取标题，去除 <em> 标签
          let title = img.getAttribute('alt') || '';
          title = title.replace(/<\/?em>/gi, '').trim();

          // 提取图片数量和创建日期
          let pages = 0;
          let upload_date = '';
          if (infoCol) {
            const infoText = infoCol.textContent.trim();
            // 提取图片数量：如 "30張圖片"
            const pagesMatch = infoText.match(/(\d+)張圖片/);
            if (pagesMatch) {
              pages = parseInt(pagesMatch[1]);
            }
            // 提取创建日期：如 "創建於2025-10-08 02:39:28"
            const dateMatch = infoText.match(/創建於(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
            if (dateMatch) {
              upload_date = dateMatch[1].trim();
            }
          }

          result.push({
            aid,
            title,
            author: '',
            category,
            cover_url: img.getAttribute('src') || img.getAttribute('data-src') || '',
            url: 'https://www.wnacg.com' + href,
            pages,
            tags: [],
            upload_date
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

    console.error(`[脚本] 第 ${pageNum} 页找到 ${comics.length} 部漫画`);

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
