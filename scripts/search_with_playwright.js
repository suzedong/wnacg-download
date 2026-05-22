// 使用 Playwright 搜索漫画
// 使用方法：node search_with_playwright.js "keyword"

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取配置路径
function getConfigPath() {
  // 优先使用环境变量指定的路径
  if (process.env.WNACG_CONFIG_PATH) {
    console.error(`[脚本] 使用环境变量指定的配置: ${process.env.WNACG_CONFIG_PATH}`);
    if (existsSync(process.env.WNACG_CONFIG_PATH)) {
      return process.env.WNACG_CONFIG_PATH;
    }
  }
  
  // 尝试多个可能的配置位置
  const possiblePaths = [
    // 开发环境（相对于项目根目录）
    join(process.cwd(), 'config', 'config.json'),
    // 构建后（相对于脚本位置）
    join(dirname(fileURLToPath(import.meta.url)), '..', 'config', 'config.json'),
  ];
  
  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  
  console.error(`[脚本] 配置文件未找到，尝试路径:`, possiblePaths);
  return null;
}

// 读取配置
function loadConfig() {
  const configPath = getConfigPath();
  if (!configPath) {
    console.error(`[脚本] 配置文件未找到，使用默认设置`);
    return { use_system_chrome: false };
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    console.error(`[脚本] 已加载配置: ${configPath}`);
    return config;
  } catch (e) {
    console.error(`[脚本] 读取配置失败: ${e.message}，使用默认设置`);
    return { use_system_chrome: false };
  }
}

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
  // 读取配置
  const config = loadConfig();
  const useSystemChrome = config.use_system_chrome || false;
  
  console.error(`[脚本] 启动浏览器...`);
  console.error(`[脚本] 浏览器模式: ${useSystemChrome ? '系统 Chrome' : '内置 Chromium'}`);
  
  let browser;
  
  const launchOptions = {
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check']
  };
  
  if (useSystemChrome) {
    // 使用系统 Chrome
    console.error(`[脚本] 尝试使用系统 Chrome...`);
    
    // macOS 上的 Chrome 路径
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ];
    
    let chromeExecutable = null;
    for (const path of chromePaths) {
      if (existsSync(path)) {
        chromeExecutable = path;
        break;
      }
    }
    
    if (chromeExecutable) {
      console.error(`[脚本] 找到系统 Chrome: ${chromeExecutable}`);
      launchOptions.executablePath = chromeExecutable;
    } else {
      console.error(`[脚本] 未找到系统 Chrome，尝试使用内置 Chromium`);
    }
  }
  
  // 尝试启动浏览器
  try {
    browser = await chromium.launch(launchOptions);
  } catch (launchError) {
    console.error(`[脚本] 浏览器启动失败: ${launchError.message}`);
    
    if (useSystemChrome) {
      console.error(`[脚本] 系统 Chrome 不可用，尝试使用内置 Chromium...`);
      // 重新尝试使用内置 Chromium
      delete launchOptions.executablePath;
      try {
        browser = await chromium.launch(launchOptions);
      } catch (innerError) {
        throw new Error(`浏览器启动失败：${innerError.message}\n请在设置中安装 Chromium 或启用"使用系统 Chrome"并确保已安装 Chrome。`);
      }
    } else {
      throw new Error(`浏览器启动失败：${launchError.message}\n请在设置页面中安装 Chromium。`);
    }
  }

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
          
          // 获取标题，清理 HTML 标签和实体
          let title = img.getAttribute('alt') || '';
          // 去除 <em> 标签
          title = title.replace(/<\/?em>/gi, '');
          // 清理 HTML 实体
          title = title.replace(/&nbsp;/g, ' ')
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"')
                       .replace(/&#39;/g, "'")
                       .replace(/&#x27;/g, "'")
                       .replace(/&#124;/g, '|');
          // 去除多余空格并trim（保留 [] 和 () 前缀）
          title = title.replace(/\s+/g, ' ').trim();

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
