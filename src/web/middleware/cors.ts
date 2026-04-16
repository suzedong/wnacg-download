/**
 * CORS 中间件
 */

import { Request, Response, NextFunction } from 'express';

/**
 * CORS 配置选项
 */
export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
}

/**
 * CORS 中间件
 * 处理跨域请求
 */
export function corsMiddleware(options: CorsOptions = {}) {
  const {
    origin = 'http://localhost:5173',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // 设置允许的源
    const requestOrigin = req.headers.origin;
    if (requestOrigin) {
      if (Array.isArray(origin)) {
        if (origin.includes(requestOrigin)) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        }
      } else {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    }

    // 设置允许的方法
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));

    // 设置允许的头部
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));

    // 是否允许携带凭证
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // 预检请求直接返回
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  };
}
