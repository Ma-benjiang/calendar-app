/**
 * Natural Language Input Parser
 * Parses natural language date/time expressions
 * AC-005: Quick Add - Natural Language Processing
 */

export interface ParsedResult {
  isValid: boolean;
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  duration?: number;
  location?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly';
  priority?: 'high' | 'medium' | 'low';
  description?: string;
  confidence: number;
  error?: string;
}

// Chinese number mapping
const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '半': 0.5,
};

// Day of week mapping
const DAY_OF_WEEK: Record<string, number> = {
  '周日': 0, '星期天': 0, '星期日': 0,
  '周一': 1, '星期一': 1,
  '周二': 2, '星期二': 2,
  '周三': 3, '星期三': 3,
  '周四': 4, '星期四': 4,
  '周五': 5, '星期五': 5,
  '周六': 6, '星期六': 6,
  'sunday': 0, 'sun': 0,
  'monday': 1, 'mon': 1,
  'tuesday': 2, 'tue': 2,
  'wednesday': 3, 'wed': 3,
  'thursday': 4, 'thu': 4,
  'friday': 5, 'fri': 5,
  'saturday': 6, 'sat': 6,
};

function parseChineseNumber(str: string): number | null {
  // Handle simple cases like "两", "三"
  if (CHINESE_NUMBERS[str] !== undefined) {
    return CHINESE_NUMBERS[str];
  }

  // Handle compound numbers like "十二", "二十"
  let result = 0;
  let temp = 0;
  for (const char of str) {
    const num = CHINESE_NUMBERS[char];
    if (num === undefined) continue;

    if (num === 10) {
      if (temp === 0) temp = 1;
      result += temp * 10;
      temp = 0;
    } else {
      temp = temp * 10 + num;
    }
  }
  result += temp;

  return result > 0 ? result : null;
}

function getRelativeDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getNextDayOfWeek(dayOfWeek: number): string {
  const date = new Date();
  const currentDay = date.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7;
  const targetDays = daysUntil === 0 ? 7 : daysUntil;
  date.setDate(date.getDate() + targetDays);
  return date.toISOString().split('T')[0];
}

function formatTime(hour: number, minute: number = 0): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function parseNaturalInput(input: string): ParsedResult {
  if (!input.trim()) {
    return { isValid: false, title: '', confidence: 0, error: 'Empty input' };
  }

  const result: ParsedResult = {
    isValid: true,
    title: '',
    confidence: 0.8,
  };

  const workingInput = input.trim();
  const now = new Date();

  // Extract title first (remove time/date/location patterns)
  // For simple inputs like "Meeting at 3pm" or "Review meeting"
  // First, try to identify the title part before any markers
  let title = workingInput;

  // Parse time expressions
  // Pattern: "下午3点", "3pm", "15:30", "晚上8点"
  const timePatterns = [
    { regex: /(\d{1,2}):(\d{2})/, offset: null },
    { regex: /(?:下午|pm\s*)(\d+)(?::(\d+))?\s*(?:点)?/i, offset: 12 },
    { regex: /(?:上午|am\s*)(\d+)(?::(\d+))?\s*(?:点)?/i, offset: 0 },
    { regex: /(?:晚上|evening\s*)(\d+)(?::(\d+))?\s*(?:点)?/i, offset: 12 },
    { regex: /(\d+)\s*(?:pm|PM)/, offset: 12 },
    { regex: /(\d+)\s*(?:am|AM)/, offset: 0 },
    { regex: /(\d+)(?:点|pm|am)?/i, offset: null },
  ];

  let hour: number | null = null;
  let minute = 0;

  for (const pattern of timePatterns) {
    const match = workingInput.match(pattern.regex);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;

      if (pattern.offset !== null) {
        if (h < 12) h += pattern.offset;
      }

      hour = h;
      minute = m;

      // Remove time from title
      title = title.replace(match[0], '').trim();
      break;
    }
  }

  // Handle special time words
  if (hour === null) {
    if (/morning|早上|上午/.test(workingInput)) {
      hour = 9;
      title = title.replace(/morning|早上|上午/, '').trim();
    } else if (/afternoon|下午/.test(workingInput) && !/下午\d+/.test(workingInput)) {
      hour = 14;
      title = title.replace(/afternoon|下午/, '').trim();
    } else if (/evening|晚上/.test(workingInput) && !/晚上\d+/.test(workingInput)) {
      hour = 18; // 6pm
      title = title.replace(/evening|晚上/, '').trim();
    } else if (/noon|中午/.test(workingInput)) {
      hour = 12;
      title = title.replace(/noon|中午/, '').trim();
    }
  }

  if (hour !== null) {
    result.hour = hour;
    result.minute = minute;
    result.confidence += 0.1;
  }

  // Parse date expressions
  // Pattern: "明天", "today", "下周一", "3月15日"
  let date: string | null = null;

  if (/tomorrow|明天/.test(workingInput)) {
    date = getRelativeDate(1);
    title = title.replace(/tomorrow|明天/, '').trim();
    result.confidence += 0.1;
  } else if (/today|今天/.test(workingInput)) {
    date = getRelativeDate(0);
    title = title.replace(/today|今天/, '').trim();
    result.confidence += 0.1;
  } else if (/yesterday|昨天/.test(workingInput)) {
    date = getRelativeDate(-1);
    title = title.replace(/yesterday|昨天/, '').trim();
    result.isValid = false;
    result.error = 'Cannot create events in the past';
  } else {
    // Check for day of week
    for (const [dayName, dayNum] of Object.entries(DAY_OF_WEEK)) {
      const regex = new RegExp(`(?:next|下)?(?:个)?${dayName}`, 'i');
      if (regex.test(workingInput)) {
        date = getNextDayOfWeek(dayNum);
        result.dayOfWeek = dayNum;
        title = title.replace(regex, '').trim();
        result.confidence += 0.1;
        break;
      }
    }

    // Check for specific date: "3月15日", "March 15"
    if (!date) {
      const dateMatch = workingInput.match(/(\d{1,2})月(\d{1,2})日?/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1], 10);
        const day = parseInt(dateMatch[2], 10);
        date = `${now.getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        title = title.replace(dateMatch[0], '').trim();
        result.confidence += 0.1;
      }
    }

    // Check for English date: "March 15"
    if (!date) {
      const months = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
      const monthRegex = new RegExp(`(${months.join('|')})\\s+(\\d{1,2})`, 'i');
      const monthMatch = workingInput.match(monthRegex);
      if (monthMatch) {
        const month = months.indexOf(monthMatch[1].toLowerCase()) + 1;
        const day = parseInt(monthMatch[2], 10);
        date = `${now.getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        title = title.replace(monthMatch[0], '').trim();
        result.confidence += 0.1;
      }
    }
  }

  // Parse relative time: "两小时后", "in 2 hours", "半小时后", "in 30 minutes"
  // Only match if we haven't already parsed a specific time
  if (hour === null) {
    // Special case: "半小时" or "半小时后" (30 minutes)
    const halfHourMatch = workingInput.match(/(?:半|half\s+an?)\s*(?:个)?\s*(?:hour|小时|h)?(?:\s*后)?/i);
    if (halfHourMatch && (workingInput.includes('半') || workingInput.includes('half'))) {
      const targetDate = new Date(now.getTime() + 30 * 60 * 1000);
      date = targetDate.toISOString().split('T')[0];
      hour = targetDate.getHours();
      minute = targetDate.getMinutes();
      result.hour = hour;
      result.minute = minute;
      title = title.replace(halfHourMatch[0], '').trim();
      result.confidence += 0.1;
    } else {
      // Match patterns like "in 2 hours", "两小时后", "in 30 minutes"
      const hourMatch = workingInput.match(/(?:in\s+)?(\d+|两|三|四|五)\s*(?:个)?(?:hour|hours|小时|hr|h)(?:\s*后)?/i);
      const minuteMatch = workingInput.match(/(?:in\s+)?(\d+)\s*(?:minute|minutes|分钟|min|m)(?:\s*后)?/i);

      if (hourMatch || minuteMatch) {
        const match = hourMatch || minuteMatch;
        const numStr = match![1];
        let num: number;

        if (/\d+/.test(numStr)) {
          num = parseInt(numStr, 10);
        } else {
          num = parseChineseNumber(numStr) || 1;
        }

        const isHour = hourMatch !== null;
        const targetDate = new Date(now);

        if (isHour) {
          targetDate.setTime(targetDate.getTime() + num * 60 * 60 * 1000);
        } else {
          targetDate.setTime(targetDate.getTime() + num * 60 * 1000);
        }

        date = targetDate.toISOString().split('T')[0];
        hour = targetDate.getHours();
        minute = targetDate.getMinutes();

        result.hour = hour;
        result.minute = minute;
        title = title.replace(match![0], '').trim();
        result.confidence += 0.1;
      }
    }
  }

  // Parse recurrence: "每天", "每周三", "every week"
  if (/every\s+day|每天|每日/.test(workingInput)) {
    result.recurrence = 'daily';
    title = title.replace(/every\s+day|每天|每日/, '').trim();
  } else if (/every\s+week|每周/.test(workingInput)) {
    result.recurrence = 'weekly';
    title = title.replace(/every\s+week|每周/, '').trim();
  } else if (/every\s+month|每月/.test(workingInput)) {
    result.recurrence = 'monthly';
    title = title.replace(/every\s+month|每月/, '').trim();
  }

  // Parse location: "在会议室A", "at Conference Room A", "地点：办公室"
  const locationPatterns = [
    /在\s*([^，,]+)/,
    /at\s+([^,]+)/i,
    /地点[：:]\s*([^，,]+)/,
    /location[：:]\s*([^,]+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = workingInput.match(pattern);
    if (match) {
      result.location = match[1].trim();
      title = title.replace(match[0], '').trim();
      result.confidence += 0.05;
      break;
    }
  }

  // Parse duration: "持续1小时", "for 1 hour", "30 minutes"
  // Try minutes first (more specific), then hours
  const minuteDurationMatch = workingInput.match(/(?:持续|for\s+)?(\d+)\s*(minute|minutes|分钟|min|m)(?![a-zA-Z])/i);
  const hourDurationMatch = workingInput.match(/(?:持续|for\s+)?(\d+|半)\s*(hour|hours|小时|hr|h)/i);
  const durationMatch = minuteDurationMatch || hourDurationMatch;

  if (durationMatch) {
    const numStr = durationMatch[1];
    const num = numStr === '半' ? 0.5 : parseInt(numStr, 10);
    const unit = durationMatch[2];

    if (/hour|小时|hr|h/i.test(unit)) {
      result.duration = Math.round(num * 60);
    } else {
      result.duration = Math.round(num);
    }
    title = title.replace(durationMatch[0], '').trim();
  }

  // Parse priority
  if (/urgent|紧急|重要|high priority/.test(workingInput)) {
    result.priority = 'high';
    title = title.replace(/urgent|紧急|重要|high priority/, '').trim();
  } else if (/optional|可选|low priority/.test(workingInput)) {
    result.priority = 'low';
    title = title.replace(/optional|可选|low priority/, '').trim();
  }

  // Set date result
  if (date) {
    result.date = date;
  } else if (hour !== null) {
    // If time is specified but no date, use today
    result.date = getRelativeDate(0);
  }

  // Build startTime and endTime
  if (result.date && hour !== null) {
    result.startTime = `${result.date}T${formatTime(hour, minute)}:00`;
    if (result.duration) {
      const endDate = new Date(new Date(result.startTime).getTime() + result.duration * 60000);
      result.endTime = endDate.toISOString();
    }
  }

  // Clean up title
  title = title
    .replace(/[,，.\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading/trailing punctuation and markers
  title = title.replace(/^[\s,，.。:：]+|[\s,，.。:：]+$/g, '');
  title = title.replace(/\s+/g, ' ').trim();

  result.title = title;

  // Validate
  if (!result.title && !result.date && result.hour === undefined) {
    result.isValid = false;
    result.error = 'Could not parse any meaningful information';
    result.confidence = 0.2;
  } else if (!result.title) {
    // If we have time/date but no title, it's still valid but with lower confidence
    result.confidence = 0.5;
  }

  // Lower confidence for ambiguous expressions
  if (/sometime|maybe|可能|大概|左右/.test(input)) {
    result.confidence = Math.min(result.confidence, 0.7);
  }

  return result;
}
