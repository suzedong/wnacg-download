import {
  WnacgError,
  ErrorCodes,
} from '../types/index.js';

/**
 * 错误工具函数
 * 提供便捷的错误创建和转换方法
 */

/**
 * 将未知错误转换为 WnacgError
 * @param error 未知错误
 * @param context 错误上下文
 * @returns WnacgError 实例
 */
export function toWnacgError(error: unknown, context?: string): WnacgError {
  if (error instanceof WnacgError) {
    return error;
  }

  if (error instanceof Error) {
    return WnacgError.networkError(error);
  }

  const message = context ? `${context}: ${String(error)}` : String(error);
  return new WnacgError(message, ErrorCodes.UNKNOWN_ERROR, false);
}

/**
 * 判断错误是否可重试
 * @param error 错误对象
 * @returns 是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof WnacgError) {
    return error.retryable;
  }
  
  // 网络错误通常可重试
  if (error instanceof Error) {
    const networkErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'timeout',
      'network error',
    ];
    return networkErrors.some(err => 
      error.message.toLowerCase().includes(err.toLowerCase())
    );
  }
  
  return false;
}

/**
 * 获取友好的错误提示消息
 * @param error 错误对象
 * @returns 友好的错误提示
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof WnacgError) {
    switch (error.code) {
      case ErrorCodes.NETWORK_ERROR:
        return '网络连接失败，请检查网络或代理设置';
      case ErrorCodes.VERIFICATION_REQUIRED:
        return '需要完成验证码验证，请在浏览器中完成操作';
      case ErrorCodes.PAGE_NOT_FOUND:
        return '页面未找到，请稍后重试';
      case ErrorCodes.DOWNLOAD_FAILED:
        return '下载失败，将尝试重试';
      case ErrorCodes.FILE_NOT_FOUND:
        return '文件未找到，请检查路径是否正确';
      case ErrorCodes.INVALID_CONFIG:
        return '配置错误，请检查配置设置';
      case ErrorCodes.AI_MODEL_ERROR:
        return 'AI 模型错误，请检查模型配置';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return `发生错误：${error.message}`;
  }

  return `未知错误：${String(error)}`;
}

/**
 * 记录错误日志
 * @param error 错误对象
 * @param logger 日志记录器
 * @param context 错误上下文
 */
export function logError(
  error: unknown,
  logger: { error: (msg: string, ...args: any[]) => void },
  context?: string
): void {
  const wnacgError = toWnacgError(error, context);
  
  logger.error(
    `${wnacgError.code}: ${wnacgError.message}`,
    {
      retryable: wnacgError.retryable,
      stack: wnacgError.stack,
      originalError: wnacgError.originalError?.message,
    }
  );
}

export { WnacgError, ErrorCodes };
