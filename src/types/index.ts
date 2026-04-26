// WNACG Downloader - 前端类型定义

// 漫画信息（网站）
export interface Comic {
  aid: string;
  title: string;
  author: string;
  category: string;
  cover_url: string;
  url: string;
  pages: number;
  tags: string[];
  upload_date: string;
}

// 本地漫画信息
export interface LocalComic {
  path: string;
  title: string;
  file_size: number;
  page_count: number;
  download_date: string;
}

// 搜索选项
export interface SearchOptions {
  max_pages: number;
  request_interval: number;
  search_chinese_only: boolean;
  proxy: string | null;
  proxy_enabled: boolean;
}

// 搜索结果
export interface SearchResult {
  keyword: string;
  search_time: string;
  comics: Comic[];
  file_path: string;
}

// 下载任务
export interface DownloadTask {
  aid: string;
  title: string;
  url: string;
  cover_url: string;
  save_path: string;
  pages: number;
}

// 下载进度
export interface DownloadProgress {
  task_id: string;
  progress: number;
  speed: number;
  status: string;
}

// 下载结果
export interface DownloadResult {
  success: number;
  failed: number;
  success_list: string[];
  failed_list: FailedComic[];
}

// 失败的漫画
export interface FailedComic {
  title: string;
  reason: string;
}

// 对比结果
export interface CompareResult {
  website_comics: number;
  local_comics: number;
  to_download: number;
  already_have: number;
  match_details: MatchDetail[];
}

// 匹配详情
export interface MatchDetail {
  website: Comic;
  local: LocalComic | null;
  match_type: string;
  confidence: number;
  reason: string;
}

// 配置结构
export interface AppConfig {
  storage_path: string;
  proxy: string | null;
  proxy_enabled: boolean;
  max_pages: number;
  request_interval: number;
  search_chinese_only: boolean;
  concurrent_downloads: number;
  retry_times: number;
  retry_interval: number;
  ai_api_url: string;
  ai_api_key: string | null;
  match_threshold: number;
  theme: string;
}
