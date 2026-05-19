import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToUnreadCount } from '@/lib/chatsDb';
import { subscribeToReceivedRequests } from '@/lib/relationshipsDb';
import { subscribeToAdminMessage, markAdminMessageSeen } from '@/lib/adminMessageDb';
import { subscribeToCommentBadges } from '@/lib/commentsDb';
import DiscussLogo from '@/components/DiscussLogo';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { MessageCircle, Bell, Megaphone } from 'lucide-react';
import { useHighlights } from '@/contexts/HighlightsContext';

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { 
    unreadChatCount,
    unreadGroupMessages,
    pendingFriendRequests,
    pendingGroupRequests,
    hasNewGroupRequests,
  } = useHighlights();

  const [adminMessage, setAdminMessage] = useState(null);
  const [hasUnseenAdmin, setHasUnseenAdmin] = useState(false);
  const [showAdminPopover, setShowAdminPopover] = useState(false);
  const [commentBadgeCount, setCommentBadgeCount] = useState(0);

  // Subscribe to comment badges
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribeCommentBadges = subscribeToCommentBadges(user.id, (badges) => {
      const count = Object.keys(badges || {}).length;
      setCommentBadgeCount(count);
    });
    return () => unsubscribeCommentBadges();
  }, [user?.id]);

  // Subscribe to admin message
  useEffect(() => {
    if (!user?.id) return;
    
    const unsubscribe = subscribeToAdminMessage((msg, isNew) => {
      setAdminMessage(msg);
      setHasUnseenAdmin(isNew);
    });
    
    return () => unsubscribe();
  }, [user?.id]);

  // Handle admin message popover open
  const handleAdminPopoverOpen = (open) => {
    setShowAdminPopover(open);
    if (open && hasUnseenAdmin) {
      markAdminMessageSeen();
      setHasUnseenAdmin(false);
    }
  };

  const totalNotifications = unreadChatCount + pendingFriendRequests + pendingGroupRequests + commentBadgeCount;

  return (
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/5 relative select-none">
      {/* Top red-and-blue thick accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center" data-testid="header-logo">
          <DiscussLogo size="md" />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link to="/feed">
                <Button 
                  variant="ghost" 
                  data-testid="header-feed-btn" 
                  className="text-gray-400 hover:text-white hover:bg-[#181818] rounded-xl px-3 sm:px-4 text-[13px] font-bold transition-all"
                >
                  Feed
                </Button>
              </Link>
              
              {/* Admin Message Icon - Only show if active */}
              {adminMessage && (
                <Popover open={showAdminPopover} onOpenChange={handleAdminPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative w-9 h-9 p-0 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/5 transition-all"
                    >
                      <Megaphone className="w-4 h-4 text-gray-400 hover:text-white" />
                      {hasUnseenAdmin && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#DC2626] rounded-full animate-pulse" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-4 bg-[#101010] border border-white/5 text-[#E1E0CC] rounded-xl shadow-2xl" align="end">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                        <Megaphone className="w-4 h-4" />
                        Admin Announcement
                      </div>
                      <p className="text-sm text-gray-300 font-medium leading-relaxed">
                        {adminMessage.message}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {adminMessage.createdAt && new Date(adminMessage.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              <Link to="/chat" className="relative">
                <Button 
                  variant="ghost" 
                  data-testid="header-chat-btn" 
                  className="w-9 h-9 p-0 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/5 transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-gray-400 hover:text-white" />
                </Button>
                {(unreadChatCount > 0 || unreadGroupMessages || hasNewGroupRequests) && (
                  <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-[10px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-[0_0_8px_rgba(220,38,38,0.4)]">
                    {unreadChatCount > 0 ? (unreadChatCount > 99 ? '99+' : unreadChatCount) : ''}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="relative">
                <Button 
                  variant="ghost" 
                  data-testid="header-profile-btn" 
                  className="w-9 h-9 p-0 rounded-xl bg-[#181818] hover:bg-[#202020] border border-white/5 overflow-hidden transition-all"
                >
                  <UserAvatar
                    src={user.photo_url || null}
                    username={user.username}
                    className="w-full h-full rounded-none"
                    alt={user.username}
                  />
                </Button>
                {(pendingFriendRequests > 0 || commentBadgeCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-[#2563EB] text-white text-[10px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-[0_0_8px_rgba(37,99,235,0.4)]">
                    {(pendingFriendRequests + commentBadgeCount) > 99 ? '99+' : pendingFriendRequests + commentBadgeCount}
                  </span>
                )}
              </Link>
            </>
          ) : isLanding ? (
            <>
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  data-testid="header-login-btn" 
                  className="text-gray-400 hover:text-white hover:bg-[#181818] rounded-xl px-4 text-[13px] font-bold border border-white/5 transition-all"
                >
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  data-testid="header-register-btn" 
                  className="bg-gradient-to-r from-[#DC2626] to-[#2563EB] text-white hover:opacity-90 rounded-xl px-5 text-[13px] font-black transition-opacity shadow-lg"
                >
                  Register
                </Button>
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
