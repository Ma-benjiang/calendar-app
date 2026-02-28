// 时区处理
export type TimeZone = string; // 'Asia/Shanghai', 'America/New_York', etc.

export class TimeZoneManager {
  private static readonly DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // 获取当前系统时区
  static getSystemTimeZone(): TimeZone {
    return this.DEFAULT_TIMEZONE;
  }
  
  // 转换时区
  static convertTimeZone(date: Date, fromZone: TimeZone, toZone: TimeZone): Date {
    const fromOffset = this.getOffsetMinutes(date, fromZone);
    const toOffset = this.getOffsetMinutes(date, toZone);
    const offsetDiff = (toOffset - fromOffset) * 60 * 1000;
    
    return new Date(date.getTime() + offsetDiff);
  }
  
  // 获取指定时区的偏移分钟数
  private static getOffsetMinutes(date: Date, timeZone: TimeZone): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
  }
  
  // 格式化带时区的日期
  static formatWithTimeZone(
    date: Date,
    timeZone: TimeZone,
    format: string
  ): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('zh-CN', options).format(date);
  }
  
  // 获取常用时区列表
  static getCommonTimeZones(): Array<{ value: TimeZone; label: string; offset: string }> {
    return [
      { value: 'Asia/Shanghai', label: '北京时间', offset: 'UTC+8' },
      { value: 'Asia/Tokyo', label: '东京时间', offset: 'UTC+9' },
      { value: 'Asia/Seoul', label: '首尔时间', offset: 'UTC+9' },
      { value: 'Asia/Singapore', label: '新加坡时间', offset: 'UTC+8' },
      { value: 'Europe/London', label: '伦敦时间', offset: 'UTC+0/+1' },
      { value: 'Europe/Paris', label: '巴黎时间', offset: 'UTC+1/+2' },
      { value: 'America/New_York', label: '纽约时间', offset: 'UTC-5/-4' },
      { value: 'America/Los_Angeles', label: '洛杉矶时间', offset: 'UTC-8/-7' },
      { value: 'Australia/Sydney', label: '悉尼时间', offset: 'UTC+10/+11' },
    ];
  }
}
