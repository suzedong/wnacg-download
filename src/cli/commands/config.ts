import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import figures from 'figures';
import { configManager } from '../../config.js';

function parseValue(key: string, value: string): any {
  if (key === 'defaultMaxPages' || key === 'requestDelay' || key === 'concurrentDownloads') {
    return parseInt(value, 10);
  }
  if (key === 'defaultOnlyChinese') {
    return value === 'true';
  }
  if (value === 'undefined' || value === '') {
    return undefined;
  }
  return value;
}

export const configCommand = new Command('config')
  .description('管理配置')
  .option('-l, --list', '列出所有配置')
  .option('-g, --get <key>', '获取配置值')
  .option('-s, --set <key>', '设置配置值')
  .argument('[value]', '配置值')
  .option('--reset', '重置配置为默认值')
  .option('--init', '交互式配置向导')
  .action(async (value, options) => {
    if (options.list) {
      const config = configManager.getAll();
      console.log('\n' + chalk.bold('当前配置:'));
      console.log(chalk.dim('─'.repeat(60)) + '\n');
      Object.entries(config).forEach(([key, value]) => {
        const formattedKey = chalk.cyan(key);
        const formattedValue = value === undefined ? chalk.dim('undefined') : chalk.green(String(value));
        console.log(`  ${formattedKey}: ${formattedValue}`);
      });
      console.log('\n');
      return;
    }

    if (options.get) {
      const configValue = configManager.get(options.get as any);
      if (configValue === undefined) {
        console.log(chalk.yellow(`未找到配置项 "${options.get}"\n`));
      } else {
        console.log(chalk.green(`${configValue}\n`));
      }
      return;
    }

    if (options.set) {
      const key = options.set;
      if (!value) {
        console.error(chalk.red('请提供配置值'));
        process.exit(1);
      }
      const validKeys = [
        'defaultStoragePath',
        'defaultProxy',
        'defaultMaxPages',
        'defaultOnlyChinese',
        'requestDelay',
        'concurrentDownloads',
        'cacheTTL',
      ];
      if (!validKeys.includes(key)) {
        console.error(chalk.red(`无效的配置项。有效的配置项：${validKeys.join(', ')}`));
        process.exit(1);
      }
      const parsedValue = parseValue(key, value);
      configManager.set(key as any, parsedValue);
      console.log(chalk.green(`${figures.tick} 已设置 ${key} = ${parsedValue}\n`));
      return;
    }

    if (options.reset) {
      configManager.reset();
      console.log(chalk.green(`${figures.tick} 配置已重置为默认值\n`));
      return;
    }

    if (options.init) {
      console.log(chalk.bold('\n欢迎使用 WNACG Downloader CLI!\n'));
      console.log('让我们来设置您的配置。\n');
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'defaultStoragePath',
          message: '漫画默认存储路径:',
          default: configManager.get('defaultStoragePath'),
        },
        {
          type: 'input',
          name: 'defaultProxy',
          message: '代理地址 (可选，直接回车跳过):',
          default: configManager.get('defaultProxy') || '',
        },
        {
          type: 'number',
          name: 'defaultMaxPages',
          message: '默认最大爬取页数:',
          default: configManager.get('defaultMaxPages'),
        },
        {
          type: 'confirm',
          name: 'defaultOnlyChinese',
          message: '只下载汉化版漫画？',
          default: configManager.get('defaultOnlyChinese'),
        },
        {
          type: 'number',
          name: 'concurrentDownloads',
          message: '并发下载数量:',
          default: configManager.get('concurrentDownloads'),
        },
      ]);
      Object.entries(answers).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          configManager.set(key as any, value);
        }
      });
      console.log(chalk.green('\n' + figures.tick + ' 配置已保存!\n'));
      console.log('稍后您可以使用以下命令修改配置：wnacg-dl config --set key value\n');
      return;
    }

    configCommand.outputHelp();
  });
