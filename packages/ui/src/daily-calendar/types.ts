/**
 * 每日台历 - 类型定义
 * Daily Calendar - Type Definitions
 */

// ==================== 日期信息类型 ====================

export interface GregorianDate {
  year: number;
  month: number;
  day: number;
  monthName: string;      // "三月"
  dayName: string;        // "三日"
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  monthName: string;      // "二月"
  dayName: string;        // "初四"
  zodiac: string;         // 生肖
}

export interface WeekdayInfo {
  index: number;          // 0-6
  name: string;           // "星期一"
  shortName: string;      // "周一"
  englishName: string;    // "Monday"
}

export interface SpecialDayInfo {
  isHoliday: boolean;
  holidayName?: string;   // "春节"
  isSolarTerm: boolean;
  solarTermName?: string; // "立春"
  constellation: string;  // "双鱼座"
}

export interface CalendarDateInfo {
  gregorian: GregorianDate;
  lunar: LunarDate;
  weekday: WeekdayInfo;
  special: SpecialDayInfo;
}

// ==================== 主题类型 ====================

export type ThemeType = 'vintage' | 'minimal' | 'nature' | 'art' | 'zen' | 'cosmic' | 'clay' | 'sticker' | 'illustration' | 'cyberpunk' | 'ukiyoe' | 'ghibli';

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  description: string;
  promptStyle: string;
  colorPalette: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

export type ThemeStrategyType = 'manual' | 'seasonal' | 'daily-random' | 'ai-recommended';

export interface ThemePreferences {
  favorites: ThemeType[];
  excluded: ThemeType[];
  seasonalMapping: {
    spring: ThemeType[];
    summer: ThemeType[];
    autumn: ThemeType[];
    winter: ThemeType[];
  };
}

export interface ThemeStrategy {
  type: ThemeStrategyType;
  currentTheme: ThemeType;
  preferences: ThemePreferences;
}

// ==================== 文案类型 ====================

export type QuoteCategory = 'poetry' | 'healing' | 'inspirational' | 'solar-term' | 'holiday' | 'general';

export interface Quote {
  id: string;
  text: string;
  textEn?: string;
  category: QuoteCategory;
  themes: ThemeType[];
  applicableHolidays?: string[];
  applicableSolarTerms?: string[];
}

// ==================== 图片生成类型 ====================

export type ImageSize = '1K' | '2K' | '4K';
export type ImageQuality = 'standard' | 'hd';

export interface ImageGenerationParams {
  date: Date;
  theme: ThemeType;
  quote: string;
  size: ImageSize;
  quality: ImageQuality;
}

export interface GeneratedImage {
  id: string;
  url: string;
  base64?: string;
  metadata: {
    generatedAt: Date;
    prompt: string;
    theme: ThemeType;
    size: ImageSize;
    quality: ImageQuality;
  };
}

// ==================== 台历记录类型 ====================

export interface DailyCalendarRecord {
  id: string;
  date: string;                    // YYYY-MM-DD
  dateInfo: CalendarDateInfo;
  theme: ThemeType;
  quote: Quote;
  image: GeneratedImage;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 用户偏好类型 ====================

export interface UserPreferences {
  themeStrategy: ThemeStrategy;
  defaultImageSize: ImageSize;
  defaultImageQuality: ImageQuality;
  language: 'zh' | 'en';
  autoGenerate: boolean;
}

// ==================== API 类型 ====================

export interface SeedreamConfig {
  apiEndpoint: string;
  apiKey: string;
  model: string;
}

export interface SeedreamGenerationRequest {
  prompt: string;
  size: ImageSize;
  quality: ImageQuality;
  n: number;
  response_format: 'url' | 'b64_json';
}

export interface SeedreamGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface SeedreamError {
  error: {
    code: string;
    message: string;
  };
}

// ==================== 组件 Props 类型 ====================

export interface CalendarCardProps {
  record: DailyCalendarRecord;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export interface CalendarHeaderProps {
  dateInfo: CalendarDateInfo;
  className?: string;
}

export interface CalendarImageProps {
  imageUrl: string;
  alt: string;
  isLoading?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export interface CalendarCaptionProps {
  quote: Quote;
  theme: ThemeType;
  className?: string;
}

export interface ThemeSelectorProps {
  currentTheme: ThemeType;
  strategy: ThemeStrategyType;
  onThemeChange: (theme: ThemeType) => void;
  onStrategyChange: (strategy: ThemeStrategyType) => void;
}

export interface HistoryGridProps {
  records: DailyCalendarRecord[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onSelectDate: (date: string) => void;
}

export interface HistoryCalendarProps {
  records: Map<string, DailyCalendarRecord>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onSelectDate: (date: string) => void;
  selectedDate?: string;
}

// ==================== Hook 返回类型 ====================

export interface UseDailyCalendarReturn {
  currentRecord: DailyCalendarRecord | null;
  isLoading: boolean;
  error: Error | null;
  generateCalendar: (date?: Date, theme?: ThemeType) => Promise<void>;
  regenerateCalendar: () => Promise<void>;
  changeTheme: (theme: ThemeType) => Promise<void>;
}

export interface UseCalendarStorageReturn {
  records: Map<string, DailyCalendarRecord>;
  preferences: UserPreferences | null;
  saveRecord: (record: DailyCalendarRecord) => Promise<void>;
  getRecord: (date: string) => DailyCalendarRecord | null;
  savePreferences: (prefs: UserPreferences) => Promise<void>;
  getPreferences: () => UserPreferences | null;
  clearHistory: () => Promise<void>;
}

export interface UseImageGenerationReturn {
  isGenerating: boolean;
  progress: number;
  error: Error | null;
  generateImage: (params: ImageGenerationParams) => Promise<GeneratedImage>;
  cancelGeneration: () => void;
}
