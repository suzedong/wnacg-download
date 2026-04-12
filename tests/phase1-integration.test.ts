/**
 * Phase 1 集成测试
 * 测试类型系统、配置管理和错误处理
 */

import { describe, it, expect } from 'vitest';
import { configManager } from '../src/config.js';
import { WnacgError, ErrorCodes } from '../src/types/index.js';
import { toWnacgError, getFriendlyErrorMessage } from '../src/core/errors.js';

describe('Phase 1: 核心代码重构与基础功能', () => {
  describe('配置管理', () => {
    it('应该能正确获取配置值', () => {
      const storagePath = configManager.get('defaultStoragePath');
      expect(storagePath).toBeDefined();
      expect(typeof storagePath).toBe('string');
    });

    it('应该能正确获取所有配置', () => {
      const allConfig = configManager.getAll();
      expect(allConfig).toBeDefined();
      expect(allConfig.defaultStoragePath).toBeDefined();
      expect(allConfig.requestDelay).toBeDefined();
      expect(allConfig.concurrentDownloads).toBeDefined();
    });

    it('应该能正确设置配置值', () => {
      const originalDelay = configManager.get('requestDelay');
      configManager.set('requestDelay', 1500);
      const newDelay = configManager.get('requestDelay');
      expect(newDelay).toBe(1500);
      // 恢复原值
      configManager.set('requestDelay', originalDelay);
    });

    it('应该支持配置变更监听', () => {
      let notifiedValue: number | undefined;
      configManager.onUpdate('concurrentDownloads', (value) => {
        notifiedValue = value;
      });
      configManager.set('concurrentDownloads', 5);
      expect(notifiedValue).toBe(5);
    });
  });

  describe('错误处理', () => {
    it('应该能正确创建网络错误', () => {
      const networkError = new Error('Connection timeout');
      const wnacgError = WnacgError.networkError(networkError);
      expect(wnacgError).toBeInstanceOf(WnacgError);
      expect(wnacgError.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(wnacgError.retryable).toBe(true);
      expect(wnacgError.message).toContain('Connection timeout');
    });

    it('应该能正确创建验证码错误', () => {
      const verificationError = WnacgError.verificationRequired();
      expect(verificationError.code).toBe(ErrorCodes.VERIFICATION_REQUIRED);
      expect(verificationError.retryable).toBe(false);
    });

    it('应该能正确转换未知错误', () => {
      const unknownError = 'Unknown error';
      const convertedError = toWnacgError(unknownError, '测试上下文');
      expect(convertedError).toBeInstanceOf(WnacgError);
      expect(convertedError.message).toContain('Unknown error');
    });

    it('应该能提供友好的错误消息', () => {
      const networkError = WnacgError.networkError(new Error('timeout'));
      const friendlyMsg = getFriendlyErrorMessage(networkError);
      expect(friendlyMsg).toContain('网络');
    });
  });

  describe('类型系统', () => {
    it('应该能正确导出错误类', () => {
      expect(WnacgError).toBeDefined();
      expect(ErrorCodes).toBeDefined();
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.VERIFICATION_REQUIRED).toBe('VERIFICATION_REQUIRED');
    });

    it('应该包含所有必需的错误码', () => {
      const requiredCodes = [
        'NETWORK_ERROR',
        'PAGE_NOT_FOUND',
        'VERIFICATION_REQUIRED',
        'DOWNLOAD_FAILED',
        'FILE_NOT_FOUND',
        'INVALID_CONFIG',
        'AI_MODEL_ERROR',
        'UNKNOWN_ERROR',
      ];
      requiredCodes.forEach(code => {
        expect(ErrorCodes).toHaveProperty(code);
      });
    });
  });
});
