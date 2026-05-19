import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUser } from '@/lib/db';
import {
  getGroupInfo, getGroupMembers, sendGroupMessage, subscribeToGroupMessages,
  markGroupMessagesAsRead, deleteGroupMessageForMe, deleteGroupMessageForEveryone,
  isGroupMember, isGroupAdmin, GROUP_STATUS, getDeletedGroupMessages, getUserGroups,
} from '@/lib/groupsDb';
import {
  getCachedGroupMessages,
  cacheGroupMessages,
  removeGroupMessageFromCaches,
  patchGroupMessageDeletedInCaches,
} from '@/lib/cacheManager';
import {
  DELETED_MESSAGE_PREVIEW,
  isDeletedForEveryone,
  replyPreviewText,
} from '@/lib/chatMessageUtils';
import Header from '@/components/Header';
import ChatLinkText from '@/components/ChatLinkText';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Info, Loader2, Copy, Reply, Trash2, MoreVertical, X, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { notifyTelegramGroupMessage } from '@/lib/telegramService';
import { notifyDiscordGroupMessage } from '@/lib/discordService';
import MediaUpload from '@/components/MediaUpload';
import FullscreenMedia from '@/components/FullscreenMedia';
import { IoImage, IoVideocam, IoLocationSharp } from 'react-icons/io5';
import { Check, MapPin } from 'lucide-react';
import LocationMessage from '@/components/LocationMessage';

export default function GroupConversationPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userDetails, setUserDetails] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);
  const [userJoinTime, setUserJoinTime] = useState(null);
  const [deletedMessageIds, setDeletedMessageIds] = useState([]);
  const [liveMessagesSynced, setLiveMessagesSynced] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [pendingMedia, setPendingMedia] = useState([]);
  const [messageLimit, setMessageLimit] = useState(50);
  const [loadingOld, setLoadingOld] = useState(false);
  const [hasMoreOld, setHasMoreOld] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesCountRef = useRef(0);
  useEffect(() => {
    messagesCountRef.current = messages.length;
  }, [messages.length]);

  // Optimistic UI, expanded and forwarding states
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardTargets, setForwardTargets] = useState({ chats: [], groups: [] });
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);

  const clearAllHighlights = useCallback(() => {
    Object.values(messageRefs.current).forEach(element => {
      if (element) {
        element.classList.remove('ring-2', 'ring-[#2563EB]', 'ring-opacity-50', 'highlight-message');
      }
    });
  }, []);

  const handleScroll = useCallback((e) => {
    const container = e.currentTarget;
    
    // Check if we should show the scroll-to-bottom button
    const isFar = container.scrollHeight - container.scrollTop - container.clientHeight > 300;
    setShowScrollDown(isFar);

    if (container.scrollTop === 0 && !loadingOld && hasMoreOld && liveMessagesSynced) {
      setLoadingOld(true);
      setTimeout(() => {
        setMessageLimit((prev) => Math.min(prev + 50, 100000));
      }, 800);
    }
  }, [loadingOld, hasMoreOld, liveMessagesSynced]);

  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', clearAllHighlights);
      return () => container.removeEventListener('scroll', clearAllHighlights);
    }
  }, [clearAllHighlights]);

  useEffect(() => {
    if (showForwardModal && user?.id) {
      (async () => {
        try {
          const { getChatsWithUserDetails } = await import('@/lib/chatsDb');
          const chats = await getChatsWithUserDetails(user.id);
          const groups = await getUserGroups(user.id);
          setForwardTargets({ chats, groups });
        } catch (error) {
          console.error('Error loading forward targets:', error);
        }
      })();
    }
  }, [showForwardModal, user?.id]);

  const handleForwardToTarget = async (targetId, type) => {
    if (!selectedMessage) return;
    try {
      const originalSender = selectedMessage.originalSender || selectedMessage.sender;
      const forwardedInfo = { originalSender };
      
      if (type === 'dm') {
        const { sendMessage } = await import('@/lib/chatsDb');
        await sendMessage(targetId, user.id, selectedMessage.text || '', selectedMessage.media || [], null, forwardedInfo);
      } else {
        await sendGroupMessage(targetId, user.id, selectedMessage.text || '', null, selectedMessage.media || [], null, forwardedInfo);
      }
      
      toast.success('Message forwarded successfully!');
      setShowForwardModal(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error(error.message || 'Failed to forward message');
    }
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messageRefs = useRef({});
  const membershipCheckRef = useRef(null);
  const joinTimeRef = useRef(null);
  const deletedIdsRef = useRef([]);

  useEffect(() => {
    deletedIdsRef.current = deletedMessageIds;
  }, [deletedMessageIds]);

  useEffect(() => {
    joinTimeRef.current = userJoinTime;
  }, [userJoinTime]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToMessage = useCallback((messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight-message');
      setTimeout(() => messageElement.classList.remove('highlight-message'), 2000);
    }
  }, []);

  // Check membership status and update immediately
  const checkMembershipStatus = useCallback(async () => {
    if (!user?.id || !groupId) return;
    
    const memberStatus = await isGroupMember(groupId, user.id);
    setIsMember(memberStatus);
    
    if (memberStatus) {
      const adminStatus = await isGroupAdmin(groupId, user.id);
      setIsAdmin(adminStatus);
    } else {
      setIsAdmin(false);
    }
  }, [user?.id, groupId]);

  useEffect(() => {
    if (!user?.id || !groupId) return;

    setLiveMessagesSynced(false);
    let cancelled = false;
    const unsubscribeRef = { current: null };

    const loadGroupData = async () => {
      try {
        await checkMembershipStatus();

        const info = await getGroupInfo(groupId);
        setGroupInfo(info);

        if (!info) {
          setLoading(false);
          setLiveMessagesSynced(true);
          return;
        }

        const membersList = await getGroupMembers(groupId);
        setMembers(membersList);

        const details = {};
        for (const member of membersList) {
          try {
            const userData = await getUser(member.userId);
            if (userData) details[member.userId] = userData;
          } catch (err) {
            console.error('Error loading user:', err);
          }
        }
        setUserDetails(details);

        const userGroupRef = (await import('@/lib/firebaseFourth')).ref;
        const fourthDatabase = (await import('@/lib/firebaseFourth')).fourthDatabase;
        const fourthGet = (await import('@/lib/firebaseFourth')).get;
        
        // Handle case where fourth database is not initialized
        if (!fourthDatabase) {
          setLoading(false);
          setLiveMessagesSynced(true);
          return;
        }

        const userGroupSnap = await fourthGet(
          userGroupRef(fourthDatabase, `userGroups/${user.id}/${groupId}`)
        );
        const jt = userGroupSnap.exists() ? userGroupSnap.val().joinedAt : null;
        joinTimeRef.current = jt;
        setUserJoinTime(jt);

        const deletedIds = await getDeletedGroupMessages(user.id, groupId);
        setDeletedMessageIds(deletedIds);
        deletedIdsRef.current = deletedIds;

        const cachedMessages = await getCachedGroupMessages(user.id, groupId);
        if (cachedMessages?.length > 0) {
          const filteredCache = cachedMessages.filter((msg) => {
            if (deletedIds.includes(msg.id)) return false;
            if (!jt) return true;
            return new Date(msg.timestamp) >= new Date(jt);
          });
          setMessages(filteredCache);
        }

        await markGroupMessagesAsRead(groupId, user.id);

        if (cancelled) return;

        const unsub = subscribeToGroupMessages(groupId, async (newMessages) => {
          const memberStatus = await isGroupMember(groupId, user.id);
          setIsMember(memberStatus);

          if (memberStatus) {
            const adminStatus = await isGroupAdmin(groupId, user.id);
            setIsAdmin(adminStatus);

            const jtNow = joinTimeRef.current;
            const delSet = new Set(deletedIdsRef.current);
            const filtered = newMessages.filter((msg) => {
              if (delSet.has(msg.id)) return false;
              if (!jtNow) return true;
              return new Date(msg.timestamp) >= new Date(jtNow);
            });

            // Measure scroll height before state update
            const container = messagesContainerRef.current;
            const scrollHeightBefore = container ? container.scrollHeight : 0;
            const scrollTopBefore = container ? container.scrollTop : 0;

            setMessages(filtered);

            if (filtered.length < messageLimit) {
              setHasMoreOld(false);
            } else {
              setHasMoreOld(true);
            }

            await cacheGroupMessages(user.id, groupId, filtered);
            setLiveMessagesSynced(true);
            await markGroupMessagesAsRead(groupId, user.id);
            setLoadingOld(false);

            // Adjust scroll position if we prepended older messages
            if (container && scrollHeightBefore > 0 && scrollTopBefore === 0 && filtered.length > messagesCountRef.current) {
              setTimeout(() => {
                const diff = container.scrollHeight - scrollHeightBefore;
                container.scrollTop = diff;
              }, 0);
            }
          } else {
            setIsAdmin(false);
            setLiveMessagesSynced(true);
          }
        }, messageLimit);
        if (cancelled) {
          unsub();
        } else {
          unsubscribeRef.current = unsub;
        }
      } catch (error) {
        console.error('Error loading group data:', error);
        toast.error('Failed to load group');
        setLiveMessagesSynced(true);
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();

    membershipCheckRef.current = setInterval(checkMembershipStatus, 2000);

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (membershipCheckRef.current) {
        clearInterval(membershipCheckRef.current);
      }
    };
  }, [user?.id, groupId, checkMembershipStatus, messageLimit]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);
 
  const handleSendMessage = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!messageText.trim() && pendingMedia.length === 0) return;
    
    const text = messageText.trim();
    const hasMedia = pendingMedia.length > 0;
    const currentReplyTo = replyTo;

    // 1. Instantly reset inputs/state for instant feel (0ms lag)
    setMessageText('');
    setReplyTo(null);
    setPendingMedia([]);
    setShowMediaUpload(false);
    if (inputRef.current) {
      inputRef.current.style.height = '40px';
      inputRef.current.style.overflowY = 'hidden';
    }

    // 2. Generate and add the optimistic message to state instantly!
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      sender: user.id,
      text,
      timestamp: new Date().toISOString(),
      type: 'message',
      media: pendingMedia || [],
      location: null,
      replyTo: currentReplyTo ? {
        id: currentReplyTo.id,
        text: currentReplyTo.text?.substring(0, 100) || '',
        sender: currentReplyTo.sender
      } : null
    };

    setOptimisticMessages(prev => [...prev, optimisticMsg]);

    // 3. Dispatch the database write completely in the background without blocking the UI
    (async () => {
      try {
        await sendGroupMessage(groupId, user.id, text, currentReplyTo, pendingMedia);
        
        // Background notification sending
        const groupName = groupInfo?.name || 'Group';
        const senderName = user?.username || 'Someone';
        members
          .filter(m => m.userId !== user.id)
          .forEach(m => {
            notifyTelegramGroupMessage(m.userId, groupName, senderName, text, hasMedia).catch(() => {});
            notifyDiscordGroupMessage(m.userId, groupName, senderName, text, hasMedia).catch(() => {});
          });

        // Remove from optimistic list since it's successfully written
        setOptimisticMessages(prev => prev.filter(om => om.id !== tempId));
      } catch (error) {
        console.error('Error sending message:', error);
        // Put the message back in the input box so they don't lose it if it actually failed!
        setMessageText(text);
        toast.error(error.message || 'Failed to send message');
        // Clean up this optimistic message since it failed
        setOptimisticMessages(prev => prev.filter(om => om.id !== tempId));
      }
    })();

    // Always keep focus in input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setSending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await sendGroupMessage(groupId, user.id, '', null, [], { latitude, longitude });
          toast.success('Location sent');
          scrollToBottom();
        } catch (error) {
          console.error('Error sending location:', error);
          toast.error(error.message || 'Failed to send location');
        } finally {
          setSending(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let msg = 'Failed to get your location';
        if (error.code === 1) msg = 'Location permission denied';
        toast.error(msg);
        setSending(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleReply = (message) => {
    setReplyTo(message);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied');
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete || !user?.id) return;

    try {
      if (deleteForEveryone) {
        await deleteGroupMessageForEveryone(groupId, messageToDelete.id, user.id);
        await patchGroupMessageDeletedInCaches(user.id, groupId, messageToDelete.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageToDelete.id
              ? { ...m, deleted: true, text: 'This message was deleted' }
              : m
          )
        );
        toast.success('Message deleted for everyone');
      } else {
        await deleteGroupMessageForMe(groupId, messageToDelete.id, user.id);
        await removeGroupMessageFromCaches(user.id, groupId, messageToDelete.id);
        setDeletedMessageIds((prev) => [...prev, messageToDelete.id]);
        deletedIdsRef.current = [...deletedIdsRef.current, messageToDelete.id];
        setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error.message || 'Failed to delete message');
    } finally {
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      setDeleteForEveryone(false);
    }
  };

  useEffect(() => {
    if (!loading && messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, liveMessagesSynced]);

  const openDeleteDialog = (message, forEveryone = false) => {
    setMessageToDelete(message);
    setDeleteForEveryone(forEveryone);
    setDeleteDialogOpen(true);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const groupMessagesByDate = (list) => {
    const grouped = {};
    list.forEach((msg) => {
      const date = formatDate(msg.timestamp);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    return grouped;
  };

  const combinedMessages = useMemo(() => {
    const filteredOptimistic = optimisticMessages.filter(om => {
      const omTime = new Date(om.timestamp).getTime();
      return !messages.some(m => 
        m.sender === om.sender && 
        m.text === om.text && 
        Math.abs(new Date(m.timestamp).getTime() - omTime) < 8000
      );
    });
    return [...messages, ...filteredOptimistic];
  }, [messages, optimisticMessages]);

  const messageById = useMemo(
    () => Object.fromEntries(combinedMessages.map((m) => [m.id, m])),
    [combinedMessages]
  );

  const groupedMessages = useMemo(() => groupMessagesByDate(combinedMessages), [combinedMessages]);

  const renderMessage = (message) => {
    const isOwn = message.sender === user.id;
    const senderDetails = userDetails[message.sender];
    const isSystemMessage = message.type === 'system';

    if (isSystemMessage) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div
            className="bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] px-4 py-2 rounded-full max-w-[80%]"
            style={document.documentElement.classList.contains('discuss-black')
              ? { backgroundColor: 'rgba(255,0,127,0.1)', borderColor: 'rgba(255,0,127,0.2)' }
              : {}}
          >
            <p
              className="text-xs text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] text-center"
              style={document.documentElement.classList.contains('discuss-black') ? { color: '#C8C8E0' } : {}}
            >{message.text}</p>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} ref={(el) => (messageRefs.current[message.id] = el)} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 message-item`}>
        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && (
            <div className="flex items-center gap-1 mb-1 ml-1">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">@{senderDetails?.username || 'User'}</span>
              {senderDetails?.verified && <VerifiedBadge size="xs" />}
            </div>
          )}
          
          <div className="relative group">
            <div className={`rounded-[16px] px-4 py-2.5 ${isOwn ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white' : 'bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333]'}`}>
              {message.replyTo && (
                <button onClick={() => scrollToMessage(message.replyTo.id)} className={`mb-2 p-2 rounded-[8px] border-l-2 text-left w-full ${isOwn ? 'bg-white/10 border-white/30' : 'bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] border-neutral-300 dark:border-neutral-600 discuss:border-[#404040]'}`}>
                  <p className={`text-[10px] font-semibold mb-0.5 ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>@{userDetails[message.replyTo.sender]?.username || 'User'}</p>
                  <p className={`text-xs truncate ${isOwn ? 'text-white/90' : 'text-neutral-600 dark:text-neutral-300'}`}>
                    {replyPreviewText(message.replyTo, messageById)}
                  </p>
                </button>
              )}

              {/* Media Content */}
              {message.media?.length > 0 && !isDeletedForEveryone(message) && (
                <div className={`grid gap-1 mb-2 ${message.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {message.media.slice(0, 2).map((item, i) => {
                    const isLastVisible = i === 1;
                    const remainingCount = message.media.length - 2;
                    return (
                      <div 
                        key={i} 
                        className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                        onClick={() => {
                          setFullscreenMedia(message.media);
                          setShowFullscreen(true);
                        }}
                      >
                        {item.type === 'video' || item.url?.includes('video') ? (
                          <video src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.thumbnail || item.url} alt="group media" className="w-full h-full object-cover" />
                        )}
                        {isLastVisible && remainingCount > 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">+{remainingCount}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {message.location && (
                <div className="mb-2">
                  <LocationMessage location={message.location} isOwn={isOwn} />
                </div>
              )}

              {message.forwarded && message.originalSender && message.originalSender !== message.sender && (
                <div className={`flex items-center gap-1 text-[10px] opacity-75 mb-1 italic ${isOwn ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]'}`}>
                  <Reply className="w-3 h-3 transform scale-x-[-1]" />
                  <span>Forwarded</span>
                </div>
              )}

              {isDeletedForEveryone(message) ? (
                <p className="text-sm whitespace-pre-wrap break-words italic opacity-60">
                  <em>{DELETED_MESSAGE_PREVIEW}</em>
                </p>
              ) : (
                message.text && (() => {
                  const lines = message.text.split('\n');
                  const hasMore = lines.length > 8;
                  const isExpanded = expandedMessages[message.id];
                  const displayText = hasMore && !isExpanded 
                    ? lines.slice(0, 8).join('\n') 
                    : message.text;

                  return (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      <ChatLinkText text={displayText} isOwn={isOwn} />
                      {hasMore && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMessages(prev => ({ ...prev, [message.id]: !prev[message.id] }));
                          }}
                          className={`font-semibold text-xs ml-1 hover:underline focus:outline-none ${isOwn ? 'text-blue-100 hover:text-white underline' : 'text-blue-600 dark:text-blue-400'}`}
                        >
                          {isExpanded ? 'Less' : '... More'}
                        </button>
                      )}
                    </div>
                  );
                })()
              )}
              <div className="flex items-center justify-end gap-1 mt-1">
                <p className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-neutral-400 dark:text-neutral-500'}`}>
                  {formatTime(message.timestamp)}
                </p>
                {isOwn && (
                  <Check className={`w-3 h-3 ${message.read ? 'text-blue-300' : 'text-white/40'}`} />
                )}
              </div>
            </div>

            {!isDeletedForEveryone(message) && isMember && (
              <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] mx-2">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                    <DropdownMenuItem onClick={() => handleReply(message)}><Reply className="w-4 h-4 mr-2" />Reply</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopy(message.text)} disabled={isDeletedForEveryone(message)}><Copy className="w-4 h-4 mr-2" />Copy</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedMessage(message);
                      setShowForwardModal(true);
                    }} disabled={isDeletedForEveryone(message)}><Send className="w-4 h-4 mr-2 transform rotate-45" />Forward</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDeleteDialog(message, false)}><Trash2 className="w-4 h-4 mr-2" />Delete for Me</DropdownMenuItem>
                    {isOwn && !isDeletedForEveryone(message) && (
                      <DropdownMenuItem onClick={() => openDeleteDialog(message, true)} className="text-red-600 dark:text-red-400"><Trash2 className="w-4 h-4 mr-2" />Delete for Everyone</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212]">
        <Header />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] discuss:text-[#EF4444] mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm">Loading group chat...</p>
        </div>
      </div>
    );
  }

  const canSendMessages = isMember && (!groupInfo?.settings?.adminOnlyMessaging || isAdmin);
  const isAdminOnlyMode = groupInfo?.settings?.adminOnlyMessaging;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212] flex flex-col">
      <Header />
      
      <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/chat')} className="p-2 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] transition-colors">
              <ArrowLeft className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">{groupInfo?.name || 'Group'}</h1>
                <span
                  className="bg-[#2563EB]/10 discuss:bg-[#EF4444]/10 text-[#2563EB] discuss:text-[#EF4444] text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={document.documentElement.classList.contains('discuss-black')
                    ? { backgroundColor: 'rgba(255,0,127,0.15)', color: '#FF007F' }
                    : {}}
                >Group Chat</span>
                {groupInfo?.settings?.autoDelete24h && <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" title="24h auto-delete enabled"><Clock className="w-3 h-3" />24h</span>}
                {isAdminOnlyMode && <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full" title="Admin-only messaging">Admin Only</span>}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">{members.length} members</p>
            </div>
          </div>
          <button onClick={() => navigate(`/group/${groupId}/info`)} className="p-2 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] transition-colors">
            <Info className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        onClick={clearAllHighlights}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide" 
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        <div className="max-w-2xl mx-auto">
          {loadingOld && (
            <div className="flex items-center justify-center py-2 gap-2 text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
              <span>Loading old messages, please wait...</span>
            </div>
          )}

          {!isMember && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 discuss:bg-amber-950/30 border border-amber-200 dark:border-amber-800 discuss:border-amber-800 rounded-[12px] p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">You are no longer part of this group</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">You can view old messages but cannot send new ones</p>
                </div>
              </div>
            </div>
          )}

          {!liveMessagesSynced && messages.length === 0 && (
            <div className="space-y-3 py-4" aria-hidden>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                >
                  <div className="h-11 w-[58%] max-w-sm rounded-2xl bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {liveMessagesSynced && messages.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-[12px] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333]">
              <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">No messages yet</p>
            </div>
          ) : messages.length > 0 ? (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex justify-center my-4">
                  <div
                    className="bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] px-3 py-1 rounded-full"
                    style={document.documentElement.classList.contains('discuss-black')
                      ? { backgroundColor: 'rgba(255,0,127,0.1)' }
                      : {}}
                  >
                    <p
                      className="text-xs text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] font-medium"
                      style={document.documentElement.classList.contains('discuss-black') ? { color: '#C8C8E0' } : {}}
                    >{date}</p>
                  </div>
                </div>
                {dateMessages.map(renderMessage)}
              </div>
            ))
          ) : null}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollDown && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-28 right-6 p-2.5 rounded-full bg-white dark:bg-neutral-800 discuss:bg-[#262626] text-[#2563EB] dark:text-neutral-200 discuss:text-[#EF4444] shadow-lg border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] hover:scale-110 active:scale-95 transition-all z-10 animate-bounce"
          style={document.documentElement.classList.contains('discuss-black')
            ? { backgroundColor: '#1A1A24', borderColor: 'rgba(255, 0, 127, 0.3)', color: '#FF007F' }
            : {}}
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {canSendMessages ? (
        <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-t border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] px-4 py-3">
          <div className="max-w-2xl mx-auto">
            {replyTo && (
              <div className="mb-2 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] p-2 rounded-[8px] border-l-2 border-[#2563EB] discuss:border-[#EF4444]">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2563EB] discuss:text-[#EF4444]">Replying to @{userDetails[replyTo.sender]?.username || 'User'}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] truncate">{replyPreviewText(replyTo, messageById)}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="ml-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 discuss:hover:bg-[#333333] rounded"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            {showMediaUpload && (
              <div className="mb-2">
                <MediaUpload 
                  multiple 
                  maxFiles={5}
                  folder="group_chats" 
                  onUploadComplete={(result) => {
                    const newMedia = Array.isArray(result) ? result : [result];
                    setPendingMedia(prev => {
                      const combined = [...prev, ...newMedia];
                      if (combined.length > 5) {
                        toast.error('You can only attach up to 5 files per message.');
                        return combined.slice(0, 5);
                      }
                      return combined;
                    });
                    setShowMediaUpload(false);
                  }} 
                />
              </div>
            )}

            {pendingMedia.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] rounded-lg">
                {pendingMedia.map((m, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden group border border-neutral-200 dark:border-neutral-700">
                    {m.format === 'mp4' || m.url?.includes('video') ? (
                      <video src={m.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.thumbnail || m.url} alt="media" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingMedia(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                className={`p-2 rounded-lg transition-colors ${showMediaUpload ? 'bg-[#2563EB] text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-500'}`}
              >
                <IoImage size={22} />
              </button>
              <button
                type="button"
                onClick={handleSendLocation}
                disabled={sending || (isAdminOnlyMode && !isAdmin)}
                className={`p-2 rounded-lg transition-colors ${sending ? 'opacity-50' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-500'}`}
                title="Send Location"
              >
                <IoLocationSharp size={22} />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  e.target.style.height = 'auto';
                  const computedHeight = e.target.scrollHeight;
                  if (computedHeight > 130) {
                    e.target.style.height = '130px';
                    e.target.style.overflowY = 'auto';
                  } else {
                    e.target.style.height = `${computedHeight}px`;
                    e.target.style.overflowY = 'hidden';
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={isAdminOnlyMode && !isAdmin ? "Only admins can send messages" : "Type a message..."}
                className="flex-1 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] border-0 text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] placeholder:text-neutral-400 rounded-2xl px-4 py-2.5 text-[14px] md:text-[15px] focus:outline-none resize-none max-h-[130px] input-textarea-scroll"
                style={{
                  height: '40px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                disabled={sending || (isAdminOnlyMode && !isAdmin)}
                maxLength={1000}
              />
              <Button type="submit" disabled={(!messageText.trim() && pendingMedia.length === 0 && !showMediaUpload) || (isAdminOnlyMode && !isAdmin)} className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white px-4">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-t border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] px-4 py-3">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{isAdminOnlyMode ? 'Only admins can send messages in this group' : 'You cannot send messages in this group'}</p>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>{deleteForEveryone ? 'This message will be deleted for everyone. This cannot be undone.' : 'This message will be deleted for you only.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showFullscreen && (
        <FullscreenMedia 
          media={fullscreenMedia} 
          onClose={() => setShowFullscreen(false)} 
        />
      )}

      {showForwardModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444] transform rotate-45" />
                Forward Message
              </h3>
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardSearch('');
                }}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333]">
              <input
                type="text"
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                placeholder="Search friends or groups..."
                className="w-full bg-neutral-100 dark:bg-neutral-900 discuss:bg-[#262626] border-0 text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] placeholder:text-neutral-400 rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            
            {/* Targets List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[45vh] scrollbar-hide">
              {/* Direct Chats */}
               <div>
                 <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Direct Chats</p>
                 {forwardTargets.chats.filter(c => 
                   c.otherUserDetails?.username?.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                   c.otherUserDetails?.fullName?.toLowerCase().includes(forwardSearch.toLowerCase())
                 ).length === 0 ? (
                   <p className="text-xs text-neutral-500 italic py-1">No chats found</p>
                 ) : (
                   <div className="space-y-2">
                     {forwardTargets.chats.filter(c => 
                       c.otherUserDetails?.username?.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                       c.otherUserDetails?.fullName?.toLowerCase().includes(forwardSearch.toLowerCase())
                     ).map(c => (
                       <div key={c.chatId} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 discuss:hover:bg-[#262626]/50">
                         <div className="flex items-center gap-2.5 min-w-0">
                           <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] flex items-center justify-center bg-neutral-100 text-xs">
                             {c.otherUserDetails?.username?.substring(0,2).toUpperCase()}
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] truncate">
                               {c.otherUserDetails?.fullName || c.otherUserDetails?.username}
                             </p>
                             <p className="text-[10px] text-neutral-400 truncate">@{c.otherUserDetails?.username}</p>
                           </div>
                         </div>
                         <button
                           onClick={() => handleForwardToTarget(c.chatId, 'dm')}
                           className="bg-[#2563EB]/10 hover:bg-[#2563EB] discuss:bg-[#EF4444]/10 discuss:hover:bg-[#EF4444] text-[#2563EB] hover:text-white discuss:text-[#EF4444] discuss:hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                         >
                           Forward
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               
               {/* Groups */}
               <div>
                 <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Groups</p>
                 {forwardTargets.groups.filter(g =>
                   g.groupName?.toLowerCase().includes(forwardSearch.toLowerCase())
                 ).length === 0 ? (
                   <p className="text-xs text-neutral-500 italic py-1">No groups found</p>
                 ) : (
                   <div className="space-y-2">
                     {forwardTargets.groups.filter(g =>
                       g.groupName?.toLowerCase().includes(forwardSearch.toLowerCase())
                     ).map(g => (
                       <div key={g.groupId} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 discuss:hover:bg-[#262626]/50">
                         <div className="flex items-center gap-2.5 min-w-0">
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DC2626] to-[#2563EB] flex items-center justify-center text-white text-xs font-bold font-mono">
                             G
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] truncate">
                               {g.groupName}
                             </p>
                             <p className="text-[10px] text-neutral-400 truncate">{g.groupType === 'public' ? '🌍 Public Group' : '🔒 Private Group'}</p>
                           </div>
                         </div>
                         <button
                           onClick={() => handleForwardToTarget(g.groupId, 'group')}
                           className="bg-[#2563EB]/10 hover:bg-[#2563EB] discuss:bg-[#EF4444]/10 discuss:hover:bg-[#EF4444] text-[#2563EB] hover:text-white discuss:text-[#EF4444] discuss:hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                         >
                           Forward
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .input-textarea-scroll::-webkit-scrollbar {
          display: none;
        }
      `}} />

      <style>{`
        .highlight-message { animation: highlight 2s ease-in-out; }
        @keyframes highlight { 0%, 100% { background-color: transparent; } 50% { background-color: rgba(37, 99, 235, 0.1); } }
        .message-item { transition: all 0.2s ease; }
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
