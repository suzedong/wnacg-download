import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import figures from 'figures';
import inquirer from 'inquirer';

export async function checkAndInstallDependencies(): Promise<boolean> {
  console.log(chalk.bold.cyan('\n检查依赖项...\n'));
  
  const issues: string[] = [];
  
  // 检查 node_modules
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    issues.push('node_modules');
  }
  
  // 检查 Playwright 浏览器
  let hasChromium = false;
  try {
    // 检查 macOS 和 Linux 的 Playwright 缓存目录
    const msPlaywrightDirs = [
      path.join(process.env.HOME || '', 'Library', 'Caches', 'ms-playwright'),
      path.join(process.env.HOME || '', '.cache', 'ms-playwright'),
      path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    ];
    
    for (const msPlaywrightDir of msPlaywrightDirs) {
      if (fs.existsSync(msPlaywrightDir)) {
        const dirs = fs.readdirSync(msPlaywrightDir);
        hasChromium = dirs.some(dir => dir.startsWith('chromium-'));
        if (hasChromium) break;
      }
    }
  } catch (e) {
    // 忽略错误
  }
  
  if (!hasChromium) {
    issues.push('playwright-browsers');
  }
  
  if (issues.length === 0) {
    console.log(chalk.green(`${figures.tick} 所有依赖已安装\n`));
    return true;
  }
  
  console.log(chalk.yellow('发现未安装的依赖:'));
  issues.forEach(issue => {
    console.log(`  ${figures.pointer} ${issue}`);
  });
  console.log();
  
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'install',
      message: '是否现在安装这些依赖？',
      default: true,
    },
  ]);
  
  if (!answer.install) {
    console.log(chalk.yellow('已取消安装\n'));
    console.log(chalk.dim('提示：可以稍后手动运行以下命令安装:\n'));
    console.log(chalk.cyan('  npx playwright install chromium\n'));
    return false;
  }
  
  // 安装 npm 依赖
  if (issues.includes('node_modules')) {
    console.log(chalk.cyan('正在安装 npm 依赖...'));
    try {
      execSync('npm install', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(chalk.green(`${figures.tick} npm 依赖安装完成\n`));
    } catch (error) {
      console.log(chalk.red('npm 依赖安装失败\n'));
      return false;
    }
  }
  
  // 安装 Playwright 浏览器
  if (issues.includes('playwright-browsers')) {
    console.log(chalk.cyan('\n正在安装 Playwright 浏览器...'));
    console.log(chalk.dim('提示：这可能需要几分钟，请耐心等待\n'));
    
    // 读取代理配置
    let proxyEnv = {};
    try {
      const { configManager } = await import('./config.js');
      const proxy = configManager.get('defaultProxy');
      if (proxy) {
        console.log(chalk.yellow(`使用代理 ${proxy} 进行下载...\n`));
        proxyEnv = {
          HTTP_PROXY: proxy,
          HTTPS_PROXY: proxy,
          http_proxy: proxy,
          https_proxy: proxy
        };
      }
    } catch (e) {
      // 忽略错误
    }
    
    try {
      execSync('npx playwright install chromium', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { 
          ...process.env,
          ...proxyEnv
        },
        timeout: 600000 // 10 分钟超时
      });
      
      console.log(chalk.green(`${figures.tick} Playwright 浏览器安装完成\n`));
    } catch (error) {
      console.log(chalk.red('\nPlaywright 浏览器安装失败\n'));
      console.log(chalk.yellow('请尝试以下方法:\n'));
      console.log(chalk.dim('1. 检查网络连接\n'));
      console.log(chalk.dim('2. 使用代理后重试\n'));
      console.log(chalk.dim('3. 或手动运行以下命令:\n'));
      console.log(chalk.cyan('  npx playwright install chromium\n'));
      return false;
    }
  }
  
  console.log(chalk.green.bold('\n✓ 所有依赖安装完成!\n'));
  console.log(chalk.dim('─'.repeat(60)) + '\n');
  
  return true;
}
