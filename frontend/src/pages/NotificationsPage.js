import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Inbox, Archive } from 'lucide-react';
import Header from '@/components/Header';
import NotificationItem from '@/components/NotificationItem';
import { NotificationSkeleton } from '@/components/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeDeepLink } from '@/platform/deepLinks';
import {
  deleteNotification,
  getNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/data/repositories/notificationRepository';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unread'); // 'unread' | 'earlier'

  useEffect(() => {
    if (!user?.id) return undefined;
    
    // Subscribe to remote + cached notifications
    const unsubscribe = subscribeToNotifications(user.id, (next) => {
      setItems(next);
      setLoading(false);
    });

    return () => {
      unsubscribe?.();
    };
  }, [user?.id]);

  // Split into unread and earlier (read/archived) notifications
  const unreadItems = useMemo(() => items.filter((item) => !item.read), [items]);
  const earlierItems = useMemo(() => items.filter((item) => item.read), [items]);

  const displayedItems = activeTab === 'unread' ? unreadItems : earlierItems;

  const handleOpen = async (item) => {
    if (!item.read && user?.id) {
      // Mark read locally and remotely
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true, readAt: new Date().toISOString() } : entry));
      markNotificationRead(user.id, item.id).catch(() => {});
    }
    navigate(normalizeDeepLink(item.url));
  };

  const handleMarkRead = async (notificationId) => {
    if (!user?.id) return;
    // Immediately mark read in local state
    setItems((current) =>
      current.map((entry) =>
        entry.id === notificationId ? { ...entry, read: true, readAt: new Date().toISOString() } : entry
      )
    );
    await markNotificationRead(user.id, notificationId).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    if (!user?.id || !unreadItems.length) return;
    const now = new Date().toISOString();
    // Update local state immediately with smooth layout transitions
    setItems((current) => current.map((item) => ({ ...item, read: true, readAt: item.readAt || now })));
    await markAllNotificationsRead(user.id, unreadItems).catch(() => {});
  };

  const handleDelete = async (notificationId) => {
    if (!user?.id) return;
    // Remove immediately from local state
    setItems((current) => current.filter((entry) => entry.id !== notificationId));
    await deleteNotification(user.id, notificationId);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950 dark:bg-black dark:text-white selection:bg-[#0095F6]/20">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-[calc(var(--bottom-nav-height,49px)+env(safe-area-inset-bottom,0px)+2rem)] sm:pt-8 sm:pb-8 lg:pb-8">
        {/* Header bar */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {unreadItems.length > 0
                ? `${unreadItems.length} unread ${unreadItems.length === 1 ? 'notification' : 'notifications'}`
                : 'All caught up on recent updates'}
            </p>
          </div>

          {unreadItems.length > 0 && activeTab === 'unread' && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs sm:text-sm font-semibold text-[#0095F6] hover:text-[#1877F2] dark:hover:text-blue-400 py-1.5 px-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Tab Pills */}
        <div className="mb-4 flex items-center gap-2 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'unread'
                ? 'bg-white dark:bg-black text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Unread</span>
            {unreadItems.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#0095F6] text-white">
                {unreadItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('earlier')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'earlier'
                ? 'bg-white dark:bg-black text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Earlier</span>
            {earlierItems.length > 0 && (
              <span className="ml-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                ({earlierItems.length})
              </span>
            )}
          </button>
        </div>

        {/* Content list */}
        {loading ? (
          <NotificationSkeleton count={5} />
        ) : displayedItems.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 mx-auto mb-3 flex items-center justify-center text-neutral-400">
              <Bell className="h-6 w-6 stroke-[1.75px]" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {activeTab === 'unread' ? "You're all caught up!" : 'No earlier notifications'}
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
              {activeTab === 'unread'
                ? 'When someone replies to your posts, follows you, or mentions you, you’ll see it here.'
                : 'Archived and read notifications are kept safely in your local history.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 shadow-xs">
            <AnimatePresence mode="popLayout" initial={false}>
              {displayedItems.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  onOpen={handleOpen}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
