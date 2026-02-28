// 通知管理
export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  data?: Record<string, any>;
}

export class NotificationManager {
  private static permission: NotificationPermission = 'default';
  private static scheduledNotifications: Map<string, number> = new Map();
  
  // 请求通知权限
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    this.permission = await Notification.requestPermission();
    return this.permission;
  }
  
  // 检查权限
  static hasPermission(): boolean {
    return this.permission === 'granted';
  }
  
  // 发送立即通知
  static async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!this.hasPermission()) {
      await this.requestPermission();
    }
    
    if (this.hasPermission()) {
      new Notification(payload.title, {
        body: payload.body,
        icon: '/icon-192x192.png',
        data: payload.data
      });
    }
  }
  
  // 调度通知
  static scheduleNotification(
    id: string,
    payload: Omit<NotificationPayload, 'id' | 'timestamp'>,
    triggerTime: Date
  ): void {
    const now = Date.now();
    const delay = triggerTime.getTime() - now;
    
    if (delay <= 0) {
      this.sendNotification({ ...payload, id, timestamp: now });
      return;
    }
    
    // 清除已存在的调度
    this.cancelNotification(id);
    
    const timeoutId = window.setTimeout(() => {
      this.sendNotification({ ...payload, id, timestamp: Date.now() });
      this.scheduledNotifications.delete(id);
    }, delay);
    
    this.scheduledNotifications.set(id, timeoutId);
  }
  
  // 取消通知
  static cancelNotification(id: string): void {
    const timeoutId = this.scheduledNotifications.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      this.scheduledNotifications.delete(id);
    }
  }
  
  // 取消所有通知
  static cancelAllNotifications(): void {
    this.scheduledNotifications.forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
  }
}
