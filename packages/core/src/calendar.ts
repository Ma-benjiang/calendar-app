// 日历核心逻辑 - 日期计算、视图生成
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color?: string;
  reminder?: number; // 提前提醒分钟数
}

// 重新导出 Task 相关类型
export * from './task';

export interface CalendarView {
  type: 'month' | 'week' | 'day';
  currentDate: Date;
}

export class CalendarCore {
  // 获取某月的天数
  static getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  // 获取某月第一天是星期几
  static getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
  }

  // 生成月视图数据
  static generateMonthView(year: number, month: number): Date[] {
    const days: Date[] = [];
    const daysInMonth = this.getDaysInMonth(year, month);
    const firstDay = this.getFirstDayOfMonth(year, month);
    
    // 上月填充
    const prevMonthDays = this.getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDays - i));
    }
    
    // 当月
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // 下月填充（补齐6行）
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }

  // 生成周视图数据
  static generateWeekView(date: Date): Date[] {
    const week: Date[] = [];
    const startOfWeek = new Date(date);
    const day = date.getDay();
    startOfWeek.setDate(date.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      week.push(d);
    }
    return week;
  }

  // 检查事件是否在指定日期
  static isEventOnDate(event: CalendarEvent, date: Date): boolean {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const checkDate = new Date(date);
    
    eventStart.setHours(0, 0, 0, 0);
    eventEnd.setHours(23, 59, 59, 999);
    checkDate.setHours(12, 0, 0, 0);
    
    return checkDate >= eventStart && checkDate <= eventEnd;
  }

  // 格式化日期
  static formatDate(date: Date, format: string): string {
    const map: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'DD': String(date.getDate()).padStart(2, '0'),
      'HH': String(date.getHours()).padStart(2, '0'),
      'mm': String(date.getMinutes()).padStart(2, '0'),
    };
    
    return format.replace(/YYYY|MM|DD|HH|mm/g, match => map[match]);
  }
}
