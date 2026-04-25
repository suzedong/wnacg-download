/**
 * 错误处理中间件
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 错误处理中间件
 * 统一处理所有路由错误
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('错误处理中间件:', err);

  // 默认错误信息
  let statusCode = 500;
  let message = '服务器内部错误';

  // 根据错误类型设置状态码
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '请求参数错误';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '未授权访问';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = '禁止访问';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = '资源不存在';
  }

  // 返回 JSON 格式错误
  res.status(statusCode).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: `路由不存在：${req.method} ${req.path}`,
  });
}
