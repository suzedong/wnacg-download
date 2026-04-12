const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  searchComics: async (keyword: string) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('search-comics', keyword);
      
      const resultHandler = (_event: any, result: any) => {
        ipcRenderer.removeListener('search-error', errorHandler);
        resolve(result);
      };
      
      const errorHandler = (_event: any, error: string) => {
        ipcRenderer.removeListener('search-result', resultHandler);
        reject(new Error(error));
      };
      
      ipcRenderer.once('search-result', resultHandler);
      ipcRenderer.once('search-error', errorHandler);
    });
  },
  
  compareComics: async (keyword: string, storagePath: string) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('compare-comics', keyword, storagePath);
      
      const resultHandler = (_event: any, result: any) => {
        ipcRenderer.removeListener('compare-error', errorHandler);
        resolve(result);
      };
      
      const errorHandler = (_event: any, error: string) => {
        ipcRenderer.removeListener('compare-result', resultHandler);
        reject(new Error(error));
      };
      
      ipcRenderer.once('compare-result', resultHandler);
      ipcRenderer.once('compare-error', errorHandler);
    });
  },
  
  downloadComics: async (comics: any[], storagePath: string) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('download-comics', comics, storagePath);
      
      const resultHandler = (_event: any, result: any) => {
        ipcRenderer.removeListener('download-error', errorHandler);
        resolve(result);
      };
      
      const errorHandler = (_event: any, error: string) => {
        ipcRenderer.removeListener('download-result', resultHandler);
        reject(new Error(error));
      };
      
      ipcRenderer.once('download-result', resultHandler);
      ipcRenderer.once('download-error', errorHandler);
    });
  },
  
  getConfig: async () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('get-config');
      
      const dataHandler = (_event: any, config: any) => {
        ipcRenderer.removeListener('config-error', errorHandler);
        resolve(config);
      };
      
      const errorHandler = (_event: any, error: string) => {
        ipcRenderer.removeListener('config-data', dataHandler);
        reject(new Error(error));
      };
      
      ipcRenderer.once('config-data', dataHandler);
      ipcRenderer.once('config-error', errorHandler);
    });
  },
  
  setConfig: async (key: string, value: any) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('set-config', key, value);
      
      const updatedHandler = (_event: any, data: any) => {
        ipcRenderer.removeListener('config-error', errorHandler);
        resolve(data);
      };
      
      const errorHandler = (_event: any, error: string) => {
        ipcRenderer.removeListener('config-updated', updatedHandler);
        reject(new Error(error));
      };
      
      ipcRenderer.once('config-updated', updatedHandler);
      ipcRenderer.once('config-error', errorHandler);
    });
  },
  
  selectDirectory: async () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('select-directory');
      
      const resultHandler = (_event: any, result: any) => {
        ipcRenderer.removeListener('select-directory-error', errorHandler);
        resolve(result);
      };
      
      const errorHandler = (_event: any, error: string) => {
        ipcRenderer.removeListener('select-directory-result', resultHandler);
        reject(new Error(error));
      };
      
      ipcRenderer.once('select-directory-result', resultHandler);
      ipcRenderer.once('select-directory-error', errorHandler);
    });
  },
  
  onSearchResult: (callback: (result: any) => void) => 
    ipcRenderer.on('search-result', (_event: any, result: any) => callback(result)),
  onSearchError: (callback: (error: string) => void) => 
    ipcRenderer.on('search-error', (_event: any, error: string) => callback(error)),
  onCompareResult: (callback: (result: any) => void) => 
    ipcRenderer.on('compare-result', (_event: any, result: any) => callback(result)),
  onCompareError: (callback: (error: string) => void) => 
    ipcRenderer.on('compare-error', (_event: any, error: string) => callback(error)),
  onDownloadResult: (callback: (result: any) => void) => 
    ipcRenderer.on('download-result', (_event: any, result: any) => callback(result)),
  onDownloadProgress: (callback: (progress: any) => void) => 
    ipcRenderer.on('download-progress', (_event: any, progress: any) => callback(progress)),
  onDownloadError: (callback: (error: string) => void) => 
    ipcRenderer.on('download-error', (_event: any, error: string) => callback(error)),
  onConfigData: (callback: (config: any) => void) => 
    ipcRenderer.on('config-data', (_event: any, config: any) => callback(config)),
  onConfigUpdated: (callback: (data: any) => void) => 
    ipcRenderer.on('config-updated', (_event: any, data: any) => callback(data)),
  onConfigError: (callback: (error: string) => void) => 
    ipcRenderer.on('config-error', (_event: any, error: string) => callback(error)),
});
