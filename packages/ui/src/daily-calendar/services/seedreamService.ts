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

// 默认配置 - 绘图大师
const DEFAULT_CONFIG: SeedreamConfig = {
  apiEndpoint: '/volces-api/api/v3/images/generations',
  apiKey: '',
  model: 'doubao-seedream-5-0-260128',
};

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

export const seedreamService = {
  generateImage: async (params: ImageGenerationParams & { refImage?: string }) => {
    const config = getConfig();
    const prompt = generatePrompt(params.theme, params.date, params.quote);
    
    console.log(`[Seedream] Requesting image with model: ${config.model}${params.refImage ? ' (Img2Img Mode)' : ''}`);
    
    if (!config.apiKey) {
      throw new Error('VITE_SEEDREAM_API_KEY is not configured');
    }

    try {
      const body: any = {
        model: config.model,
        prompt,
        // 核心修复：Seedream 5.0 要求分辨率至少 368.6 万像素，1024x1024 会报错
        size: '2048x2048', 
        quality: params.quality || 'standard',
        n: 1,
        response_format: 'url',
      };

      if (params.refImage) {
        body.ref_image_url = params.refImage; // 已经是 data:image/jpeg;base64,... 格式
        body.strength = 0.6; 
      }

      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Seedream] API Error: ${response.status}`, errorData);
        throw new Error(`AI 绘图失败: ${response.status}. ${errorData.error?.message || ''}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;
      console.log('[Seedream] Image generated successfully!');
      
      return {
        id: `${Date.now()}`,
        url: imageUrl,
        metadata: { 
          generatedAt: new Date(), 
          prompt, 
          theme: params.theme, 
          size: '2048x2048', 
          quality: params.quality || 'standard' 
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
export async function generateCalendarImage(params: ImageGenerationParams): Promise<GeneratedImage> {
  return seedreamService.generateImage(params);
}

export function cancelImageGeneration(): void {
  seedreamService.cancelGeneration();
}
