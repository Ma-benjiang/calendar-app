// 重复事件规则 (类似 RRULE)
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // 间隔（每2天、每3周等）
  count?: number; // 重复次数
  until?: Date; // 结束日期
  byWeekday?: number[]; // 周几重复 [0, 1, 2] = 周日、周一、周二
  byMonthDay?: number[]; // 每月几号
  byMonth?: number[]; // 哪几个月
}

export interface RecurringEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color?: string;
  recurrence: RecurrenceRule;
  exceptions?: Date[]; // 例外日期（跳过这些日期）
}

export class RecurrenceEngine {
  // 生成重复事件实例
  static generateOccurrences(
    event: RecurringEvent,
    rangeStart: Date,
    rangeEnd: Date
  ): Array<{ startDate: Date; endDate: Date; isException: boolean }> {
    const occurrences: Array<{ startDate: Date; endDate: Date; isException: boolean }> = [];
    const duration = event.endDate.getTime() - event.startDate.getTime();
    
    let currentDate = new Date(event.startDate);
    let count = 0;
    
    while (currentDate <= rangeEnd) {
      if (currentDate >= rangeStart) {
        const isException = event.exceptions?.some(
          ex => ex.toDateString() === currentDate.toDateString()
        ) || false;
        
        occurrences.push({
          startDate: new Date(currentDate),
          endDate: new Date(currentDate.getTime() + duration),
          isException
        });
      }
      
      count++;
      if (event.recurrence.count && count >= event.recurrence.count) break;
      if (event.recurrence.until && currentDate > event.recurrence.until) break;
      
      currentDate = this.getNextOccurrence(currentDate, event.recurrence);
    }
    
    return occurrences;
  }
  
  private static getNextOccurrence(date: Date, rule: RecurrenceRule): Date {
    const next = new Date(date);
    const interval = rule.interval || 1;
    
    switch (rule.frequency) {
      case 'daily':
        next.setDate(date.getDate() + interval);
        break;
      case 'weekly':
        next.setDate(date.getDate() + (7 * interval));
        break;
      case 'monthly':
        next.setMonth(date.getMonth() + interval);
        break;
      case 'yearly':
        next.setFullYear(date.getFullYear() + interval);
        break;
    }
    
    return next;
  }
  
  // 解析自然语言（如"每周一、周三重复"）
  static parseNaturalLanguage(input: string): RecurrenceRule | null {
    const rule: RecurrenceRule = { frequency: 'daily' };
    
    if (input.includes('每天') || input.includes('daily')) {
      rule.frequency = 'daily';
    } else if (input.includes('每周') || input.includes('weekly')) {
      rule.frequency = 'weekly';
      // 解析周几
      const weekdays: Record<string, number> = {
        '周日': 0, '星期天': 0, '星期一': 1, '周一': 1,
        '星期二': 2, '周二': 2, '星期三': 3, '周三': 3,
        '星期四': 4, '周四': 4, '星期五': 5, '周五': 5,
        '星期六': 6, '周六': 6
      };
      
      rule.byWeekday = [];
      for (const [cn, num] of Object.entries(weekdays)) {
        if (input.includes(cn)) {
          rule.byWeekday.push(num);
        }
      }
      if (rule.byWeekday.length === 0) delete rule.byWeekday;
    } else if (input.includes('每月') || input.includes('monthly')) {
      rule.frequency = 'monthly';
    } else if (input.includes('每年') || input.includes('yearly')) {
      rule.frequency = 'yearly';
    } else {
      return null;
    }
    
    // 解析间隔
    const intervalMatch = input.match(/每(\d+)/);
    if (intervalMatch) {
      rule.interval = parseInt(intervalMatch[1]);
    }
    
    return rule;
  }
}
