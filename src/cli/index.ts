#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figures from 'figures';
import { searchCommand } from './commands/search.js';
import { compareCommand } from './commands/compare.js';
import { downloadCommand } from './commands/download.js';
import { configCommand } from './commands/config.js';
import { runTUI } from '../tui.js';
import { checkAndInstallDependencies } from '../setup.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const program = new Command();

program
  .name('wnacg-dl')
  .description('从 wnacg.com 下载漫画的交互式 CLI 工具')
  .version(pkg.version)
  .option('-i, --interactive', '运行交互式 TUI 模式', false)
  .addCommand(searchCommand)
  .addCommand(compareCommand)
  .addCommand(downloadCommand)
  .addCommand(configCommand);

const args = process.argv.slice(2);
const isTUI = args.length === 0 || args.includes('-i') || args.includes('--interactive');

if (isTUI) {
  checkAndInstallDependencies()
    .then(ready => {
      if (ready) {
        runTUI();
      } else {
        console.log(chalk.yellow('\n依赖未安装完成，无法启动。\n'));
        process.exit(1);
      }
    })
    .catch(console.error);
} else {
  program.parse();
}

program.addHelpText('before', '\n' +
  chalk.bold.cyan('╔══════════════════════════════════════════════════════════╗') + '\n' +
  chalk.bold.cyan('║') + '          ' + chalk.white.bold('WNACG 漫画下载工具') + '                          ' + chalk.bold.cyan('║') + '\n' +
  chalk.bold.cyan('║') + '          ' + chalk.dim('从 wnacg.com 下载汉化漫画') + '                   ' + chalk.bold.cyan('║') + '\n' +
  chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝') + '\n'
);

program.addHelpText('after', '\n' +
  chalk.bold('使用示例:') + '\n' +
  '  ' + chalk.cyan('wnacg-dl search TYPE90') + '              搜索 TYPE90 的漫画\n' +
  '  ' + chalk.cyan('wnacg-dl compare TYPE90 -s /comics') + '  对比本地漫画库\n' +
  '  ' + chalk.cyan('wnacg-dl download TYPE90 -y') + '         下载所有找到的漫画\n' +
  '  ' + chalk.cyan('wnacg-dl config --set defaultProxy http://localhost:7890') + '\n\n' +
  chalk.bold('快速开始:') + '\n' +
  '  ' + figures.arrowRight + ' 设置代理：' + chalk.dim('wnacg-dl config --set defaultProxy http://192.168.21.100:7890') + '\n' +
  '  ' + figures.arrowRight + ' 搜索漫画：' + chalk.dim('wnacg-dl search TYPE90') + '\n' +
  '  ' + figures.arrowRight + ' 下载漫画：' + chalk.dim('wnacg-dl download TYPE90') + '\n\n' +
  chalk.dim('更多信息:') + ' https://github.com/yourusername/wnacg-downloader-cli\n'
);
