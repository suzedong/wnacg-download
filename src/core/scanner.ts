import fs from 'fs/promises';
import path from 'path';
import type { LocalComic } from '../types/index.js';
import winston from 'winston';
import type { IScannerService } from './interfaces.js';

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * 本地漫画扫描器
 */
export class Scanner implements IScannerService {
  async scanDirectory(dirPath: string): Promise<LocalComic[]> {
    const comics: LocalComic[] = [];

    try {
      // 单层扫描：只扫描指定目录下的第一层文件夹
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 只记录文件夹，不进入子文件夹（单层扫描）
          const stats = await fs.stat(fullPath);
          comics.push({
            title: entry.name,
            path: fullPath,
            size: stats.size,
            createdAt: stats.birthtime,
          });
        }
        // 忽略文件，因为漫画以文件夹为单位
      }

      logger.info(`Scanned ${comics.length} comics in ${dirPath}`);
      return comics;
    } catch (error) {
      logger.error(`Failed to scan directory ${dirPath}: ${error}`);
      return [];
    }
  }

  private _isComicFile(filename: string): boolean {
    const comicExtensions = [
      '.zip',
      '.rar',
      '.7z',
      '.cbz',
      '.cbr',
      '.cb7',
      '.pdf',
      '.epub',
    ];
    const ext = path.extname(filename).toLowerCase();
    return comicExtensions.includes(ext);
  }

  private _extractTitle(filename: string): string {
    const name = path.basename(filename, path.extname(filename));
    return name
      .replace(/[\[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.warn(`Failed to calculate size of ${dirPath}: ${error}`);
    }

    return totalSize;
  }

  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
