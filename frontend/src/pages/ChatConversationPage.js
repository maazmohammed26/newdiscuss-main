import UserAvatar from '@/components/UserAvatar';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { database, ref, onValue } from '@/lib/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUser } from '@/lib/db';
import { getUserProfile } from '@/lib/userProfileDb';
import { isChatEnabled, getRelationshipStatus, getRelationshipDetails, RELATIONSHIP_STATUS, unfollowFriend } from '@/lib/relationshipsDb';
import { 
  getOrCreateChat, 
  sendMessage, 
  subscribeToMessages, 
  markMessagesAsRead,
  toggleAutoDelete,
  deleteOldMessages,
  generateChatId,
  deleteChat,
  deleteMessageForMe,
  deleteMessageForEveryone,
  getDeletedMessages,
  sendReplyMessage,
  reportAndRestrictUser,
  runAutoDeleteCleanup,
  subscribeToChatSettings,
  CHAT_STATUS
} from '@/lib/chatsDb';
import {
  getCachedMessages,
  cacheMessages,
  clearDmThreadCaches,
  removeDmMessageFromCaches,
  patchDmMessageDeletedInCaches,
} from '@/lib/cacheManager';
import {
  replyPreviewText,
  DELETED_MESSAGE_PREVIEW,
  isDeletedForEveryone,
} from '@/lib/chatMessageUtils';
import Header from '@/components/Header';
import FriendRequestButton from '@/components/FriendRequestButton';
import VerifiedBadge from '@/components/VerifiedBadge';
import ChatLinkText from '@/components/ChatLinkText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, Send, Loader2, Lock, MoreVertical, Trash2, User, AlertTriangle, Clock, 
  Copy, X, Reply, Flag, Check, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { notifyChatMessage, isNotificationsEnabled } from '@/lib/pushNotificationService';
import { notifyTelegramDM } from '@/lib/telegramService';
import { notifyDiscordDM } from '@/lib/discordService';
import MediaUpload from '@/components/MediaUpload';
import FullscreenMedia from '@/components/FullscreenMedia';
import { IoImage, IoVideocam, IoLocationSharp } from 'react-icons/io5';
import { MapPin } from 'lucide-react';
import LocationMessage from '@/components/LocationMessage';

export default function ChatConversationPage() {
  const { otherUserId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesCountRef = useRef(0);
  const inputRef = useRef(null);
  const messageRefs = useRef({});

  const [otherUser, setOtherUser] = useState(null);
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [deletedMessageIds, setDeletedMessageIds] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatStatus, setChatStatus] = useState(CHAT_STATUS.ACTIVE);
  const [relationshipStatus, setRelationshipStatus] = useState(RELATIONSHIP_STATUS.NONE);
  const [unfollowedBy, setUnfollowedBy] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAutoDeleteConfirm, setShowAutoDeleteConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [chatCreated, setChatCreated] = useState(false);
  const [liveMessagesSynced, setLiveMessagesSynced] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const [loadingOld, setLoadingOld] = useState(false);
  const [hasMoreOld, setHasMoreOld] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  useEffect(() => {
    messagesCountRef.current = messages.length;
  }, [messages.length]);

  // Optimistic UI, expanded and forwarding states
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardTargets, setForwardTargets] = useState({ chats: [], groups: [] });
  const [forwardSearch, setForwardSearch] = useState('');
  const [recommendedUsers, setRecommendedUsers] = useState([]);

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
          const chats = await getChatsWithUserDetails(user.id);
          const { getUserGroups } = await import('@/lib/groupsDb');
          const groups = await getUserGroups(user.id);
          setForwardTargets({ chats, groups });

          const { getAllUsersForSearch } = await import('@/lib/relationshipsDb');
          const allUsers = await getAllUsersForSearch();
          const others = allUsers.filter(u => u.id !== user.id);
          setRecommendedUsers(others);
        } catch (error) {
          console.error('Error loading forward targets:', error);
        }
      })();
    }
  }, [showForwardModal, user?.id]);

  const handleForwardToTarget = async (targetId, type) => {
    if (!selectedMessage) return;
    
    // Check if it's text-only (no media)
    const isTextOnly = selectedMessage.text && (!selectedMessage.media || selectedMessage.media.length === 0);
    if (isTextOnly) {
      toast.info('Forwarding text messages is coming soon!');
      setShowForwardModal(false);
      setSelectedMessage(null);
      return;
    }

    try {
      const originalSender = selectedMessage.originalSender || selectedMessage.sender;
      const forwardedInfo = { originalSender };
      
      if (type === 'dm') {
        const finalChatId = targetId.includes('_') ? targetId : generateChatId(user.id, targetId);
        await sendMessage(finalChatId, user.id, selectedMessage.text || '', selectedMessage.media || [], null, forwardedInfo);
      } else {
        const { sendGroupMessage } = await import('@/lib/groupsDb');
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

  const deletedIdsRef = useRef([]);
  const otherUserRef = useRef(null);
  const userIdRef = useRef(null);
  const prevSeenMessageIdsRef = useRef(new Set());

  // Reply state
  const [replyTo, setReplyTo] = useState(null);

  // Message action states
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null);

  // Swipe state for reply
  const [swipeStates, setSwipeStates] = useState({});

  // Long press handling
  const longPressTimer = useRef(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [pendingMedia, setPendingMedia] = useState([]);

  useEffect(() => {
    deletedIdsRef.current = deletedMessageIds;
  }, [deletedMessageIds]);

  useEffect(() => {
    otherUserRef.current = otherUser;
  }, [otherUser]);

  useEffect(() => {
    if (!otherUserId) return;
    const uref = ref(database, `users/${otherUserId}`);
    let sawProfile = false;
    const unsub = onValue(uref, (snap) => {
      if (snap.exists()) {
        sawProfile = true;
        return;
      }
      if (sawProfile) {
        toast.error('This user is no longer on Discuss');
        navigate('/chat');
      }
    });
    return () => unsub();
  }, [otherUserId, navigate]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  // Load other user data and chat
  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const loadData = async () => {
      try {
        // Run auto-delete cleanup on load
        runAutoDeleteCleanup();

        // Load other user details
        const [userData, profileData] = await Promise.all([
          getUser(otherUserId),
          getUserProfile(otherUserId)
        ]);
        
        if (!userData) {
          console.error('User not found:', otherUserId);
          setLoading(false);
          return;
        }
        
        setOtherUser(userData);
        setOtherUserProfile(profileData);

        // Check relationship and chat status with details
        const [canChat, status, details] = await Promise.all([
          isChatEnabled(user.id, otherUserId),
          getRelationshipStatus(user.id, otherUserId),
          getRelationshipDetails(user.id, otherUserId)
        ]);
        setChatEnabled(canChat);
        setRelationshipStatus(status);
        setUnfollowedBy(details.unfollowedBy);

        // Get or create chat
        const generatedChatId = generateChatId(user.id, otherUserId);
        setChatId(generatedChatId);

        // Load deleted messages for current user
        const deleted = await getDeletedMessages(user.id, generatedChatId);
        setDeletedMessageIds(deleted);

        // If chat is enabled, create it right away to prevent "failed to send" errors
        if (canChat) {
          try {
            await getOrCreateChat(user.id, otherUserId);
            setChatCreated(true);
          } catch (err) {
            console.error('Error creating chat:', err);
          }
        }
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, otherUserId]);

  useEffect(() => {
    setLiveMessagesSynced(false);
    prevSeenMessageIdsRef.current = new Set();
  }, [chatId]);

  // Subscribe to chat settings
  useEffect(() => {
    if (!chatId || !user?.id) return;
    
    // Mark messages as read immediately when opening the chat
    markMessagesAsRead(chatId, user.id);
    
    const unsubscribe = subscribeToChatSettings(chatId, (settings) => {
      if (settings) {
        setAutoDeleteEnabled(settings.autoDelete || false);
        if (settings.status) setChatStatus(settings.status);
      } else {
        // Chat deleted or non-existent
        setChatStatus(CHAT_STATUS.DELETED);
      }
    });
    
    return () => unsubscribe();
  }, [chatId]);

  // Subscribe to messages with IndexedDB + localStorage cache
  useEffect(() => {
    if (!chatId || !user?.id) return;

    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      const cached = await getCachedMessages(user.id, chatId);
      if (!cancelled && cached?.length) {
        setMessages(cached);
      }

      unsubscribe = subscribeToMessages(chatId, async (newMessages) => {
        if (cancelled) return;

        const uid = userIdRef.current;
        const seen = prevSeenMessageIdsRef.current;
        const newIncoming = newMessages.filter(
          (m) => m.sender !== uid && !seen.has(m.id)
        );
        newMessages.forEach((m) => seen.add(m.id));

        if (newIncoming.length > 0 && isNotificationsEnabled() && document.hidden) {
          await notifyChatMessage(chatId, otherUserRef.current?.username);
        }

        // Measure scroll height before state update
        const container = messagesContainerRef.current;
        const scrollHeightBefore = container ? container.scrollHeight : 0;
        const scrollTopBefore = container ? container.scrollTop : 0;

        setMessages(newMessages);

        if (newMessages.length < messageLimit) {
          setHasMoreOld(false);
        } else {
          setHasMoreOld(true);
        }

        await cacheMessages(user.id, chatId, newMessages);
        setLiveMessagesSynced(true);
        markMessagesAsRead(chatId, user.id);
        setLoadingOld(false);

        // Adjust scroll position if we prepended older messages
        if (container && scrollHeightBefore > 0 && scrollTopBefore === 0 && newMessages.length > messagesCountRef.current) {
          setTimeout(() => {
            const diff = container.scrollHeight - scrollHeightBefore;
            container.scrollTop = diff;
          }, 0);
        }
      }, messageLimit);
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, user?.id, messageLimit]);

  // Initial scroll to bottom when chat loads
  useEffect(() => {
    if (!loading && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);
    }
  }, [loading]);

  // Handle relationship status change
  const handleStatusChange = useCallback((newStatus) => {
    setRelationshipStatus(newStatus);
    if (newStatus === RELATIONSHIP_STATUS.FRIENDS) {
      setChatEnabled(true);
      setChatStatus(CHAT_STATUS.ACTIVE);
    } else if (newStatus === RELATIONSHIP_STATUS.UNFOLLOWED) {
      setChatEnabled(false);
      setChatStatus(CHAT_STATUS.BLOCKED);
    }
  }, []);

  // Ensure chat exists before sending
  const ensureChatExists = async () => {
    if (!chatCreated && chatEnabled) {
      try {
        await getOrCreateChat(user.id, otherUserId);
        setChatCreated(true);
        return true;
      } catch (err) {
        console.error('Failed to create chat:', err);
        return false;
      }
    }
    return true;
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    // ⚠️ ANDROID CHROME FIX: getCurrentPosition MUST be called here directly
    // as the very first thing — before setSending(true) or any other call.
    // Any state update or async call before it breaks the gesture chain and
    // Android Chrome silently denies without showing the popup.
    setSending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const chatExists = await ensureChatExists();
          if (!chatExists) throw new Error('Failed to create chat');
          await sendMessage(chatId, user.id, '', [], { latitude, longitude });
          toast.success('Location sent');
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        } catch (error) {
          console.error('Error sending location:', error);
          toast.error('Failed to send location');
        } finally {
          setSending(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setSending(false);
        if (error.code === 1) {
          toast.error('Location permission denied. Please allow location access in Chrome settings.');
        } else {
          toast.error('Failed to get your location. Please try again.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleSendMessage = (e, mediaFiles = null) => {
    if (e) e.preventDefault();
    const effectiveMedia = mediaFiles || pendingMedia;
    if (!newMessage.trim() && (!effectiveMedia || effectiveMedia.length === 0) && !chatId) return;
    if (!chatEnabled) return;

    const messageText = newMessage.trim();
    
    // 1. Instantly reset inputs/state for instant feel (0ms lag)
    setNewMessage('');
    setShowMediaUpload(false);
    setPendingMedia([]);
    const currentReplyTo = replyTo;
    setReplyTo(null);
    if (inputRef.current) {
      inputRef.current.style.height = '40px';
      inputRef.current.style.overflowY = 'hidden';
    }

    // 2. Generate and add the optimistic message to state instantly!
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      sender: user.id,
      text: messageText,
      timestamp: new Date().toISOString(),
      read: false,
      status: 'sent',
      media: effectiveMedia || [],
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
        const chatExists = await ensureChatExists();
        if (!chatExists) {
          throw new Error('Failed to create chat');
        }

        if (currentReplyTo) {
          await sendReplyMessage(chatId, user.id, messageText, currentReplyTo, effectiveMedia);
        } else {
          await sendMessage(chatId, user.id, messageText, effectiveMedia);
        }
        
        // Background non-blocking triggers
        const isImage = !!(effectiveMedia && effectiveMedia.length > 0);
        notifyTelegramDM(otherUserId, user?.username, messageText, isImage).catch(() => {});
        notifyDiscordDM(otherUserId, user?.username, messageText, isImage).catch(() => {});
        
        // Trigger OneSignal Push Notification (native mobile push)
        import('@/lib/pushNotificationService').then(({ sendOneSignalNotification }) => {
          sendOneSignalNotification(
            otherUserId,
            `New message from @${user?.username || 'user'}`,
            messageText || (isImage ? "📷 Sent an image" : "Sent a message"),
            { url: `/chat/${chatId}`, type: 'chat' }
          );
        }).catch(err => console.error('[OneSignal] Push trigger failed:', err));
        
        // Remove from optimistic list since it's successfully written
        setOptimisticMessages(prev => prev.filter(om => om.id !== tempId));
      } catch (error) {
        console.error('Send message error:', error);
        // Put the message back in the input box so they don't lose it if it actually failed!
        setNewMessage(messageText);
        toast.error(error.message || 'Failed to send message');
        // Clean up this optimistic message since it failed
        setOptimisticMessages(prev => prev.filter(om => om.id !== tempId));
      }
    })();

    // Always keep focus in input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleDeleteChat = async () => {
    if (!chatId) return;
    
    setDeleting(true);
    try {
      await deleteChat(chatId);
      if (user?.id) await clearDmThreadCaches(user.id, chatId);
      toast.success('Chat deleted');
      navigate('/chat');
    } catch (error) {
      toast.error('Failed to delete chat');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleAutoDelete = async () => {
    if (!chatId) return;
    
    try {
      await toggleAutoDelete(chatId, !autoDeleteEnabled);
      setAutoDeleteEnabled(!autoDeleteEnabled);
      setShowAutoDeleteConfirm(false);
      
      if (!autoDeleteEnabled) {
        toast.success('Auto-delete enabled. Messages will be deleted after 24 hours.');
        await deleteOldMessages(chatId, 24);
      } else {
        toast.success('Auto-delete disabled.');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  // Handle message long press - ONLY triggered on long press, not click
  const handleMessageLongPress = (message) => {
    setSelectedMessage(message);
    setShowMessageOptions(true);
  };

  // Long press handlers
  const handleTouchStart = (message) => {
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      handleMessageLongPress(message);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Copy message text
  const handleCopyMessage = async () => {
    if (selectedMessage) {
      try {
        await navigator.clipboard.writeText(selectedMessage.text);
        toast.success('Message copied');
      } catch (err) {
        toast.error('Failed to copy');
      }
    }
    setShowMessageOptions(false);
    setSelectedMessage(null);
  };

  // Delete message for me
  const handleDeleteForMe = async () => {
    if (!selectedMessage || !chatId) return;
    
    try {
      await deleteMessageForMe(chatId, selectedMessage.id, user.id);
      await removeDmMessageFromCaches(user.id, chatId, selectedMessage.id);
      setDeletedMessageIds(prev => [...prev, selectedMessage.id]);
      setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
      toast.success('Message deleted for you');
    } catch (error) {
      toast.error('Failed to delete message');
    }
    setShowDeleteMessageConfirm(false);
    setShowMessageOptions(false);
    setSelectedMessage(null);
    setDeleteMode(null);
  };

  // Delete message for everyone
  const handleDeleteForEveryone = async () => {
    if (!selectedMessage || !chatId) return;
    
    try {
      await deleteMessageForEveryone(chatId, selectedMessage.id, user.id);
      await patchDmMessageDeletedInCaches(user.id, chatId, selectedMessage.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessage.id
            ? { ...m, deleted: true, text: 'This message was deleted' }
            : m
        )
      );
      toast.success('Message deleted for everyone');
    } catch (error) {
      toast.error(error.message || 'Failed to delete message');
    }
    setShowDeleteMessageConfirm(false);
    setShowMessageOptions(false);
    setSelectedMessage(null);
    setDeleteMode(null);
  };

  // Handle swipe for reply
  const handleSwipeStart = (messageId, e) => {
    const touch = e.touches ? e.touches[0] : e;
    setSwipeStates(prev => ({
      ...prev,
      [messageId]: { startX: touch.clientX, currentX: touch.clientX }
    }));
  };

  const handleSwipeMove = (messageId, e) => {
    if (!swipeStates[messageId]) return;
    
    const touch = e.touches ? e.touches[0] : e;
    setSwipeStates(prev => ({
      ...prev,
      [messageId]: { ...prev[messageId], currentX: touch.clientX }
    }));
  };

  const handleSwipeEnd = (message, isOwn) => {
    const state = swipeStates[message.id];
    if (!state) return;

    const diff = state.currentX - state.startX;
    const threshold = 50;

    // Swipe right on received, swipe left on own
    if ((isOwn && diff < -threshold) || (!isOwn && diff > threshold)) {
      setReplyTo(message);
      inputRef.current?.focus();
    }

    setSwipeStates(prev => {
      const newStates = { ...prev };
      delete newStates[message.id];
      return newStates;
    });
  };

  // Scroll to original message when clicking reply preview
  const scrollToMessage = (messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      element.classList.add('ring-2', 'ring-[#2563EB]', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-[#2563EB]', 'ring-opacity-50');
      }, 2000);
    }
  };

  // Handle report user
  const handleReportUser = async () => {
    if (!chatId || !otherUserId) return;
    
    setReporting(true);
    try {
      await reportAndRestrictUser(user.id, otherUserId, chatId);
      await unfollowFriend(user.id, otherUserId);
      
      toast.success('User reported. Chat has been restricted.');
      setChatEnabled(false);
      setChatStatus('restricted');
      setRelationshipStatus(RELATIONSHIP_STATUS.UNFOLLOWED);
      navigate('/chat');
    } catch (error) {
      toast.error('Failed to report user');
    } finally {
      setReporting(false);
      setShowReportConfirm(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }
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

  const visibleMessages = useMemo(() => {
    return combinedMessages.filter((m) => !deletedMessageIds.includes(m.id));
  }, [combinedMessages, deletedMessageIds]);

  const groupedMessages = useMemo(() => {
    return visibleMessages.reduce((groups, message) => {
      const date = formatMessageDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  }, [visibleMessages]);

  const initials = (otherUser?.username || 'U').slice(0, 2).toUpperCase();
  const displayName = otherUserProfile?.fullName || otherUser?.username || 'Unknown';

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212]">
        <Header />
        {/* Skeleton Top Bar */}
        <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] px-4 py-3">
          <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] animate-pulse rounded" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] animate-pulse" />
                <div>
                  <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] animate-pulse rounded mb-1.5" />
                  <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] animate-pulse rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Skeleton Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ maxHeight: `calc(100vh - 140px)` }}>
          <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto space-y-4">
            <div className="space-y-3 py-2" aria-hidden>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className="h-11 w-[58%] max-w-sm rounded-2xl bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212]">
        <Header />
        <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto py-20 text-center">
          <User className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-2">
            User not found
          </h2>
          <Button onClick={() => navigate('/chat')} variant="outline" className="rounded-[6px]">
            Back to Chats
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] px-4 py-3 sticky top-0 z-10">
        <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="p-2 -ml-2 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate(`/user/${otherUserId}`)}
              className="flex items-center gap-3"
            >
              <UserAvatar
                src={otherUser.photo_url}
                username={otherUser.username}
                className="w-10 h-10"
              />
              
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] text-sm">
                    {displayName}
                  </span>
                  {otherUser.verified && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-xs">
                  @{otherUser.username}
                </p>
              </div>
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-neutral-800 dark:border-neutral-700 discuss:bg-[#262626] discuss:border-[#333333] rounded-[12px]">
              <DropdownMenuItem
                onClick={() => navigate(`/user/${otherUserId}`)}
                className="dark:text-neutral-50 discuss:text-[#F5F5F5] dark:focus:bg-neutral-700 discuss:focus:bg-[#333333] rounded-[6px]"
              >
                <User className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-neutral-700 discuss:bg-[#333333]" />
              <DropdownMenuItem
                onClick={() => setShowAutoDeleteConfirm(true)}
                className="dark:text-neutral-50 discuss:text-[#F5F5F5] dark:focus:bg-neutral-700 discuss:focus:bg-[#333333] rounded-[6px]"
              >
                <Clock className="w-4 h-4 mr-2" />
                {autoDeleteEnabled ? 'Disable Auto-Delete' : 'Enable Auto-Delete (24h)'}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-neutral-700 discuss:bg-[#333333]" />
              <DropdownMenuItem
                onClick={() => setShowReportConfirm(true)}
                className="text-[#F59E0B] focus:text-[#F59E0B] dark:focus:bg-neutral-700 discuss:focus:bg-[#333333] rounded-[6px]"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                className="text-[#EF4444] focus:text-[#EF4444] dark:focus:bg-neutral-700 discuss:focus:bg-[#333333] rounded-[6px]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Auto-delete banner */}
      {autoDeleteEnabled && (
        <div className="bg-[#F59E0B]/10 border-b border-[#F59E0B]/20 px-4 py-2">
          <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#92400E] dark:text-[#FCD34D] discuss:text-[#FCD34D]">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">
                Auto-delete enabled • Messages delete after 24 hours
              </span>
            </div>
            <button
              onClick={() => setShowAutoDeleteConfirm(true)}
              className="text-[#92400E] dark:text-[#FCD34D] discuss:text-[#FCD34D] text-xs font-semibold hover:underline"
            >
              Turn off
            </button>
          </div>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] px-4 py-2">
          <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto flex items-center gap-3">
            <div className="w-1 h-10 bg-[#2563EB] discuss:bg-[#EF4444] rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-[#2563EB] discuss:text-[#EF4444] text-xs font-semibold">
                Replying to {replyTo.sender === user.id ? 'yourself' : otherUser?.username}
              </p>
              <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm truncate">
                {replyPreviewText(replyTo, messageById)}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onClick={clearAllHighlights}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide"
        style={{ maxHeight: `calc(100vh - ${autoDeleteEnabled ? 176 : (replyTo ? 180 : 140)}px)` }}
      >
        <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto space-y-4">
          {loadingOld && (
            <div className="flex items-center justify-center py-2 gap-2 text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
              <span>Loading old messages, please wait...</span>
            </div>
          )}

          {!liveMessagesSynced && messages.length === 0 && (
            <div className="space-y-3 py-2" aria-hidden>
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

          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-xs px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              
              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                const isOwn = message.sender === user.id;
                const showAvatar = !isOwn && (index === 0 || dateMessages[index - 1]?.sender !== message.sender);
                const swipeState = swipeStates[message.id];
                const swipeOffset = swipeState ? swipeState.currentX - swipeState.startX : 0;
                const clampedOffset = isOwn 
                  ? Math.min(0, Math.max(-60, swipeOffset))
                  : Math.max(0, Math.min(60, swipeOffset));
                
                return (
                  <div
                    key={message.id}
                    ref={el => messageRefs.current[message.id] = el}
                    className={`flex items-end gap-2 mb-2 ${isOwn ? 'justify-end' : 'justify-start'} relative transition-all duration-300`}
                    onTouchStart={(e) => {
                      handleSwipeStart(message.id, e);
                      handleTouchStart(message);
                    }}
                    onTouchMove={(e) => {
                      handleSwipeMove(message.id, e);
                      handleTouchMove();
                    }}
                    onTouchEnd={() => {
                      handleSwipeEnd(message, isOwn);
                      handleTouchEnd();
                    }}
                  >
                    {/* Swipe reply indicator */}
                    {!isOwn && swipeOffset > 30 && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <Reply className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
                      </div>
                    )}
                    {isOwn && swipeOffset < -30 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <Reply className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444] transform scale-x-[-1]" />
                      </div>
                    )}

                    {!isOwn && showAvatar && (
                      <UserAvatar
                        src={otherUser.photo_url}
                        username={otherUser.username}
                        className="w-6 h-6 shrink-0"
                      />
                    )}
                    {!isOwn && !showAvatar && <div className="w-6" />}
                    
                    <div
                      style={{ transform: `translateX(${clampedOffset}px)` }}
                      className={`max-w-[75%] transition-transform duration-100 ${message.deleted ? 'opacity-60' : ''}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleMessageLongPress(message);
                      }}
                    >
                      {/* Reply reference - ONLY this is clickable to scroll */}
                      {message.replyTo && (
                        <button
                          onClick={() => scrollToMessage(message.replyTo.id)}
                          className={`w-full mb-1 px-3 py-1.5 rounded-lg text-xs text-left cursor-pointer hover:opacity-80 transition-opacity ${
                            isOwn 
                              ? 'bg-[#1D4ED8] discuss:bg-[#DC2626] text-white/80' 
                              : 'bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#333333] text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          <p className="font-medium truncate">
                            {message.replyTo.sender === user.id ? 'You' : otherUser?.username}
                          </p>
                          <p className="truncate opacity-80">
                            {replyPreviewText(message.replyTo, messageById)}
                          </p>
                        </button>
                      )}
                      
                      {/* Message Content */}
                      <div
                        className={`p-3 rounded-2xl ${
                          isOwn
                            ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white rounded-br-none'
                            : 'bg-white dark:bg-neutral-800 discuss:bg-[#262626] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] rounded-bl-none border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333]'
                        } shadow-sm max-w-xs sm:max-w-md break-words relative overflow-hidden`}
                      >
                        {/* Media Grid/Single */}
                        {message.media && message.media.length > 0 && (
                          <div className={`mb-2 grid gap-1 ${message.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                                    <img src={item.thumbnail || item.url} alt="chat media" className="w-full h-full object-cover" />
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

                        {message.text && (() => {
                          const lines = message.text.split('\n');
                          const hasMore = lines.length > 8;
                          const isExpanded = expandedMessages[message.id];
                          const displayText = hasMore && !isExpanded 
                            ? lines.slice(0, 8).join('\n') 
                            : message.text;

                          return (
                            <div className="text-[14px] md:text-[15px] leading-relaxed">
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
                        })()}
                        
                        <div className={`flex items-center justify-end gap-1 mt-1 opacity-70`}>
                          <span className="text-[10px] tabular-nums">
                            {formatMessageTime(message.timestamp)}
                          </span>
                          {isOwn && (
                            <Check className={`w-3 h-3 ${message.read ? 'text-blue-300' : ''}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          
          {liveMessagesSynced && visibleMessages.length === 0 && chatEnabled && (
            <div className="text-center py-10">
              <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm">
                No messages yet. Say hello! 👋
              </p>
            </div>
          )}
          
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

      {/* Chat disabled message */}
      {!chatEnabled && (
        <div className="bg-[#FEF3C7] dark:bg-[#F59E0B]/20 discuss:bg-[#F59E0B]/10 border-t border-[#F59E0B]/30 px-4 py-3">
          <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[#F59E0B] shrink-0" />
              <div className="flex-1">
                <p className="text-[#92400E] dark:text-[#FCD34D] discuss:text-[#FCD34D] text-sm font-medium">
                  You can no longer send messages to this user
                </p>
                <p className="text-[#B45309] dark:text-[#FBBF24] discuss:text-[#FBBF24] text-xs mt-0.5">
                  {chatStatus === 'restricted' 
                    ? 'This chat has been restricted due to a report.'
                    : relationshipStatus === RELATIONSHIP_STATUS.UNFOLLOWED 
                      ? (unfollowedBy === user?.id 
                          ? 'You unfollowed this user. Send a friend request to chat again.'
                          : 'This user has unfollowed you.')
                      : 'You need to be friends to send messages.'}
                </p>
              </div>
              {chatStatus !== 'restricted' && (
                <FriendRequestButton
                  targetUserId={otherUserId}
                  targetUsername={otherUser?.username}
                  size="sm"
                  showChat={false}
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message input */}
      {chatEnabled && (
        <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-t border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] px-4 py-3 sticky bottom-0">
          <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto">
            {replyTo && (
              <div className="mb-2 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] p-2 rounded-[8px] border-l-2 border-[#2563EB] discuss:border-[#EF4444]">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2563EB] discuss:text-[#EF4444]">
                      Replying to {replyTo.sender === user?.id ? 'yourself' : `@${otherUser?.username || 'User'}`}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] truncate">
                      {replyPreviewText(replyTo, {})}
                    </p>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} className="ml-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 discuss:hover:bg-[#333333] rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {showMediaUpload && (
              <div className="mb-2">
                <MediaUpload 
                  multiple 
                  maxFiles={5}
                  folder="dm_chats" 
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

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                className={`p-2 rounded-full transition-colors ${showMediaUpload ? 'bg-[#2563EB] text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-500'}`}
              >
                <IoImage size={22} />
              </button>
              <button
                type="button"
                onClick={handleSendLocation}
                disabled={sending}
                className="p-2 rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-500"
                title="Send Location"
              >
                <IoLocationSharp size={22} />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
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
                placeholder={replyTo ? "Type your reply..." : "Type a message..."}
                className="flex-1 bg-neutral-100 dark:bg-neutral-900 discuss:bg-[#262626] border-0 text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] placeholder:text-neutral-400 dark:placeholder:text-neutral-500 discuss:placeholder:text-[#9CA3AF] rounded-2xl px-4 py-2.5 text-[14px] md:text-[15px] focus:outline-none resize-none max-h-[130px] input-textarea-scroll"
                style={{
                  height: '40px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                disabled={sending}
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() && pendingMedia.length === 0 && !showMediaUpload}
                className="rounded-full w-10 h-10 p-0 bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white shadow-button"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Message options dialog - Long press options */}
      <AlertDialog open={showMessageOptions} onOpenChange={setShowMessageOptions}>
        <AlertDialogContent className="dark:bg-neutral-800 dark:border-neutral-700 discuss:bg-[#262626] discuss:border-[#333333] rounded-[12px] max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-neutral-50 discuss:text-[#F5F5F5] text-center">
              Message Options
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <button
              onClick={() => {
                setReplyTo(selectedMessage);
                setShowMessageOptions(false);
                setSelectedMessage(null);
                inputRef.current?.focus();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] transition-colors"
            >
              <Reply className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
              <span>Reply</span>
            </button>
            {!selectedMessage?.deleted && (
              <button
                onClick={handleCopyMessage}
                className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] transition-colors"
              >
                <Copy className="w-5 h-5 text-[#10B981]" />
                <span>Copy</span>
              </button>
            )}
            {!selectedMessage?.deleted && selectedMessage?.sender === user.id && (
              <button
                onClick={() => {
                  setShowMessageOptions(false);
                  setShowForwardModal(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] transition-colors"
              >
                <Send className="w-5 h-5 text-[#3b82f6] transform rotate-45" />
                <span>Forward</span>
              </button>
            )}
            <button
              onClick={() => {
                setDeleteMode('me');
                setShowDeleteMessageConfirm(true);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] transition-colors"
            >
              <Trash2 className="w-5 h-5 text-[#F59E0B]" />
              <span>Delete for Me</span>
            </button>
            {selectedMessage?.sender === user.id && !selectedMessage?.deleted && (
              <button
                onClick={() => {
                  setDeleteMode('everyone');
                  setShowDeleteMessageConfirm(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#333333] text-[#EF4444] transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete for Everyone</span>
              </button>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full dark:bg-neutral-700 dark:text-neutral-50 dark:border-neutral-700 discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333] rounded-[6px]">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete message confirmation */}
      <AlertDialog open={showDeleteMessageConfirm} onOpenChange={setShowDeleteMessageConfirm}>
        <AlertDialogContent className="dark:bg-neutral-800 dark:border-neutral-700 discuss:bg-[#262626] discuss:border-[#333333] rounded-[12px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-neutral-50 discuss:text-[#F5F5F5]">
              {deleteMode === 'everyone' ? 'Delete for Everyone?' : 'Delete for Me?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-neutral-400 discuss:text-[#9CA3AF]">
              {deleteMode === 'everyone' 
                ? 'This message will be deleted for everyone in this chat. The message will show as "This message was deleted".'
                : 'This message will be removed from your chat. The other person can still see it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-neutral-700 dark:text-neutral-50 dark:border-neutral-700 discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333] rounded-[6px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMode === 'everyone' ? handleDeleteForEveryone : handleDeleteForMe}
              className="bg-[#EF4444] text-white hover:bg-[#DC2626] rounded-[6px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete chat confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="dark:bg-neutral-800 dark:border-neutral-700 discuss:bg-[#262626] discuss:border-[#333333] rounded-[12px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-neutral-50 discuss:text-[#F5F5F5] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              Delete Chat?
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-neutral-400 discuss:text-[#9CA3AF]">
              This will delete the chat for both users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-neutral-700 dark:text-neutral-50 dark:border-neutral-700 discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333] rounded-[6px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={deleting}
              className="bg-[#EF4444] text-white hover:bg-[#DC2626] rounded-[6px]"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Chat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-delete confirmation */}
      <AlertDialog open={showAutoDeleteConfirm} onOpenChange={setShowAutoDeleteConfirm}>
        <AlertDialogContent className="dark:bg-neutral-800 dark:border-neutral-700 discuss:bg-[#262626] discuss:border-[#333333] rounded-[12px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-neutral-50 discuss:text-[#F5F5F5] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
              {autoDeleteEnabled ? 'Disable Auto-Delete?' : 'Enable Auto-Delete?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-neutral-400 discuss:text-[#9CA3AF]">
              {autoDeleteEnabled 
                ? 'Messages will be kept permanently.'
                : 'All messages will be automatically deleted after 24 hours. This applies to this chat only and works for both users.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-neutral-700 dark:text-neutral-50 dark:border-neutral-700 discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333] rounded-[6px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleAutoDelete}
              className={autoDeleteEnabled 
                ? "bg-[#10B981] text-white hover:bg-[#059669] rounded-[6px]"
                : "bg-[#F59E0B] text-white hover:bg-[#D97706] rounded-[6px]"
              }
            >
              {autoDeleteEnabled ? 'Disable' : 'Enable Auto-Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report confirmation */}
      <AlertDialog open={showReportConfirm} onOpenChange={setShowReportConfirm}>
        <AlertDialogContent className="dark:bg-neutral-800 dark:border-neutral-700 discuss:bg-[#262626] discuss:border-[#333333] rounded-[12px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-neutral-50 discuss:text-[#F5F5F5] flex items-center gap-2">
              <Flag className="w-5 h-5 text-[#F59E0B]" />
              Report User?
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-neutral-400 discuss:text-[#9CA3AF]">
              You will no longer be able to message this user. Both users will be restricted from chatting. This user will also be automatically unfollowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-neutral-700 dark:text-neutral-50 dark:border-neutral-700 discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333] rounded-[6px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReportUser}
              disabled={reporting}
              className="bg-[#EF4444] text-white hover:bg-[#DC2626] rounded-[6px]"
            >
              {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Report & Restrict'}
            </AlertDialogAction>
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
                 {(() => {
                   const filteredChats = forwardTargets.chats.filter(c => 
                     c.otherUserDetails?.username?.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                     c.otherUserDetails?.fullName?.toLowerCase().includes(forwardSearch.toLowerCase())
                   );
                   
                   if (filteredChats.length > 0) {
                     return (
                       <div className="space-y-2">
                         {filteredChats.map(c => (
                           <div key={c.chatId} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 discuss:hover:bg-[#262626]/50">
                             <div className="flex items-center gap-2.5 min-w-0">
                               <UserAvatar src={c.otherUserDetails?.photo_url} username={c.otherUserDetails?.username} className="w-8 h-8" />
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
                     );
                   }

                   const filteredUsers = recommendedUsers.filter(u =>
                     u.username?.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                     u.email?.toLowerCase().includes(forwardSearch.toLowerCase())
                   );
                   
                   if (filteredUsers.length > 0) {
                     return (
                       <div className="space-y-2">
                         {filteredUsers.map(u => (
                           <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 discuss:hover:bg-[#262626]/50">
                             <div className="flex items-center gap-2.5 min-w-0">
                               <UserAvatar src={u.photo_url} username={u.username} className="w-8 h-8" />
                               <div className="min-w-0">
                                 <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] truncate">
                                   {u.username}
                                 </p>
                                 <p className="text-[10px] text-neutral-400 truncate">@{u.username}</p>
                               </div>
                             </div>
                             <button
                               onClick={() => handleForwardToTarget(u.id, 'dm')}
                               className="bg-[#2563EB]/10 hover:bg-[#2563EB] discuss:bg-[#EF4444]/10 discuss:hover:bg-[#EF4444] text-[#2563EB] hover:text-white discuss:text-[#EF4444] discuss:hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                             >
                               Forward
                             </button>
                           </div>
                         ))}
                       </div>
                     );
                   }

                   return <p className="text-xs text-neutral-500 italic py-1">No chats or users found</p>;
                 })()}
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
