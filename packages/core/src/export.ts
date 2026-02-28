// 日历导入导出 (iCal/ICS 格式)
import { CalendarEvent } from './calendar';

export class ICalExporter {
  private static generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@calendar.app`;
  }
  
  private static formatDate(date: Date, allDay: boolean = false): string {
    if (allDay) {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    }
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  
  private static escapeICal(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
  
  // 导出为 ICS 格式
  static exportToICS(events: CalendarEvent[], title: string = 'My Calendar'): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Calendar App//EN',
      `X-WR-CALNAME:${this.escapeICal(title)}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@calendar.app`);
      lines.push(`DTSTAMP:${this.formatDate(new Date())}`);
      lines.push(`DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${this.formatDate(event.startDate, event.allDay)}`);
      lines.push(`DTEND${event.allDay ? ';VALUE=DATE' : ''}:${this.formatDate(event.endDate, event.allDay)}`);
      lines.push(`SUMMARY:${this.escapeICal(event.title)}`);
      
      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeICal(event.description)}`);
      }
      
      if (event.color) {
        lines.push(`COLOR:${event.color}`);
      }
      
      lines.push('END:VEVENT');
    }
    
    lines.push('END:VCALENDAR');
    
    return lines.join('\r\n');
  }
  
  // 下载 ICS 文件
  static downloadICS(events: CalendarEvent[], filename: string = 'calendar.ics'): void {
    const icsContent = this.exportToICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
  
  // 解析 ICS 文件
  static parseICS(icsContent: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const lines = icsContent.split(/\r?\n/);
    
    let currentEvent: Partial<CalendarEvent> | null = null;
    
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.title && currentEvent.startDate) {
          events.push({
            id: currentEvent.id || `imported_${Date.now()}`,
            title: currentEvent.title,
            description: currentEvent.description,
            startDate: currentEvent.startDate,
            endDate: currentEvent.endDate || currentEvent.startDate,
            allDay: currentEvent.allDay,
            color: currentEvent.color
          });
        }
        currentEvent = null;
      } else if (currentEvent) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');
        
        switch (key.split(';')[0]) {
          case 'UID':
            currentEvent.id = value;
            break;
          case 'SUMMARY':
            currentEvent.title = this.unescapeICal(value);
            break;
          case 'DESCRIPTION':
            currentEvent.description = this.unescapeICal(value);
            break;
          case 'DTSTART':
            currentEvent.startDate = this.parseICalDate(value, key.includes('VALUE=DATE'));
            currentEvent.allDay = key.includes('VALUE=DATE');
            break;
          case 'DTEND':
            currentEvent.endDate = this.parseICalDate(value, key.includes('VALUE=DATE'));
            break;
          case 'COLOR':
            currentEvent.color = value;
            break;
        }
      }
    }
    
    return events;
  }
  
  private static parseICalDate(value: string, allDay: boolean): Date {
    if (allDay) {
      const year = parseInt(value.slice(0, 4));
      const month = parseInt(value.slice(4, 6)) - 1;
      const day = parseInt(value.slice(6, 8));
      return new Date(year, month, day);
    }
    
    // 解析 ISO 格式
    return new Date(
      value.slice(0, 4) + '-' +
      value.slice(4, 6) + '-' +
      value.slice(6, 11) + ':' +
      value.slice(11, 13) + ':' +
      value.slice(13, 15)
    );
  }
  
  private static unescapeICal(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }
}
