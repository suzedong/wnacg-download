import fs from 'fs';
import path from 'path';

interface ModelOptions {
  modelPath: string;
  threshold: number;
}

export class ModelManager {
  private model: any = null;
  private options: ModelOptions;

  constructor(options: Partial<ModelOptions> = {}) {
    this.options = {
      modelPath: options.modelPath || path.join(process.cwd(), 'models', 'model.json'),
      threshold: options.threshold || 0.8,
    };
  }

  async loadModel(): Promise<void> {
    try {
      // 检查模型文件是否存在
      if (!fs.existsSync(this.options.modelPath)) {
        // 如果模型文件不存在，使用内置的简单匹配算法
        console.log('AI 模型文件不存在，使用内置的简单匹配算法');
        return;
      }

      // 加载模型文件
      const modelData = fs.readFileSync(this.options.modelPath, 'utf-8');
      this.model = JSON.parse(modelData);
      console.log('AI 模型加载成功');
    } catch (error) {
      console.error('加载 AI 模型失败:', error);
      // 失败时使用内置的简单匹配算法
    }
  }

  getModel(): any {
    return this.model;
  }

  getThreshold(): number {
    return this.options.threshold;
  }

  // 简单的字符串相似度计算（Levenshtein 距离）
  calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0) return 0.0;
    if (str2.length === 0) return 0.0;

    const matrix: number[][] = [];

    // 初始化第一行和第一列
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        const cost = str2.charAt(i - 1) === str1.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     //  deletion
          matrix[i][j - 1] + 1,     //  insertion
          matrix[i - 1][j - 1] + cost //  substitution
        );
      }
    }

    // 计算相似度
    const maxLength = Math.max(str1.length, str2.length);
    const distance = matrix[str2.length][str1.length];
    return 1 - (distance / maxLength);
  }

  // 清理模型
  cleanup(): void {
    this.model = null;
  }
}

export const modelManager = new ModelManager();
