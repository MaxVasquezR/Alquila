import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { getSocket } from './socket';
import { useAuth } from './auth';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkType?: string;
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [c, list] = await Promise.all([
      api<{ count: number }>('/notifications/unread-count'),
      api<{ data: NotificationItem[] }>('/notifications'),
    ]);
    setCount(c.count);
    setItems(list.data);
  }, [user]);

  useEffect(() => {
    refresh();
    const s = getSocket();
    if (!s) return;
    const handler = (n: NotificationItem) => {
      refresh();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(n.title, { body: n.body });
      }
    };
    s.on('notification:new', handler);
    return () => {
      s.off('notification:new', handler);
    };
  }, [refresh, user]);

  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const markAllRead = async () => {
    await api('/notifications/read-all', { method: 'POST' });
    setCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return { count, items, refresh, markAllRead };
}
