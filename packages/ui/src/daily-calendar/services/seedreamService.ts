/**
 * Seedream API 服务
 * 火山引擎 Seedream 图像生成服务封装
 */

import {
  SeedreamConfig,
  SeedreamGenerationRequest,
  SeedreamGenerationResponse,
  SeedreamError,
  ImageGenerationParams,
  GeneratedImage,
  ThemeType,
} from '../types';

// 默认配置
const DEFAULT_CONFIG: SeedreamConfig = {
  apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
  apiKey: '',
  model: 'doubao-seedream-5-0-260128',
};

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
};

// 扩展 ImportMeta 接口以支持 Vite 环境变量
declare global {
  interface ImportMetaEnv {
    VITE_SEEDREAM_API_KEY?: string;
    VITE_SEEDREAM_MODEL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/**
 * 获取 Seedream 配置
 * 优先从环境变量读取 API Key
 */
function getConfig(): SeedreamConfig {
  const env = import.meta.env || {};
  return {
    ...DEFAULT_CONFIG,
    apiKey: env.VITE_SEEDREAM_API_KEY || '',
    model: env.VITE_SEEDREAM_MODEL || DEFAULT_CONFIG.model,
  };
}

/**
 * 根据主题生成 Prompt
 */
function generatePrompt(theme: ThemeType, date: Date, quote: string): string {
  const themePrompts: Record<ThemeType, string> = {
    vintage: `Vintage calendar page, warm sepia tones, old paper texture, elegant typography showing date, soft watercolor flowers, nostalgic atmosphere, high quality illustration`,
    minimal: `Minimalist calendar design, clean white background, modern sans-serif typography, subtle geometric shapes, soft pastel accents, Scandinavian aesthetic, high quality`,
    nature: `Nature-inspired calendar, lush green botanical elements, morning light, fresh leaves and flowers, organic textures, peaceful outdoor setting, artistic photography style`,
    art: `Artistic calendar illustration, impressionist painting style, vibrant colors, expressive brushstrokes, museum-quality artwork, sophisticated composition`,
    zen: `Zen-inspired calendar, ink wash painting style, oriental aesthetics, bamboo or cherry blossoms, peaceful and serene atmosphere, traditional Chinese art style`,
    cosmic: `Cosmic calendar design, deep space background, stars and nebulae, mystical atmosphere, dark blue and purple tones, astronomical elements, high quality digital art`,
  };

  const basePrompt = themePrompts[theme] || themePrompts.vintage;
  const dateStr = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${basePrompt}. Calendar date: ${dateStr}. Quote: "${quote}". High quality, detailed, suitable for calendar display.`;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算重试延迟（指数退避）
 */
function getRetryDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelay
  );
  return delay;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Seedream API 服务类
 */
export class SeedreamService {
  private config: SeedreamConfig;
  private abortController: AbortController | null = null;

  constructor(config?: Partial<SeedreamConfig>) {
    this.config = {
      ...getConfig(),
      ...config,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SeedreamConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.apiKey) {
      return { valid: false, error: 'API Key 未配置，请设置 VITE_SEEDREAM_API_KEY 环境变量' };
    }
    if (!this.config.apiEndpoint) {
      return { valid: false, error: 'API Endpoint 未配置' };
    }
    return { valid: true };
  }

  /**
   * 生成图片
   * @param params 生成参数
   * @returns 生成的图片信息
   */
  async generateImage(params: ImageGenerationParams): Promise<GeneratedImage> {
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { date, theme, quote, size, quality } = params;
    const prompt = generatePrompt(theme, date, quote);

    const requestBody: SeedreamGenerationRequest = {
      prompt,
      size,
      quality,
      n: 1,
      response_format: 'url',
    };

    // 取消之前的请求
    this.cancelGeneration();
    this.abortController = new AbortController();

    let lastError: Error | null = null;

    // 重试循环
    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            ...requestBody,
          }),
          signal: this.abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null) as SeedreamError | null;

          // 处理特定错误码
          if (response.status === 401) {
            throw new Error('API Key 无效，请检查配置');
          }
          if (response.status === 429) {
            throw new Error('请求过于频繁，请稍后再试');
          }
          if (response.status >= 500) {
            // 服务器错误，可以重试
            throw new Error(`服务器错误 (${response.status})，正在重试...`);
          }

          throw new Error(
            errorData?.error?.message || `请求失败 (${response.status})`
          );
        }

        const data = await response.json() as SeedreamGenerationResponse;

        if (!data.data || data.data.length === 0) {
          throw new Error('API 返回空数据');
        }

        const result = data.data[0];

        return {
          id: generateId(),
          url: result.url || '',
          base64: result.b64_json,
          metadata: {
            generatedAt: new Date(),
            prompt,
            theme,
            size,
            quality,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是用户取消，直接抛出
        if (lastError.name === 'AbortError') {
          throw new Error('生成已取消');
        }

        // 最后一次尝试，抛出错误
        if (attempt === RETRY_CONFIG.maxRetries) {
          break;
        }

        // 等待后重试
        const retryDelay = getRetryDelay(attempt);
        console.warn(`生成失败，${retryDelay}ms 后重试 (${attempt + 1}/${RETRY_CONFIG.maxRetries}):`, lastError.message);
        await delay(retryDelay);
      }
    }

    throw lastError || new Error('生成失败，请稍后重试');
  }

  /**
   * 取消正在进行的生成
   */
  cancelGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 获取支持的图片尺寸
   */
  getSupportedSizes(): Array<'1K' | '2K' | '4K'> {
    return ['1K', '2K', '4K'];
  }

  /**
   * 获取支持的图片质量
   */
  getSupportedQualities(): string[] {
    return ['standard', 'hd'];
  }
}

// 导出单例实例
export const seedreamService = new SeedreamService();

// 导出便捷函数
export async function generateCalendarImage(
  params: ImageGenerationParams
): Promise<GeneratedImage> {
  return seedreamService.generateImage(params);
}

export function cancelImageGeneration(): void {
  seedreamService.cancelGeneration();
}
