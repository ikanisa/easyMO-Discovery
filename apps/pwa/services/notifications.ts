
/**
 * Notifications Service
 * 
 * Handles push notifications with in-app inbox fallback
 * Graceful degradation if notifications are blocked
 */

export interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  category?: string;
}

const INBOX_STORAGE_KEY = 'easymo_notification_inbox';
const MAX_INBOX_SIZE = 50; // Keep last 50 notifications

/**
 * In-App Notification Inbox
 * Stores notifications when push is blocked or unavailable
 */
export const NotificationInbox = {
  /**
   * Get all notifications from inbox
   */
  getAll(): NotificationMessage[] {
    try {
      const stored = localStorage.getItem(INBOX_STORAGE_KEY);
      if (!stored) return [];
      const notifications = JSON.parse(stored) as NotificationMessage[];
      // Sort by timestamp (newest first)
      return notifications.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  },

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    const notifications = NotificationInbox.getAll();
    return notifications.filter(n => !n.read).length;
  },

  /**
   * Add notification to inbox
   */
  add(notification: Omit<NotificationMessage, 'id' | 'timestamp' | 'read'>): void {
    const notifications = NotificationInbox.getAll();
    const newNotification: NotificationMessage = {
      ...notification,
      id: `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    // Add to beginning and limit size
    notifications.unshift(newNotification);
    const trimmed = notifications.slice(0, MAX_INBOX_SIZE);

    try {
      localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(trimmed));
      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('notification-inbox-updated'));
    } catch (error) {
      console.error('Failed to save notification to inbox:', error);
    }
  },

  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notifications = NotificationInbox.getAll();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      try {
        localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(notifications));
        window.dispatchEvent(new CustomEvent('notification-inbox-updated'));
      } catch (error) {
        console.error('Failed to update notification:', error);
      }
    }
  },

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    const notifications = NotificationInbox.getAll();
    notifications.forEach(n => { n.read = true; });
    try {
      localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(notifications));
      window.dispatchEvent(new CustomEvent('notification-inbox-updated'));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  /**
   * Delete notification
   */
  delete(id: string): void {
    const notifications = NotificationInbox.getAll();
    const filtered = notifications.filter(n => n.id !== id);
    try {
      localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('notification-inbox-updated'));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  /**
   * Clear all notifications
   */
  clear(): void {
    try {
      localStorage.removeItem(INBOX_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('notification-inbox-updated'));
    } catch (error) {
      console.error('Failed to clear inbox:', error);
    }
  },
};

/**
 * Show notification (push or inbox fallback)
 */
export async function showNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<void> {
  // Try push notification first
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        ...options,
        icon: options.icon || '/icons/icon-192.png',
        badge: options.badge || '/icons/icon-192.png',
      });
      return;
    } catch (error) {
      console.warn('Failed to show push notification, falling back to inbox:', error);
    }
  }

  // Fallback to in-app inbox
  NotificationInbox.add({
    title,
    body: options.body || '',
    icon: options.icon,
    badge: options.badge,
    data: options.data as Record<string, any>,
    category: options.tag,
  });
}

/**
 * Request notification permission with explanation
 */
export async function requestNotificationPermission(
  explanation?: string
): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  // Check current permission
  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Check if notifications are supported and enabled
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

