import { SiteConfig } from '../types/config.js';

export const wnacgConfig: SiteConfig = {
  name: 'WNACG',
  baseUrl: 'https://www.wnacg.com',
  urls: {
    search: '/search/index.php?q={keyword}&m=&syn=yes&f=_all&s=create_time_DESC&p={page}',
    comicDetail: '/photos-index-aid-{aid}.html',
  },
  selectors: {
    searchResult: {
      comicBox: ['li'],
      fallbackSelectors: ['div.gallery-item', 'div.item', 'div.grid_cell'],
      titleLink: 'a[href*="aid-"]',
      coverImage: 'img',
      categoryClass: '[class*="cate-"]',
    },
    comicDetail: {
      title: '#bodywrap h2',
      category: '.category',
      pageLink: '.page-link',
    },
  },
  categoryMap: {
    '1': '同人誌／漢化',
    '2': '同人誌／CG 畫集',
    '3': '寫真 & Cosplay',
    '5': '同人誌',
    '6': '單行本',
    '7': '雜誌&短篇',
    '9': '單行本／漢化',
    '10': '雜誌&短篇／漢化',
    '12': '同人誌／日語',
    '13': '單行本／日語',
    '14': '雜誌&短篇／日語',
    '16': '同人誌／English',
    '17': '單行本／English',
    '18': '雜誌&短篇／English',
    '19': '韓漫',
    '20': '韓漫／漢化',
    '21': '韓漫／生肉',
    '22': '3D&漫畫',
    '23': '3D&漫畫／漢化',
    '24': '3D&漫畫／其他',
    '37': 'AI&圖集',
  },
};
