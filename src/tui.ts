import inquirer from 'inquirer';
import chalk from 'chalk';
import figures from 'figures';
import { WNACGScraper } from './core/scraper.js';
import { Scanner } from './core/scanner.js';
import { Comparer } from './core/comparer.js';
import { Downloader } from './core/downloader.js';
import { configManager } from './config.js';
import { checkAndInstallDependencies } from './setup.js';
import { wnacgConfig } from './config/wnacg.config.js';

export async function runTUI(): Promise<void> {
  // 检查并安装依赖
  const ready = await checkAndInstallDependencies();
  if (!ready) {
    console.log(chalk.yellow('\n依赖未安装完成，无法启动。\n'));
    process.exit(1);
  }
  
  console.clear();
  console.log(chalk.bold.cyan('\n========================================'));
  console.log(chalk.bold.cyan('        WNACG 漫画下载工具'));
  console.log(chalk.dim('              交互式模式'));
  console.log(chalk.bold.cyan('========================================\n'));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '您想要做什么？',
      choices: [
        { name: '🔍 搜索漫画', value: 'search' },
        { name: '📊 对比本地收藏', value: 'compare' },
        { name: '⬇️  下载漫画', value: 'download' },
        { name: '⚙️  配置设置', value: 'config' },
        { name: '❌ 退出', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'search':
      await searchFlow();
      break;
    case 'compare':
      await compareFlow();
      break;
    case 'download':
      await downloadFlow();
      break;
    case 'config':
      await configFlow();
      break;
    case 'exit':
      console.log(chalk.yellow('\n再见!\n'));
      process.exit(0);
      break;
  }

  await runTUI();
}

async function searchFlow(): Promise<void> {
  const { author } = await inquirer.prompt([
    {
      type: 'input',
      name: 'author',
      message: '输入作者或关键字:',
      validate: (input) => input.length > 0 || '请输入作者',
    },
  ]);

  // 获取配置中的默认页数，并格式化显示
  const configMaxPages = configManager.get('defaultMaxPages');
  // const _displayDefault = configMaxPages === 0 ? '不限制' : configMaxPages.toString();
  
  const { maxPages } = await inquirer.prompt([
    {
      type: 'number',
      name: 'maxPages',
      message: '最大爬取页数:',
      default: configMaxPages,
    },
  ]);

  console.log('\n');
  const scraper = new WNACGScraper(wnacgConfig, configManager.get('defaultProxy'));

  try {
    const comics = await scraper.search({
      author,
      maxPages,
      onlyChinese: configManager.get('defaultOnlyChinese'),
      requestDelay: configManager.get('requestDelay'),
    });

    if (comics.length === 0) {
      console.log(chalk.yellow('未找到漫画\n'));
    } else {
      console.log(chalk.green(`\n${figures.tick} 找到 ${comics.length} 部漫画\n`));
      comics.slice(0, 10).forEach((comic, index) => {
        console.log(`${chalk.cyan(`${index + 1}.`)} ${comic.title}`);
      });
      if (comics.length > 10) {
        console.log(chalk.dim(`... 还有 ${comics.length - 10} 部\n`));
      }
    }
  } catch (error) {
    console.log(chalk.red(`错误：${error}\n`));
  } finally {
    await scraper.close();
  }

  await pause();
}

async function compareFlow(): Promise<void> {
  const { author } = await inquirer.prompt([
    {
      type: 'input',
      name: 'author',
      message: '输入作者或关键字:',
      validate: (input) => input.length > 0 || '请输入作者',
    },
  ]);

  const { storagePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'storagePath',
      message: '存储路径:',
      default: configManager.get('defaultStoragePath'),
    },
  ]);

  const subdir = author.replace(/[^a-zA-Z0-9]/g, '-');
  const scanPath = `${storagePath}/${subdir}`;

  console.log('\n');
  const scraper = new WNACGScraper(wnacgConfig, configManager.get('defaultProxy'));
  const scanner = new Scanner();
  const comparer = new Comparer();

  try {
    const websiteComics = await scraper.search({
      author,
      maxPages: 5,
      onlyChinese: configManager.get('defaultOnlyChinese'),
      requestDelay: configManager.get('requestDelay'),
    });

    const localComics = await scanner.scanDirectory(scanPath);
    const result = await comparer.compare(websiteComics, localComics);

    console.log(chalk.bold('\n对比结果:'));
    console.log(chalk.cyan(`  网站：${websiteComics.length} 部`));
    console.log(chalk.green(`  待下载：${result.toDownload.length}`));
    console.log(chalk.yellow(`  已拥有：${result.alreadyHave.length}\n`));

    if (result.toDownload.length > 0) {
      console.log(chalk.bold('\n待下载:'));
      result.toDownload.slice(0, 10).forEach((comic: any, index: number) => {
        console.log(`${chalk.green(`${index + 1}.`)} ${comic.title}`);
      });
      if (result.toDownload.length > 10) {
        console.log(chalk.dim(`... 还有 ${result.toDownload.length - 10} 部\n`));
      }
    }
  } catch (error) {
    console.log(chalk.red(`错误：${error}\n`));
  } finally {
    await scraper.close();
  }

  await pause();
}

async function downloadFlow(): Promise<void> {
  const { author } = await inquirer.prompt([
    {
      type: 'input',
      name: 'author',
      message: '输入作者或关键字:',
      validate: (input) => input.length > 0 || '请输入作者',
    },
  ]);

  const { storagePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'storagePath',
      message: '存储路径:',
      default: configManager.get('defaultStoragePath'),
    },
  ]);

  const subdir = author.replace(/[^a-zA-Z0-9]/g, '-');
  const scanPath = `${storagePath}/${subdir}`;

  console.log('\n');
  const scraper = new WNACGScraper(wnacgConfig, configManager.get('defaultProxy'));
  const scanner = new Scanner();
  const comparer = new Comparer();
  const downloader = new Downloader({
    storagePath: scanPath,
    proxy: configManager.get('defaultProxy'),
    concurrentDownloads: configManager.get('concurrentDownloads'),
  });

  try {
    console.log('搜索中...');
    const websiteComics = await scraper.search({
      author,
      maxPages: 5,
      onlyChinese: configManager.get('defaultOnlyChinese'),
      requestDelay: configManager.get('requestDelay'),
    });

    console.log('扫描本地...');
    const localComics = await scanner.scanDirectory(scanPath);

    console.log('对比中...');
    const compareResult = await comparer.compare(websiteComics, localComics);

    if (compareResult.toDownload.length === 0) {
      console.log(chalk.green('\n✓ 所有漫画已下载!\n'));
    } else {
      console.log(chalk.green(`\n${figures.tick} 找到 ${compareResult.toDownload.length} 部待下载漫画\n`));
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '下载全部？',
          default: true,
        },
      ]);

      if (confirm) {
        console.log('下载中...\n');
        const result = await downloader.downloadComics(compareResult.toDownload);
        
        console.log(chalk.green(`\n${figures.tick} 成功：${result.success.length}`));
        if (result.failed.length > 0) {
          console.log(chalk.red(`${figures.cross} 失败：${result.failed.length}\n`));
        }
      }
    }
  } catch (error) {
    console.log(chalk.red(`错误：${error}\n`));
  } finally {
    await scraper.close();
  }

  await pause();
}

async function configFlow(): Promise<void> {
  const config = configManager.getAll();
  
  // 配置项名称映射（英文 -> 中文）
  const configNames: Record<string, string> = {
    defaultStoragePath: '默认存储路径',
    defaultProxy: '默认代理',
    defaultMaxPages: '最大爬取页数',
    defaultOnlyChinese: '仅汉化版',
    requestDelay: '请求间隔（毫秒）',
    concurrentDownloads: '并发下载数',
    downloadRetryTimes: '下载重试次数',
    downloadRetryDelay: '重试间隔（秒）',
    aiModelType: 'AI 模型类型',
    aiModelApiUrl: 'AI 模型 API 地址',
    matchThreshold: 'AI 匹配阈值',
  };
  
  // 配置值格式化
  const formatValue = (key: string, value: any): string => {
    if (value === undefined) return '未设置';
    if (key === 'defaultMaxPages' && value === 0) return '不限制';
    if (key === 'aiModelType') {
      return value === 'local' ? '本地模型' : '远程 API';
    }
    if (key === 'defaultOnlyChinese') {
      return value ? '是' : '否';
    }
    if (key.includes('Delay') || key.includes('Interval')) {
      return `${value}ms`;
    }
    return String(value);
  };
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '配置:',
      choices: [
        { name: '查看当前设置', value: 'view' },
        { name: '快速设置', value: 'setup' },
        { name: '返回', value: 'back' },
      ],
    },
  ]);

  if (action === 'view') {
    console.log('\n当前配置:');
    Object.entries(config).forEach(([key, value]) => {
      const chineseName = configNames[key] || key;
      const formattedValue = formatValue(key, value);
      console.log(`  ${chalk.cyan(chineseName)}: ${chalk.green(formattedValue)}`);
    });
    console.log('\n');
  } else if (action === 'setup') {
    await runTUI();
  }

  await pause();
}

async function pause(): Promise<void> {
  await inquirer.prompt([
    {
      type: 'input',
      message: '按回车键继续...',
      name: 'pause',
    },
  ]);
}
