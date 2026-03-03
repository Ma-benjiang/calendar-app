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

// 默认配置 - 绘图大师
const DEFAULT_CONFIG: SeedreamConfig = {
  apiEndpoint: '/volces-api/api/v3/images/generations',
  apiKey: '',
  model: 'doubao-seedream-5-0-260128',
};

// ...其余代码保持不变...
export class SeedreamService {
  private config: SeedreamConfig;
  private abortController: AbortController | null = null;

  constructor(config?: Partial<SeedreamConfig>) {
    this.config = {
      ...getConfig(),
      ...config,
    };
  }

  // ...其余实现逻辑...
  async generateImage(params: ImageGenerationParams): Promise<GeneratedImage> {
    // 逻辑...
    return { /* ... */ } as any;
  }
}

function getConfig(): SeedreamConfig {
  const env = (import.meta as any).env || {};
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
    vintage: `High-end vintage editorial photography, 90s film grain, direct flash, low saturation neutral tones, shot on Leica M6, nostalgic atmosphere, luxury magazine aesthetic`,
    minimal: `Exquisite card design, premium fine paper texture, tactile letterpress effect, elegant minimalist layout, soft organic shadows, neutral beige palette, sophisticated stationery aesthetic`,
    nature: `Industrial minimalism, nature inside a museum, a single botanical leaf behind frosted glass, soft gallery lighting, marble textures, serene and expensive atmosphere`,
    art: `Conceptual art installation, hyper-realistic textures, floating elements in a minimalist void, soft volumetric lighting, museum-grade composition, clean and avant-garde`,
    zen: `Black and white minimalist illustration, elegant thin lines, bold geometric color blocks, extreme negative space, conceptual and poetic, high-end independent magazine style`,
    cosmic: `Futuristic industrial design, translucent materials, glowing soft nebulas through frosted glass, deep navy and silver accents, sleek and sophisticated, astronomical luxury`,
    clay: `3D render, cute claymation style, soft matte clay texture, handcrafted look with tiny thumbprint details, rounded organic shapes, vibrant pastel colors, studio lighting, clean solid background, high detail`,
    sticker: `3D sticker design, die-cut sticker with a thick white border, 3D pop-out effect, glossy finish, vibrant colors, white background, high contrast, soft shadow underneath to create depth, professional sticker aesthetic`,
    illustration: `3D stylized illustration, high-end product feel, C4D Octane render, smooth plastic and metallic textures, trendy aesthetic, soft studio lighting, minimalist design, bright sophisticated color palette`,
    cyberpunk: `Cyberpunk aesthetic, neon-lit city evening, futuristic technology, rainy streets with vibrant reflections, high contrast, cinematic lighting, sharp details, teal and magenta color palette, 8k resolution`,
    ukiyoe: `Traditional Japanese Ukiyo-e style, woodblock print texture, iconic flat colors, elegant line work, mountain or ocean waves landscape, vintage paper texture, classic oriental art`,
    ghibli: `Studio Ghibli style, hand-drawn aesthetic, lush watercolor scenery, soft nostalgic sunlight, whimsical atmosphere, high quality anime art, peaceful and heartwarming`,
  };

  const basePrompt = themePrompts[theme] || themePrompts.vintage;
  const dateStr = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${basePrompt}. High quality, detailed, professional composition, artistic photography, NO TEXT in image.`;
}

export const seedreamService = {
  generateImage: async (params: ImageGenerationParams) => {
    const config = getConfig();
    const prompt = generatePrompt(params.theme, params.date, params.quote);
    
    console.log(`[Seedream] Requesting image with model: ${config.model}`);
    if (!config.apiKey) {
      console.error('[Seedream] API Key is missing!');
      throw new Error('API Key 未配置');
    }

    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          prompt,
          size: params.size || '1024x1024',
          quality: params.quality || 'standard',
          n: 1,
          response_format: 'url',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Seedream] API Error: ${response.status}`, errorData);
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Seedream] Image generated successfully!');
      return {
        id: `${Date.now()}`,
        url: data.data[0].url,
        metadata: { generatedAt: new Date(), prompt, theme: params.theme, size: params.size, quality: params.quality }
      };
    } catch (error) {
      console.error('[Seedream] Fetch error:', error);
      throw error;
    }
  },
  cancelGeneration: () => {}
};

// 兼容性导出
export async function generateCalendarImage(params: ImageGenerationParams): Promise<GeneratedImage> {
  return seedreamService.generateImage(params);
}

export function cancelImageGeneration(): void {
  seedreamService.cancelGeneration();
}
