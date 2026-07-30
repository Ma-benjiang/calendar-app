/**
 * 每日台历创意服务
 * 一次文字模型调用同时生成文案和无文字背景图 Prompt。
 */

import {
  CalendarDateInfo,
  LLMModelConfig,
  Quote,
  ThemeType,
} from '../types';
import {
  requestAIJson,
  requestCalendarCreativePlan,
} from './desktopAIRequest';
import {
  resolveLLMModelConfig,
  validateLLMModelConfig,
} from './llmModelConfig';

interface CaptionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface CreativePayload {
  quote?: unknown;
  imagePrompt?: unknown;
  image_prompt?: unknown;
}

export interface CalendarCreativePlan {
  quote: Quote;
  imagePrompt: string;
}

const THEME_DESCRIPTIONS: Record<ThemeType, string> = {
  vintage: '复古画报摄影，纸张颗粒和克制的怀旧色彩',
  minimal: '极简静物摄影，干净背景和柔和有机阴影',
  nature: '自然植物艺术，清晨光线和清新湿润质感',
  art: '先锋概念艺术，超现实元素和大胆构图',
  zen: '东方禅意水墨，留白、薄雾和安静氛围',
  cosmic: '深空星云艺术，深蓝渐变和空灵光尘',
  clay: '手工黏土动画，圆润造型和哑光材质',
  sticker: '立体贴纸艺术，清晰轮廓和明快质感',
  illustration: '潮流三维插画，塑料与金属混合材质',
  cyberpunk: '电影感赛博朋克，雨夜反射和霓虹光线',
  ukiyoe: '浮世绘木版画，平面色彩和传统纹理',
  ghibli: '温暖手绘动画，水彩自然和怀旧阳光',
};

function parseCreativePayload(content: string): CreativePayload | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as CreativePayload;
  } catch {
    return null;
  }
}

function getDateContext(date: Date, dateInfo: CalendarDateInfo) {
  const special = dateInfo.special;
  return {
    date: date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    weekday: dateInfo.weekday.name,
    lunar: `${dateInfo.lunar.monthName}${dateInfo.lunar.dayName}`,
    zodiac: `${dateInfo.lunar.zodiac}年`,
    solarTerm: special.solarTermName || null,
    holiday: special.holidayName || null,
    holidayStatus: special.isWorkdayAdjustment
      ? '调休工作日'
      : special.isHoliday
        ? '法定休息日'
        : null,
  };
}

export function buildFallbackImagePrompt(
  date: Date,
  theme: ThemeType,
  quote: Quote,
  dateInfo: CalendarDateInfo
): string {
  const context = getDateContext(date, dateInfo);
  const dateMood = [
    context.solarTerm,
    context.holiday,
    context.holidayStatus,
    context.lunar,
  ].filter(Boolean).join('，');

  return [
    `创作一幅 ${THEME_DESCRIPTIONS[theme]} 风格的方形视觉作品。`,
    dateMood ? `画面情绪参考当天语境：${dateMood}。` : '',
    `以“${quote.text}”表达的情绪为创意内核，但不要在画面中呈现这句话。`,
    '构图简洁、有明确主体、光线自然、细节丰富，并保留舒适的视觉呼吸感。',
    '画面中禁止出现任何文字、字母、数字、日期、日历界面、Logo 或水印。',
  ].filter(Boolean).join(' ');
}

export class CaptionAIService {
  async generateCreativePlan(
    date: Date,
    theme: ThemeType,
    dateInfo: CalendarDateInfo,
    llmModelConfig?: LLMModelConfig
  ): Promise<CalendarCreativePlan | null> {
    const config = resolveLLMModelConfig(llmModelConfig);
    if (!config.apiKey || validateLLMModelConfig(config).length > 0) {
      return null;
    }

    const context = {
      ...getDateContext(date, dateInfo),
      theme: THEME_DESCRIPTIONS[theme],
    };
    const systemPrompt = `你是每日台历的文案编辑和视觉导演。
请根据用户提供的确定性日期 JSON 数据，同时生成一句中文每日文案和一段生图提示词。

要求：
1. quote 必须原创、自然、有画面感，不超过 20 个汉字。
2. imagePrompt 只描述背景画面的主体、场景、构图、色彩、光线、材质和氛围。
3. 节日或节气只转化为克制的视觉象征，避免俗套堆砌。
4. 图片为 1:1 方形构图，主体清晰，留有适度呼吸空间。
5. 图片中禁止出现任何文字、字母、数字、日期、日历界面、Logo 或水印。
6. 不得修改、猜测或纠正输入的日期信息。

仅返回 JSON，格式示例：
{"quote":"春风有信，花开有期","imagePrompt":"一段可直接提交给图像模型的中文视觉描述"}`;
    const userPrompt = `请基于以下 JSON 生成台历创意：\n${JSON.stringify(context)}`;

    try {
      const desktopResult = await requestCalendarCreativePlan<{
        quote: string;
        imagePrompt: string;
      }>({
        provider: config.provider,
        apiEndpoint: config.apiEndpoint,
        apiKey: config.apiKey,
        model: config.model,
        system: systemPrompt,
        prompt: userPrompt,
      });

      if (desktopResult) {
        if (!desktopResult.ok || !desktopResult.data) {
          console.warn(
            '[AI Caption] AI SDK request failed:',
            desktopResult.error || 'Unknown error'
          );
          return null;
        }

        return {
          quote: {
            id: `ai-${Date.now()}`,
            text: desktopResult.data.quote.trim(),
            category: 'general',
            themes: [theme],
          },
          imagePrompt: desktopResult.data.imagePrompt.trim(),
        };
      }

      const response = await requestAIJson<CaptionResponse>(
        config.apiEndpoint,
        config.apiKey,
        {
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          thinking: { type: 'disabled' },
          temperature: 0.85,
          max_tokens: 1000,
          stream: false,
        }
      );

      if (!response.ok) {
        console.warn(
          `[AI Caption] Request failed (${response.status}):`,
          response.data.error?.message || 'Unknown error'
        );
        return null;
      }

      const content = response.data.choices?.[0]?.message?.content || '';
      const payload = parseCreativePayload(content);
      const quoteText = typeof payload?.quote === 'string' ? payload.quote.trim() : '';
      const imagePromptValue = payload?.imagePrompt ?? payload?.image_prompt;
      const imagePrompt = typeof imagePromptValue === 'string'
        ? imagePromptValue.trim()
        : '';

      if (!quoteText || quoteText.length > 40 || imagePrompt.length < 20) {
        console.warn('[AI Caption] Invalid creative payload, using local fallback');
        return null;
      }

      return {
        quote: {
          id: `ai-${Date.now()}`,
          text: quoteText,
          category: 'general',
          themes: [theme],
        },
        imagePrompt,
      };
    } catch (error) {
      console.warn('[AI Caption] Generation failed, using local fallback:', error);
      return null;
    }
  }

  async generateQuote(
    date: Date,
    theme: ThemeType,
    dateInfo: CalendarDateInfo,
    llmModelConfig?: LLMModelConfig
  ): Promise<Quote | null> {
    return (
      await this.generateCreativePlan(date, theme, dateInfo, llmModelConfig)
    )?.quote ?? null;
  }
}

export const captionAIService = new CaptionAIService();
