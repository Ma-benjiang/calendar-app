/**
 * 文案生成服务
 * 处理每日祝福语/文案的生成和选择
 */

import {
  Quote,
  QuoteCategory,
  ThemeType,
  CalendarDateInfo,
} from '../types';
import { getSeason } from '../utils/dateUtils';

// 文案库
const QUOTES_LIBRARY: Quote[] = [
  // 诗词类
  { id: 'poetry-001', text: '春风得意马蹄疾，一日看尽长安花', category: 'poetry', themes: ['vintage', 'art', 'zen'] },
  { id: 'poetry-002', text: '采菊东篱下，悠然见南山', category: 'poetry', themes: ['nature', 'zen', 'vintage'] },
  { id: 'poetry-003', text: '行到水穷处，坐看云起时', category: 'poetry', themes: ['zen', 'nature', 'minimal'] },
  { id: 'poetry-004', text: '明月松间照，清泉石上流', category: 'poetry', themes: ['zen', 'nature', 'art'] },
  { id: 'poetry-005', text: '海内存知己，天涯若比邻', category: 'poetry', themes: ['vintage', 'art'] },
  { id: 'poetry-006', text: '落霞与孤鹜齐飞，秋水共长天一色', category: 'poetry', themes: ['art', 'nature'] },
  { id: 'poetry-007', text: '疏影横斜水清浅，暗香浮动月黄昏', category: 'poetry', themes: ['zen', 'art', 'vintage'] },
  { id: 'poetry-008', text: '接天莲叶无穷碧，映日荷花别样红', category: 'poetry', themes: ['nature', 'art'] },
  { id: 'poetry-009', text: '小荷才露尖尖角，早有蜻蜓立上头', category: 'poetry', themes: ['nature', 'zen'] },
  { id: 'poetry-010', text: '山重水复疑无路，柳暗花明又一村', category: 'poetry', themes: ['nature', 'art'] },

  // 治愈类
  { id: 'healing-001', text: '今天的阳光，是昨天期待的礼物', category: 'healing', themes: ['minimal', 'nature', 'vintage'] },
  { id: 'healing-002', text: '慢慢来，比较快', category: 'healing', themes: ['minimal', 'zen'] },
  { id: 'healing-003', text: '愿你被这个世界温柔以待', category: 'healing', themes: ['minimal', 'art', 'nature'] },
  { id: 'healing-004', text: '生活明朗，万物可爱', category: 'healing', themes: ['nature', 'minimal', 'art'] },
  { id: 'healing-005', text: '保持热爱，奔赴山海', category: 'healing', themes: ['nature', 'cosmic'] },
  { id: 'healing-006', text: '心有猛虎，细嗅蔷薇', category: 'healing', themes: ['art', 'zen', 'vintage'] },
  { id: 'healing-007', text: '岁月漫长，值得等待', category: 'healing', themes: ['vintage', 'minimal', 'zen'] },
  { id: 'healing-008', text: '时光不语，静待花开', category: 'healing', themes: ['zen', 'nature', 'vintage'] },
  { id: 'healing-009', text: '愿你眼里有光，心中有爱', category: 'healing', themes: ['minimal', 'art'] },
  { id: 'healing-010', text: '日子很长，过客很多，也不必太在意', category: 'healing', themes: ['zen', 'minimal'] },

  // 励志类
  { id: 'inspire-001', text: '每一天都是新的开始', category: 'inspirational', themes: ['minimal', 'art', 'cosmic'] },
  { id: 'inspire-002', text: '星光不问赶路人，时光不负有心人', category: 'inspirational', themes: ['cosmic', 'vintage', 'art'] },
  { id: 'inspire-003', text: '越努力，越幸运', category: 'inspirational', themes: ['minimal', 'art'] },
  { id: 'inspire-004', text: '相信自己，你比想象中更强大', category: 'inspirational', themes: ['minimal', 'cosmic'] },
  { id: 'inspire-005', text: '梦想不会逃跑，逃跑的永远只是不敢追梦的人', category: 'inspirational', themes: ['art', 'cosmic'] },
  { id: 'inspire-006', text: '最好的时光，是现在', category: 'inspirational', themes: ['minimal', 'vintage'] },
  { id: 'inspire-007', text: '路虽远，行则将至；事虽难，做则必成', category: 'inspirational', themes: ['zen', 'nature'] },
  { id: 'inspire-008', text: '不积跬步，无以至千里', category: 'inspirational', themes: ['zen', 'vintage'] },

  // 节气类
  { id: 'solar-001', text: '立春至，万物生', category: 'solar-term', themes: ['nature', 'zen'], applicableSolarTerms: ['立春'] },
  { id: 'solar-002', text: '雨水润物细无声', category: 'solar-term', themes: ['nature', 'zen'], applicableSolarTerms: ['雨水'] },
  { id: 'solar-003', text: '春雷响，万物长', category: 'solar-term', themes: ['nature'], applicableSolarTerms: ['惊蛰'] },
  { id: 'solar-004', text: '春分雨脚落声微', category: 'solar-term', themes: ['nature', 'art'], applicableSolarTerms: ['春分'] },
  { id: 'solar-005', text: '清明时节雨纷纷', category: 'solar-term', themes: ['nature', 'zen'], applicableSolarTerms: ['清明'] },
  { id: 'solar-006', text: '谷雨春光晓', category: 'solar-term', themes: ['nature'], applicableSolarTerms: ['谷雨'] },
  { id: 'solar-007', text: '立夏将离春去也', category: 'solar-term', themes: ['nature'], applicableSolarTerms: ['立夏'] },
  { id: 'solar-008', text: '小满江河满', category: 'solar-term', themes: ['nature'], applicableSolarTerms: ['小满'] },
  { id: 'solar-009', text: '芒种看今日，螽斯应节生', category: 'solar-term', themes: ['nature', 'vintage'], applicableSolarTerms: ['芒种'] },
  { id: 'solar-010', text: '夏至一阴生', category: 'solar-term', themes: ['zen', 'nature'], applicableSolarTerms: ['夏至'] },
  { id: 'solar-011', text: '小暑大暑，上蒸下煮', category: 'solar-term', themes: ['nature'], applicableSolarTerms: ['小暑', '大暑'] },
  { id: 'solar-012', text: '立秋凉风至', category: 'solar-term', themes: ['nature', 'zen'], applicableSolarTerms: ['立秋'] },
  { id: 'solar-013', text: '处暑无三日，新凉直万金', category: 'solar-term', themes: ['nature', 'vintage'], applicableSolarTerms: ['处暑'] },
  { id: 'solar-014', text: '白露秋分夜，一夜凉一夜', category: 'solar-term', themes: ['nature'], applicableSolarTerms: ['白露', '秋分'] },
  { id: 'solar-015', text: '寒露惊秋晚', category: 'solar-term', themes: ['nature', 'art'], applicableSolarTerms: ['寒露'] },
  { id: 'solar-016', text: '霜降碧天静', category: 'solar-term', themes: ['nature', 'art'], applicableSolarTerms: ['霜降'] },
  { id: 'solar-017', text: '立冬犹十日，衣亦未装绵', category: 'solar-term', themes: ['nature', 'vintage'], applicableSolarTerms: ['立冬'] },
  { id: 'solar-018', text: '小雪气寒而将雪矣', category: 'solar-term', themes: ['nature'], applicableSolarTerms: ['小雪'] },
  { id: 'solar-019', text: '大雪满初晨', category: 'solar-term', themes: ['nature', 'art'], applicableSolarTerms: ['大雪'] },
  { id: 'solar-020', text: '冬至阳生春又来', category: 'solar-term', themes: ['zen', 'nature'], applicableSolarTerms: ['冬至'] },

  // 节日类
  { id: 'holiday-001', text: '新春快乐，万事如意', category: 'holiday', themes: ['vintage', 'art', 'zen'], applicableHolidays: ['春节'] },
  { id: 'holiday-002', text: '元宵节快乐，月圆人团圆', category: 'holiday', themes: ['art', 'zen'], applicableHolidays: ['元宵节'] },
  { id: 'holiday-003', text: '清明时节，慎终追远', category: 'holiday', themes: ['zen', 'nature'], applicableHolidays: ['清明节'] },
  { id: 'holiday-004', text: '端午安康，粽叶飘香', category: 'holiday', themes: ['nature', 'vintage'], applicableHolidays: ['端午节'] },
  { id: 'holiday-005', text: '七夕快乐，愿有情人终成眷属', category: 'holiday', themes: ['art', 'cosmic'], applicableHolidays: ['七夕节'] },
  { id: 'holiday-006', text: '中秋快乐，月圆人团圆', category: 'holiday', themes: ['art', 'zen', 'cosmic'], applicableHolidays: ['中秋节'] },
  { id: 'holiday-007', text: '重阳节快乐，敬老尊贤', category: 'holiday', themes: ['zen', 'vintage'], applicableHolidays: ['重阳节'] },
  { id: 'holiday-008', text: '新年快乐，万象更新', category: 'holiday', themes: ['minimal', 'art'], applicableHolidays: ['元旦'] },
  { id: 'holiday-009', text: '劳动节快乐，致敬每一位劳动者', category: 'holiday', themes: ['minimal', 'art'], applicableHolidays: ['劳动节'] },
  { id: 'holiday-010', text: '国庆快乐，祖国繁荣昌盛', category: 'holiday', themes: ['art', 'cosmic'], applicableHolidays: ['国庆节'] },
  { id: 'holiday-011', text: '情人节快乐，愿爱永恒', category: 'holiday', themes: ['art', 'minimal'], applicableHolidays: ['情人节'] },
  { id: 'holiday-012', text: '圣诞快乐，平安喜乐', category: 'holiday', themes: ['art', 'vintage'], applicableHolidays: ['圣诞节'] },
];

// 最近使用的文案 ID（用于避免重复）
const recentQuoteIds = new Set<string>();
const MAX_RECENT_QUOTES = 30;

/**
 * 获取特殊日期文案
 */
function getSpecialDayQuote(dateInfo: CalendarDateInfo): Quote | null {
  const { special } = dateInfo;

  // 节假日优先
  if (special.isHoliday && special.holidayName) {
    const holidayQuote = QUOTES_LIBRARY.find(q =>
      q.category === 'holiday' &&
      q.applicableHolidays?.includes(special.holidayName!)
    );
    if (holidayQuote) return holidayQuote;
  }

  // 节气其次
  if (special.isSolarTerm && special.solarTermName) {
    const solarQuote = QUOTES_LIBRARY.find(q =>
      q.category === 'solar-term' &&
      q.applicableSolarTerms?.includes(special.solarTermName!)
    );
    if (solarQuote) return solarQuote;
  }

  return null;
}

/**
 * 根据主题筛选文案
 */
function getQuotesByTheme(_theme: ThemeType): Quote[] {
  // 优先返回适合该主题的文案
  const themedQuotes = QUOTES_LIBRARY.filter(q => q.themes.includes(theme));

  // 如果没有找到足够的主题文案，返回所有非特殊日期文案
  if (themedQuotes.length < 5) {
    const generalQuotes = QUOTES_LIBRARY.filter(q =>
      q.category !== 'holiday' && q.category !== 'solar-term'
    );
    return [...themedQuotes, ...generalQuotes];
  }

  return themedQuotes;
}

/**
 * 根据上下文筛选文案
 */
function filterByContext(quotes: Quote[], date: Date): Quote[] {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const season = getSeason(date);

  // 周一或月初使用励志文案
  const isMonday = dayOfWeek === 1;
  const isFirstDayOfMonth = dayOfMonth === 1;

  if (isMonday || isFirstDayOfMonth) {
    const inspirational = quotes.filter(q => q.category === 'inspirational');
    if (inspirational.length > 0) {
      return inspirational;
    }
  }

  // 根据季节筛选
  const seasonThemes: Record<string, ThemeType[]> = {
    spring: ['nature', 'zen', 'art'],
    summer: ['nature', 'minimal', 'cosmic'],
    autumn: ['vintage', 'art', 'nature'],
    winter: ['zen', 'vintage', 'cosmic'],
  };

  const currentSeasonThemes = seasonThemes[season];
  const seasonQuotes = quotes.filter(q =>
    q.themes.some(t => currentSeasonThemes.includes(t))
  );

  if (seasonQuotes.length > 0) {
    return seasonQuotes;
  }

  return quotes;
}

/**
 * 随机选择文案（避免近期重复）
 */
function randomSelect(quotes: Quote[]): Quote {
  // 过滤掉最近使用过的文案
  const availableQuotes = quotes.filter(q => !recentQuoteIds.has(q.id));

  // 如果所有文案都最近用过，重置历史
  const pool = availableQuotes.length > 0 ? availableQuotes : quotes;

  // 随机选择
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];

  // 记录到最近使用
  recentQuoteIds.add(selected.id);
  if (recentQuoteIds.size > MAX_RECENT_QUOTES) {
    const first = recentQuoteIds.values().next().value as string;
    recentQuoteIds.delete(first);
  }

  return selected;
}

/**
 * 选择每日文案
 * @param date 日期
 * @param theme 主题
 * @param dateInfo 日期信息
 * @returns 选中的文案
 */
export function selectDailyQuote(
  date: Date,
  theme: ThemeType,
  dateInfo: CalendarDateInfo
): Quote {
  // 1. 特殊日期优先
  const specialQuote = getSpecialDayQuote(dateInfo);
  if (specialQuote) {
    return specialQuote;
  }

  // 2. 按主题筛选
  const themeQuotes = getQuotesByTheme(theme);

  // 3. 按星期/月份筛选
  const contextualQuotes = filterByContext(themeQuotes, date);

  // 4. 随机选择（避免近期重复）
  return randomSelect(contextualQuotes);
}

/**
 * 根据 ID 获取文案
 */
export function getQuoteById(id: string): Quote | undefined {
  return QUOTES_LIBRARY.find(q => q.id === id);
}

/**
 * 获取所有文案
 */
export function getAllQuotes(): Quote[] {
  return [...QUOTES_LIBRARY];
}

/**
 * 按分类获取文案
 */
export function getQuotesByCategory(category: QuoteCategory): Quote[] {
  return QUOTES_LIBRARY.filter(q => q.category === category);
}

/**
 * 添加自定义文案
 */
export function addCustomQuote(quote: Omit<Quote, 'id'>): Quote {
  const newQuote: Quote = {
    ...quote,
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  QUOTES_LIBRARY.push(newQuote);
  return newQuote;
}

/**
 * 清除最近使用记录
 */
export function clearRecentQuotes(): void {
  recentQuoteIds.clear();
}

/**
 * 生成 Prompt 用的文案描述
 */
export function generatePromptQuote(quote: Quote, _theme: ThemeType): string {
  const categoryDescriptions: Record<QuoteCategory, string> = {
    poetry: '古典诗词意境',
    healing: '温暖治愈风格',
    inspirational: '励志向上风格',
    'solar-term': '传统节气氛围',
    holiday: '节日喜庆氛围',
    general: '日常通用风格',
  };

  return `${quote.text} (${categoryDescriptions[quote.category]})`;
}
