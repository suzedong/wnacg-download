import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import figures from 'figures';
import { WNACGScraper } from '../../core/scraper.js';
import { configManager } from '../../config.js';
import { checkAndInstallDependencies } from '../../setup.js';
import { wnacgConfig } from '../../config/wnacg.config.js';
import { SearchManager } from '../../core/search-manager.js';
import type { Comic, SearchResult } from '../../types/index.js';
import path from 'path';

export const searchCommand = new Command('search')
  .description('在 wnacg.com 上搜索漫画')
  .argument('<author>', '作者或关键字')
  .option('-p, --pages <number>', '最大爬取页数 (不指定则爬取全部)')
  .option('-P, --proxy <url>', '代理地址')
  .option('-a, --all', '包含所有漫画 (不仅汉化版)', false)
  .option('-j, --json', '以 JSON 格式输出', false)
  .option('-f, --force', '强制刷新，不使用缓存', false)
  .option('-d, --delay <ms>', '请求间隔时间（毫秒），覆盖配置')
  .option('-l, --list', '显示所有搜索结果列表', false)
  .action(async (author: string, options: any) => {
    const ready = await checkAndInstallDependencies();
    if (!ready) {
      console.log(chalk.yellow('\n依赖未安装完成，无法执行搜索。\n'));
      process.exit(1);
    }

    // 如果指定了 --list 参数，显示所有搜索结果列表
    if (options.list) {
      showSearchResultsList();
      return;
    }

    const spinner = ora('初始化中...').start();
    const scraper = new WNACGScraper(wnacgConfig, options.proxy || configManager.get('defaultProxy'), false); // 默认使用非无头模式

    try {
      // 使用命令行指定的 delay 或配置中的 delay
      const requestDelay = options.delay ? parseInt(options.delay, 10) : configManager.get('requestDelay');

      spinner.text = `正在搜索 "${author}"...`;
      
      const startTime = Date.now();
      const comics = await scraper.search({
        author,
        maxPages: options.pages ? parseInt(options.pages) : configManager.get('defaultMaxPages'),
        onlyChinese: !options.all,
        requestDelay,
      });
      const duration = Date.now() - startTime;

      spinner.succeed(`找到 ${comics.length} 部漫画（耗时 ${(duration / 1000).toFixed(1)} 秒）`);

      // 使用 SearchManager 保存结果
      const cacheDir = path.join(process.cwd(), 'cache');
      const searchManager = new SearchManager(cacheDir);
      
      // 检查是否已存在缓存
      if (!options.force && searchManager.exists(author)) {
        console.log(chalk.yellow(`\n⚠ 关键字 "${author}" 的搜索结果已存在。`));
        console.log(chalk.yellow('使用 --force 选项强制覆盖缓存。\n'));
        await scraper.close();
        process.exit(0);
      }
      
      const result: SearchResult = {
        keyword: author,
        searchTime: new Date().toISOString(),
        comics,
        totalPages: options.pages ? parseInt(options.pages) : 1,
        totalComics: comics.length,
      };
      searchManager.save(author, result);
      const cacheFile = path.join(cacheDir, `search_${author.replace(/[<>:"/\\|?*]/g, '_')}.json`);
      
      console.log(`
${chalk.green('✓')} 漫画信息已保存到：${chalk.cyan(cacheFile)}`);

      if (options.json) {
        // JSON 输出模式
        const output = {
          success: true,
          keyword: author,
          searchTime: new Date().toISOString(),
          totalComics: comics.length,
          comics,
        };
        console.log(JSON.stringify(output, null, 2));
      } else {
        printResults(comics);
      }

      await scraper.close();
    } catch (error) {
      spinner.fail('搜索失败');
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`错误：${errorMessage}`));
      console.error(chalk.dim('提示：检查网络连接或稍后重试'));
      await scraper.close();
      process.exit(1);
    }
  });

function printResults(comics: Comic[]): void {
  if (comics.length === 0) {
    console.log(chalk.yellow('未找到漫画'));
    return;
  }

  console.log('\n' + chalk.bold.cyan('搜索结果:'));
  console.log(chalk.dim('─'.repeat(100)) + '\n');

  comics.forEach((comic, index) => {
    const num = chalk.cyan.bold(`${String(index + 1).padStart(2, ' ')}.`);
    const title = chalk.white(comic.title.length > 70 ? comic.title.substring(0, 67) + '...' : comic.title);
    const category = chalk.yellow(comic.category);
    const author = comic.author ? chalk.dim(`作者：${comic.author}`) : '';
    
    console.log(`${figures.pointer} ${num} ${title}`);
    console.log(`   ${category}${author ? ' | ' + author : ''}`);
    console.log(chalk.dim('─'.repeat(100)));
  });

  console.log(`\n${chalk.green(figures.tick)} 总计：${chalk.bold.green(comics.length.toString())} 部漫画\n`);
}

/**
 * 显示所有搜索结果列表
 */
function showSearchResultsList(): void {
  const cacheDir = path.join(process.cwd(), 'cache');
  const searchManager = new SearchManager(cacheDir);
  
  const metadataList = searchManager.list({ sortBy: 'time', order: 'desc' });
  
  if (metadataList.length === 0) {
    console.log(chalk.yellow('\n暂无搜索结果\n'));
    console.log(chalk.dim('提示：使用 wnacg-dl search <关键字> 进行搜索\n'));
    return;
  }
  
  console.log('\n' + chalk.bold.cyan('搜索结果列表:'));
  console.log(chalk.dim('─'.repeat(120)) + '\n');
  
  metadataList.forEach((metadata, index) => {
    const num = chalk.cyan.bold(`${String(index + 1).padStart(2, ' ')}.`);
    const keyword = chalk.white.bold(metadata.keyword);
    const time = chalk.dim(new Date(metadata.searchTime).toLocaleString('zh-CN'));
    const count = chalk.green.bold(`${metadata.totalComics} 部`);
    const size = chalk.blue((metadata.fileSize / 1024).toFixed(1) + ' KB');
    
    console.log(`${figures.pointer} ${num} ${keyword}`);
    console.log(`   ${chalk.dim('搜索时间:')} ${time}`);
    console.log(`   ${chalk.dim('漫画数量:')} ${count}  |  ${chalk.dim('文件大小:')} ${size}`);
    console.log(chalk.dim('─'.repeat(120)));
  });
  
  console.log(`\n${chalk.green(figures.tick)} 总计：${chalk.bold.green(metadataList.length.toString())} 个搜索结果\n`);
  console.log(chalk.dim('提示：'));
  console.log(chalk.dim('  - 使用 wnacg-dl search <关键字> 查看具体搜索结果'));
  console.log(chalk.dim('  - 使用 wnacg-dl compare <关键字> 对比本地漫画'));
  console.log(chalk.dim('  - 使用 wnacg-dl download <关键字> 下载漫画\n'));
}
