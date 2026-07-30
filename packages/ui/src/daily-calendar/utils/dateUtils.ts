/**
 * 日期工具函数
 * 处理公历、农历、节气、节日等日期相关计算
 */

import {
  CalendarDateInfo,
  GregorianDate,
  LunarDate,
  WeekdayInfo,
} from '../types';
import { getChinaHoliday } from '../../services/chinaHolidayService';

// 农历数据表（1900-2100年）
// 每个元素表示该年的农历数据，格式：16进制
// 前12位表示每月大小（大月30天，小月29天），后4位表示闰月月份（0表示无闰月）
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
];

// 生肖
const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
// 农历月份名称
const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
// 农历日期名称
const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];
// 星期名称
const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WEEKDAY_SHORT_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEKDAY_ENGLISH_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// 二十四节气
const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];
// 节气日期（大约日期，用于简化计算）
const SOLAR_TERM_DATES = [
  [6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // 小寒 (1月)
  [20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21], // 大寒
  [4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // 立春 (2月)
  [19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19], // 雨水
  [5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], // 惊蛰 (3月)
  [20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], // 春分
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // 清明 (4月)
  [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19], // 谷雨
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], // 立夏 (5月)
  [21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], // 小满
  [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], // 芒种 (6月)
  [21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21], // 夏至
  [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // 小暑 (7月)
  [23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22], // 大暑
  [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // 立秋 (8月)
  [23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23], // 处暑
  [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // 白露 (9月)
  [23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23], // 秋分
  [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8], // 寒露 (10月)
  [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23], // 霜降
  [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // 立冬 (11月)
  [22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22], // 小雪
  [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], // 大雪 (12月)
  [22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21], // 冬至
];

// 节假日定义
const HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '04-01': '愚人节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '10-24': '联合国日',
  '11-01': '万圣节',
  '12-24': '平安夜',
  '12-25': '圣诞节',
};

// 农历节假日定义（农历月-日）
const LUNAR_HOLIDAYS: Record<string, string> = {
  '01-01': '春节',
  '01-15': '元宵节',
  '02-02': '龙抬头',
  '05-05': '端午节',
  '07-07': '七夕节',
  '07-15': '中元节',
  '08-15': '中秋节',
  '09-09': '重阳节',
  '12-08': '腊八节',
  '12-23': '小年',
  '12-30': '除夕',
};

// 星座日期范围
const CONSTELLATIONS = [
  { name: '摩羯座', start: [12, 22], end: [1, 19] },
  { name: '水瓶座', start: [1, 20], end: [2, 18] },
  { name: '双鱼座', start: [2, 19], end: [3, 20] },
  { name: '白羊座', start: [3, 21], end: [4, 19] },
  { name: '金牛座', start: [4, 20], end: [5, 20] },
  { name: '双子座', start: [5, 21], end: [6, 21] },
  { name: '巨蟹座', start: [6, 22], end: [7, 22] },
  { name: '狮子座', start: [7, 23], end: [8, 22] },
  { name: '处女座', start: [8, 23], end: [9, 22] },
  { name: '天秤座', start: [9, 23], end: [10, 23] },
  { name: '天蝎座', start: [10, 24], end: [11, 22] },
  { name: '射手座', start: [11, 23], end: [12, 21] },
];

/**
 * 判断是否为闰年
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 获取公历月份天数
 */
export function getDaysInMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1];
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取公历日期信息
 */
export function getGregorianDate(date: Date): GregorianDate {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return {
    year,
    month,
    day,
    monthName: `${month}月`,
    dayName: `${day}日`,
  };
}

/**
 * 获取星期信息
 */
export function getWeekdayInfo(date: Date): WeekdayInfo {
  const index = date.getDay();
  return {
    index,
    name: WEEKDAY_NAMES[index],
    shortName: WEEKDAY_SHORT_NAMES[index],
    englishName: WEEKDAY_ENGLISH_NAMES[index],
  };
}

/**
 * 获取农历信息（简化版算法）
 * 注意：这是一个简化实现，对于精确应用建议使用专业农历库如 lunar-javascript
 */
export function getLunarDate(date: Date): LunarDate {
  const baseDate = new Date(1900, 0, 31); // 1900年农历正月初一
  const offset = Math.floor((date.getTime() - baseDate.getTime()) / 86400000);

  let lunarYear = 1900;
  let daysInYear = 0;
  let tempOffset = offset;

  // 计算农历年
  for (let i = 0; i < LUNAR_INFO.length; i++) {
    daysInYear = getLunarYearDays(1900 + i);
    if (tempOffset < daysInYear) {
      lunarYear = 1900 + i;
      break;
    }
    tempOffset -= daysInYear;
  }

  // 计算农历月
  let lunarMonth = 1;
  let daysInMonth = 0;
  let isLeap = false;

  for (let i = 1; i <= 12; i++) {
    daysInMonth = getLunarMonthDays(lunarYear, i);
    if (tempOffset < daysInMonth) {
      lunarMonth = i;
      break;
    }
    tempOffset -= daysInMonth;

    // 检查闰月
    const leapMonth = getLeapMonth(lunarYear);
    if (leapMonth === i) {
      daysInMonth = getLeapDays(lunarYear);
      if (tempOffset < daysInMonth) {
        lunarMonth = i;
        isLeap = true;
        break;
      }
      tempOffset -= daysInMonth;
    }
  }

  const lunarDay = tempOffset + 1;

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    monthName: isLeap ? `闰${LUNAR_MONTH_NAMES[lunarMonth - 1]}月` : `${LUNAR_MONTH_NAMES[lunarMonth - 1]}月`,
    dayName: LUNAR_DAY_NAMES[lunarDay - 1] || `初${lunarDay}`,
    zodiac: ZODIAC_ANIMALS[(lunarYear - 4) % 12],
  };
}

/**
 * 获取农历年天数
 */
function getLunarYearDays(year: number): number {
  const index = year - 1900;
  if (index < 0 || index >= LUNAR_INFO.length) return 354;

  let sum = 348;
  const info = LUNAR_INFO[index];
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0;
  }
  return sum + getLeapDays(year);
}

/**
 * 获取农历月天数
 */
function getLunarMonthDays(year: number, month: number): number {
  const index = year - 1900;
  if (index < 0 || index >= LUNAR_INFO.length) return 30;

  const info = LUNAR_INFO[index];
  return (info & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 获取闰月天数
 */
function getLeapDays(year: number): number {
  const index = year - 1900;
  if (index < 0 || index >= LUNAR_INFO.length) return 0;

  if (getLeapMonth(year)) {
    return (LUNAR_INFO[index] & 0x10000) ? 30 : 29;
  }
  return 0;
}

/**
 * 获取闰月月份
 */
function getLeapMonth(year: number): number {
  const index = year - 1900;
  if (index < 0 || index >= LUNAR_INFO.length) return 0;

  return LUNAR_INFO[index] & 0xf;
}

/**
 * 获取节气信息
 */
export function getSolarTerm(date: Date): { isSolarTerm: boolean; solarTermName?: string } {
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();
  const yearIndex = Math.max(0, Math.min(year - 1900, 199));

  // 检查当前日期是否为节气日
  const term1Index = month * 2; // 每月第一个节气
  const term2Index = month * 2 + 1; // 每月第二个节气

  if (SOLAR_TERM_DATES[term1Index] && SOLAR_TERM_DATES[term1Index][yearIndex] === day) {
    return { isSolarTerm: true, solarTermName: SOLAR_TERMS[term1Index] };
  }
  if (SOLAR_TERM_DATES[term2Index] && SOLAR_TERM_DATES[term2Index][yearIndex] === day) {
    return { isSolarTerm: true, solarTermName: SOLAR_TERMS[term2Index] };
  }

  return { isSolarTerm: false };
}

/**
 * 获取节假日信息
 */
export function getHoliday(date: Date): {
  isHoliday: boolean;
  holidayName?: string;
  isWorkdayAdjustment?: boolean;
  holidayStatus?: 'off' | 'workday';
} {
  const syncedHoliday = getChinaHoliday(date);
  if (syncedHoliday) {
    return {
      isHoliday: syncedHoliday.isOffDay,
      holidayName: syncedHoliday.name,
      isWorkdayAdjustment: !syncedHoliday.isOffDay,
      holidayStatus: syncedHoliday.isOffDay ? 'off' : 'workday',
    };
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;

  if (HOLIDAYS[key]) {
    return { isHoliday: true, holidayName: HOLIDAYS[key] };
  }

  return { isHoliday: false };
}

/**
 * 获取农历节假日信息
 */
export function getLunarHoliday(lunarDate: LunarDate): { isHoliday: boolean; holidayName?: string } {
  const month = String(lunarDate.month).padStart(2, '0');
  const day = String(lunarDate.day).padStart(2, '0');
  const key = `${month}-${day}`;

  if (LUNAR_HOLIDAYS[key]) {
    return { isHoliday: true, holidayName: LUNAR_HOLIDAYS[key] };
  }

  return { isHoliday: false };
}

/**
 * 获取星座
 */
export function getConstellation(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  for (const constellation of CONSTELLATIONS) {
    const [startMonth, startDay] = constellation.start;
    const [endMonth, endDay] = constellation.end;

    if (startMonth > endMonth) {
      // 跨年的星座（摩羯座）
      if ((month === startMonth && day >= startDay) ||
          (month === endMonth && day <= endDay)) {
        return constellation.name;
      }
    } else {
      if ((month > startMonth || (month === startMonth && day >= startDay)) &&
          (month < endMonth || (month === endMonth && day <= endDay))) {
        return constellation.name;
      }
    }
  }

  return '未知';
}

/**
 * 获取完整的日期信息
 */
export function getCalendarDateInfo(date: Date): CalendarDateInfo {
  const gregorian = getGregorianDate(date);
  const lunar = getLunarDate(date);
  const weekday = getWeekdayInfo(date);
  const solarTerm = getSolarTerm(date);
  const holiday = getHoliday(date);
  const lunarHoliday = getLunarHoliday(lunar);
  const constellation = getConstellation(date);

  // 优先使用公历节假日，如果没有则使用农历节假日
  const finalHoliday = holiday.holidayName ? holiday : lunarHoliday;

  return {
    gregorian,
    lunar,
    weekday,
    special: {
      isHoliday: finalHoliday.isHoliday,
      holidayName: finalHoliday.holidayName,
      isWorkdayAdjustment: holiday.isWorkdayAdjustment,
      holidayStatus: holiday.holidayStatus,
      isSolarTerm: solarTerm.isSolarTerm,
      solarTermName: solarTerm.solarTermName,
      constellation,
    },
  };
}

/**
 * 格式化日期显示
 */
export function formatDateDisplay(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = getWeekdayInfo(date);

  return format
    .replace('YYYY', String(year))
    .replace('MM', String(month).padStart(2, '0'))
    .replace('DD', String(day).padStart(2, '0'))
    .replace('M', String(month))
    .replace('D', String(day))
    .replace('dddd', weekday.name)
    .replace('ddd', weekday.shortName);
}

/**
 * 获取日期范围
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * 获取月份第一天
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * 获取月份最后一天
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * 获取月份所有日期
 */
export function getDaysInMonthRange(year: number, month: number): Date[] {
  const firstDay = getFirstDayOfMonth(year, month);
  const lastDay = getLastDayOfMonth(year, month);
  return getDateRange(firstDay, lastDay);
}

/**
 * 添加天数
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 添加月份
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  result.setDate(Math.min(
    originalDay,
    getDaysInMonth(result.getFullYear(), result.getMonth() + 1)
  ));
  return result;
}

/**
 * 是否是今天
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

/**
 * 是否是同一天
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * 获取季节
 */
export function getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
