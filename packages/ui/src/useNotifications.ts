import { useEffect, useState } from 'react';
import { NotificationManager, NotificationPayload } from '@calendar/core';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  
  useEffect(() => {
    setSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);
  
  const requestPermission = async () => {
    const result = await NotificationManager.requestPermission();
    setPermission(result);
    return result;
  };
  
  const scheduleNotification = (
    id: string,
    payload: Omit<NotificationPayload, 'id' | 'timestamp'>,
    triggerTime: Date
  ) => {
    NotificationManager.scheduleNotification(id, payload, triggerTime);
  };
  
  const cancelNotification = (id: string) => {
    NotificationManager.cancelNotification(id);
  };
  
  return {
    supported,
    permission,
    requestPermission,
    scheduleNotification,
    cancelNotification
  };
};
