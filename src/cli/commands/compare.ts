import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import figures from 'figures';
import { WNACGScraper } from '../../core/scraper.js';
import { Scanner } from '../../core/scanner.js';
import { Comparer } from '../../core/comparer.js';
import { configManager } from '../../config.js';
import { checkAndInstallDependencies } from '../../setup.js';
import { wnacgConfig } from '../../config/wnacg.config.js';
import type { Comic, LocalComic } from '../../types.js';

export const compareCommand = new Command('compare')
  .description('对比网站漫画和本地收藏')
  .argument('<author>', '作者或关键字')
  .option('-s, --storage <path>', '存储路径')
  .option('-S, --subdir <name>', '子目录名')
  .option('-p, --pages <number>', '最大爬取页数 (不指定则爬取全部)')
  .option('-P, --proxy <url>', '代理地址')
  .option('-a, --all', '包含所有漫画 (不仅汉化版)', false)
  .option('-j, --json', '以 JSON 格式输出', false)
  .option('-f, --force', '强制刷新，不使用缓存', false)
  .action(async (author: string, options: any) => {
    const ready = await checkAndInstallDependencies();
    if (!ready) {
      console.log(chalk.yellow('\n依赖未安装完成，无法执行对比。\n'));
      process.exit(1);
    }

    const spinner = ora('初始化中...').start();
    const scraper = new WNACGScraper(wnacgConfig, options.proxy || configManager.get('defaultProxy'), false); // 默认使用非无头模式
    const scanner = new Scanner();
    const comparer = new Comparer();

    try {

      const storagePath = options.storage || configManager.get('defaultStoragePath');
      const subdir = options.subdir || author.replace(/[^a-zA-Z0-9]/g, '-');
      const scanPath = `${storagePath}/${subdir}`;

      // 检查是否存在搜索结果文件
      const fs = await import('fs');
      const path = await import('path');
      const cacheDir = path.join(process.cwd(), 'cache');
      const cacheFile = path.join(cacheDir, `search_${author.replace(/[^a-zA-Z0-9]/g, '_')}.json`);

      let websiteComics;
      if (fs.existsSync(cacheFile)) {
        spinner.text = `正在读取搜索结果文件...`;
        const data = fs.readFileSync(cacheFile, 'utf-8');
        websiteComics = JSON.parse(data);
        console.log(`
${chalk.green('✓')} 从文件加载漫画信息：${chalk.cyan(cacheFile)}`);
      } else {
        spinner.text = `正在 wnacg 上搜索 "${author}"...`;
        websiteComics = await scraper.search({
          author,
          maxPages: options.pages ? parseInt(options.pages) : configManager.get('defaultMaxPages'),
          onlyChinese: !options.all,
          requestDelay: configManager.get('requestDelay'), // 使用配置的请求间隔（默认 1000ms）
        });

        // 保存漫画信息到文件
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(cacheFile, JSON.stringify(websiteComics, null, 2));
        console.log(`
${chalk.green('✓')} 漫画信息已保存到：${chalk.cyan(cacheFile)}`);
      }

      spinner.text = `正在扫描本地目录：${scanPath}`;
      const localComics = await scanner.scanDirectory(scanPath);

      spinner.text = '正在对比收藏...';
      const result = await comparer.compare(websiteComics, localComics);

      spinner.succeed('对比完成');

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printResults(result, scanPath);
      }

      await scraper.close();
    } catch (error) {
      spinner.fail('对比失败');
      console.error(chalk.red(`错误：${error}`));
      await scraper.close();
      process.exit(1);
    }
  });

function printResults(
  result: { toDownload: Comic[]; alreadyHave: { website: Comic; local?: LocalComic }[] },
  scanPath: string
): void {
  console.log('\n' + chalk.bold('对比结果:'));
  console.log(chalk.dim('─'.repeat(80)) + '\n');

  console.log(chalk.cyan.bold('📍 存储路径:'), scanPath);
  console.log(chalk.cyan.bold('📊 统计:'));
  console.log(`   ${figures.arrowRight} 网站：${chalk.bold(result.toDownload.length + result.alreadyHave.length.toString())} 部`);
  console.log(`   ${figures.arrowRight} 本地：${chalk.bold(result.alreadyHave.length.toString())} 部`);
  console.log(`   ${figures.arrowRight} ${chalk.green('待下载:')} ${chalk.green.bold(result.toDownload.length.toString())}\n`);

  if (result.alreadyHave.length > 0) {
    console.log(chalk.yellow.bold(`\n已拥有 (${result.alreadyHave.length}):`));
    console.log(chalk.dim('─'.repeat(80)));
    
    result.alreadyHave.slice(0, 10).forEach(({ website, local }) => {
      console.log(`${figures.tick} ${chalk.dim(website.title)}`);
      if (local) {
        console.log(`  ${chalk.green('→')} ${chalk.dim(local.path)}`);
      }
    });

    if (result.alreadyHave.length > 10) {
      console.log(chalk.dim(`  ... 还有 ${result.alreadyHave.length - 10} 部`));
    }
  }

  if (result.toDownload.length > 0) {
    console.log(chalk.green.bold(`\n待下载 (${result.toDownload.length}):`));
    console.log(chalk.dim('─'.repeat(80)));
    
    result.toDownload.slice(0, 10).forEach((comic) => {
      console.log(`${figures.pointer} ${chalk.white(comic.title)}`);
      console.log(`  ${chalk.yellow(comic.category)}`);
    });

    if (result.toDownload.length > 10) {
      console.log(chalk.dim(`  ... 还有 ${result.toDownload.length - 10} 部`));
    }
  }

  console.log('\n' + chalk.dim('─'.repeat(80)) + '\n');
}
