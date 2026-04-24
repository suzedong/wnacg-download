import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import type { Comic, SearchOptions } from '../types/index.js';
import { SiteConfig } from '../types/config.js';
import winston from 'winston';
import type { ISearchService } from './interfaces.js';
import { configManager } from '../config.js';

const createLogger = () => winston.createLogger({
  level: 'info',
  silent: process.env.JSON_MODE === 'true', // JSON 模式下完全静音
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

let _logger: winston.Logger | null = null;

const getLogger = () => {
  if (!_logger) {
    _logger = createLogger();
  }
  return _logger;
};

export class WNACGScraper implements ISearchService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private proxy?: string;
  private headless: boolean;
  private config: SiteConfig;

  constructor(config: SiteConfig, proxy?: string, headless: boolean = false) {
    this.config = config;
    this.proxy = proxy;
    this.headless = headless;
  }

  async initialize(): Promise<void> {
    const browserArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-extensions',
      '--disable-infobars',
      '--start-maximized',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ];

    if (this.proxy) {
      browserArgs.push(`--proxy-server=${this.proxy}`);
    }

    this.browser = await chromium.launch({
      headless: this.headless, // 使用传入的 headless 参数
      args: browserArgs,
    });

    this.page = await this.browser.newPage();

    // 增加更多的反检测措施
    await this.page.addInitScript(() => {
      // 禁用 webdriver 检测
      // @ts-ignore
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // 禁用 Chrome 自动化扩展检测
      // @ts-ignore
      Object.defineProperty(navigator, 'chrome', {
        get: () => {
          return {
            runtime: {},
            // 其他属性...
          };
        },
      });
      
      // 禁用 navigator.languages 检测
      // @ts-ignore
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en-US', 'en'],
      });
      
      // 禁用 navigator.plugins 检测
      // @ts-ignore
      Object.defineProperty(navigator, 'plugins', {
        get: () => [{
          0: { type: 'application/x-shockwave-flash', suffixes: 'swf', description: 'Shockwave Flash 32.0 r0' },
          length: 1,
          namedItem: function (_name: string) { return this[0]; }
        }],
      });
    });
  }

  async handleCloudflare(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // 等待 Cloudflare 验证页面加载
      await this.page.waitForSelector('#cf-wrapper', { timeout: 15000 });
      
      // 检查是否需要验证码
      const captchaElement = await this.page.$('#cf-captcha-container');
      if (captchaElement) {
        getLogger().info('需要手动完成 Cloudflare 验证码');
        getLogger().info('请在浏览器中完成验证码，然后按 Enter 继续...');
        
        // 等待用户完成验证码
        await new Promise(resolve => {
          process.stdin.once('data', resolve);
        });
        
        // 等待页面重定向
        await this.page.waitForNavigation({ timeout: 30000 });
        return true;
      }
      
      // 检查是否有挑战页面
      const challengeElement = await this.page.$('.cf-challenge-form');
      if (challengeElement) {
        getLogger().info('检测到 Cloudflare 挑战，等待自动解决...');
        
        // 尝试点击挑战按钮
        const challengeButton = await this.page.$('.cf-button');
        if (challengeButton) {
          await challengeButton.click();
        }
        
        // 等待挑战解决
        await this.page.waitForNavigation({ timeout: 60000 });
        return true;
      }
      
      // 检查是否有等待页面
      const waitingElement = await this.page.$('.cf-waiting-room');
      if (waitingElement) {
        getLogger().info('检测到 Cloudflare 等待页面，等待...');
        
        // 等待页面重定向
        await this.page.waitForNavigation({ timeout: 120000 });
        return true;
      }
      
      return false;
    } catch (error) {
      // 超时或其他错误，可能已经通过了验证
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private getCategoryByCateId(cateId: string): string {
    return this.config.categoryMap[cateId] || '';
  }

  private buildSearchUrl(keyword: string, page: number): string {
    const encodedKeyword = encodeURIComponent(keyword);
    return this.config.baseUrl + this.config.urls.search
      .replace('{keyword}', encodedKeyword)
      .replace('{page}', page.toString());
  }

  private buildComicDetailUrl(aid: string): string {
    return this.config.baseUrl + this.config.urls.comicDetail
      .replace('{aid}', aid);
  }

  async search(options: SearchOptions): Promise<Comic[]> {
    if (!this.page) {
      await this.initialize();
    }

    const { author, onlyChinese = true, maxPages } = options;
    const comics: Comic[] = [];
    let totalPages = 1;

    // 显示搜索配置
    getLogger().info(`搜索配置:`);
    getLogger().info(`  关键字: ${author}`);
    getLogger().info(`  代理: ${this.proxy || '无'}`);
    getLogger().info(`  最大页数: ${maxPages || '不限制'}`);
    getLogger().info(`  请求间隔: ${configManager.get('requestDelay')}ms`);
    getLogger().info(`  仅汉化版: ${onlyChinese ? '是' : '否'}`);

    // 先获取第一页，提取总页数
    getLogger().info('正在爬取第 1 页...');
    const firstPageUrl = this.buildSearchUrl(author, 1);

    if (!this.page) throw new Error('Page not initialized');
    
    getLogger().info(`正在从网站获取第 1 页...`);
    await this.page.goto(firstPageUrl, { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // 处理 Cloudflare 验证码
    await this.handleCloudflare();
    
    // 等待页面稳定
    await this.page.waitForTimeout(3000);
    
    // 确保页面已经完成导航
    try {
      await this.page.waitForSelector('body', { timeout: 10000 });
    } catch (error) {
      // 忽略错误，继续执行
    }

    let html = await this.page.content();
    const $ = cheerio.load(html);

    // 提取总页数
    const pageLinks = $('a[href*="&p="]');
    const pageNumbers: number[] = [];
    
    pageLinks.each((_, el) => {
      const text = $(el).text().trim();
      const pageNum = parseInt(text);
      if (!isNaN(pageNum)) {
        pageNumbers.push(pageNum);
      }
    });
    
    if (pageNumbers.length > 0) {
      totalPages = Math.max(...pageNumbers);
      getLogger().info(`共找到 ${totalPages} 页`);
    }

    // 计算实际需要爬取的页数（考虑 maxPages 限制）
    let pagesToCrawl = totalPages;
    if (maxPages && maxPages > 0) {
      pagesToCrawl = Math.min(totalPages, maxPages);
      if (pagesToCrawl < totalPages) {
        getLogger().info(`限制爬取 ${maxPages} 页，实际爬取 ${pagesToCrawl} 页（共 ${totalPages} 页）`);
      }
    }
    
    // 解析第一页的漫画
    const firstPageCount = comics.length;
    await this.parseComicPage(html, comics, onlyChinese, author);
    getLogger().info(`第 1 页找到 ${comics.length - firstPageCount} 部漫画`);
    
    const remainingPages = pagesToCrawl - 1; // 已经爬取了第一页

    if (remainingPages > 0) {
      getLogger().info(`正在并行爬取剩余 ${remainingPages} 页...`);
      
      // 生成剩余页面的 URL
      const pageUrls = [];
      for (let i = 2; i <= pagesToCrawl; i++) {
        pageUrls.push(this.buildSearchUrl(author, i));
      }

      // 并行爬取剩余页面
      const pagePromises = pageUrls.map(async (url) => {
        try {
          const newPage = await this.browser?.newPage();
          if (!newPage) throw new Error('Failed to create new page');
          
          const pageNum = url.split('&p=')[1];
          getLogger().info(`正在从网站获取第 ${pageNum} 页...`);
          await newPage.goto(url, { 
            waitUntil: 'networkidle',
            timeout: 60000
          });
          
          // 等待页面稳定
          await newPage.waitForTimeout(3000);
          
          const pageHtml = await newPage.content();
          await newPage.close();
          
          return { pageNum, html: pageHtml };
        } catch (error) {
          getLogger().error(`Error crawling page ${url}: ${error}`);
          return null;
        }
      });

      // 等待所有页面爬取完成
      const pageResults = await Promise.all(pagePromises);
      
      // 解析每个页面的漫画信息
      for (const result of pageResults) {
        if (result) {
          const countBefore = comics.length;
          await this.parseComicPage(result.html, comics, onlyChinese, author);
          getLogger().info(`第 ${result.pageNum} 页找到 ${comics.length - countBefore} 部漫画`);
        }
      }
    }

    getLogger().info(`共找到 ${comics.length} 部漫画`);
    return comics;
  }

  private async parseComicPage(html: string, comics: Comic[], onlyChinese: boolean, author: string): Promise<void> {
    const $ = cheerio.load(html);
    const selectors = this.config.selectors.searchResult;

    // 查找漫画项（使用配置的选择器）
    let comicBoxes = $(selectors.comicBox[0]);
    
    // 尝试备用选择器
    for (const fallbackSelector of selectors.fallbackSelectors) {
      if (comicBoxes.length === 0) {
        comicBoxes = $(fallbackSelector);
      }
    }
    
    if (comicBoxes.length === 0) {
      // 尝试更通用的选择器，查找包含漫画链接的元素
      const links = $(selectors.titleLink);
      if (links.length > 0) {
        comicBoxes = links;
      }
    }
    
    if (comicBoxes.length === 0) {
      getLogger().warn('No comics found on this page');
      return;
    }

    // 用于去重的 Set（避免重复添加相同的漫画）
    const addedAids = new Set<string>();

    comicBoxes.each((_, element) => {
      const $element = $(element);
      
      // 查找漫画链接
      const titleEl = $element.find(selectors.titleLink);
      if (titleEl.length === 0) return;
      
      const urlEl = titleEl.attr('href');
      if (!urlEl) return;

      // 从 URL 中提取 aid
      const aidMatch = urlEl.match(/aid-(\d+)/);
      const aid = aidMatch ? aidMatch[1] : '';
      
      // 去重：如果已经添加过相同 aid 的漫画，跳过
      if (aid && addedAids.has(aid)) {
        return;
      }
      
      // 获取标题
      let title = titleEl.attr('title') || titleEl.text().trim();
      // 去除 HTML 标签
      title = title.replace(/<[^>]+>/g, '');
      title = title.trim();
      
      // 分类信息通过多种方式判断
      let category = '';
      
      // 1. 首先检查 $element 本身是否包含 cate-* 类名
      const elementClassList = $element.attr('class') || '';
      let cateMatch = elementClassList.match(/cate-(\d+)/);
      
      if (cateMatch) {
        const cateId = cateMatch[1];
        category = this.getCategoryByCateId(cateId);
        getLogger().debug(`Found category via element class: ${category} (cate-${cateId})`);
      } else {
        // 2. 查找包含 cate-* 类名的子元素
        const cateElement = $element.find(selectors.categoryClass);
        if (cateElement.length > 0) {
          const cateClassList = cateElement.attr('class') || '';
          cateMatch = cateClassList.match(/cate-(\d+)/);
          if (cateMatch) {
            const cateId = cateMatch[1];
            category = this.getCategoryByCateId(cateId);
            getLogger().debug(`Found category via child element: ${category} (cate-${cateId})`);
          }
        }
      }
      
      // 3. 如果没有找到 cate-* 类名，尝试从标题、描述中提取
      if (!category) {
        // 获取整个元素的文本内容
        const fullText = $element.text().toLowerCase();
        
        // 检查是否包含汉化相关关键词
        if (title.includes('漢化') || title.includes('汉化') || 
            fullText.includes('漢化') || fullText.includes('汉化') ||
            fullText.includes('中国翻訳') || fullText.includes('中文') ||
            fullText.includes('dl 版')) {
          category = '單行本／漢化';
          getLogger().debug(`Found category via text: 漢化`);
        } else if (!onlyChinese) {
          // 如果不要求只搜索汉化版，给一个默认分类
          category = '未知分类';
        }
      }
      
      // 确保分类中包含"漢化"字样（如果要求只搜索汉化版）
      if (onlyChinese) {
        const isChinese = category.includes('漢化') || category.includes('汉化') || 
                         title.includes('漢化') || title.includes('汉化');
        if (!isChinese) {
          getLogger().debug(`Skipping non-Chinese comic: ${title}`);
          return;
        }
      }

      // 查找封面图片
      let coverUrl = '';
      const coverEl = $element.find(selectors.coverImage);
      if (coverEl.length > 0) {
        coverUrl = coverEl.attr('src') || '';
      }

      // 提取图片数和创建时间
      let imageCount: number | undefined;
      let createdAt: string | undefined;
      
      // 查找 info_col 元素
      const infoCol = $element.find('.info_col');
      if (infoCol.length > 0) {
        const infoText = infoCol.text().trim();
        
        // 提取图片数：例如 "218張圖片"
        const imageMatch = infoText.match(/(\d+)張圖片/);
        if (imageMatch) {
          imageCount = parseInt(imageMatch[1]);
        }
        
        // 提取创建时间：例如 "創建於2025-09-09 01:00:57"
        const dateMatch = infoText.match(/創建於(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        if (dateMatch) {
          createdAt = dateMatch[1];
        }
      }

      // 构建完整的漫画 URL
      const comicUrl = urlEl.startsWith('http') ? urlEl : `${this.config.baseUrl}${urlEl}`;

      // 添加到结果中
      comics.push({
        aid,
        title,
        author,
        category,
        url: comicUrl,
        coverUrl,
        imageCount,
        createdAt,
      });
      
      // 记录已添加的 aid
      if (aid) {
        addedAids.add(aid);
      }
    });
  }

  async getComicDetails(aid: string): Promise<Comic | null> {
    if (!this.page) {
      await this.initialize();
    }

    const url = this.buildComicDetailUrl(aid);
    const selectors = this.config.selectors.comicDetail;
    
    try {
      if (!this.page) throw new Error('Page not initialized');
      
      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(5000);

      const html = await this.page.content();
      const $ = cheerio.load(html);

      const title = $(selectors.title).text().trim();
      const category = $(selectors.category).text().trim();

      const pages: number[] = [];
      $(selectors.pageLink).each((_, el) => {
        const pageNum = parseInt($(el).text());
        if (!isNaN(pageNum)) {
          pages.push(pageNum);
        }
      });

      return {
        aid,
        title,
        author: '',
        category,
        url,
        pages: pages.length > 0 ? Math.max(...pages) : undefined,
      };
    } catch (error) {
      getLogger().error(`Failed to get details for aid ${aid}: ${error}`);
      return null;
    }
  }
}
