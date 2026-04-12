import { ComicMatcher } from '../../../src/core/ai/matcher.js';
import type { Comic, LocalComic } from '../../../src/types.js';

async function testMatcher() {
  console.log('测试 AI 漫画名匹配器');
  console.log('='.repeat(60));

  // 创建匹配器
  const matcher = new ComicMatcher({ threshold: 0.8 });
  await matcher.initialize();

  // 测试数据
  const websiteComics: Comic[] = [
    {
      title: '[TYPE.90] 非・正規肉母穴3',
      url: 'https://www.wnacg.com/photos-index-aid-12345.html',
      category: '雜誌&短篇／漢化',
      aid: '12345',
      cover: 'https://www.wnacg.com/images/thumbnails/12345.jpg',
      author: 'TYPE.90',
    },
    {
      title: '[TYPE.90] ビッチな淫姉さまぁ',
      url: 'https://www.wnacg.com/photos-index-aid-67890.html',
      category: '單行本／漢化',
      aid: '67890',
      cover: 'https://www.wnacg.com/images/thumbnails/67890.jpg',
      author: 'TYPE.90',
    },
  ];

  const localComics: LocalComic[] = [
    {
      title: '非・正規肉母穴3',
      path: 'C:\\comics\\TYPE90\\非・正規肉母穴3',
      author: 'TYPE.90',
    },
    {
      title: 'ビッチな淫姉さまぁ [慵貓個人重嵌]',
      path: 'C:\\comics\\TYPE90\\ビッチな淫姉さまぁ',
      author: 'TYPE.90',
    },
  ];

  // 测试增强的相似度计算
  console.log('\n测试增强的相似度计算:');
  console.log('-'.repeat(60));

  // 测试一些常见的漫画名变体
  const testCases = [
    {
      website: '[TYPE.90] 非・正規肉母穴3',
      local: '非・正規肉母穴3'
    },
    {
      website: '[TYPE.90] ビッチな淫姉さまぁ',
      local: 'ビッチな淫姉さまぁ [慵貓個人重嵌]'
    },
    {
      website: '(C106) [大本営 (TYPE.90)] EMPIRE HARD CORE 2025 SUMMER',
      local: 'EMPIRE HARD CORE 2025 SUMMER'
    },
    {
      website: '[TYPE.90] 妖館の珠姫',
      local: '妖館の珠姫 [慵貓個人重嵌]'
    }
  ];

  testCases.forEach((testCase, index) => {
    const similarity = matcher.calculateSimilarity(testCase.website, testCase.local);
    console.log(`测试 ${index + 1}: ${similarity.toFixed(4)}`);
    console.log(`  网站: ${testCase.website}`);
    console.log(`  本地: ${testCase.local}`);
  });

  // 测试匹配
  console.log('\n测试匹配结果:');
  console.log('-'.repeat(60));

  websiteComics.forEach((websiteComic, index) => {
    console.log(`\n测试 ${index + 1}: ${websiteComic.title}`);
    
    localComics.forEach((localComic) => {
      const similarity = matcher.calculateSimilarity(websiteComic.title, localComic.title);
      console.log(`  与 "${localComic.title}" 的相似度: ${similarity.toFixed(4)}`);
    });
  });

  // 测试批量匹配
  console.log('\n批量匹配结果:');
  console.log('-'.repeat(60));

  const matchResults = matcher.matchComics(websiteComics, localComics);
  matchResults.forEach((result, index) => {
    console.log(`\n漫画 ${index + 1}: ${result.websiteComic.title}`);
    console.log(`  匹配: ${result.matched ? '✅' : '❌'}`);
    console.log(`  相似度: ${result.similarity.toFixed(4)}`);
    if (result.localComic) {
      console.log(`  匹配的本地漫画: ${result.localComic.title}`);
    }
  });

  // 清理资源
  matcher.cleanup();
  console.log('\n测试完成');
}

testMatcher().catch(console.error);
