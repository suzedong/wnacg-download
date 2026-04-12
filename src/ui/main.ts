import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import url from 'url';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools();
  
  if (process.env.NODE_ENV !== 'development') {
    const viteBuildPath = path.join(__dirname, '..', '..', 'src', 'ui', 'dist', 'ui', 'index.html');
    if (fs.existsSync(viteBuildPath)) {
      mainWindow.loadURL(
        url.format({
          pathname: viteBuildPath,
          protocol: 'file:',
          slashes: true,
        })
      );
    } else {
      mainWindow.loadURL(
        url.format({
          pathname: path.join(__dirname, 'index.html'),
          protocol: 'file:',
          slashes: true,
        })
      );
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('search-comics', async (event, keyword) => {
  try {
    const { WNACGScraper } = await import('../core/scraper.js');
    const { configManager } = await import('../config.js');
    const { wnacgConfig } = await import('../config/wnacg.config.js');
    
    const scraper = new WNACGScraper(wnacgConfig, configManager.get('defaultProxy'), false);
    await scraper.initialize();
    
    const comics = await scraper.search({
      author: keyword,
      maxPages: configManager.get('defaultMaxPages'),
      onlyChinese: configManager.get('defaultOnlyChinese'),
      requestDelay: configManager.get('requestDelay'),
    });
    
    await scraper.close();
    event.reply('search-result', comics);
  } catch (error) {
    event.reply('search-error', error instanceof Error ? error.message : String(error));
  }
});

ipcMain.on('compare-comics', async (event, keyword, storagePath) => {
  try {
    const { WNACGScraper } = await import('../core/scraper.js');
    const { LocalScanner } = await import('../core/scanner.js');
    const { Comparer } = await import('../core/comparer.js');
    const { configManager } = await import('../config.js');
    const { wnacgConfig } = await import('../config/wnacg.config.js');
    
    const scraper = new WNACGScraper(wnacgConfig, configManager.get('defaultProxy'), false);
    await scraper.initialize();
    
    const websiteComics = await scraper.search({
      author: keyword,
      maxPages: configManager.get('defaultMaxPages'),
      onlyChinese: configManager.get('defaultOnlyChinese'),
      requestDelay: configManager.get('requestDelay'),
    });
    
    await scraper.close();
    
    const scanner = new LocalScanner();
    const localComics = await scanner.scanDirectory(storagePath);
    
    const comparer = new Comparer();
    const result = await comparer.compare(websiteComics, localComics);
    
    event.reply('compare-result', result);
  } catch (error) {
    event.reply('compare-error', error instanceof Error ? error.message : String(error));
  }
});

ipcMain.on('download-comics', async (event, comics, storagePath) => {
  try {
    const { Downloader } = await import('../core/downloader.js');
    const { configManager } = await import('../config.js');
    
    const downloader = new Downloader({
      storagePath,
      proxy: configManager.get('defaultProxy'),
      concurrentDownloads: configManager.get('concurrentDownloads'),
    });
    
    const result = await downloader.downloadComics(comics);
    event.reply('download-result', result);
  } catch (error) {
    event.reply('download-error', error instanceof Error ? error.message : String(error));
  }
});

ipcMain.on('get-config', async (event) => {
  try {
    const { configManager } = await import('../config.js');
    const config = configManager.getAll();
    event.reply('config-data', config);
  } catch (error) {
    event.reply('config-error', error instanceof Error ? error.message : String(error));
  }
});

ipcMain.on('set-config', async (event, key, value) => {
  try {
    const { configManager } = await import('../config.js');
    configManager.set(key as any, value);
    event.reply('config-updated', { key, value });
  } catch (error) {
    event.reply('config-error', error instanceof Error ? error.message : String(error));
  }
});

ipcMain.on('select-directory', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      event.reply('select-directory-result', result.filePaths[0]);
    } else {
      event.reply('select-directory-result', null);
    }
  } catch (error) {
    event.reply('select-directory-error', error instanceof Error ? error.message : String(error));
  }
});
