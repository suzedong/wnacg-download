/**
 * Electron 主进程
 * 管理窗口创建、IPC 通信、菜单等
 */

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { configManager } from '../config.js';
import { WNACGScraper } from '../core/scraper.js';
import { ComicDownloader } from '../core/downloader.js';
import { ComicComparer } from '../core/comparer.js';
import { SearchManager } from '../core/search-manager.js';
import type { Comic, DownloadOptions, CompareOptions } from '../types.js';

// 获取 __dirname（ES Module 环境）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 全局变量
let mainWindow: BrowserWindow | null = null;
let scraper: WNACGScraper | null = null;
let downloader: ComicDownloader | null = null;
let comparer: ComicComparer | null = null;
let searchManager: SearchManager | null = null;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false, // 先不显示，等 ready 后再显示
  });

  // 加载应用
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // 窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 初始化核心模块
 */
function initCoreModules(): void {
  scraper = new WNACGScraper(configManager);
  downloader = new ComicDownloader(configManager);
  comparer = new ComicComparer(configManager);
  searchManager = new SearchManager(configManager);
}

/**
 * 设置 IPC 处理器
 */
function setupIPCHandlers(): void {
  // ==================== 搜索 ====================
  
  ipcMain.handle('search-comics', async (_event, keyword: string): Promise<Comic[]> => {
    try {
      if (!scraper) {
        throw new Error('爬虫模块未初始化');
      }
      
      const maxPages = configManager.get<number>('maxPages');
      const onlyChinese = configManager.get<boolean>('onlyChinese');
      const requestDelay = configManager.get<number>('requestDelay');
      
      const comics = await scraper.search(keyword, {
        maxPages,
        onlyChinese,
        requestDelay,
      });
      
      // 保存搜索结果
      if (searchManager) {
        await searchManager.saveSearch(keyword, comics);
      }
      
      return comics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '搜索失败';
      throw new Error(errorMessage);
    }
  });

  ipcMain.handle('get-cache-list', async (): Promise<any[]> => {
    try {
      if (!searchManager) {
        throw new Error('搜索管理器未初始化');
      }
      
      const searches = await searchManager.listSearches();
      return searches.map(s => ({
        keyword: s.keyword,
        searchTime: s.searchTime,
        comicCount: s.comicCount,
        fileSize: s.fileSize,
        filePath: s.filePath,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取缓存列表失败';
      throw new Error(errorMessage);
    }
  });

  ipcMain.handle('delete-cache', async (_event, keyword: string): Promise<void> => {
    try {
      if (!searchManager) {
        throw new Error('搜索管理器未初始化');
      }
      
      await searchManager.deleteSearch(keyword);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除缓存失败';
      throw new Error(errorMessage);
    }
  });

  // ==================== 对比 ====================
  
  ipcMain.handle('compare-comics', async (_event, keyword: string, localPath: string) => {
    try {
      if (!comparer || !searchManager) {
        throw new Error('对比模块未初始化');
      }
      
      // 获取搜索结果
      const searchResult = await searchManager.getSearch(keyword);
      if (!searchResult) {
        throw new Error(`未找到搜索结果：${keyword}`);
      }
      
      // 执行对比
      const options: CompareOptions = {
        searchFile: searchResult.filePath,
        localPath: localPath || configManager.get<string>('storagePath'),
      };
      
      const result = await comparer.compare(options);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '对比失败';
      throw new Error(errorMessage);
    }
  });

  // ==================== 下载 ====================
  
  ipcMain.handle('download-comics', async (_event, comics: Comic[], storagePath: string) => {
    try {
      if (!downloader) {
        throw new Error('下载模块未初始化');
      }
      
      const options: DownloadOptions = {
        storagePath: storagePath || configManager.get<string>('storagePath'),
        concurrentDownloads: configManager.get<number>('concurrentDownloads'),
        retryTimes: configManager.get<number>('retryTimes'),
        retryInterval: configManager.get<number>('retryInterval'),
      };
      
      // 监听下载进度
      downloader.on('progress', (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', progress);
        }
      });
      
      downloader.on('completed', (result) => {
        if (mainWindow) {
          mainWindow.webContents.send('download-completed', result);
        }
      });
      
      downloader.on('error', (error) => {
        if (mainWindow) {
          mainWindow.webContents.send('download-error', error.message);
        }
      });
      
      const result = await downloader.download(comics, options);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败';
      throw new Error(errorMessage);
    }
  });

  ipcMain.handle('cancel-download', async (_event, aid: string): Promise<void> => {
    try {
      if (!downloader) {
        throw new Error('下载模块未初始化');
      }
      
      await downloader.cancel(aid);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取消下载失败';
      throw new Error(errorMessage);
    }
  });

  // ==================== 配置 ====================
  
  ipcMain.handle('get-config', async (): Promise<any> => {
    try {
      return configManager.getAll();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取配置失败';
      throw new Error(errorMessage);
    }
  });

  ipcMain.handle('set-config', async (_event, key: string, value: any): Promise<void> => {
    try {
      configManager.set(key, value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '设置配置失败';
      throw new Error(errorMessage);
    }
  });

  // ==================== 目录选择 ====================
  
  ipcMain.handle('select-directory', async (): Promise<string | undefined> => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
        title: '选择漫画存储目录',
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      
      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '选择目录失败';
      throw new Error(errorMessage);
    }
  });
}

/**
 * 设置应用菜单
 */
function setupMenu(): void {
  const isMac = process.platform === 'darwin';
  
  const template: any = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: '语音',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: '学习更多',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/your-repo/wnacg-downloader');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 应用就绪时创建窗口
 */
app.whenReady().then(() => {
  // 初始化核心模块
  initCoreModules();
  
  // 设置 IPC 处理器
  setupIPCHandlers();
  
  // 设置菜单
  setupMenu();
  
  // 创建窗口
  createWindow();
  
  app.on('activate', () => {
    // macOS: 点击 dock 图标且无窗口时重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 所有窗口关闭时退出应用
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 应用退出前清理资源
 */
app.on('will-quit', async () => {
  // 关闭爬虫浏览器
  if (scraper) {
    await scraper.close();
  }
});

/**
 * 处理未捕获的异常
 */
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
