import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import figures from 'figures';
import { WNACGScraper } from '../../core/scraper.js';
import { configManager } from '../../config.js';
import { checkAndInstallDependencies } from '../../setup.js';
import { wnacgConfig } from '../../config/wnacg.config.js';
import { SearchManager } from '../../core/search-manager.js';
import type { Comic, SearchResult } from '../../types.js';
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
  .action(async (author: string, options: any) => {
    const ready = await checkAndInstallDependencies();
    if (!ready) {
      console.log(chalk.yellow('\n依赖未安装完成，无法执行搜索。\n'));
      process.exit(1);
    }

    const spinner = ora('初始化中...').start();
    const scraper = new WNACGScraper(wnacgConfig, options.proxy || configManager.get('defaultProxy'), false); // 默认使用非无头模式

    try {
      // 使用命令行指定的 delay 或配置中的 delay
      const requestDelay = options.delay ? parseInt(options.delay, 10) : configManager.get('requestDelay');

      spinner.text = `正在搜索 "${author}"...`;
      
      const comics = await scraper.search({
        author,
        maxPages: options.pages ? parseInt(options.pages) : configManager.get('defaultMaxPages'),
        onlyChinese: !options.all,
        requestDelay,
      });

      spinner.succeed(`找到 ${comics.length} 部漫画`);

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
      const cacheFile = path.join(cacheDir, `search_${author}.json`);
      
      console.log(`
${chalk.green('✓')} 漫画信息已保存到：${chalk.cyan(cacheFile)}`);

      if (options.json) {
        console.log(JSON.stringify(comics, null, 2));
      } else {
        printResults(comics);
      }

      await scraper.close();
    } catch (error) {
      spinner.fail('搜索失败');
      console.error(chalk.red(`错误：${error}`));
      await scraper.close();
      process.exit(1);
    }
  });

function printResults(comics: Comic[]): void {
  if (comics.length === 0) {
    console.log(chalk.yellow('未找到漫画'));
    return;
  }

  console.log('\n' + chalk.bold('搜索结果:'));
  console.log(chalk.dim('─'.repeat(80)) + '\n');

  comics.forEach((comic, index) => {
    const num = chalk.cyan(`${String(index + 1).padStart(2, ' ')}`);
    const title = chalk.white(comic.title.length > 60 ? comic.title.substring(0, 57) + '...' : comic.title);
    const category = chalk.yellow(comic.category);
    
    console.log(`${figures.pointer} ${num} ${title}`);
    console.log(`   ${chalk.dim(category)}`);
    console.log(chalk.dim('─'.repeat(80)));
  });

  console.log(`\n${chalk.green(figures.tick)} 总计：${chalk.bold(comics.length.toString())} 部漫画\n`);
}
