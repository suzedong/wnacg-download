import { Comic, LocalComic, CompareResult } from '../types.js';
import { ComicMatcher } from './ai/matcher.js';
import winston from 'winston';

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

export class Comparer {
  private matcher: ComicMatcher;

  constructor() {
    this.matcher = new ComicMatcher();
  }

  async compare(websiteComics: Comic[], localComics: LocalComic[]): Promise<CompareResult> {
    // 初始化 AI 匹配器
    await this.matcher.initialize();

    const toDownload: Comic[] = [];
    const alreadyHave: { website: Comic; local?: LocalComic }[] = [];

    // 使用 AI 匹配器进行匹配
    const matchResults = this.matcher.matchComics(websiteComics, localComics);

    matchResults.forEach(result => {
      if (result.matched) {
        alreadyHave.push({
          website: result.websiteComic,
          local: result.localComic,
        });
        logger.debug(`Already have: ${result.websiteComic.title} (similarity: ${result.similarity.toFixed(2)})`);
      } else {
        toDownload.push(result.websiteComic);
        logger.debug(`To download: ${result.websiteComic.title}`);
      }
    });

    logger.info(`Comparison complete: ${toDownload.length} to download, ${alreadyHave.length} already have`);

    // 清理资源
    this.matcher.cleanup();

    return {
      websiteComics,
      localComics,
      toDownload,
      alreadyHave,
    };
  }
}
