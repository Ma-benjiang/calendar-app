/**
 * AI 文案生成服务
 * 调用文字模型生成每日金句
 */

import { ThemeType, CalendarDateInfo, Quote } from '../types';

export class CaptionAIService {
  private apiEndpoint = '/volces-api/api/v3/chat/completions';
  private apiKey = import.meta.env.VITE_SEEDREAM_API_KEY || '';
  // 固定使用文案高手模型
  private model = import.meta.env.VITE_CHAT_MODEL || 'doubao-seed-2-0-mini-260215';

  async generateQuote(date: Date, theme: ThemeType, dateInfo: CalendarDateInfo): Promise<Quote | null> {
    if (!this.apiKey) {
      console.error('[AI Caption] API Key is missing! Check your .env file.');
      return null;
    }

    const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    const solarTerm = dateInfo.special.solarTermName ? `今天恰逢节气：${dateInfo.special.solarTermName}。` : '';
    const holiday = dateInfo.special.holidayName ? `今天是：${dateInfo.special.holidayName}。` : '';
    
    const themeDescriptions: Record<string, string> = {
      vintage: '复古画报风格', minimal: '极简主义', nature: '工业自然', art: '先锋艺术',
      zen: '极简线条', cosmic: '深空磨砂', clay: '3D粘土', sticker: '3D贴纸',
      illustration: '潮流插画', cyberpunk: '赛博朋克', ukiyoe: '浮世绘', ghibli: '吉卜力'
    };

    const prompt = `你是一个极具文学素养和审美眼光的日历文案创作者。
当前日期：${dateStr}。${solarTerm}${holiday}
当前艺术风格：${themeDescriptions[theme] || theme}。

请为今天的日历创作一句简短（20字以内）且深刻的文案。
要求：
1. 必须是【原创】且【多变】的文案，不要总是重复节日的俗套话。
2. 文字要优美、有画面感，能引发情感共鸣。
3. 风格要契合当前的艺术风格：${themeDescriptions[theme] || theme}。
4. 只返回文案正文，不要有任何解释。`;

    console.log(`[AI Caption] Using TEXT model: ${this.model}`);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: '你是一位精通诗词与现代美学的文案大师。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.95, // 极高随机性，确保每次不一样
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const text = data.choices[0]?.message?.content?.trim().replace(/^"|"$/g, '') || '';

      if (text) {
        console.log(`[AI Caption] New Quote: "${text}"`);
        return { id: `ai-${Date.now()}`, text, category: 'general', themes: [theme] };
      }
      return null;
    } catch (error) {
      console.error('[AI Caption] Error:', error);
      return null;
    }
  }
}

export const captionAIService = new CaptionAIService();
