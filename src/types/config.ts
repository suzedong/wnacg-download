export interface SiteConfig {
  name: string;
  baseUrl: string;
  urls: UrlTemplates;
  selectors: PageSelectors;
  categoryMap: CategoryMapping;
}

export interface UrlTemplates {
  search: string;
  comicDetail: string;
}

export interface PageSelectors {
  searchResult: {
    comicBox: string[];
    fallbackSelectors: string[];
    titleLink: string;
    coverImage: string;
    categoryClass: string;
  };
  comicDetail: {
    title: string;
    category: string;
    pageLink: string;
  };
}

export interface CategoryMapping {
  [cateId: string]: string;
}
