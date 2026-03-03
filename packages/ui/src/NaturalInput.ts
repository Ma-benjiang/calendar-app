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
  month?: number;
  day?: number;
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

  // Check for English date FIRST (before time parsing) to avoid "15" in "March 15" being parsed as time
  const monthsList = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const englishMonthRegex = new RegExp(`(${monthsList.join('|')})\\s+(\\d{1,2})`, 'i');
  const englishMonthMatch = workingInput.match(englishMonthRegex);
  let englishDateMatched = false;
  if (englishMonthMatch) {
    englishDateMatched = true;
    // We'll process this properly in the date section, but mark it now to avoid time parsing issues
  }

  // Check if input is relative time (should skip simple time parsing)
  const isRelativeTime = /(?:in\s+)?\d+\s*(?:hour|hours|minute|minutes|h|m|小时|分钟|hr|min)(?:\s*后)?/i.test(workingInput) ||
                         /(?:两|三|四|五|半)\s*(?:个)?(?:hour|hours|小时|h|分钟|min)?(?:\s*后)?/i.test(workingInput);

  // Parse time expressions
  // Pattern: "下午3点", "3pm", "15:30", "晚上8点"
  const timePatterns = [
    { regex: /(\d{1,2}):(\d{2})/, offset: null },
    { regex: /(?:下午|pm\s*)(\d+)(?::(\d+))?\s*(?:点)?/i, offset: 12 },
    { regex: /(?:上午|am\s*)(\d+)(?::(\d+))?\s*(?:点)?/i, offset: 0 },
    { regex: /(?:晚上|evening\s*)(\d+)(?::(\d+))?\s*(?:点)?/i, offset: 12 },
    { regex: /(?:at\s+)?(\d+)\s*(?:pm|PM)/, offset: 12 },
    { regex: /(?:at\s+)?(\d+)\s*(?:am|AM)/, offset: 0 },
    // Only match standalone numbers if not relative time and not part of English date
    // Skip standalone number matching if we detected a month name followed by number (like "March 15")
    ...(isRelativeTime || englishDateMatched ? [] : [{ regex: /(?:^|\s)(\d{1,2})(?:\s*(?:点|pm|am))?(?:\s|$|(?:下午|上午|晚上))/i, offset: null }]),
  ];

  let hour: number | null = null;
  let minute = 0;

  for (const pattern of timePatterns) {
    const match = workingInput.match(pattern.regex);
    if (match) {
      // Skip if this looks like part of an English date (e.g., "15" in "March 15")
      if (englishMonthMatch && match.index !== undefined &&
          englishMonthMatch.index !== undefined &&
          match.index >= englishMonthMatch.index &&
          match.index < englishMonthMatch.index + englishMonthMatch[0].length) {
        continue;
      }

      let h = parseInt(match[1], 10);
      let m = match[2] ? parseInt(match[2], 10) : 0;

      // Handle "点半" (half past)
      if (/点半/.test(workingInput)) {
        m = 30;
      }

      if (pattern.offset !== null) {
        if (h < 12) h += pattern.offset;
      }

      hour = h;
      minute = m;

      // Remove time from title
      title = title.replace(match[0], '').trim();

      // Also remove orphaned prepositions that were before the time
      // e.g., "at 3pm" -> after removing "3pm", "at" is left behind
      // Clean up orphaned "at" or "in" before the removed time
      title = title.replace(/\s+(?:at|in)\s*$/i, '').trim();
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

  // Parse recurrence EARLY (before date/day-of-week parsing) to avoid conflicts
  // e.g., "每周三" should be parsed as recurrence before "周三" is parsed as date
  if (/every\s+day|每天|每日/i.test(title)) {
    result.recurrence = 'daily';
    title = title.replace(/every\s+day|每天|每日/i, '').trim();
  } else if (/every\s+week|每周/i.test(title)) {
    // Check for specific day: "每周三", "every week monday"
    const weeklyDayMatch = title.match(/(?:every\s+week|每周)[一二三四五六日天]/i);
    const englishWeeklyDayMatch = title.match(/(?:every\s+week)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i);
    if (weeklyDayMatch || englishWeeklyDayMatch) {
      const match = weeklyDayMatch || englishWeeklyDayMatch;
      result.recurrence = 'weekly';
      const dayMatch = match![0].match(/([一二三四五六日天]|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i);
      if (dayMatch) {
        const dayKey = dayMatch[1].toLowerCase();
        const dayNum = DAY_OF_WEEK[dayKey];
        if (dayNum !== undefined) {
          result.dayOfWeek = dayNum;
        }
      }
      title = title.replace(match![0], '').trim();
    } else {
      result.recurrence = 'weekly';
      title = title.replace(/every\s+week|每周/i, '').trim();
    }
  } else if (/every\s+month|每月/i.test(title)) {
    result.recurrence = 'monthly';
    title = title.replace(/every\s+month|每月/i, '').trim();
  }

  // Parse date expressions
  // Pattern: "明天", "today", "下周一", "3月15日"
  let date: string | null = null;

  // Check for English date FIRST (before day of week) to avoid "march" being matched as "tuesday"
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'];
  const monthRegex = new RegExp(`(${months.join('|')})\\s+(\\d{1,2})`, 'i');
  const monthMatch = workingInput.match(monthRegex);

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
  } else if (monthMatch) {
    const monthNum = months.indexOf(monthMatch[1].toLowerCase()) + 1;
    const dayNum = parseInt(monthMatch[2], 10);
    date = `${now.getFullYear()}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    title = title.replace(monthMatch[0], '').trim();
    result.month = monthNum;
    result.day = dayNum;
    result.confidence += 0.1;
  } else {
    // Check for day of week - but skip if we already set dayOfWeek from recurrence
    if (!result.dayOfWeek) {
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
    }

    // Check for specific date: "3月15日"
    if (!date) {
      const dateMatch = workingInput.match(/(\d{1,2})月(\d{1,2})日?/);
      if (dateMatch) {
        const monthNum = parseInt(dateMatch[1], 10);
        const dayNum = parseInt(dateMatch[2], 10);
        date = `${now.getFullYear()}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
        title = title.replace(dateMatch[0], '').trim();
        result.month = monthNum;
        result.day = dayNum;
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
      const minuteMatch = workingInput.match(/(?:in\s+)?(\d+)\s*(?:minute|minutes|分钟|min)(?:\s*后)?/i);

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
  // Check for specific day recurrence first (e.g., "每周三") - must match the day name too
  // Use `title` instead of `workingInput` to avoid conflicts with earlier parsing
  const weeklyDayMatch = title.match(/(?:every\s+week|每周)[一二三四五六日天]/i);
  const englishWeeklyDayMatch = title.match(/(?:every\s+week)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i);
  if (weeklyDayMatch || englishWeeklyDayMatch) {
    const match = weeklyDayMatch || englishWeeklyDayMatch;
    result.recurrence = 'weekly';
    // Extract the day from the match
    const dayMatch = match![0].match(/([一二三四五六日天]|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i);
    if (dayMatch) {
      const dayKey = dayMatch[1].toLowerCase();
      const dayNum = DAY_OF_WEEK[dayKey];
      if (dayNum !== undefined) {
        result.dayOfWeek = dayNum;
      }
    }
    title = title.replace(match![0], '').trim();
  }

  // Parse location: "在会议室A", "at Conference Room A", "地点：办公室"
  // Use `title` to work with already-processed text
  const locationPatterns = [
    // Match "at location" but not if followed by time markers - use simpler pattern
    { regex: /(?:^|\s)at\s+(.+?)(?=\s+(?:at|on|for|from|to|with|tomorrow|today|next|明天|今天|下周|下午|上午|晚上|\d+\s*(?::|pm|am|点))|$)/i, from: 'title' },
    // Match "in location" for locations like "in Conference Room A"
    { regex: /(?:^|\s)in\s+(.+?)(?=\s+(?:at|on|for|from|to|with|tomorrow|today|next|明天|今天|下周|下午|上午|晚上|\d+\s*(?::|pm|am|点))|$)/i, from: 'title' },
    { regex: /地点[：:]\s*([^，,\s]+(?:\s+[^，,]+)?)/, from: 'title' },
    { regex: /location[：:]\s*([^,]+)/i, from: 'title' },
  ];

  // Handle "在" prefix specially - only match if it looks like a location (short and before time markers)
  // Match "在" followed by location, but NOT including the following verb
  const zaiMatch = title.match(/在\s*([^，,。！?;:\d]{1,20}?)(?=\s*(?:开|进行|举办|举行|会议|会|讨论|活动|event|meeting|call|review)|\s+(?:下午|上午|晚上|点|:\d{2}|tomorrow|today|at\s+\d)|$)/);
  if (zaiMatch && !result.location) {
    // Check if the extracted text looks like a location (not too long, not containing verbs)
    const potentialLocation = zaiMatch[1].trim();
    // Don't treat "开" or empty string as location
    if (potentialLocation && potentialLocation.length > 0 && potentialLocation.length < 20) {
      result.location = potentialLocation;
      // Only remove "在<location>", not the following verb
      title = title.replace(zaiMatch[0], '').trim();
      result.confidence += 0.05;
    }
  }

  // Process other location patterns only if "在" pattern didn't match
  if (!result.location) {
    for (const pattern of locationPatterns) {
      const match = title.match(pattern.regex);
      if (match) {
        result.location = match[1].trim();
        title = title.replace(match[0], '').trim();
        result.confidence += 0.05;
        break;
      }
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

  // Remove orphaned prepositions that are no longer meaningful
  title = title.replace(/\bat\b$/i, '').trim();
  title = title.replace(/\s+/g, ' ').trim();

  result.title = title;

  // Validate
  // Check if we have a valid time/date reference (not just empty or meaningless text)
  const hasValidTimeOrDate = result.date !== undefined || result.hour !== undefined ||
                             result.recurrence !== undefined || result.dayOfWeek !== undefined;

  if (!result.title && !hasValidTimeOrDate) {
    result.isValid = false;
    result.error = 'Could not parse any meaningful information';
    result.confidence = 0.2;
  } else if (result.title && !hasValidTimeOrDate) {
    // If we have a title but no time/date info, use today's date as default
    result.date = getRelativeDate(0);
    result.confidence = 0.5;
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
