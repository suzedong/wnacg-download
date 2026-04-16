import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import figures from 'figures';
import { WNACGScraper } from '../../core/scraper.js';
import { Scanner } from '../../core/scanner.js';
import { Comparer } from '../../core/comparer.js';
import { Downloader } from '../../core/downloader.js';
import { configManager } from '../../config.js';
import { checkAndInstallDependencies } from '../../setup.js';
import { wnacgConfig } from '../../config/wnacg.config.js';
import type { Comic } from '../../types.js';

export const downloadCommand = new Command('download')
  .description('从 wnacg.com 下载漫画')
  .argument('<author>', '作者或关键字')
  .option('-s, --storage <path>', '存储路径')
  .option('-S, --subdir <name>', '子目录名')
  .option('-p, --pages <number>', '最大爬取页数 (不指定则爬取全部)')
  .option('-P, --proxy <url>', '代理地址')
  .option('-a, --all', '包含所有漫画 (不仅汉化版)', false)
  .option('-y, --yes', '跳过确认直接下载', false)
  .option('-f, --force', '强制刷新，不使用缓存', false)
  .action(async (author: string, options: any) => {
    const ready = await checkAndInstallDependencies();
    if (!ready) {
      console.log(chalk.yellow('\n依赖未安装完成，无法执行下载。\n'));
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
      const compareResult = await comparer.compare(websiteComics, localComics);

      spinner.succeed(`找到 ${compareResult.toDownload.length} 部待下载漫画`);

      if (compareResult.toDownload.length === 0) {
        console.log(chalk.green('\n✓ 所有漫画已下载!\n'));
        await scraper.close();
        return;
      }

      let comicsToDownload: Comic[] = compareResult.toDownload;

      if (!options.yes) {
        comicsToDownload = await selectComics(compareResult.toDownload);
        
        if (comicsToDownload.length === 0) {
          console.log(chalk.yellow('\n已取消下载。\n'));
          await scraper.close();
          return;
        }
      }

      spinner.text = '开始下载...';
      const downloader = new Downloader({
        storagePath: scanPath,
        proxy: options.proxy || configManager.get('defaultProxy'),
        concurrentDownloads: configManager.get('concurrentDownloads'),
      });

      const result = await downloader.downloadComics(comicsToDownload);

      spinner.succeed('下载完成');
      printSummary(result);

      await scraper.close();
    } catch (error) {
      spinner.fail('下载失败');
      console.error(chalk.red(`错误：${error}`));
      await scraper.close();
      process.exit(1);
    }
  });

async function selectComics(comics: Comic[]): Promise<Comic[]> {
  console.log(chalk.bold('\n选择要下载的漫画:'));
  console.log(chalk.dim('─'.repeat(80)) + '\n');

  comics.forEach((comic, index) => {
    const num = chalk.cyan(`${String(index + 1).padStart(2, ' ')}`);
    const title = comic.title.length > 50 ? comic.title.substring(0, 47) + '...' : comic.title;
    console.log(`${num} ${title}`);
  });

  console.log('\n' + chalk.dim('─'.repeat(80)) + '\n');

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: '选择要下载的漫画 (空格键选择，回车键确认)',
      choices: comics.map((comic, index) => ({
        name: comic.title,
        value: index,
        checked: true,
      })),
      pageSize: 10,
    },
  ]);

  return selected.map((index: number) => comics[index]);
}

function printSummary(result: { success: string[]; failed: string[] }): void {
  console.log('\n' + chalk.bold('下载统计:'));
  console.log(chalk.dim('─'.repeat(80)) + '\n');

  if (result.success.length > 0) {
    console.log(chalk.green(`${figures.tick} 成功：${result.success.length}`));
    result.success.slice(0, 5).forEach(title => {
      console.log(`   ${figures.arrowRight} ${title}`);
    });
    if (result.success.length > 5) {
      console.log(chalk.dim(`   ... 还有 ${result.success.length - 5} 部`));
    }
  }

  if (result.failed.length > 0) {
    console.log(chalk.red(`${figures.cross} 失败：${result.failed.length}`));
    result.failed.slice(0, 5).forEach(title => {
      console.log(`   ${figures.arrowRight} ${title}`);
    });
    if (result.failed.length > 5) {
      console.log(chalk.dim(`   ... 还有 ${result.failed.length - 5} 部`));
    }
  }

  console.log('\n');
}
