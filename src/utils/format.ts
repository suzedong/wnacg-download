// 格式化工具函数

/**
 * 格式化文件大小
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * 格式化下载速度
 */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

/**
 * 格式化剩余时间
 */
export function formatETA(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m} 分 ${s} 秒`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} 小时 ${m} 分`;
}
