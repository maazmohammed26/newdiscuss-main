import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUserGroups, subscribeToGroupInvites, subscribeToAdminJoinRequests } from '@/lib/groupsDb';
import { subscribeToReceivedRequests } from '@/lib/relationshipsDb';
import { subscribeToUserChats } from '@/lib/chatsDb';
import { subscribeToActiveStories, subscribeToSeenStoryIds, groupStoriesByAuthor } from '@/lib/storiesDb';

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
  const unreadChatsRef = useRef({});
  const locallyReadChatsRef = useRef(new Map());
  const readReleaseTimersRef = useRef(new Map());

  // Signal Stories global sync state
  const [activeStories, setActiveStories] = useState([]);
  const [seenStoryIds, setSeenStoryIds] = useState(new Set());
  const [storyGroups, setStoryGroups] = useState([]);
  const [usersWithStories, setUsersWithStories] = useState(new Set());

  useEffect(() => {
    if (!user?.id) {
      setUnreadChatCount(0);
      setUnreadGroupMessages(false);
      setPendingFriendRequests(0);
      setPendingGroupInvites(0);
      setPendingAdminGroupRequests(0);
      return;
    }

    const readReleaseTimers = readReleaseTimersRef.current;
    const locallyReadChats = locallyReadChatsRef.current;

    const unsubChats = subscribeToUserChats(user.id, (chats) => {
      const unreadByChat = {};
      let count = 0;
      chats.forEach((chat) => {
        const unread = Number(chat.unreadCount) || 0;
        unreadByChat[chat.chatId] = unread;
        if (unread === 0 && locallyReadChatsRef.current.has(chat.chatId)) {
          locallyReadChatsRef.current.delete(chat.chatId);
          const timer = readReleaseTimersRef.current.get(chat.chatId);
          if (timer) window.clearTimeout(timer);
          readReleaseTimersRef.current.delete(chat.chatId);
        }
        if (!locallyReadChatsRef.current.has(chat.chatId)) count += unread;
      });
      unreadChatsRef.current = unreadByChat;
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
      readReleaseTimers.forEach((timer) => window.clearTimeout(timer));
      readReleaseTimers.clear();
      locallyReadChats.clear();
      unreadChatsRef.current = {};
    };
  }, [user?.id]);

  const markChatReadLocally = useCallback((chatId) => {
    if (!chatId) return;
    const unread = unreadChatsRef.current[chatId] || 0;
    locallyReadChatsRef.current.set(chatId, Date.now());
    unreadChatsRef.current = { ...unreadChatsRef.current, [chatId]: 0 };
    setUnreadChatCount((current) => Math.max(0, current - unread));

    const existingTimer = readReleaseTimersRef.current.get(chatId);
    if (existingTimer) window.clearTimeout(existingTimer);
    const timer = window.setTimeout(() => {
      locallyReadChatsRef.current.delete(chatId);
      readReleaseTimersRef.current.delete(chatId);
      const latestCount = Object.values(unreadChatsRef.current)
        .reduce((sum, value) => sum + (Number(value) || 0), 0);
      setUnreadChatCount(latestCount);
    }, 8000);
    readReleaseTimersRef.current.set(chatId, timer);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setActiveStories([]);
      setSeenStoryIds(new Set());
      setStoryGroups([]);
      setUsersWithStories(new Set());
      return;
    }

    const unsubSeen = subscribeToSeenStoryIds(user.id, (seen) => {
      setSeenStoryIds(seen);
    });

    const unsubStories = subscribeToActiveStories((storiesList) => {
      setActiveStories(storiesList);
    });

    return () => {
      unsubSeen();
      unsubStories();
    };
  }, [user?.id]);

  useEffect(() => {
    const groups = groupStoriesByAuthor(activeStories, seenStoryIds, user?.id);
    setStoryGroups(groups);
    const uids = new Set(activeStories.map(s => s.authorId));
    setUsersWithStories(uids);
  }, [activeStories, seenStoryIds, user?.id]);

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
    markChatReadLocally,
    clearedSections,
    activeStories,
    seenStoryIds,
    storyGroups,
    usersWithStories,
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
