
import React, { useState, useEffect } from 'react';
import { NotificationInbox, NotificationMessage } from '../../services/notifications';
import { ICONS } from '@easymo/shared/constants';
import Button from '../Button';

interface NotificationInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * In-App Notification Inbox
 * 
 * Shows notifications when push is blocked or unavailable
 * Graceful fallback for notification functionality
 */
const NotificationInboxComponent: React.FC<NotificationInboxProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadNotifications = () => {
      const all = NotificationInbox.getAll();
      setNotifications(all);
      setUnreadCount(NotificationInbox.getUnreadCount());
    };

    loadNotifications();

    // Listen for updates
    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('notification-inbox-updated', handleUpdate);
    return () => {
      window.removeEventListener('notification-inbox-updated', handleUpdate);
    };
  }, []);

  const handleMarkAsRead = (id: string) => {
    NotificationInbox.markAsRead(id);
    const all = NotificationInbox.getAll();
    setNotifications(all);
    setUnreadCount(NotificationInbox.getUnreadCount());
  };

  const handleMarkAllAsRead = () => {
    NotificationInbox.markAllAsRead();
    const all = NotificationInbox.getAll();
    setNotifications(all);
    setUnreadCount(0);
  };

  const handleDelete = (id: string) => {
    NotificationInbox.delete(id);
    const all = NotificationInbox.getAll();
    setNotifications(all);
    setUnreadCount(NotificationInbox.getUnreadCount());
  };

  const handleClear = () => {
    NotificationInbox.clear();
    setNotifications([]);
    setUnreadCount(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
      <div className="w-full max-h-[80vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-blue-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 min-h-tap"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-tap"
              aria-label="Close"
            >
              <ICONS.XMark className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <ICONS.Bell className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                No notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {notification.icon && (
                      <img
                        src={notification.icon}
                        alt=""
                        className="w-10 h-10 rounded-lg"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                            {notification.title}
                          </h3>
                          {notification.body && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 min-h-tap"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 min-h-tap"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="secondary"
              onClick={handleClear}
              fullWidth
              size="sm"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationInboxComponent;

