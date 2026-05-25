import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUserGroups, subscribeToGroupInvites, subscribeToAdminJoinRequests } from '@/lib/groupsDb';
import { subscribeToReceivedRequests } from '@/lib/relationshipsDb';
import { subscribeToUserChats } from '@/lib/chatsDb';

const HighlightsContext = createContext();

export function HighlightsProvider({ children }) {
  const { user } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadGroupMessages, setUnreadGroupMessages] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [pendingGroupInvites, setPendingGroupInvites] = useState(0);
  const [pendingAdminGroupRequests, setPendingAdminGroupRequests] = useState(0);
  const [viewedGroupRequests, setViewedGroupRequests] = useState(0);
  const [clearedSections, setClearedSections] = useState({});

  useEffect(() => {
    if (!user?.id) {
      setUnreadChatCount(0);
      setUnreadGroupMessages(false);
      setPendingFriendRequests(0);
      setPendingGroupInvites(0);
      setPendingAdminGroupRequests(0);
      return;
    }

    const unsubChats = subscribeToUserChats(user.id, (chats) => {
      const count = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadChatCount(count);
    });

    const unsubGroups = subscribeToUserGroups(user.id, (groups) => {
      const hasUnread = groups.some(g => g.hasUnread);
      setUnreadGroupMessages(hasUnread);
    });

    const unsubFriendReqs = subscribeToReceivedRequests(user.id, (reqs) => {
      setPendingFriendRequests(reqs.length);
    });

    const unsubGroupInvites = subscribeToGroupInvites(user.id, (invites) => {
      setPendingGroupInvites(invites.length);
    });

    const unsubAdminRequests = subscribeToAdminJoinRequests(user.id, (requests) => {
      setPendingAdminGroupRequests(requests.length);
    });

    return () => {
      unsubChats();
      unsubGroups();
      unsubFriendReqs();
      unsubGroupInvites();
      unsubAdminRequests();
    };
  }, [user?.id]);

  const pendingGroupRequests = pendingGroupInvites + pendingAdminGroupRequests;
  const hasNewGroupRequests = pendingGroupRequests > viewedGroupRequests;

  const totalHighlights = 
    (unreadChatCount > 0 ? 1 : 0) + 
    (unreadGroupMessages ? 1 : 0) + 
    (pendingFriendRequests > 0 ? 1 : 0) + 
    (hasNewGroupRequests ? 1 : 0);

  const markGroupRequestsViewed = () => {
    setViewedGroupRequests(pendingGroupRequests);
  };

  const clearSection = (sectionName) => {
    setClearedSections(prev => ({ ...prev, [sectionName]: Date.now() }));
  };

  const clearAllHighlights = () => {
    const now = Date.now();
    setClearedSections({
      chat: now,
      groups: now,
      requests: now
    });
  };

  const value = {
    unreadChatCount,
    unreadGroupMessages,
    pendingFriendRequests,
    pendingGroupInvites,
    pendingAdminGroupRequests,
    pendingGroupRequests,
    hasNewGroupRequests,
    totalHighlights,
    markGroupRequestsViewed,
    clearSection,
    clearAllHighlights,
    clearedSections
  };

  return (
    <HighlightsContext.Provider value={value}>
      {children}
    </HighlightsContext.Provider>
  );
}

export function useHighlights() {
  return useContext(HighlightsContext);
}
