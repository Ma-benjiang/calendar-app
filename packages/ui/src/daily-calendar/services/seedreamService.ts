/**
 * Seedream API 服务
 * 火山引擎 Seedream 图像生成服务封装
 */

import {
  SeedreamConfig,
  ImageGenerationParams,
  GeneratedImage,
  ThemeType,
} from '../types';
import {
  getDefaultImageModelConfig,
  resolveImageModelConfig,
  validateImageModelConfig,
} from './imageModelConfig';
import { requestAIJson } from './desktopAIRequest';

interface SeedreamResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
}

/**
 * 根据主题生成 Prompt
 */
function generatePrompt(theme: ThemeType, _date: Date, _quote: string): string {
  const themePrompts: Record<ThemeType, string> = {
    vintage: `A beautiful and nostalgic scene, 90s fashion editorial style, direct flash, high-end paper texture, muted nostalgic tones`,
    minimal: `An exquisite minimalist still life photography, a single beautiful object, clean background, soft organic shadows, elegant composition`,
    nature: `A stunning botanical art piece, lush green leaves, morning light, dew drops, serene and fresh atmosphere`,
    art: `A captivating avant-garde conceptual art installation, floating surrealist elements, hyper-realistic textures, striking composition`,
    zen: `A poetic zen landscape, traditional Chinese ink wash painting style, a lone boat on a misty lake, elegant brush strokes, serene and calm`,
    cosmic: `A breathtaking deep space nebula, glowing stardust, mystical astronomical masterpiece, deep navy gradients, ethereal and vast`,
    clay: `A cute 3D claymation character or scene, soft matte clay textures, handcrafted look, rounded forms, vibrant pastel colors`,
    sticker: `A vibrant 3D pop-out sticker design of a cool object, die-cut with thick white borders, glossy finish, high contrast`,
    illustration: `A trendy 3D stylized illustration of a modern object, C4D Octane render, smooth plastic and metallic textures, bright color palette`,
    cyberpunk: `A cinematic cyberpunk city street at night, neon lights, rainy reflections, futuristic technology, sharp details`,
    ukiyoe: `A classic Japanese Ukiyo-e style print, iconic ocean waves or mountain landscape, woodblock texture, elegant flat colors`,
    ghibli: `A heartwarming Studio Ghibli style anime scene, lush watercolor nature, soft nostalgic sunlight, peaceful and magical`,
  };

  const basePrompt = themePrompts[theme] || themePrompts.vintage;
  return `${basePrompt}. High-end artistic photography or illustration, rich details, stunning visual impact, NO TEXT, NO CALENDAR LAYOUT in image.`;
}

function getOpenAIImageSize(size: ImageGenerationParams['size']): string {
  if (size === '1K') return '1024x1024';
  if (size === '4K') return '2880x2880';
  return '2048x2048';
}

function getOpenAIEditEndpoint(endpoint: string): string {
  return endpoint.replace(/\/images\/generations\/?$/, '/images/edits');
}

export const seedreamService = {
  generateImage: async (
    params: ImageGenerationParams & { refImage?: string },
    imageModelConfig?: SeedreamConfig
  ): Promise<GeneratedImage> => {
    const config = resolveImageModelConfig(
      imageModelConfig ?? getDefaultImageModelConfig()
    );
    const prompt = params.visualPrompt?.trim()
      || generatePrompt(params.theme, params.date, params.quote);
    
    console.log(`[Seedream] Requesting image with model: ${config.model}${params.refImage ? ' (Img2Img Mode)' : ''}`);

    const configErrors = validateImageModelConfig(config);
    if (configErrors.length > 0) {
      throw new Error(`生图模型配置不完整：${configErrors.join('；')}`);
    }

    try {
      const body: {
        model: string;
        prompt: string;
        size: string;
        quality: string;
        n: number;
        response_format?: string;
        ref_image_url?: string;
        strength?: number;
      } = {
        model: config.model,
        prompt,
        size: config.provider === 'openai'
          ? getOpenAIImageSize(params.size)
          : '2048x2048',
        quality: config.provider === 'openai'
          ? params.quality === 'hd' ? 'high' : 'medium'
          : params.quality || 'standard',
        n: 1,
      };

      let endpoint = config.apiEndpoint;
      let multipart:
        | { imageDataUrl: string; imageField: string; filename: string }
        | undefined;

      if (config.provider === 'openai' && params.refImage) {
        endpoint = getOpenAIEditEndpoint(config.apiEndpoint);
        multipart = {
          imageDataUrl: params.refImage,
          imageField: 'image',
          filename: 'reference.jpg',
        };
      } else if (params.refImage) {
        body.ref_image_url = params.refImage; // 已经是 data:image/jpeg;base64,... 格式
        body.strength = 0.6;
        body.response_format = 'url';
      } else if (config.provider !== 'openai') {
        body.response_format = 'url';
      }

      const response = await requestAIJson<SeedreamResponse>(
        endpoint,
        config.apiKey,
        body,
        multipart
      );

      if (!response.ok) {
        console.error(`[Seedream] API Error: ${response.status}`, response.data);
        throw new Error(`AI 绘图失败: ${response.status}. ${response.data.error?.message || ''}`);
      }

      const image = response.data.data?.[0];
      const imageUrl = image?.url ?? (
        image?.b64_json ? `data:image/png;base64,${image.b64_json}` : ''
      );

      if (!imageUrl) {
        throw new Error('AI 绘图失败：响应中没有图片');
      }

      console.log('[Seedream] Image generated successfully!');
      
      return {
        id: `${Date.now()}`,
        url: imageUrl,
        metadata: { 
          generatedAt: new Date(), 
          prompt, 
          theme: params.theme, 
          size: params.size,
          quality: params.quality || 'standard',
          provider: config.provider,
          model: config.model,
        }
      };
    } catch (error) {
      console.error('[Seedream] Error:', error);
      throw error;
    }
  },
  cancelGeneration: () => {}
};

// 兼容性导出
export async function generateCalendarImage(
  params: ImageGenerationParams,
  imageModelConfig?: SeedreamConfig
): Promise<GeneratedImage> {
  return seedreamService.generateImage(params, imageModelConfig);
}

export function cancelImageGeneration(): void {
  seedreamService.cancelGeneration();
}
