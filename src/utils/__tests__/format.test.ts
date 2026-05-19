import { describe, it, expect } from 'vitest';
import { formatBytes, formatSpeed, formatETA } from '../format';

describe('formatBytes', () => {
  it('should handle zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should handle negative values', () => {
    expect(formatBytes(-100)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(5242880)).toBe('5.0 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });

  it('should format terabytes', () => {
    expect(formatBytes(1099511627776)).toBe('1.0 TB');
  });
});

describe('formatSpeed', () => {
  it('should format zero speed', () => {
    expect(formatSpeed(0)).toBe('0 B/s');
  });

  it('should format MB/s', () => {
    expect(formatSpeed(2621440)).toBe('2.5 MB/s');
  });
});

describe('formatETA', () => {
  it('should handle zero', () => {
    expect(formatETA(0)).toBe('--');
  });

  it('should handle negative', () => {
    expect(formatETA(-10)).toBe('--');
  });

  it('should handle Infinity', () => {
    expect(formatETA(Infinity)).toBe('--');
  });

  it('should format seconds', () => {
    expect(formatETA(5)).toBe('5 秒');
    expect(formatETA(30)).toBe('30 秒');
  });

  it('should format minutes', () => {
    expect(formatETA(125)).toBe('2 分 5 秒');
  });

  it('should format hours', () => {
    expect(formatETA(7500)).toBe('2 小时 5 分');
  });
});
