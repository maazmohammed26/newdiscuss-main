import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeDeepLink } from '@/platform/deepLinks';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/data/repositories/notificationRepository';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return subscribeToNotifications(user.id, (next) => {
      setItems(next);
      setLoading(false);
    });
  }, [user?.id]);

  const open = async (item) => {
    if (!item.read) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
      markNotificationRead(user.id, item.id).catch(() => {});
    }
    navigate(normalizeDeepLink(item.url));
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-black dark:text-white">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div><h1 className="text-xl font-bold">Notifications</h1><p className="text-sm text-neutral-500">{unread ? `${unread} unread` : 'You’re all caught up'}</p></div>
          {unread > 0 && <button onClick={() => markAllNotificationsRead(user.id, items)} className="flex items-center gap-2 text-sm font-semibold text-[#0095F6]"><CheckCheck className="h-4 w-4" />Mark all read</button>}
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : items.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-950"><Bell className="mx-auto mb-3 h-8 w-8 text-neutral-400" /><p className="text-sm text-neutral-500">No notifications yet</p></div>
        ) : <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">{items.map((item) => (
          <button key={item.id} onClick={() => open(item)} className={`block w-full border-b border-neutral-100 px-4 py-4 text-left last:border-0 dark:border-neutral-900 ${item.read ? '' : 'bg-blue-50/70 dark:bg-blue-950/20'}`}>
            <div className="flex gap-3"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-[#0095F6]'}`} /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.body}</p><p className="mt-1 text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString()}</p></div></div>
          </button>
        ))}</div>}
      </main>
    </div>
  );
}
