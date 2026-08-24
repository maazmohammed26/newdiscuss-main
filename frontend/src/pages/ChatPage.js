import UserAvatar from '@/components/UserAvatar';
import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { getUser } from '@/lib/db';
import { database, ref, onValue } from '@/lib/firebase';
import { getChatsWithUserDetails, subscribeToUserChats, getUserChats, getChatSettings } from '@/lib/chatsDb';
import { getFriendsWithDetails, searchFriends } from '@/lib/relationshipsDb';
import { 
  getUserGroups, 
  subscribeToUserGroups, 
  GROUP_STATUS,
  searchPublicGroups,
  sendJoinRequest,
  getUserJoinRequestStatus,
  cancelJoinRequest
} from '@/lib/groupsDb';
import { 
  getCachedChats, 
  cacheChats, 
  getCachedFriends, 
  cacheFriends,
  getCachedGroups,
  cacheGroups,
  fastCacheLoad
} from '@/lib/cacheManager';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import VerifiedBadge from '@/components/VerifiedBadge';
import CreateGroupModal from '@/components/CreateGroupModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, Search, X, MessageCircle, Users, Loader2, 
  MessageSquarePlus, Timer, MoreVertical, UserPlus, Inbox, Globe
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  previewFromLastMessageString,
  isDeletedListPreview,
} from '@/lib/chatMessageUtils';

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pendingGroupRequests } = useHighlights();
  const [chats, setChats] = useState(() => {
    if (typeof window !== 'undefined' && window.__discuss_chats_cache) {
      return window.__discuss_chats_cache;
    }
    if (!user?.id) return [];
    const fast = fastCacheLoad(`chats_${user.id}`, Number.MAX_SAFE_INTEGER);
    return fast?.data || [];
  });
  const [friends, setFriends] = useState(() => {
    if (typeof window !== 'undefined' && window.__discuss_friends_cache) {
      return window.__discuss_friends_cache;
    }
    if (!user?.id) return [];
    const fast = fastCacheLoad(`friends_${user.id}`, Number.MAX_SAFE_INTEGER);
    return fast?.data || [];
  });
  const [groups, setGroups] = useState(() => {
    if (typeof window !== 'undefined' && window.__discuss_groups_cache) {
      return window.__discuss_groups_cache;
    }
    if (!user?.id) return [];
    const fast = fastCacheLoad(`groups_${user.id}`, Number.MAX_SAFE_INTEGER);
    return fast?.data || [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined' && (
      Array.isArray(window.__discuss_chats_cache) ||
      Array.isArray(window.__discuss_friends_cache) ||
      Array.isArray(window.__discuss_groups_cache)
    )) {
      return false;
    }
    if (!user?.id) return true;
    const c = fastCacheLoad(`chats_${user.id}`, Number.MAX_SAFE_INTEGER);
    const f = fastCacheLoad(`friends_${user.id}`, Number.MAX_SAFE_INTEGER);
    const g = fastCacheLoad(`groups_${user.id}`, Number.MAX_SAFE_INTEGER);
    return !(c || f || g);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'friends'
  const [chatSettings, setChatSettings] = useState({});
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [searchGroupsOpen, setSearchGroupsOpen] = useState(false);
  const [publicGroups, setPublicGroups] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [searchingGroups, setSearchingGroups] = useState(false);
  const [groupRequestStatus, setGroupRequestStatus] = useState({});
  const chatsRef = useRef(chats);

  useEffect(() => { chatsRef.current = chats; }, [chats]);

  // Sync state changes with in-memory cache for instant subsequent loads
  useEffect(() => {
    if (Array.isArray(chats) && typeof window !== 'undefined') {
      window.__discuss_chats_cache = chats;
    }
  }, [chats]);

  useEffect(() => {
    if (Array.isArray(friends) && typeof window !== 'undefined') {
      window.__discuss_friends_cache = friends;
    }
  }, [friends]);

  useEffect(() => {
    if (Array.isArray(groups) && typeof window !== 'undefined') {
      window.__discuss_groups_cache = groups;
    }
  }, [groups]);

  // Load chats, groups and friends with user details inline - with caching
  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        // Try to get cached data first for instant loading
        const [cachedChatsData, cachedFriendsData, cachedGroupsData] = await Promise.all([
          getCachedChats(user.id),
          getCachedFriends(user.id),
          getCachedGroups(user.id)
        ]);

        if (cachedChatsData?.length > 0) {
          setChats(cachedChatsData);
        }
        if (cachedFriendsData?.length > 0) {
          setFriends(cachedFriendsData);
        }
        if (cachedGroupsData?.length > 0) {
          setGroups(cachedGroupsData);
        }
        if (cachedChatsData || cachedFriendsData || cachedGroupsData) {
          setLoading(false);
        }

        // Load friends (only manual database fetch needed since chats and groups have subscriptions!)
        const friendsData = await getFriendsWithDetails(user.id);
        setFriends(friendsData);
        await cacheFriends(user.id, friendsData);
        
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time chat updates
    const unsubscribeChats = subscribeToUserChats(user.id, async (updatedChats) => {
      const chatsWithDetails = await Promise.all(
        updatedChats.map(async (chat) => {
          try {
            if (!chat.otherUser) return null;
            
            const existing = chatsRef.current.find((item) => item.otherUser === chat.otherUser)?.otherUserDetails;
            const userData = existing || await getUser(chat.otherUser);
            
            if (!userData || !userData.username) {
              return null;
            }
            
            // Get chat settings for auto-delete indicator in real-time
            const settings = await getChatSettings(chat.chatId);
            if (settings?.autoDelete) {
              setChatSettings(prev => ({ ...prev, [chat.chatId]: settings }));
            }
            
            return {
              ...chat,
              otherUserDetails: {
                id: chat.otherUser,
                username: userData.username,
                email: userData.email || '',
                photo_url: userData.photo_url || '',
                verified: userData.verified || false
              }
            };
          } catch {
            return null;
          }
        })
      );
      
      const validChats = chatsWithDetails.filter(chat => chat !== null && chat.otherUserDetails !== null);
      startTransition(() => setChats(validChats));
      cacheChats(user.id, validChats);
    });

    // Subscribe to real-time group updates
    const unsubscribeGroups = subscribeToUserGroups(user.id, (updatedGroups) => {
      startTransition(() => setGroups(updatedGroups));
      cacheGroups(user.id, updatedGroups);
    });

    return () => {
      unsubscribeChats();
      unsubscribeGroups();
    };
  }, [user?.id]);

  // Drop 1:1 chats in real time if the peer profile is removed from primary RTDB
  const chatPeerIdsKey = chats
    .map((c) => c.otherUser)
    .filter(Boolean)
    .sort()
    .join(',');
  useEffect(() => {
    if (!user?.id || !chatPeerIdsKey) return;
    const seenOk = new Set();
    const ids = [...new Set(chatPeerIdsKey.split(',').filter(Boolean))];
    const unsubs = ids.map((oid) =>
      onValue(ref(database, `users/${oid}`), (snap) => {
        if (snap.exists()) {
          seenOk.add(oid);
          return;
        }
        if (!seenOk.has(oid)) return;
        setChats((prev) => {
          const next = prev.filter((c) => c.otherUser !== oid);
          if (next.length < prev.length) {
            cacheChats(user.id, next);
            toast.info('Chat removed — user no longer on Discuss');
          }
          return next;
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [chatPeerIdsKey, user?.id]);

  // Drop friends from the list when their profile is deleted
  const friendIdsKey = friends
    .map((f) => f.id)
    .filter(Boolean)
    .sort()
    .join(',');
  useEffect(() => {
    if (!user?.id || !friendIdsKey) return;
    const seenOk = new Set();
    const ids = [...new Set(friendIdsKey.split(',').filter(Boolean))];
    const unsubs = ids.map((fid) =>
      onValue(ref(database, `users/${fid}`), (snap) => {
        if (snap.exists()) {
          seenOk.add(fid);
          return;
        }
        if (!seenOk.has(fid)) return;
        setFriends((prev) => {
          const next = prev.filter((f) => f.id !== fid);
          if (next.length < prev.length) {
            cacheFriends(user.id, next);
            toast.info('A friend was removed from Discuss');
          }
          return next;
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [friendIdsKey, user?.id]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !user?.id) {
      setSearchResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setSearching(true);
      try {
        if (activeTab === 'friends') {
          const results = await searchFriends(user.id, searchQuery);
          setSearchResults(results);
        } else {
          // Search in both chats and groups
          const chatResults = chats.filter(chat =>
            chat.otherUserDetails?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          const groupResults = groups.filter(group =>
            group.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults([...chatResults, ...groupResults]);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery, user?.id, activeTab, chats, groups]);

  const handleChatClick = (otherUserId, details) => {
    if (typeof window !== 'undefined' && details) {
      window.__discuss_active_chat_user = { id: otherUserId, ...details };
    }
    navigate(`/chat/${otherUserId}`);
  };

  const handleGroupClick = (groupId, group) => {
    if (typeof window !== 'undefined' && group) {
      window.__discuss_active_group = {
        ...group,
        id: group.groupId,
        name: group.name || group.groupName,
      };
    }
    navigate(`/group/${groupId}`);
  };

  const handleStartNewChat = (friendId) => {
    navigate(`/chat/${friendId}`);
  };

  const handleGroupCreated = (group) => {
    // Reload groups
    getUserGroups(user.id).then(groupsData => {
      setGroups(groupsData);
      cacheGroups(user.id, groupsData);
    });
    // Navigate to the new group
    navigate(`/group/${group.id}`);
  };

  const handleSearchGroups = async (query) => {
    if (!query.trim()) {
      setPublicGroups([]);
      return;
    }
    
    setSearchingGroups(true);
    try {
      const results = await searchPublicGroups(query);
      setPublicGroups(results);
      
      // Check request status for each group
      const statuses = {};
      for (const group of results) {
        const status = await getUserJoinRequestStatus(group.id, user.id);
        statuses[group.id] = status;
      }
      setGroupRequestStatus(statuses);
    } catch (error) {
      console.error('Error searching groups:', error);
    } finally {
      setSearchingGroups(false);
    }
  };

  const handleJoinRequest = async (groupId) => {
    try {
      await sendJoinRequest(groupId, user.id);
      setGroupRequestStatus({ ...groupRequestStatus, [groupId]: 'pending' });
      toast.success('Join request sent');
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  const handleCancelRequest = async (groupId) => {
    try {
      await cancelJoinRequest(groupId, user.id);
      setGroupRequestStatus({ ...groupRequestStatus, [groupId]: 'cancelled' });
      toast.success('Request cancelled');
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderChatItem = (chat) => {
    const otherUser = chat.otherUserDetails;
    
    if (!otherUser || !otherUser.username) {
      return null;
    }
    
    const initials = otherUser.username.slice(0, 2).toUpperCase();
    const isBlocked = chat.status === 'blocked';
    const hasAutoDelete = chatSettings[chat.chatId]?.autoDelete;
    // Don't show unread for deleted messages
    const isDeletedMessage = isDeletedListPreview(chat.lastMessage);
    const hasUnread = chat.unreadCount > 0 && !isBlocked && !isDeletedMessage;
    const displayMessage = previewFromLastMessageString(
      chat.lastMessage,
      isBlocked,
      false
    );

    return (
      <button
        key={chat.chatId}
        onClick={() => handleChatClick(chat.otherUser, otherUser)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          isBlocked 
            ? 'bg-neutral-50/50 dark:bg-neutral-800/50 dark:bg-black/50 opacity-60'
            : hasUnread
              ? 'bg-[#0095F6]/5 dark:bg-[#0095F6]/10 bg-[#0095F6]/10 border-[#0095F6]/30 dark:border-[#0095F6]/30 discuss:border-[#EF4444]/30'
              : 'bg-white hover:bg-neutral-50 dark:bg-black dark:hover:bg-neutral-950'
        } ${hasUnread ? 'bg-blue-50/70 dark:bg-blue-950/20' : ''}`}
      >
        <div className="relative shrink-0">
          <UserAvatar
            src={otherUser.photo_url}
            username={otherUser.username}
            className="w-12 h-12"
          />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <span className={`font-semibold text-sm truncate ${hasUnread ? 'text-neutral-900 dark:text-white dark:text-white' : 'text-neutral-900 dark:text-neutral-50 dark:text-white'}`}>
                <span>@{otherUser.username}</span>
              </span>
              {otherUser.verified && <VerifiedBadge size="sm" />}
              {hasAutoDelete && (
                <span className="bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title="Auto-delete enabled (24h)">
                  <Timer className="w-2.5 h-2.5" />
                  <span>24h</span>
                </span>
              )}
            </div>
            <span className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 text-xs shrink-0">
              <span>{formatTime(chat.lastMessageTime)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className={`text-xs truncate ${isDeletedMessage ? 'italic text-neutral-400 dark:text-neutral-500' : ''} ${hasUnread ? 'text-neutral-900 dark:text-neutral-200 dark:text-neutral-200 font-medium' : 'text-neutral-500 dark:text-neutral-400 dark:text-neutral-400'}`}>
              {displayMessage}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderGroupItem = (group) => {
    const isDeleted = group.status === GROUP_STATUS.DELETED;
    // Don't show unread for deleted messages
    const isDeletedMessage = isDeletedListPreview(group.lastMessage);
    const hasUnread = group.unreadCount > 0 && !isDeleted && !isDeletedMessage;
    const initials = group.groupName?.slice(0, 2).toUpperCase() || 'GR';
    const displayMessage = previewFromLastMessageString(
      group.lastMessage,
      false,
      isDeleted
    );

    return (
      <button
        key={group.groupId}
        onClick={() => handleGroupClick(group.groupId, group)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          isDeleted 
            ? 'bg-neutral-50/50 dark:bg-neutral-800/50 dark:bg-black/50 opacity-60'
            : hasUnread
              ? 'bg-[#0095F6]/5 dark:bg-[#0095F6]/10 bg-[#0095F6]/10 border-[#0095F6]/30 dark:border-[#0095F6]/30 discuss:border-[#EF4444]/30'
              : 'bg-white hover:bg-neutral-50 dark:bg-black dark:hover:bg-neutral-950'
        } ${hasUnread ? 'bg-blue-50/70 dark:bg-blue-950/20' : ''}`}
      >
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          {hasUnread && (
            <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm">
              {group.unreadCount > 99 ? '99+' : group.unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`font-semibold text-sm truncate ${hasUnread ? 'text-neutral-900 dark:text-white dark:text-white' : 'text-neutral-900 dark:text-neutral-50 dark:text-white'}`}>
                <span>{group.groupName}</span>
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-purple-100 dark:bg-purple-900/30 discuss:bg-purple-900/30 text-purple-700 dark:text-purple-300 discuss:text-purple-300"
                style={document.documentElement.classList.contains('discuss-black')
                  ? { backgroundColor: 'rgba(112,0,255,0.18)', color: '#C084FC' }
                  : {}}
              >
                <span>Group Chat</span>
              </span>
            </div>
            <span className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 text-xs shrink-0">
              <span>{formatTime(group.lastMessageTime || group.joinedAt)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className={`text-xs truncate ${isDeletedMessage ? 'italic text-neutral-400 dark:text-neutral-500' : ''} ${hasUnread ? 'text-neutral-900 dark:text-neutral-200 dark:text-neutral-200 font-medium' : 'text-neutral-500 dark:text-neutral-400 dark:text-neutral-400'}`}>
              {displayMessage}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderFriendItem = (friend) => {
    const initials = (friend.username || 'U').slice(0, 2).toUpperCase();

    return (
      <button
        key={friend.id}
        onClick={() => handleStartNewChat(friend.id)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-neutral-50 dark:bg-black dark:hover:bg-neutral-950 transition-colors"
      >
        <UserAvatar
          src={friend.photo_url}
          username={friend.username}
          className="w-12 h-12 shrink-0"
        />
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-neutral-900 dark:text-neutral-50 dark:text-white text-sm truncate">
              <span>@{friend.username}</span>
            </span>
            {friend.verified && <VerifiedBadge size="sm" />}
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 text-xs">
            <span>Friends since {new Date(friend.since).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
          </p>
        </div>

        <MessageSquarePlus className="w-5 h-5 text-[#0095F6] text-[#0095F6] shrink-0" />
      </button>
    );
  };

  // Combine and sort chats and groups by last message time
  const combinedChatsAndGroups = [
    ...chats.map(c => ({ ...c, type: 'chat' })),
    ...groups.map(g => ({ ...g, type: 'group' }))
  ].sort((a, b) => {
    const timeA = new Date(a.lastMessageTime || a.joinedAt || 0);
    const timeB = new Date(b.lastMessageTime || b.joinedAt || 0);
    return timeB - timeA;
  });

  const displayData = searchQuery.trim() 
    ? searchResults 
    : (activeTab === 'chats' ? combinedChatsAndGroups : friends);

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0) + 
                      groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-28 text-neutral-950 dark:text-white">
      <Header />
      
      <div className="mx-auto w-full max-w-[1180px] px-0 pb-32 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,680px)] lg:justify-center">
          <Sidebar />
          <main className="min-w-0 border-x border-neutral-200 dark:border-neutral-800">
        {/* Header with three-dot menu */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-5 dark:border-neutral-800">
          <button
            onClick={() => navigate('/feed')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-50 dark:text-white flex-1">
            <span>Messages</span>
          </h1>
          
          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900">
                <MoreVertical className="w-5 h-5" />
                {pendingGroupRequests > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-neutral-50 dark:border-neutral-900 discuss:border-[#121212]"></span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setCreateGroupOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                <span>Create Group</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchGroupsOpen(true)}>
                <Globe className="w-4 h-4 mr-2" />
                <span>Search Public Groups</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/join-requests')} className="relative">
                <Inbox className="w-4 h-4 mr-2" />
                <span>View / Manage Requests</span>
                {pendingGroupRequests > 0 && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <div className="mx-4 mt-4 flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
          <button
            onClick={() => { setActiveTab('chats'); setSearchQuery(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[13px] font-semibold transition-all ${
              activeTab === 'chats'
                ? 'bg-[#0095F6] bg-[#0095F6] text-white shadow-button'
                : 'text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white dark:hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chats</span>
            {totalUnread > 0 && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('friends'); setSearchQuery(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[13px] font-semibold transition-all ${
              activeTab === 'friends'
                ? 'bg-[#0095F6] bg-[#0095F6] text-white shadow-button'
                : 'text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
            <span className="bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#333333] text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 text-[10px] px-1.5 py-0.5 rounded-full">
              {friends.length}
            </span>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 dark:text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'chats' ? 'Search chats and groups...' : 'Search friends...'}
              className="h-11 rounded-xl border-transparent bg-neutral-100 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-[#0095F6]/30 focus:bg-white dark:bg-neutral-900 dark:text-white dark:focus:bg-black"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2 py-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 mb-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0095F6] text-[#0095F6]" />
              <span>{activeTab === 'chats' ? 'Syncing chats…' : 'Loading friends…'}</span>
            </p>
            {(activeTab === 'chats' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4]).map((i) => (
              <div
                key={i}
                className="w-full flex items-center gap-3 p-3 rounded-[12px] bg-white dark:bg-neutral-800 dark:bg-black border border-neutral-200 dark:border-neutral-700 dark:border-[#262626] animate-pulse"
              >
                <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] rounded" />
                  <div className="h-2 w-2/3 bg-neutral-100 dark:bg-neutral-600 dark:bg-[#1A1A1A] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : displayData.length === 0 ? (
          <div className="px-6 py-20 text-center">
            {searchQuery ? (
              <>
                <Search className="w-10 h-10 text-neutral-400 dark:text-neutral-500 dark:text-neutral-400 mx-auto mb-3" />
                <h3 className="text-neutral-900 dark:text-neutral-50 dark:text-white font-semibold mb-1">
                  <span>No results found</span>
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 text-sm">
                  <span>Try a different search term</span>
                </p>
              </>
            ) : activeTab === 'chats' ? (
              <>
                <MessageCircle className="w-10 h-10 text-neutral-400 dark:text-neutral-500 dark:text-neutral-400 mx-auto mb-3" />
                <h3 className="text-neutral-900 dark:text-neutral-50 dark:text-white font-semibold mb-1">
                  <span>No chats yet</span>
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 text-sm mb-4">
                  <span>Start a conversation with friends or create a group</span>
                </p>
                <div className="flex gap-2 justify-center">
                  {friends.length > 0 && (
                    <Button
                      onClick={() => setActiveTab('friends')}
                      className="bg-[#0095F6] bg-[#0095F6] hover:bg-[#1877F2] hover:bg-[#1877F2] text-white rounded-[6px] shadow-button"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      <span>View Friends</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => setCreateGroupOpen(true)}
                    variant="outline"
                    className="border-neutral-200 dark:border-neutral-700 dark:border-[#262626] rounded-[6px]"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span>Create Group</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Users className="w-10 h-10 text-neutral-400 dark:text-neutral-500 dark:text-neutral-400 mx-auto mb-3" />
                <h3 className="text-neutral-900 dark:text-neutral-50 dark:text-white font-semibold mb-1">
                  <span>No friends yet</span>
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 text-sm mb-4">
                  <span>Find people to connect with</span>
                </p>
                <Button
                  onClick={() => navigate('/profile')}
                  className="bg-[#0095F6] bg-[#0095F6] hover:bg-[#1877F2] hover:bg-[#1877F2] text-white rounded-[6px] shadow-button"
                >
                  <span>Find Friends</span>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {activeTab === 'chats'
              ? displayData.map(item => 
                  item.type === 'group' 
                    ? renderGroupItem(item) 
                    : renderChatItem(item)
                ).filter(Boolean)
              : displayData.map(renderFriendItem).filter(Boolean)
            }
          </div>
        )}
          </main>
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        userId={user?.id}
        onGroupCreated={handleGroupCreated}
      />

      {/* Search Public Groups Dialog */}
      <Dialog open={searchGroupsOpen} onOpenChange={setSearchGroupsOpen}>
        <DialogContent className="sm:max-w-[500px] overflow-hidden rounded-3xl border-neutral-200 bg-white p-0 dark:border-neutral-800 dark:bg-black">
          <DialogHeader>
            <DialogTitle className="text-neutral-900 dark:text-neutral-50 dark:text-white">
              Search Public Groups
            </DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400">
              Find and join public groups
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                value={groupSearchQuery}
                onChange={(e) => {
                  setGroupSearchQuery(e.target.value);
                  handleSearchGroups(e.target.value);
                }}
                placeholder="Search groups..."
                className="pl-10 bg-white dark:bg-neutral-800 dark:bg-black"
              />
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {searchingGroups ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0095F6] text-[#0095F6]" />
                </div>
              ) : publicGroups.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  {groupSearchQuery ? 'No groups found' : 'Type to search public groups'}
                </div>
              ) : (
                publicGroups.map(group => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between border-b border-neutral-200 px-4 py-3.5 last:border-0 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {group.name?.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-50 dark:text-white">
                          {group.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {group.memberCount || 0} members
                        </p>
                      </div>
                    </div>
                    
                    {groupRequestStatus[group.id] === 'pending' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelRequest(group.id)}
                        className="text-xs"
                      >
                        Cancel Request
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleJoinRequest(group.id)}
                        className="bg-[#0095F6] bg-[#0095F6] text-white text-xs"
                      >
                        Request to Join
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
