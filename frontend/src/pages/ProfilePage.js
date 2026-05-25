import UserAvatar from '@/components/UserAvatar';
import MediaUpload from '@/components/MediaUpload';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import L from 'leaflet';
import { getPosts, getUser } from '@/lib/db';
import { getUserPulses } from '@/lib/pulseDb';
import {
  getUserProfile, 
  updateFullName, 
  deleteFullName, 
  updateBio, 
  deleteBio,
  addSocialLink,
  editSocialLink,
  deleteSocialLink,
  BIO_CHAR_LIMIT,
  MAX_SOCIAL_LINKS
} from '@/lib/userProfileDb';
import {
  saveUserLocation,
  deleteUserLocation,
  getUserLocation,
  isDevRadarDbAvailable
} from '@/lib/firebaseSixth';
import {
  getReceivedRequests,
  getSentRequests,
  getFriendsWithDetails,
  searchUsers,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  subscribeToReceivedRequests,
  getSuggestedFriends
} from '@/lib/relationshipsDb';
import { 
  subscribeToGroupInvites,
  acceptGroupInvite,
  rejectGroupInvite
} from '@/lib/groupsDb';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import ThemeSelector from '@/components/ThemeSelector';
import VerifiedBadge from '@/components/VerifiedBadge';
import VerificationRequestModal from '@/components/VerificationRequestModal';
import UserAdminMessage from '@/components/UserAdminMessage';
import LinkifiedText from '@/components/LinkifiedText';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import UserSearchResult from '@/components/UserSearchResult';
import ProfileShareModal from '@/components/ProfileShareModal';
import CurrentLocationUpdateModal from '@/components/CurrentLocationUpdateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, LogOut, Loader2, ChevronDown, ChevronUp, 
  Calendar, Filter, ShieldCheck, ShieldAlert, User, Pencil, Trash2, Plus, Link2, X, Check, ExternalLink, Key,
  Info, Mail, Image as ImageIcon, Users, UserPlus, Search, Clock, MessageCircle, Share2, Bell, ArrowLeft, MoreHorizontal, PlayCircle, Lock, Megaphone,
  Eye, EyeOff, MessageSquare, Shield, Smartphone, Fingerprint as BiometricIcon, Send, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import NotificationToggle from '@/components/NotificationToggle';
import { notifyFriendRequest, isNotificationsEnabled } from '@/lib/pushNotificationService';
import {
  saveTelegramChatId,
  getTelegramChatId,
  removeTelegramChatId,
  saveTelegramPrivacy,
  getTelegramPrivacy,
  notifyTelegramFriendRequest,
  notifyTelegramFriendAccepted,
  BOT_USERNAME as TELEGRAM_BOT_USERNAME,
  APP_URL as TELEGRAM_APP_URL,
} from '@/lib/telegramService';
import {
  saveDiscordUserId,
  getDiscordUserId,
  removeDiscordUserId,
  saveDiscordPrivacy,
  getDiscordPrivacy,
  BOT_USERNAME as DISCORD_BOT_USERNAME,
} from '@/lib/discordService';

import { useSecurity } from '@/contexts/SecurityContext';
import { isBiometricSupported, registerBiometric } from '@/lib/securityService';
import {
  LOCATION_REQUEST_COOLDOWN_MS,
  LOCATION_SUCCESS_CLOSE_DELAY_MS,
  getCurrentPositionWithAndroidSupport,
  getFriendlyLocationErrorMessage,
} from '@/lib/locationPermission';
import { subscribeToAdminMessage, markAdminMessageSeen } from '@/lib/adminMessageDb';
import { ADMIN_MESSAGE_PREVIEW_LENGTH } from '@/lib/uiConstants';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [showPulses, setShowPulses] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pendingProfilePic, setPendingProfilePic] = useState(null);
  const [savingProfilePic, setSavingProfilePic] = useState(false);

  // Telegram notification states
  const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramPrivacy, setTelegramPrivacy] = useState(true);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [loadingTelegram, setLoadingTelegram] = useState(true);
  const [showTelegramInstructions, setShowTelegramInstructions] = useState(false);

  // Discord notification states
  const [discordUserIdInput, setDiscordUserIdInput] = useState('');
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordPrivacy, setDiscordPrivacy] = useState(true);
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [loadingDiscord, setLoadingDiscord] = useState(true);
  const [showDiscordInstructions, setShowDiscordInstructions] = useState(false);

  // Profile data from secondary Firebase
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [adminMessage, setAdminMessage] = useState(null);
  const [hasUnseenAdminMessage, setHasUnseenAdminMessage] = useState(false);
  const [adminPopoverOpen, setAdminPopoverOpen] = useState(false);

  // Edit states
  const [editingFullName, setEditingFullName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [savingFullName, setSavingFullName] = useState(false);
  const [deleteFullNameConfirm, setDeleteFullNameConfirm] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [deleteBioConfirm, setDeleteBioConfirm] = useState(false);

  const [addingLink, setAddingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [editLinkName, setEditLinkName] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [deleteLinkConfirm, setDeleteLinkConfirm] = useState(null);
  
  // Security settings
  const { localSettings, remoteSettings, updatePin, setSecurityEnabled, setSecurityType, verifyPin, disableAppLock, lockNow } = useSecurity();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showVerifyPinModal, setShowVerifyPinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [testingBiometric, setTestingBiometric] = useState(false);
  const [pendingSecurityAction, setPendingSecurityAction] = useState(null);
  const [savingPin, setSavingPin] = useState(false);
  const [showDisableLockModal, setShowDisableLockModal] = useState(false);
  const [disablePinInput, setDisablePinInput] = useState('');
  const [showDisablePin, setShowDisablePin] = useState(false);
  const [disablingLock, setDisablingLock] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  // --- DevRadar Location States ---
  const [shareLocation, setShareLocation] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [showLocationUpdateModal, setShowLocationUpdateModal] = useState(false);
  const [locationUpdateStatus, setLocationUpdateStatus] = useState('idle');
  const [locationUpdateError, setLocationUpdateError] = useState('');
  const locationRequestCooldownRef = useRef(0);

  // Load DevRadar sharing status on mount
  useEffect(() => {
    if (!user?.id) return;
    const loadLocationSharingStatus = async () => {
      try {
        const loc = await getUserLocation(user.id);
        if (loc) {
          setShareLocation(loc.isPublic || false);
          if (loc.latitude && loc.longitude) {
            setLocationCoords({ latitude: loc.latitude, longitude: loc.longitude });
          }
        }
      } catch (err) {
        console.warn('Failed to load DevRadar status:', err);
      }
    };
    loadLocationSharingStatus();
  }, [user?.id]);

  // Sync profile details to DevRadar in background when profile details change
  useEffect(() => {
    if (shareLocation && locationCoords && user?.id) {
      const syncLocationProfile = async () => {
        try {
          const locData = {
            latitude: locationCoords.latitude,
            longitude: locationCoords.longitude,
            isPublic: true,
            username: user.username || user.displayName || '',
            fullName: profileData?.fullName || '',
            bio: profileData?.bio || '',
            photo_url: user.photo_url || user.photoURL || '',
            verified: user.verified || false,
          };
          await saveUserLocation(user.id, locData);
        } catch (err) {
          console.warn('[DevRadar Sync] Stale profile data sync failed:', err.message);
        }
      };
      syncLocationProfile();
    }
  }, [profileData?.fullName, profileData?.bio, user?.photo_url, user?.photoURL, user?.username, user?.displayName, user?.verified, shareLocation, locationCoords, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToAdminMessage((msg, isNew) => {
      setAdminMessage(msg);
      setHasUnseenAdminMessage(isNew);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.id]);

  const handleToggleLocationSharing = () => {
    if (updatingLocation) return;

    if (shareLocation) {
      // Opt-out path — no geolocation needed, safe to be async
      setUpdatingLocation(true);
      deleteUserLocation(user.id)
        .then(() => {
          setShareLocation(false);
          setLocationCoords(null);
          toast.success('Location sharing disabled. You are now invisible on DevRadar.');
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to disable location sharing.');
        })
        .finally(() => setUpdatingLocation(false));
      return;
    }

    setLocationUpdateError('');
    setLocationUpdateStatus('idle');
    setShowLocationUpdateModal(true);
  };

  const handleConfirmLiveLocationUpdate = async () => {
    const now = Date.now();
    const isCoolingDown = now - locationRequestCooldownRef.current < LOCATION_REQUEST_COOLDOWN_MS;
    const isCurrentlyUpdating = updatingLocation;
    if (isCoolingDown) {
      toast.info('Please wait a moment before requesting location again.');
      return;
    }
    if (isCurrentlyUpdating) return;
    locationRequestCooldownRef.current = now;

    setUpdatingLocation(true);
    setLocationUpdateStatus('loading');
    setLocationUpdateError('');

    const result = await getCurrentPositionWithAndroidSupport();

    if (!result.ok) {
      setUpdatingLocation(false);
      if (result.reason === 'blocked') {
        setLocationUpdateStatus('blocked');
        return;
      }
      setLocationUpdateStatus('error');
      setLocationUpdateError(getFriendlyLocationErrorMessage(result.reason));
      return;
    }

    const { latitude, longitude } = result.position.coords;
    try {
      const locData = {
        latitude,
        longitude,
        isPublic: true,
        username: user.username || user.displayName || '',
        fullName: profileData?.fullName || '',
        bio: profileData?.bio || '',
        photo_url: user.photo_url || user.photoURL || '',
        verified: user.verified || false,
      };
      await saveUserLocation(user.id, locData);
      setShareLocation(true);
      setLocationCoords({ latitude, longitude });
      setLocationUpdateStatus('success');
      toast.success('Current location updated. You are now visible on DevRadar.');
      setTimeout(() => {
        setShowLocationUpdateModal(false);
        setLocationUpdateStatus('idle');
      }, LOCATION_SUCCESS_CLOSE_DELAY_MS);
    } catch (err) {
      console.error(err);
      setLocationUpdateStatus('error');
      setLocationUpdateError('Failed to save your location. Please retry.');
      toast.error('Failed to save your location details.');
    } finally {
      setUpdatingLocation(false);
    }
  };

  // --- Drag and Drop Adjust Location States ---
  const [showAdjustLocationModal, setShowAdjustLocationModal] = useState(false);
  const adjustMapContainerRef = useRef(null);
  const adjustMapInstanceRef = useRef(null);
  const adjustMarkerRef = useRef(null);
  const [tempCoords, setTempCoords] = useState(null);

  // Load Leaflet CSS dynamically if not present
  useEffect(() => {
    const linkId = 'leaflet-css-cdn';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // Initialize Adjust Location Map with robust container timing
  useEffect(() => {
    if (!showAdjustLocationModal || !adjustMapContainerRef.current) return;

    const centerLat = tempCoords?.latitude || locationCoords?.latitude || 12.9716;
    const centerLng = tempCoords?.longitude || locationCoords?.longitude || 77.5946;

    const timer = setTimeout(() => {
      if (!adjustMapContainerRef.current) return;

      // Fix leaflet default marker icon assets for safety inside ProfilePage
      if (L.Icon.Default.prototype._getIconUrl) {
        delete L.Icon.Default.prototype._getIconUrl;
      }
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      
      const map = L.map(adjustMapContainerRef.current, {
        zoomControl: false
      }).setView([centerLat, centerLng], 14);

      adjustMapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      const marker = L.marker([centerLat, centerLng], {
        draggable: true
      }).addTo(map);

      adjustMarkerRef.current = marker;

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setTempCoords({ latitude: position.lat, longitude: position.lng });
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setTempCoords({ latitude: lat, longitude: lng });
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (adjustMapInstanceRef.current) {
        adjustMapInstanceRef.current.remove();
        adjustMapInstanceRef.current = null;
      }
    };
  }, [showAdjustLocationModal]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleOpenAdjustModal = () => {
    if (locationCoords) {
      setTempCoords({ latitude: locationCoords.latitude, longitude: locationCoords.longitude });
    } else {
      setTempCoords({ latitude: 12.9716, longitude: 77.5946 });
    }
    setShowAdjustLocationModal(true);
  };

  const handleSaveAdjustedLocation = async () => {
    if (!tempCoords) return;
    try {
      const locData = {
        latitude: tempCoords.latitude,
        longitude: tempCoords.longitude,
        isPublic: true,
        username: user.username || user.displayName || '',
        fullName: profileData?.fullName || '',
        bio: profileData?.bio || '',
        photo_url: user.photo_url || user.photoURL || '',
        verified: user.verified || false,
      };
      await saveUserLocation(user.id, locData);
      setLocationCoords({ latitude: tempCoords.latitude, longitude: tempCoords.longitude });
      setShareLocation(true);
      toast.success('Precise location updated successfully!');
      setShowAdjustLocationModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update precise location.');
    }
  };

  useEffect(() => {
    if (typeof isBiometricSupported === 'function') {
      isBiometricSupported().then(setBiometricAvailable);
    }
  }, []);

  // Reset PINs when modals close
  useEffect(() => {
    if (!showPinModal && !showChangePinModal && !showVerifyPinModal) {
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setShowOldPin(false);
      setShowNewPin(false);
      setShowConfirmPin(false);
    }
  }, [showPinModal, showChangePinModal, showVerifyPinModal]);

  const handleToggleSecurity = () => {
    if (!localSettings?.enabled) {
      setShowPinModal(true);
    } else {
      // Ask for PIN before disabling
      setDisablePinInput('');
      setShowDisableLockModal(true);
    }
  };

  const handleSavePinAndEnable = async () => {
    if (newPin.length !== 6) { toast.error('PIN must be 6 digits'); return; }
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; }
    setSavingPin(true);
    try {
      // updatePin writes to DB, updates remoteSettings optimistically, enables lock
      await updatePin(newPin);
      setShowPinModal(false);
      toast.success('PIN saved! App Lock is now enabled.');
    } catch (err) {
      console.error('[PIN] Save failed:', err);
      toast.error('Failed to save PIN. Check your connection.');
    } finally {
      setSavingPin(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!verifyPin(oldPin)) { toast.error('Incorrect old PIN'); return; }
    if (newPin.length !== 6) { toast.error('New PIN must be 6 digits'); return; }
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; }
    setSavingPin(true);
    try {
      // updatePin writes to DB and updates remoteSettings optimistically
      await updatePin(newPin);
      setShowChangePinModal(false);
      toast.success('PIN updated successfully!');
    } catch (err) {
      console.error('[PIN] Update failed:', err);
      toast.error('Failed to update PIN. Check your connection.');
    } finally {
      setSavingPin(false);
    }
  };

  const handleBiometricToggle = () => {
    if (localSettings?.type === 'biometric') {
      // Ask PIN to confirm before disabling biometric
      setPendingSecurityAction('disable_biometric');
      setShowVerifyPinModal(true);
    } else {
      setPendingSecurityAction('biometric');
      setShowVerifyPinModal(true);
    }
  };

  const handleDisableLock = async () => {
    if (disablePinInput.length !== 6) { toast.error('Enter your 6-digit PIN'); return; }
    setDisablingLock(true);
    try {
      await disableAppLock(disablePinInput);
      setShowDisableLockModal(false);
      toast.success('App Lock disabled');
    } catch (err) {
      toast.error(err.message === 'Incorrect PIN' ? 'Incorrect PIN' : 'Failed to disable. Check connection.');
    } finally {
      setDisablingLock(false);
    }
  };

  const handleVerifyAndEnableBiometric = async () => {
    if (!verifyPin(oldPin)) { toast.error('Incorrect PIN'); return; }
    setTestingBiometric(true);
    setSavingPin(true);
    try {
      if (pendingSecurityAction === 'disable_biometric') {
        // Disable biometric - revert to PIN only
        setSecurityType('pin');
        toast.success('Biometrics disabled. PIN-only lock active.');
        setShowVerifyPinModal(false);
      } else {
        // Enable biometric
        const success = await registerBiometric(user?.username || 'User');
        if (success) {
          setSecurityType('biometric');
          toast.success('Biometric lock enabled!');
          setShowVerifyPinModal(false);
        } else {
          toast.error('Biometric registration failed. Try again.');
        }
      }
    } catch (err) {
      toast.error('Security verification failed');
    } finally {
      setTestingBiometric(false);
      setSavingPin(false);
      setOldPin('');
      setPendingSecurityAction(null);
    }
  };

  // Check if max links reached
  const maxLinksReached = (profileData?.socialLinks?.length || 0) >= MAX_SOCIAL_LINKS;

  // Friend system states
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [groupInvites, setGroupInvites] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [searchingFriends, setSearchingFriends] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [requestUserDetails, setRequestUserDetails] = useState({});
  
  // Suggested friends
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Fetch user posts and pulses
  const [userPulses, setUserPulses] = useState([]);
  
  useEffect(() => {
    if (user?.id) {
      setLoadingPosts(true);
      Promise.all([
        getPosts().then(posts => posts.filter(p => p.author_id === user.id)),
        getUserPulses(user.id)
      ])
        .then(([posts, pulses]) => {
          setUserPosts(posts);
          setUserPulses(pulses);
        })
        .catch(() => {})
        .finally(() => setLoadingPosts(false));
    }
  }, [user]);

  // Fetch profile data from secondary Firebase
  useEffect(() => {
    if (user?.id) {
      setLoadingProfile(true);
      getUserProfile(user.id)
        .then(data => {
          setProfileData(data);
          setLoadingProfile(false);
        })
        .catch(() => setLoadingProfile(false));
    }
  }, [user?.id]);

  // Load existing Telegram Chat ID and Privacy
  useEffect(() => {
    if (!user?.id) return;
    setLoadingTelegram(true);
    Promise.all([
      getTelegramChatId(user.id),
      getTelegramPrivacy(user.id)
    ])
      .then(([chatId, privacy]) => {
        if (chatId) {
          setTelegramConnected(true);
          setTelegramChatIdInput(chatId);
        }
        setTelegramPrivacy(privacy);
      })
      .catch(() => {})
      .finally(() => setLoadingTelegram(false));
    
    // Load existing Discord User ID and Privacy
    setLoadingDiscord(true);
    Promise.all([
      getDiscordUserId(user.id),
      getDiscordPrivacy(user.id)
    ])
      .then(([discordId, privacy]) => {
        if (discordId) {
          setDiscordConnected(true);
          setDiscordUserIdInput(discordId);
        }
        setDiscordPrivacy(privacy);
      })
      .catch(() => {})
      .finally(() => setLoadingDiscord(false));
    
    // Check biometric support
    isBiometricSupported().then(setBiometricAvailable);
  }, [user?.id]);

  // Fetch friends and requests
  useEffect(() => {
    if (!user?.id) return;

    const loadFriendsData = async () => {
      setLoadingFriends(true);
      try {
        const [friendsData, received, sent] = await Promise.all([
          getFriendsWithDetails(user.id),
          getReceivedRequests(user.id),
          getSentRequests(user.id)
        ]);
        setFriends(friendsData);
        setReceivedRequests(received);
        setSentRequests(sent);

        // Load user details for requests
        const userIds = [...received.map(r => r.fromUserId), ...sent.map(r => r.toUserId)];
        const uniqueUserIds = [...new Set(userIds)];
        const details = {};
        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            try {
              const userData = await getUser(uid);
              if (userData) {
                details[uid] = userData;
              }
            } catch {}
          })
        );
        setRequestUserDetails(details);
      } catch (error) {
        console.error('Error loading friends data:', error);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriendsData();

    // Subscribe to received requests for real-time updates
    const unsubscribe = subscribeToReceivedRequests(user.id, async (requests) => {
      setReceivedRequests(prevReceived => {
        // Check for NEW requests (not seen before) to trigger notification
        const prevRequestIds = prevReceived.map(r => r.fromUserId);
        const newRequests = requests.filter(r => !prevRequestIds.includes(r.fromUserId));
        
        // Notify for new friend requests (only if notifications enabled)
        if (newRequests.length > 0 && isNotificationsEnabled()) {
          setRequestUserDetails(currentDetails => {
            for (const req of newRequests) {
              const userData = currentDetails[req.fromUserId];
              const username = userData?.username || 'Someone';
              notifyFriendRequest(req.fromUserId, username);
              // Also send Telegram notification (fires independently)
              notifyTelegramFriendRequest(user.id, username);
            }
            return currentDetails;
          });
        }
        return requests;
      });
      
      // Load details for new requests
      setRequestUserDetails(prevDetails => {
        const newUserIds = requests.map(r => r.fromUserId).filter(id => !prevDetails[id]);
        if (newUserIds.length > 0) {
          const fetchNewUsers = async () => {
            const fetchedDetails = {};
            await Promise.all(
              newUserIds.map(async (uid) => {
                try {
                  const userData = await getUser(uid);
                  if (userData) fetchedDetails[uid] = userData;
                } catch {}
              })
            );
            setRequestUserDetails(current => ({ ...current, ...fetchedDetails }));
          };
          fetchNewUsers();
        }
        return prevDetails;
      });
    });

    const unsubInvites = subscribeToGroupInvites(user.id, async (invites) => {
      setGroupInvites(invites);
      setRequestUserDetails(prevDetails => {
        const newUserIds = invites.map(r => r.invitedBy).filter(id => id && !prevDetails[id]);
        if (newUserIds.length > 0) {
          const fetchNewUsers = async () => {
            const fetchedDetails = {};
            await Promise.all(
              newUserIds.map(async (uid) => {
                try {
                  const userData = await getUser(uid);
                  if (userData) fetchedDetails[uid] = userData;
                } catch {}
              })
            );
            setRequestUserDetails(current => ({ ...current, ...fetchedDetails }));
          };
          fetchNewUsers();
        }
        return prevDetails;
      });
    });

    return () => {
      unsubscribe();
      unsubInvites();
    };
  }, [user?.id]);

  // Fetch suggested friends
  useEffect(() => {
    if (!user?.id) return;
    
    const loadSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const suggestions = await getSuggestedFriends(user.id, 6);
        setSuggestedFriends(suggestions);
      } catch (error) {
        console.error('Error loading suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    
    loadSuggestions();
  }, [user?.id, friends.length]); // Refresh when friends list changes

  // Search for friends
  useEffect(() => {
    if (!friendSearchQuery.trim() || !user?.id) {
      setFriendSearchResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setSearchingFriends(true);
      try {
        const results = await searchUsers(friendSearchQuery, user.id);
        setFriendSearchResults(results);
      } catch (error) {
        console.error('Friend search error:', error);
      } finally {
        setSearchingFriends(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [friendSearchQuery, user?.id]);

  const availableYears = useMemo(() => {
    const years = new Set();
    userPosts.forEach(p => {
      if (p.timestamp) years.add(new Date(p.timestamp).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [userPosts]);

  const filteredPosts = useMemo(() => {
    if (filterType === 'all') return userPosts;
    const now = new Date();
    return userPosts.filter(p => {
      if (!p.timestamp) return false;
      const d = new Date(p.timestamp);
      if (filterType === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (filterType === 'month' && filterMonth !== '') {
        const yr = filterYear || now.getFullYear();
        return d.getMonth() === parseInt(filterMonth) && d.getFullYear() === parseInt(yr);
      }
      if (filterType === 'year' && filterYear) {
        return d.getFullYear() === parseInt(filterYear);
      }
      return true;
    });
  }, [userPosts, filterType, filterMonth, filterYear]);

  const handleLogout = async () => { 
    setLoggingOut(true); 
    await logout(); 
    window.history.replaceState(null, '', '/');
    navigate('/', { replace: true }); 
  };

  const handlePostDeleted = (postId) => setUserPosts(prev => prev.filter(p => p.id !== postId));
  const handlePostUpdated = (updatedPost) => setUserPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
  const handleVoteChanged = (postId, voteData) => setUserPosts(prev =>
    prev.map(p => p.id === postId ? { ...p, upvote_count: voteData.upvote_count, downvote_count: voteData.downvote_count, votes: voteData.votes } : p)
  );

  // Friend request handlers
  const handleAcceptRequest = async (fromUserId) => {
    setProcessingRequest(fromUserId);
    try {
      await acceptFriendRequest(user.id, fromUserId);
      setReceivedRequests(prev => prev.filter(r => r.fromUserId !== fromUserId));
      // Refresh friends list
      const friendsData = await getFriendsWithDetails(user.id);
      setFriends(friendsData);
      toast.success('Friend request accepted!');
      // Notify the original requester via Telegram
      notifyTelegramFriendAccepted(fromUserId, user?.username).catch(() => {});
    } catch (error) {
      toast.error('Failed to accept request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (fromUserId) => {
    setProcessingRequest(fromUserId);
    try {
      await declineFriendRequest(user.id, fromUserId);
      setReceivedRequests(prev => prev.filter(r => r.fromUserId !== fromUserId));
      toast.success('Friend request declined');
    } catch (error) {
      toast.error('Failed to decline request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancelRequest = async (toUserId) => {
    setProcessingRequest(toUserId);
    try {
      await cancelFriendRequest(user.id, toUserId);
      setSentRequests(prev => prev.filter(r => r.toUserId !== toUserId));
      toast.success('Friend request cancelled');
    } catch (error) {
      toast.error('Failed to cancel request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Full Name handlers
  const handleSaveFullName = async () => {
    if (!fullNameInput.trim()) return;
    setSavingFullName(true);
    try {
      await updateFullName(user.id, fullNameInput);
      setProfileData(prev => ({ ...prev, fullName: fullNameInput.trim() }));
      setEditingFullName(false);
      toast.success('Full name updated');
    } catch (err) {
      toast.error('Failed to update full name');
    } finally {
      setSavingFullName(false);
    }
  };

  const handleDeleteFullName = async () => {
    setSavingFullName(true);
    try {
      await deleteFullName(user.id);
      setProfileData(prev => ({ ...prev, fullName: undefined }));
      setDeleteFullNameConfirm(false);
      toast.success('Full name removed');
    } catch (err) {
      toast.error('Failed to remove full name');
    } finally {
      setSavingFullName(false);
    }
  };

  // Bio handlers
  const handleSaveBio = async () => {
    if (!bioInput.trim()) return;
    setSavingBio(true);
    try {
      await updateBio(user.id, bioInput);
      setProfileData(prev => ({ ...prev, bio: bioInput.trim().slice(0, BIO_CHAR_LIMIT) }));
      setEditingBio(false);
      toast.success('Bio updated');
    } catch (err) {
      toast.error('Failed to update bio');
    } finally {
      setSavingBio(false);
    }
  };

  const handleDeleteBio = async () => {
    setSavingBio(true);
    try {
      await deleteBio(user.id);
      setProfileData(prev => ({ ...prev, bio: undefined }));
      setDeleteBioConfirm(false);
      toast.success('Bio removed');
    } catch (err) {
      toast.error('Failed to remove bio');
    } finally {
      setSavingBio(false);
    }
  };

  // Social Link handlers
  const handleAddLink = async () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    if (maxLinksReached) {
      toast.error(`Maximum ${MAX_SOCIAL_LINKS} links allowed`);
      return;
    }
    setSavingLink(true);
    try {
      await addSocialLink(user.id, { name: newLinkName, url: newLinkUrl });
      const currentLinks = profileData?.socialLinks || [];
      setProfileData(prev => ({ 
        ...prev, 
        socialLinks: [...currentLinks, { name: newLinkName.trim(), url: newLinkUrl.trim() }] 
      }));
      setAddingLink(false);
      setNewLinkName('');
      setNewLinkUrl('');
      toast.success('Link added');
    } catch (err) {
      toast.error('Failed to add link');
    } finally {
      setSavingLink(false);
    }
  };

  const handleEditLink = async (index) => {
    if (!editLinkName.trim() || !editLinkUrl.trim()) return;
    setSavingLink(true);
    try {
      await editSocialLink(user.id, index, { name: editLinkName, url: editLinkUrl });
      const updatedLinks = [...(profileData?.socialLinks || [])];
      updatedLinks[index] = { name: editLinkName.trim(), url: editLinkUrl.trim() };
      setProfileData(prev => ({ ...prev, socialLinks: updatedLinks }));
      setEditingLinkIndex(null);
      toast.success('Link updated');
    } catch (err) {
      toast.error('Failed to update link');
    } finally {
      setSavingLink(false);
    }
  };

  const handleDeleteLink = async (index) => {
    setSavingLink(true);
    try {
      await deleteSocialLink(user.id, index);
      const updatedLinks = (profileData?.socialLinks || []).filter((_, i) => i !== index);
      setProfileData(prev => ({ ...prev, socialLinks: updatedLinks }));
      setDeleteLinkConfirm(null);
      toast.success('Link removed');
    } catch (err) {
      toast.error('Failed to remove link');
    } finally {
      setSavingLink(false);
    }
  };

  // Telegram handlers
  const handleSaveTelegram = async () => {
    const trimmed = telegramChatIdInput.trim();
    if (!trimmed) return;
    if (!/^\-?\d+$/.test(trimmed)) {
      toast.error('Invalid Chat ID — must be a number (e.g. 123456789)');
      return;
    }
    setSavingTelegram(true);
    try {
      await saveTelegramChatId(user.id, trimmed);
      setTelegramConnected(true);
      toast.success('Telegram connected! You will now receive notifications.');
    } catch {
      toast.error('Failed to save Telegram Chat ID');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    setSavingTelegram(true);
    try {
      await removeTelegramChatId(user.id);
      setTelegramConnected(false);
      setTelegramChatIdInput('');
      toast.success('Telegram disconnected');
    } catch {
      toast.error('Failed to disconnect Telegram');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleToggleTelegramPrivacy = async () => {
    const newValue = !telegramPrivacy;
    setSavingTelegram(true);
    try {
      await saveTelegramPrivacy(user.id, newValue);
      setTelegramPrivacy(newValue);
      toast.success(newValue ? 'Privacy enabled: Message content hidden' : 'Privacy disabled: Full message previews enabled');
    } catch {
      toast.error('Failed to update privacy setting');
    } finally {
      setSavingTelegram(false);
    }
  };

  // Discord handlers
  const handleSaveDiscord = async () => {
    const trimmed = discordUserIdInput.trim();
    if (!trimmed) return;
    if (!/^\d+$/.test(trimmed)) {
      toast.error('Invalid Discord ID — must be a numeric ID');
      return;
    }
    setSavingDiscord(true);
    try {
      await saveDiscordUserId(user.id, trimmed);
      setDiscordConnected(true);
      toast.success('Discord connected! You will now receive notifications.');
    } catch {
      toast.error('Failed to save Discord User ID');
    } finally {
      setSavingDiscord(false);
    }
  };

  const handleDisconnectDiscord = async () => {
    setSavingDiscord(true);
    try {
      await removeDiscordUserId(user.id);
      setDiscordConnected(false);
      setDiscordUserIdInput('');
      toast.success('Discord disconnected');
    } catch {
      toast.error('Failed to disconnect Discord');
    } finally {
      setSavingDiscord(false);
    }
  };

  const handleToggleDiscordPrivacy = async () => {
    const newValue = !discordPrivacy;
    setSavingDiscord(true);
    try {
      await saveDiscordPrivacy(user.id, newValue);
      setDiscordPrivacy(newValue);
      toast.success(newValue ? 'Privacy enabled: Message content hidden' : 'Privacy disabled: Full message previews enabled');
    } catch {
      toast.error('Failed to update privacy setting');
    } finally {
      setSavingDiscord(false);
    }
  };

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();
  const adminPreviewText = typeof adminMessage?.message === 'string' ? adminMessage.message : '';
  const adminMessageNeedsScroll = adminPreviewText.length > ADMIN_MESSAGE_PREVIEW_LENGTH;

  const handleAdminPopoverToggle = (open) => {
    setAdminPopoverOpen(open);
    if (open && hasUnseenAdminMessage) {
      markAdminMessageSeen();
      setHasUnseenAdminMessage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] pb-28">
      <Header />
      <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-10 pb-32">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#0F172A] dark:hover:text-white discuss:hover:text-[#F5F5F5] text-[13px] font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-none discuss:shadow-none border discuss:border discuss:border-[#333333] p-8 text-center relative rounded-2xl">
          
          {/* Top Right Icons - Share & Info */}
          <div className="absolute top-4 right-4 flex items-center gap-1">
            {adminMessage && (
              <Popover open={adminPopoverOpen} onOpenChange={handleAdminPopoverToggle}>
                <PopoverTrigger asChild>
                  <button
                    className="relative p-2 rounded-full bg-[#EEF2FF] dark:bg-[#0F172A] discuss:bg-[#262626] border border-[#C7D2FE]/70 dark:border-white/20 discuss:border-[#333333] text-[#4338CA] dark:text-[#A5B4FC] discuss:text-[#F5F5F5] hover:scale-105 transition-all shadow-[0_0_16px_rgba(99,102,241,0.18)]"
                    title="Admin Message"
                    aria-label="Admin Message"
                  >
                    <Megaphone className="w-[18px] h-[18px]" />
                    {hasUnseenAdminMessage && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-2 ring-white dark:ring-[#1E293B]" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-white/95 dark:bg-[#101827]/95 discuss:bg-[#1E1E1E]/95 backdrop-blur-xl border border-[#C7D2FE]/50 dark:border-white/15 discuss:border-[#333333] rounded-xl shadow-[0_24px_48px_rgba(15,23,42,0.32)]" align="end">
                  <div className="p-3.5 border-b border-[#E2E8F0] dark:border-white/10 discuss:border-[#333333] flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-gradient-to-tr from-[#EF4444] to-[#2563EB] text-white">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold tracking-wide text-[#0F172A] dark:text-white discuss:text-[#F5F5F5]">ADMIN UPDATE</p>
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">Tech feed notification</p>
                    </div>
                  </div>
                  <div className="px-3.5 py-3">
                    <div
                      className="max-h-40 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 scrollbar-hide"
                      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                    >
                      <div className="text-[13px] leading-relaxed text-[#0F172A] dark:text-[#E2E8F0] discuss:text-[#E5E7EB] break-words whitespace-pre-wrap">
                        <LinkifiedText text={adminPreviewText} />
                      </div>
                    </div>
                    {adminMessageNeedsScroll && (
                      <p className="mt-2 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                        Scroll to read full message.
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {/* Share Button */}
            <button 
              onClick={() => setShowShareModal(true)}
              className="p-2 rounded-full hover:bg-[#F5F5F7] dark:hover:bg-[#0F172A] discuss:hover:bg-[#262626] text-[#6275AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] transition-colors"
              title="Share Profile"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            {/* Info Icon */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-full hover:bg-[#F5F5F7] dark:hover:bg-[#0F172A] discuss:hover:bg-[#262626] text-[#6275AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] transition-colors">
                  <Info className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 bg-white dark:bg-[#1E293B] discuss:bg-[#262626] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]" align="end">
                <div className="space-y-3">
                  <h4 className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm">Profile Settings</h4>
                  
                  <div className="flex items-start gap-2 text-[12px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                    <ImageIcon className="w-4 h-4 mt-0.5 shrink-0 text-[#2563EB] discuss:text-[#EF4444]" />
                    <p>You can upload, replace, or remove your profile picture. All images are securely stored and optimized.</p>
                  </div>
                  
                  <div className="flex items-start gap-2 text-[12px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#2563EB] discuss:text-[#EF4444]" />
                    <p>Password change is currently disabled for security reasons.</p>
                  </div>
                  
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                    <a
                      href="mailto:support@discussit.in"
                      className="flex items-center justify-center gap-2 w-full bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white text-[12px] font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Contact Support
                    </a>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Profile Picture Upload/Replace/Remove */}
          <div className="relative group mx-auto mb-5 w-24 h-24">
            <button 
              onClick={() => user?.photo_url ? setShowImagePreview(true) : null}
              className="w-full h-full rounded-full overflow-hidden block discuss:border discuss:border-[#333333] shadow-lg discuss:shadow-none"
            >
              <UserAvatar
                src={user?.photo_url}
                username={user?.username}
                className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
              />
              {user?.photo_url && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/50 rounded-full p-2">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </button>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="absolute bottom-0 right-0 p-1.5 bg-[#2563EB] discuss:bg-[#EF4444] text-white rounded-full shadow-md hover:scale-110 transition-transform">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-white dark:bg-[#1E293B] discuss:bg-[#262626] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                <div className="p-3 border-b border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                  <h4 className="font-semibold text-sm">Update Profile Picture</h4>
                </div>
                <div className="p-3">
                  {!pendingProfilePic ? (
                    <>
                      <MediaUpload 
                        type="image" 
                        folder="profiles" 
                        onUploadComplete={(result) => setPendingProfilePic(result.url)} 
                      />
                      {user?.photo_url && (
                        <button 
                          onClick={async () => {
                            const { updateProfilePicture } = await import('@/lib/db');
                            await updateProfilePicture(user.id, '');
                            toast.success('Profile picture removed');
                            window.location.reload();
                          }}
                          className="w-full mt-3 flex items-center justify-center gap-2 text-[#EF4444] text-xs font-medium py-2 hover:bg-[#EF4444]/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Current Picture
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border border-neutral-200 dark:border-neutral-700">
                        <img src={pendingProfilePic} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-sm font-medium mb-4 dark:text-neutral-200 discuss:text-neutral-200">Save this profile picture?</p>
                      <div className="flex w-full gap-2">
                        <Button 
                          onClick={() => setPendingProfilePic(null)} 
                          variant="outline" 
                          className="flex-1 dark:border-neutral-600 dark:text-neutral-300"
                          disabled={savingProfilePic}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={async () => {
                            setSavingProfilePic(true);
                            try {
                              const { updateProfilePicture } = await import('@/lib/db');
                              await updateProfilePicture(user.id, pendingProfilePic);
                              toast.success('Profile picture updated!');
                              window.location.reload();
                            } catch (e) {
                              toast.error('Failed to update picture');
                              setSavingProfilePic(false);
                            }
                          }} 
                          className="flex-1 bg-[#2563EB] text-white hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626]"
                          disabled={savingProfilePic}
                        >
                          {savingProfilePic ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <h1 data-testid="profile-username" className="font-heading text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] flex items-center justify-center gap-2">
            <span>{user?.username}</span>
            {user?.verified && <VerifiedBadge size="md" />}
          </h1>
          <p data-testid="profile-email" className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[13px] mt-0.5"><span>{user?.email}</span></p>

          <div className="inline-flex items-center gap-2 bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] discuss:border discuss:border-[#333333] px-4 py-2 mt-4 rounded-lg">
            <FileText className="w-4 h-4 text-[#1D7AFF] discuss:text-[#EF4444]" />
            <span data-testid="profile-post-count" className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[13px] font-semibold">
              {loadingPosts ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : <span>{userPosts.length} Total Posts</span>}
            </span>
          </div>

          {/* Discord Section (Disabled) */}
          <div className="mt-4 opacity-50 cursor-not-allowed">
             <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155]">
               <div className="flex items-center gap-2 text-[#0F172A] dark:text-[#F1F5F9] text-sm">
                 <span className="font-semibold">Discord Integration</span>
               </div>
               <span className="text-[10px] font-bold uppercase bg-[#E2E8F0] dark:bg-[#334155] px-2 py-0.5 rounded text-[#6275AF] dark:text-[#94A3B8]">Coming Soon</span>
             </div>
          </div>

          {!user?.verified && (
            <Button
              onClick={() => setShowVerificationModal(true)}
              variant="outline"
              className="mt-4 border-[#E63946] text-[#E63946] hover:bg-[#E63946]/10 dark:border-[#E63946] dark:hover:bg-[#E63946]/10 discuss:border-[#EF4444] discuss:text-[#EF4444] discuss:hover:bg-[#EF4444]/10"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Request Verification
            </Button>
          )}

          {/* User Admin Message */}
          {user?.admin_message && (
            <div className="mt-6">
              <UserAdminMessage message={user.admin_message} />
            </div>
          )}

          {/* ==================== PROFILE FIELDS ==================== */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-left space-y-4">
            
            {/* Loading indicator for profile data */}
            {loadingProfile && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#6275AF]" />
                <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs">Loading profile...</span>
              </div>
            )}

            {/* Full Name Section */}
            <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-lg discuss:border discuss:border-[#333333]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                  Full Name
                  <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-normal">(optional)</span>
                </label>
                {!editingFullName && profileData?.fullName && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] discuss:hover:bg-[#1a1a1a] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                      <DropdownMenuItem onClick={() => { setEditingFullName(true); setFullNameInput(profileData.fullName || ''); }} className="cursor-pointer text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] focus:bg-[#F5F5F7] dark:focus:bg-[#0F172A] discuss:focus:bg-[#262626]">
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteFullNameConfirm(true)} className="cursor-pointer text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444]">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {editingFullName ? (
                <div className="flex gap-2">
                  <Input 
                    value={fullNameInput} 
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Enter your full name"
                    className="flex-1 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm"
                  />
                  <Button onClick={handleSaveFullName} disabled={savingFullName || !fullNameInput.trim()} size="sm"
                    className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white">
                    {savingFullName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => setEditingFullName(false)} size="sm" variant="outline"
                    className="border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#6275AF]">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : profileData?.fullName ? (
                <p className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm">{profileData.fullName}</p>
              ) : (
                <button onClick={() => { setEditingFullName(true); setFullNameInput(''); }}
                  className="text-[#2563EB] discuss:text-[#EF4444] hover:underline text-sm flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add full name
                </button>
              )}
            </div>

            {/* Bio Section */}
            <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-lg discuss:border discuss:border-[#333333]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                  Bio
                  <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-normal">(max {BIO_CHAR_LIMIT} chars)</span>
                </label>
                {!editingBio && profileData?.bio && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] discuss:hover:bg-[#1a1a1a] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                      <DropdownMenuItem onClick={() => { setEditingBio(true); setBioInput(profileData.bio || ''); }} className="cursor-pointer text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] focus:bg-[#F5F5F7] dark:focus:bg-[#0F172A] discuss:focus:bg-[#262626]">
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteBioConfirm(true)} className="cursor-pointer text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444]">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {editingBio ? (
                <div className="space-y-2">
                  <Textarea 
                    value={bioInput} 
                    onChange={(e) => setBioInput(e.target.value.slice(0, BIO_CHAR_LIMIT))}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${bioInput.length >= BIO_CHAR_LIMIT ? 'text-[#EF4444]' : 'text-[#6275AF] dark:text-[#94A3B8]'}`}>
                      {bioInput.length}/{BIO_CHAR_LIMIT}
                    </span>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveBio} disabled={savingBio || !bioInput.trim()} size="sm"
                        className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white">
                        {savingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                      </Button>
                      <Button onClick={() => setEditingBio(false)} size="sm" variant="outline"
                        className="border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#6275AF]">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : profileData?.bio ? (
                <p className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm whitespace-pre-wrap">{profileData.bio}</p>
              ) : (
                <button onClick={() => { setEditingBio(true); setBioInput(''); }}
                  className="text-[#2563EB] discuss:text-[#EF4444] hover:underline text-sm flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add bio
                </button>
              )}
            </div>

            {/* Social Links Section */}
            <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-lg discuss:border discuss:border-[#333333]">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-medium flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                  Social Links
                  <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-normal">(max {MAX_SOCIAL_LINKS})</span>
                </label>
                <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs">
                  {profileData?.socialLinks?.length || 0}/{MAX_SOCIAL_LINKS}
                </span>
              </div>

              {/* Existing Links */}
              {profileData?.socialLinks?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {profileData.socialLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] p-2 rounded border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                      {editingLinkIndex === index ? (
                        <>
                          <Input 
                            value={editLinkName} 
                            onChange={(e) => setEditLinkName(e.target.value)}
                            placeholder="Link name"
                            className="flex-1 h-8 text-xs bg-transparent border-0 p-0"
                          />
                          <Input 
                            value={editLinkUrl} 
                            onChange={(e) => setEditLinkUrl(e.target.value)}
                            placeholder="URL"
                            className="flex-1 h-8 text-xs bg-transparent border-0 p-0"
                          />
                          <Button onClick={() => handleEditLink(index)} disabled={savingLink} size="sm" className="h-7 px-2 bg-[#2563EB] discuss:bg-[#EF4444]">
                            {savingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </Button>
                          <Button onClick={() => setEditingLinkIndex(null)} size="sm" variant="ghost" className="h-7 px-2">
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className="flex-1 text-[#2563EB] discuss:text-[#60A5FA] hover:underline text-sm flex items-center gap-1">
                            {link.name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-[#F5F5F7] dark:hover:bg-[#0F172A] discuss:hover:bg-[#262626] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                              <DropdownMenuItem onClick={() => { setEditingLinkIndex(index); setEditLinkName(link.name); setEditLinkUrl(link.url); }} className="cursor-pointer text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] focus:bg-[#F5F5F7] dark:focus:bg-[#0F172A] discuss:focus:bg-[#262626]">
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteLinkConfirm(index)} className="cursor-pointer text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444]">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Link */}
              {addingLink ? (
                <div className="space-y-2 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] p-3 rounded border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                  <Input 
                    value={newLinkName} 
                    onChange={(e) => setNewLinkName(e.target.value)}
                    placeholder="Link name (e.g., LinkedIn, GitHub)"
                    className="w-full text-sm bg-transparent"
                  />
                  <Input 
                    value={newLinkUrl} 
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="URL (e.g., https://github.com/username)"
                    className="w-full text-sm bg-transparent"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleAddLink} disabled={savingLink || !newLinkName.trim() || !newLinkUrl.trim()} size="sm"
                      className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white">
                      {savingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Link'}
                    </Button>
                    <Button onClick={() => { setAddingLink(false); setNewLinkName(''); setNewLinkUrl(''); }} size="sm" variant="outline"
                      className="border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#6275AF]">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : !maxLinksReached ? (
                <button onClick={() => setAddingLink(true)}
                  className="text-[#2563EB] discuss:text-[#EF4444] hover:underline text-sm flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> <span>Add social link</span>
                </button>
              ) : (
                <p className="text-[#6275AF] dark:text-[#94A3B8] text-xs"><span>Maximum links reached</span></p>
              )}
            </div>
          </div>
          {/* ==================== END PROFILE FIELDS ==================== */}
          {/* ==================== APP SECURITY ==================== */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-bold"><span>App Security</span></span>
                <button
                  onClick={() => setShowSecurityInfo(prev => !prev)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${showSecurityInfo ? 'bg-[#2563EB] text-white' : 'bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20'}`}
                  aria-label="Security info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              {remoteSettings?.pin && (
                <button
                  onClick={lockNow}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] discuss:text-[#EF4444] px-3 py-1.5 rounded-lg bg-[#2563EB]/10 discuss:bg-[#EF4444]/10 hover:bg-[#2563EB]/20 discuss:hover:bg-[#EF4444]/20 transition-all shadow-sm"
                  title="Lock the app now"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Now</span>
                </button>
              )}
            </div>
            {/* Info Dropdown */}
            {showSecurityInfo && (
              <div className="mb-4 p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/15 animate-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Security Rules</p>
                  </div>
                  <button 
                    onClick={() => setShowSecurityInfo(false)}
                    className="text-[10px] font-bold text-blue-500 hover:underline"
                  >
                    Close
                  </button>
                </div>
                <div className="text-[11px] text-blue-600 dark:text-blue-300 space-y-2 pl-6">
                  <p><span>• App auto-locks after </span><strong>5 minutes</strong><span> of inactivity</span></p>
                  <p><span>• Your PIN is </span><strong>synced across all devices</strong></p>
                  <p><span>• Biometrics (Face/Fingerprint) are </span><strong>device-specific</strong></p>
                  <p><span>• </span><strong>5 wrong attempts</strong><span> will trigger a 5-minute lockout</span></p>
                  <p><span>• Disabling the lock will remove your PIN from </span><strong>all devices</strong></p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] discuss:border discuss:border-[#333333] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${localSettings?.enabled ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]' : 'bg-[#6275AF]/10 text-[#6275AF]'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>App Lock</span></p>
                    <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                      <span>{localSettings?.enabled
                        ? (localSettings?.type === 'biometric' ? 'Active - Biometric + PIN' : 'Active - PIN only')
                        : 'Protect with PIN or Biometrics'}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleSecurity}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localSettings?.enabled ? 'bg-[#2563EB] discuss:bg-[#EF4444]' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                >

                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {localSettings?.enabled && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  {biometricAvailable && (
                    <div className="flex items-center justify-between border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${localSettings?.type === 'biometric' ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]' : 'bg-[#6275AF]/10 text-[#6275AF]'}`}>
                          <BiometricIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>FaceID / Fingerprint</span></p>
                          <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                            <span>{localSettings?.type === 'biometric' ? 'Active - PIN as fallback' : 'Tap to enable biometric unlock'}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleBiometricToggle}
                        disabled={testingBiometric}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localSettings?.type === 'biometric' ? 'bg-[#2563EB] discuss:bg-[#EF4444]' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings?.type === 'biometric' ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  )}
                  <Button onClick={() => setShowChangePinModal(true)} variant="outline" size="sm" className="w-full text-xs text-[#6275AF] flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" />
                    <span>Change Security PIN</span>
                  </Button>
                </div>
              )}

            </div>
          </div>


          {/* ==================== DEVRADAR LOCATION SETTINGS ==================== */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-bold">DevRadar Telemetry Network</span>
              </div>
              
              {/* Dynamic Status Live Pulse Indicator */}
              {shareLocation ? (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 ${theme === 'discuss-light' ? 'rounded-none border-black text-black' : 'rounded-full'}`}>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
                  <span>Telemetry Broadcast Active</span>
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-neutral-500/10 text-neutral-500 border border-neutral-500/25 ${theme === 'discuss-light' ? 'rounded-none border-black text-black' : 'rounded-full'}`}>
                  <span className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-600 rounded-full" />
                  <span>Telemetry Offline</span>
                </div>
              )}
            </div>

            {/* Premium Theme-Tailored Glass/Border Panel */}
            <div className={`p-5 transition-all duration-300 ${
              theme === 'discuss-black'
                ? 'border border-[#FF007F]/20 bg-[#13131A]/90 hover:border-[#FF007F]/35 shadow-[0_4px_25px_rgba(255,0,127,0.06),_0_0_12px_rgba(255,0,127,0.03)] rounded-2xl'
                : theme === 'discuss-light'
                ? 'border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,1)] rounded-none'
                : theme === 'dark'
                ? 'border border-white/10 bg-slate-950/40 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md rounded-2xl'
                : 'border border-slate-200 bg-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] backdrop-blur-md rounded-2xl'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    shareLocation 
                      ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444] discuss-black:text-[#FF007F] discuss-black:bg-[#FF007F]/10' 
                      : 'bg-neutral-500/10 text-neutral-400 dark:text-neutral-500'
                  }`}>
                    <MapPin className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold tracking-tight text-[#0F172A] dark:text-[#F1F5F9] discuss:text-black discuss-black:text-[#F5F5F5]">
                      Geospatial Telemetry Broadcast
                    </p>
                    <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5 leading-relaxed max-w-[220px]">
                      {updatingLocation ? (
                        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin text-[#2563EB] discuss:text-[#EF4444]" /> Synchronizing coordinates...</span>
                      ) : shareLocation ? (
                        <span>Your node specification is broadcasted publicly on the interactive map.</span>
                      ) : (
                        <span>Activate coordinate tracking to become discoverable to nearby developers and community nodes.</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleLocationSharing}
                  disabled={updatingLocation}
                  className={`relative inline-flex h-6 w-11 items-center transition-all duration-300 focus:outline-none ${
                    theme === 'discuss-light' ? 'rounded-none border border-black' : 'rounded-full'
                  } ${
                    shareLocation 
                      ? theme === 'discuss-black'
                        ? 'bg-[#FF007F] shadow-[0_0_10px_rgba(255,0,127,0.5)]'
                        : theme === 'discuss-light'
                        ? 'bg-[#EF4444]'
                        : 'bg-[#2563EB]'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                    theme === 'discuss-light' ? 'rounded-none border-r border-black' : 'rounded-full'
                  } ${shareLocation ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className={`mt-4 pt-4 border-t flex flex-col gap-2.5 ${
                theme === 'discuss-black' 
                  ? 'border-[#FF007F]/10' 
                  : theme === 'discuss-light' 
                  ? 'border-black' 
                  : 'border-[#E2E8F0] dark:border-white/5'
              }`}>
                <Button
                  onClick={() => {
                    setLocationUpdateError('');
                    setLocationUpdateStatus('idle');
                    setShowLocationUpdateModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className={`w-full text-xs font-black uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                    theme === 'discuss-black'
                      ? 'text-[#FF007F] border-[#FF007F]/30 bg-[#FF007F]/5 hover:bg-[#FF007F]/10 hover:border-[#FF007F]/50 rounded-xl'
                      : theme === 'discuss-light'
                      ? 'text-black border-black bg-white hover:bg-neutral-100 rounded-none border-2'
                      : 'text-[#2563EB] border-[#2563EB] bg-[#2563EB]/5 hover:bg-[#2563EB]/10 rounded-xl'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Update Current Location</span>
                </Button>

                {shareLocation && locationCoords && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] font-bold">Node Coordinates:</span>
                      <span className={`font-mono font-bold ${theme === 'discuss-black' ? 'text-[#FF007F]' : theme === 'discuss-light' ? 'text-black' : 'text-[#2563EB]'}`}>
                        {locationCoords.latitude.toFixed(6)}° N, {locationCoords.longitude.toFixed(6)}° E
                      </span>
                    </div>
                    <Button
                      onClick={handleOpenAdjustModal}
                      variant="outline"
                      size="sm"
                      className={`w-full text-xs font-black uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all mt-1 ${
                        theme === 'discuss-black'
                          ? 'text-[#FF007F] border-[#FF007F]/30 bg-[#FF007F]/5 hover:bg-[#FF007F]/10 hover:border-[#FF007F]/50 rounded-xl'
                          : theme === 'discuss-light'
                          ? 'text-black border-black bg-white hover:bg-neutral-100 rounded-none border-2'
                          : 'text-[#2563EB] border-[#2563EB] bg-[#2563EB]/5 hover:bg-[#2563EB]/10 rounded-xl'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Calibrate Precision Node Pin</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-medium"><span>Theme</span></span>
            </div>
            <ThemeSelector />
          </div>

          {/* Notification Settings */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
              <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-medium"><span>Notifications</span></span>
            </div>
            <NotificationToggle />
          </div>

          {/* ==================== TELEGRAM NOTIFICATIONS (PREMIUM UI) ==================== */}
          <div className="mt-8 pt-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#229ED9]/10 flex items-center justify-center rounded-xl">
                  <Send className="w-5 h-5 text-[#229ED9]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>Telegram Alerts</span></h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${telegramConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`}></span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6275AF] dark:text-[#94A3B8]">
                      {telegramConnected ? <span>Verified & Encrypted</span> : <span>Disconnected</span>}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTelegramInstructions(v => !v)}
                className={`p-2 rounded-lg transition-all ${showTelegramInstructions ? 'bg-[#229ED9] text-white shadow-lg shadow-[#229ED9]/20' : 'bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20'}`}
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Instructions panel */}
            {showTelegramInstructions && (
              <div className="mb-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-[#229ED9]">
                  <MessageSquare className="w-4 h-4" />
                  <p className="text-sm font-bold"><span>Bot Connectivity Guide</span></p>
                </div>
                
                <p className="text-[12px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                  <span>Discuss uses an </span><strong>Automated Delivery Agent</strong><span> on Telegram to bypass browser push limitations. Connect your account in seconds:</span>
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-3 rounded-xl">
                    <p className="text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1"><span>1. AUTHENTICATE WITH BOT</span></p>
                    <p className="text-[11px] text-[#6275AF] mb-3"><span>Send </span><span className="font-semibold text-[#229ED9]">/start</span><span> to our official bot to retrieve your secure Chat ID.</span></p>
                    <a href="https://t.me/DiscussNotifications_bot" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1c80b0] text-white text-xs font-bold py-2 rounded-lg transition-all active:scale-95 shadow-md shadow-[#229ED9]/20">
                      <span>Open Telegram Bot</span> <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-3 rounded-xl">
                    <p className="text-[11px] font-bold text-amber-500 mb-1"><span>ALTERNATIVE: GET ID INSTANTLY</span></p>
                    <p className="text-[11px] text-[#6275AF] mb-3"><span>If you don't get the ID from our bot, open </span><a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] font-bold hover:underline">@userinfobot</a><span> or </span><a href="https://t.me/RawDataBot" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] font-bold hover:underline">@RawDataBot</a><span> on Telegram and send a message. It will immediately give you your numeric User ID!</span></p>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-3 rounded-xl">
                    <p className="text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1"><span>2. LINK CHAT ID</span></p>
                    <p className="text-[11px] text-[#6275AF]"><span>Paste your numeric Telegram ID into the input field below and click </span><span className="font-semibold">Connect</span>.</p>
                  </div>
                </div>
              </div>
            )}

            {/* User ID input + action */}
            {loadingTelegram ? (
              <div className="flex items-center justify-center py-6 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-2xl border border-dashed border-[#CBD5E1]">
                <Loader2 className="w-5 h-5 animate-spin text-[#229ED9]" />
              </div>
            ) : telegramConnected ? (
              <div className="space-y-4">
                <div className="bg-[#10B981]/5 border border-[#10B981]/15 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#059669] uppercase tracking-wider"><span>Active Link</span></p>
                      <p className="text-[13px] font-mono text-[#475569] dark:text-[#94A3B8]"><span>{telegramChatIdInput}</span></p>
                    </div>
                  </div>
                  <button onClick={handleDisconnectTelegram} disabled={savingTelegram} className="text-[#6275AF] hover:text-[#EF4444] p-2 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Privacy Card */}
                <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${telegramPrivacy ? 'bg-[#6275AF]/10 text-[#6275AF]' : 'bg-[#229ED9]/10 text-[#229ED9]'}`}>
                        {telegramPrivacy ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </div>
                      <span className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]"><span>Message Previews</span></span>
                    </div>
                    <button
                      onClick={handleToggleTelegramPrivacy}
                      disabled={savingTelegram}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${telegramPrivacy ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-[#10B981]'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${telegramPrivacy ? 'translate-x-1' : 'translate-x-6'}`} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] leading-relaxed">
                    {telegramPrivacy 
                      ? <span>Incognito Mode: Only notifies you of the message source. Full content is only visible inside the Discuss app.</span> 
                      : <span>Real-time Delivery: Pushes complete message text and image previews directly to your Telegram chat.</span>}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 p-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl focus-within:border-[#229ED9] discuss:focus-within:border-[#EF4444] discuss-black:focus-within:border-[#FF007F] transition-all">
                  <Input
                    value={telegramChatIdInput}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^-?\d+$/.test(v)) setTelegramChatIdInput(v);
                    }}
                    placeholder="Telegram Chat ID (e.g. 872125...)"
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm font-mono"
                  />
                  <Button
                    onClick={handleSaveTelegram}
                    disabled={savingTelegram || !telegramChatIdInput.trim()}
                    className="bg-[#229ED9] hover:bg-[#1c80b0] discuss:bg-[#EF4444] discuss:hover:bg-[#d93838] discuss-black:bg-[#FF007F] discuss-black:hover:bg-[#e0006f] text-white font-bold px-5 rounded-xl transition-all shadow-md shadow-[#229ED9]/20 discuss:shadow-[#EF4444]/20 discuss-black:shadow-[#FF007F]/20"
                  >
                    {savingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Connect</span>}
                  </Button>
                </div>
                <p className="text-center text-[11px] text-[#6275AF] font-medium italic">
                   <span>Note: Telegram notifications use industry-standard encryption for privacy.</span>
                </p>
              </div>
            )}
          </div>
          {/* ==================== END TELEGRAM NOTIFICATIONS ==================== */}



          {/* ==================== DISCORD NOTIFICATIONS (PREMIUM UI) ==================== */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#5865F2]/10 flex items-center justify-center rounded-xl">
                  <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.054-.108.001-.23-.106-.271a12.978 12.978 0 0 1-1.883-.894.083.083 0 0 1-.006-.139c.156-.117.311-.235.459-.356a.075.075 0 0 1 .079-.011c3.923 1.793 8.18 1.793 12.061 0a.075.075 0 0 1 .079.011c.148.121.303.239.459.356a.083.083 0 0 1-.006.139 13.06 13.06 0 0 1-1.883.894.083.083 0 0 0-.106.271c.352.699.764 1.365 1.226 1.994.053.072.03.1.084.028a19.839 19.839 0 0 0 6.002-3.03.085.085 0 0 0 .032-.057c.492-5.156-.844-9.626-3.59-13.66a.065.065 0 0 0-.032-.027zM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.947 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>Discord Alerts</span></h3>
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">Coming Soon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full bg-neutral-300`}></span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6275AF] dark:text-[#94A3B8]">
                      <span>Disconnected</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDiscordInstructions(v => !v)}
                className={`p-2 rounded-lg transition-all ${showDiscordInstructions ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20' : 'bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2]/20'}`}
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Instructions panel */}
            {showDiscordInstructions && (
              <div className="mb-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-[#5865F2]">
                  <ShieldCheck className="w-4 h-4" />
                  <p className="text-sm font-bold">Privacy & Security Protocol</p>
                </div>
                
                <p className="text-[12px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                  To maintain end-to-end privacy, Discuss uses an <strong>Encrypted Notification Bridge</strong>. For your security, Discord requires a mutual server connection before allowing encrypted DMs.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-3 rounded-xl">
                    <p className="text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">1. JOIN OFFICIAL SERVER <span className="text-red-500 font-black">(REQUIRED)</span></p>
                    <p className="text-[11px] text-[#6275AF] mb-3">A shared server connection is mandatory for the bot to verify your identity and send private alerts.</p>
                    <a href="https://discord.gg/FNhRA5EK" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold py-2 rounded-lg transition-all active:scale-95 shadow-md shadow-[#5865F2]/20">
                      Join Discuss Community <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-3 rounded-xl">
                    <p className="text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">2. CONFIGURE USER ID</p>
                    <p className="text-[11px] text-[#6275AF]">Enable <span className="font-semibold italic">Developer Mode</span> in Discord settings, right-click your profile, and select <span className="font-semibold text-[#5865F2]">Copy User ID</span>.</p>
                  </div>
                </div>
              </div>
            )}
                {/* User ID input + action (Consolidated Disabled State for Coming Soon) */}
            <div className="opacity-50 pointer-events-none select-none">
              <div className="space-y-3">
                <div className="flex gap-2 p-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl">
                  <Input
                    disabled
                    placeholder="Discord User ID (e.g. 123456789...)"
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm font-mono"
                  />
                  <Button
                    disabled
                    className="bg-[#5865F2] text-white font-bold px-5 rounded-xl transition-all"
                  >
                    <span>Connect</span>
                  </Button>
                </div>
                <p className="text-center text-[11px] text-[#6275AF] font-medium italic">
                   <span>Note: Discord notifications are currently under development.</span>
                </p>
              </div>
            </div>
          </div>
          {/* ==================== END DISCORD NOTIFICATIONS ==================== */}

          <Button data-testid="profile-logout-btn" onClick={handleLogout} disabled={loggingOut}
            className="w-full bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:hover:bg-[#EF4444]/20 discuss:text-[#EF4444] font-semibold py-3 h-12 mt-5 transition-all">
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> <span>Logout</span></span>}
          </Button>
        </div>

        {/* ==================== FRIENDS SECTION ==================== */}
        <div className="mt-6">
          <button
            onClick={() => setShowFriends(!showFriends)}
            className="w-full flex items-center justify-between bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] px-5 py-4 hover:shadow-md dark:hover:shadow-none transition-all rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#10B981]/10 discuss:bg-[#10B981]/10 flex items-center justify-center rounded-lg relative">
                <Users className="w-4 h-4 text-[#10B981]" />
                {receivedRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#F59E0B] text-white text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1">
                    <span>{receivedRequests.length}</span>
                  </span>
                )}
              </div>
              <div className="text-left">
                <h2 className="text-[15px] font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Friends</h2>
                <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs">
                  <span>{friends.length} friend{friends.length !== 1 ? 's' : ''}</span>
                  {receivedRequests.length > 0 && <span> • {receivedRequests.length} pending</span>}
                </p>
              </div>
            </div>
            {showFriends ? <ChevronUp className="w-5 h-5 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]" />}
          </button>

          {showFriends && (
            <div className="mt-4 space-y-4">
              {/* Received Friend Requests */}
              {receivedRequests.length > 0 && (
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[#92400E] dark:text-[#FCD34D] discuss:text-[#FCD34D] mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Friend Requests ({receivedRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {receivedRequests.map((request) => {
                      const reqUser = requestUserDetails[request.fromUserId];
                      
                      return (
                        <div key={request.fromUserId} className="flex items-center justify-between bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                          <button
                            onClick={() => navigate(`/user/${request.fromUserId}`)}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            <UserAvatar
                              src={reqUser?.photo_url}
                              username={reqUser?.username || 'User'}
                              className="w-10 h-10"
                            />
                            <div className="text-left min-w-0">
                              <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm block truncate">
                                <span>@{reqUser?.username || 'Unknown'}</span>
                              </span>
                              <span className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs">
                                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                              </span>
                            </div>
                          </button>
                          <div className="flex gap-2 shrink-0 ml-2">
                            <Button
                              onClick={() => handleAcceptRequest(request.fromUserId)}
                              disabled={processingRequest === request.fromUserId}
                              size="sm"
                              className="bg-[#10B981] hover:bg-[#059669] text-white h-8 px-3"
                            >
                              {processingRequest === request.fromUserId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </Button>
                            <Button
                              onClick={() => handleDeclineRequest(request.fromUserId)}
                              disabled={processingRequest === request.fromUserId}
                              variant="outline"
                              size="sm"
                              className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 h-8 px-3"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {sentRequests.length > 0 && (
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                  <h3 className="text-sm font-semibold text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Sent Requests ({sentRequests.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {sentRequests.map((request) => {
                      const reqUser = requestUserDetails[request.toUserId];
                      
                      return (
                        <div key={request.toUserId} className="flex items-center justify-between bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                          <button
                            onClick={() => navigate(`/user/${request.toUserId}`)}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            <UserAvatar
                              src={reqUser?.photo_url}
                              username={reqUser?.username || 'User'}
                              className="w-10 h-10"
                            />
                            <div className="text-left min-w-0">
                              <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm block truncate">
                                <span>@{reqUser?.username || 'Unknown'}</span>
                              </span>
                              <span className="text-[#F59E0B] text-xs"><span>Pending</span></span>
                            </div>
                          </button>
                          <Button
                            onClick={() => handleCancelRequest(request.toUserId)}
                            disabled={processingRequest === request.toUserId}
                            variant="outline"
                            size="sm"
                            className="border-[#6275AF] text-[#6275AF] hover:bg-[#6275AF]/10 h-8 px-3 shrink-0 ml-2"
                          >
                            {processingRequest === request.toUserId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Find Friends Search */}
              <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                  <span>Find Friends</span>
                </h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]" />
                  <Input
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    placeholder="Search users by username..."
                    className="pl-10 bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] placeholder:text-[#6275AF] dark:placeholder:text-[#94A3B8] discuss:placeholder:text-[#9CA3AF] text-sm"
                  />
                  {friendSearchQuery && (
                    <button
                      onClick={() => setFriendSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] dark:hover:text-white discuss:hover:text-[#F5F5F5]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {searchingFriends ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[#6275AF]" />
                  </div>
                ) : friendSearchResults.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                    {friendSearchResults.map((searchUser) => (
                      <UserSearchResult
                        key={searchUser.id}
                        user={searchUser}
                        currentUserId={user?.id}
                        onClose={() => setFriendSearchQuery('')}
                      />
                    ))}
                  </div>
                ) : friendSearchQuery && !searchingFriends ? (
                  <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-sm text-center py-4">
                    <span>No users found</span>
                  </p>
                ) : null}
              </div>

              {/* Friends List */}
              {loadingFriends ? (
                <div className="flex flex-col items-center justify-center py-8 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] discuss:text-[#EF4444] mb-2" />
                  <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-sm"><span>Loading friends list...</span></p>
                </div>
              ) : friends.length > 0 ? (
                <div className="space-y-4">
                  {/* Suggested Friends Section */}
                  {suggestedFriends.length > 0 && (
                    <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                      <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                        <span>Suggested Friends</span>
                      </h3>
                      {loadingSuggestions ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
                          <span className="ml-2 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-sm"><span>Finding suggestions...</span></span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                          {suggestedFriends.map((suggested) => {
                            
                            return (
                              <div key={suggested.id} className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-3 rounded-lg">
                                <button
                                  onClick={() => navigate(`/user/${suggested.id}`)}
                                  className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                  <UserAvatar
                                    src={suggested?.photo_url}
                                    username={suggested?.username || 'User'}
                                    className="w-10 h-10"
                                  />
                                  <div className="text-left min-w-0">
                                    <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm block truncate flex items-center gap-1">
                                      @{suggested.username}
                                      {suggested.verified && <VerifiedBadge size="xs" />}
                                    </span>
                                    {suggested.mutualCount > 0 && (
                                      <span className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs">
                                        {suggested.mutualCount} mutual friend{suggested.mutualCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                </button>
                                <Button
                                  onClick={() => navigate(`/user/${suggested.id}`)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 shrink-0 ml-2 border-[#2563EB] discuss:border-[#EF4444] text-[#2563EB] discuss:text-[#EF4444] hover:bg-[#2563EB]/10 discuss:hover:bg-[#EF4444]/10"
                                >
                                  <UserPlus className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Your Friends */}
                  <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#10B981]" />
                    Your Friends ({friends.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                    {friends.map((friend) => {
                      
                      return (
                        <div key={friend.id} className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-3 rounded-lg">
                          <button
                            onClick={() => navigate(`/user/${friend.id}`)}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            <UserAvatar
                              src={friend?.photo_url}
                              username={friend?.username || 'User'}
                              className="w-10 h-10"
                            />
                            <div className="text-left min-w-0">
                              <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm block truncate">
                                @{friend.username}
                              </span>
                              {friend.verified && <VerifiedBadge size="xs" />}
                            </div>
                          </button>
                          <Button
                            onClick={() => navigate(`/chat/${friend.id}`)}
                            size="sm"
                            className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white h-8 px-3 shrink-0 ml-2"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Suggested Friends for users without friends */}
                  {suggestedFriends.length > 0 && (
                    <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                      <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                        People You May Know
                      </h3>
                      {loadingSuggestions ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
                          <span className="ml-2 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-sm">Finding people...</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                          {suggestedFriends.map((suggested) => {
                            
                            return (
                              <div key={suggested.id} className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-3 rounded-lg">
                                <button
                                  onClick={() => navigate(`/user/${suggested.id}`)}
                                  className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                  {suggested.photo_url ? (
                                    <UserAvatar src={suggested.photo_url} username={suggested.username} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] discuss:from-[#EF4444] discuss:to-[#F59E0B] flex items-center justify-center">
                                      <span className="text-white text-sm font-bold">{initials}</span>
                                    </div>
                                  )}
                                  <div className="text-left min-w-0">
                                    <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm block truncate flex items-center gap-1">
                                      <span>@{suggested.username}</span>
                                      {suggested.verified && <VerifiedBadge size="xs" />}
                                    </span>
                                  </div>
                                </button>
                                <Button
                                  onClick={() => navigate(`/user/${suggested.id}`)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 shrink-0 ml-2 border-[#2563EB] discuss:border-[#EF4444] text-[#2563EB] discuss:text-[#EF4444] hover:bg-[#2563EB]/10 discuss:hover:bg-[#EF4444]/10"
                                >
                                  <UserPlus className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-center py-8 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                    <Users className="w-10 h-10 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mx-auto mb-3" />
                    <h3 className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] font-semibold mb-1"><span>No friends yet</span></h3>
                    <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-sm">
                      <span>Search for users above to connect</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* ==================== END FRIENDS SECTION ==================== */}

        {/* Your Posts Section */}
        <div className="mt-6">
          <button
            data-testid="your-posts-toggle"
            onClick={() => setShowPosts(!showPosts)}
            className="w-full flex items-center justify-between bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] px-5 py-4 hover:shadow-md dark:hover:shadow-none transition-all rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#2563EB]/10 discuss:bg-[#EF4444]/10 flex items-center justify-center rounded-lg">
                <FileText className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
              </div>
              <div className="text-left">
                <h2 className="text-[15px] font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>Your Posts</span></h2>
                <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs"><span>{userPosts.length} post{userPosts.length !== 1 ? 's' : ''}</span></p>
              </div>
            </div>
            {showPosts ? <ChevronUp className="w-5 h-5 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]" />}
          </button>

          {showPosts && (
            <div className="mt-4 space-y-4">
              {/* Filter bar */}
              <div data-testid="post-filter-bar" className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl px-3 py-2.5">
                <Filter className="w-3.5 h-3.5 text-[#6275AF] dark:text-[#94A3B8]" />
                <select
                  data-testid="filter-type-select"
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setFilterMonth(''); setFilterYear(''); }}
                  className="bg-[#F5F5F7] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F1F5F9] rounded-lg px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                >
                  <option value="all"><span>All Posts</span></option>
                  <option value="this_month"><span>This Month</span></option>
                  <option value="month"><span>Select Month</span></option>
                  <option value="year"><span>Select Year</span></option>
                </select>

                {filterType === 'month' && (
                  <>
                    <select
                      data-testid="filter-month-select"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-[#F5F5F7] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F1F5F9] rounded-lg px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select
                      data-testid="filter-month-year-select"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="bg-[#F5F5F7] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F1F5F9] rounded-lg px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                    >
                      <option value="">Year</option>
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </>
                )}

                {filterType === 'year' && (
                  <select
                    data-testid="filter-year-select"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-[#F5F5F7] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F1F5F9] rounded-lg px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                  >
                    <option value="">Year</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}

                {filterType !== 'all' && (
                  <span className="text-[#6275AF] dark:text-[#94A3B8] text-[11px] ml-auto">
                    <span>{filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''}</span>
                  </span>
                )}
              </div>

              {loadingPosts ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#6275AF]" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155]">
                  <Calendar className="w-8 h-8 text-[#6275AF] dark:text-[#94A3B8] mx-auto mb-2" />
                  <p className="text-[#6275AF] dark:text-[#94A3B8] text-[13px]">
                    <span>{filterType === 'all' ? "You haven't created any posts yet." : 'No posts found for this period.'}</span>
                  </p>
                </div>
              ) : (
                filteredPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={user}
                    onDeleted={handlePostDeleted}
                    onUpdated={handlePostUpdated}
                    onVoteChanged={handleVoteChanged}
                    onTagClick={() => {}}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Your Pulses Section */}
        <div className="mt-6">
          <button
            data-testid="your-pulses-toggle"
            onClick={() => setShowPulses(!showPulses)}
            className="w-full flex items-center justify-between bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] px-5 py-4 hover:shadow-md dark:hover:shadow-none transition-all rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#EF4444]/10 discuss:bg-[#EF4444]/10 flex items-center justify-center rounded-lg">
                <PlayCircle className="w-4 h-4 text-[#EF4444] discuss:text-[#EF4444]" />
              </div>
              <div className="text-left">
                <h2 className="text-[15px] font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>Your Pulses</span></h2>
                <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs"><span>{userPulses.length} video{userPulses.length !== 1 ? 's' : ''}</span></p>
              </div>
            </div>
            {showPulses ? <ChevronUp className="w-5 h-5 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]" />}
          </button>

          {showPulses && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {loadingPosts ? (
                <div className="col-span-full flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#6275AF]" />
                </div>
              ) : userPulses.length === 0 ? (
                <div className="col-span-full text-center py-10 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155]">
                  <PlayCircle className="w-8 h-8 text-[#6275AF] dark:text-[#94A3B8] mx-auto mb-2" />
                  <p className="text-[#6275AF] dark:text-[#94A3B8] text-[13px]">
                    <span>You haven't posted any Pulse videos yet.</span>
                  </p>
                </div>
              ) : (
                userPulses.map(pulse => (
                  <div key={pulse.id} className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all" onClick={() => navigate('/pulse')}>
                    <video src={pulse.videoUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <PlayCircle className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-semibold truncate drop-shadow-md">
                      {pulse.caption || 'Pulse Video'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <p className="text-center text-[#94A3B8] dark:text-[#6275AF] text-xs mt-6 mb-24">
          <span>Managed by </span><span className="font-semibold text-[#BC4800]">&lt;discuss&gt;</span>
        </p>
      </div>

      <VerificationRequestModal 
        open={showVerificationModal} 
        onClose={() => setShowVerificationModal(false)}
        user={user}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal 
        open={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={user?.photo_url}
        altText={user?.username}
      />

      {/* Delete Full Name Confirmation */}
      <AlertDialog open={deleteFullNameConfirm} onOpenChange={setDeleteFullNameConfirm}>
        <AlertDialogContent className="dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#262626] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>Remove full name?</span></AlertDialogTitle>
            <AlertDialogDescription className="dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
              <span>This will remove your full name from your profile.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155] discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333]">
              <span>Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFullName} disabled={savingFullName} className="bg-[#EF4444] text-white hover:bg-[#DC2626]">
              {savingFullName ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Remove</span>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Bio Confirmation */}
      <AlertDialog open={deleteBioConfirm} onOpenChange={setDeleteBioConfirm}>
        <AlertDialogContent className="dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#262626] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>Remove bio?</span></AlertDialogTitle>
            <AlertDialogDescription className="dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
              <span>This will remove your bio from your profile.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155] discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333]">
              <span>Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBio} disabled={savingBio} className="bg-[#EF4444] text-white hover:bg-[#DC2626]">
              {savingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Remove</span>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Link Confirmation */}
      <AlertDialog open={deleteLinkConfirm !== null} onOpenChange={(v) => { if (!v) setDeleteLinkConfirm(null); }}>
        <AlertDialogContent className="dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#262626] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"><span>Remove link?</span></AlertDialogTitle>
            <AlertDialogDescription className="dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
              <span>This will remove this social link from your profile.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155] discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333]">
              <span>Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteLink(deleteLinkConfirm)} disabled={savingLink} className="bg-[#EF4444] text-white hover:bg-[#DC2626]">
              {savingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Remove</span>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Share Modal */}
      <ProfileShareModal 
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        username={user?.username}
      />

      
      {/* PIN Modals */}
      <AlertDialog open={showPinModal} onOpenChange={setShowPinModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Set Security PIN</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px]">
              Set a 6-digit PIN. This will protect your account on all devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">New PIN</label>
              <div className="relative">
                <Input 
                  type={showNewPin ? "text" : "password"} 
                  maxLength={6} 
                  value={newPin} 
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="••••••" 
                  className="text-center text-xl tracking-[1em] font-mono pr-10" 
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] transition-colors"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">Confirm PIN</label>
              <div className="relative">
                <Input 
                  type={showConfirmPin ? "text" : "password"} 
                  maxLength={6} 
                  value={confirmPin} 
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="••••••" 
                  className="text-center text-xl tracking-[1em] font-mono pr-10" 
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] transition-colors"
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="flex flex-col gap-2">
            <Button onClick={handleSavePinAndEnable} disabled={savingPin} className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white">
              {savingPin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save & Enable
            </Button>
            <Button variant="ghost" onClick={() => setShowPinModal(false)} disabled={savingPin} className="w-full">Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showChangePinModal} onOpenChange={setShowChangePinModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Change PIN</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px]">
              Enter your old PIN and set a new 6-digit PIN.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">Old PIN</label>
              <div className="relative">
                <Input 
                  type={showOldPin ? "text" : "password"} 
                  maxLength={6} 
                  value={oldPin} 
                  onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="••••••" 
                  className="text-center text-xl tracking-[1em] font-mono pr-10" 
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPin(!showOldPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] transition-colors"
                >
                  {showOldPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">New PIN</label>
              <div className="relative">
                <Input 
                  type={showNewPin ? "text" : "password"} 
                  maxLength={6} 
                  value={newPin} 
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="••••••" 
                  className="text-center text-xl tracking-[1em] font-mono pr-10" 
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] transition-colors"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">Confirm New PIN</label>
              <div className="relative">
                <Input 
                  type={showConfirmPin ? "text" : "password"} 
                  maxLength={6} 
                  value={confirmPin} 
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="••••••" 
                  className="text-center text-xl tracking-[1em] font-mono pr-10" 
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] transition-colors"
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-center -mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowChangePinModal(false);
                  setShowForgotPinModal(true);
                }}
                className="text-[10px] font-bold text-[#6275AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] transition-colors"
              >
                Forgot your PIN?
              </button>
            </div>
          </div>
          <AlertDialogFooter className="flex flex-col gap-2">
            <Button onClick={handleUpdatePin} disabled={savingPin} className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white">
              {savingPin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update PIN
            </Button>
            <Button variant="ghost" onClick={() => setShowChangePinModal(false)} disabled={savingPin} className="w-full">Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forgot PIN Recovery Modal */}
      <AlertDialog open={showForgotPinModal} onOpenChange={setShowForgotPinModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex flex-col items-center gap-3">
              <img
                src="/favicon-new.png"
                alt="Discuss"
                className="w-16 h-16 rounded-2xl shadow-lg object-cover border-2 border-red-50"
              />
              <span className="text-red-600">PIN Recovery</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px] space-y-3 leading-relaxed">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-2 shadow-inner">
                <p className="font-black mb-1 uppercase tracking-wider" style={{ color: '#991b1b' }}>IMPORTANT NOTICE</p>
                <p className="leading-relaxed font-bold" style={{ color: '#b91c1c' }}>
                  Account recovery is only possible if you are the <strong>ethical owner</strong> of this account.
                </p>
              </div>
              <p className="text-[#6275AF] dark:text-[#94A3B8]">
                Unauthorized attempts will result in the <strong>PERMANENT DISABLING</strong> of this account.
              </p>
              <div className="bg-[#F5F5F7] dark:bg-[#0F172A] p-2 rounded-lg italic text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-[#334155]">
                &quot;I declare and accept the account recovery terms and confirm I am the rightful owner.&quot;
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 mt-4">
            <Button
              onClick={() => {
                const subject = encodeURIComponent(`PIN Recovery Request - ${user?.email}`);
                const body = encodeURIComponent(
                  `Hello Discuss Support,\n\n` +
                  `I am writing to request recovery for my App Lock PIN.\n\n` +
                  `I declare and accept that account recovery is only possible for the ethical owner of the account. I understand that any unauthorized attempt may result in the permanent disabling of my account.\n\n` +
                  `I declare and accept the account recovery terms and confirm I am the rightful owner.\n\n` +
                  `User Email: ${user?.email}\n` +
                  `Device: ${navigator.userAgent}\n\n` +
                  `Thank you.`
                );
                window.location.href = `mailto:support@discussit.in?subject=${subject}&body=${body}`;
              }}
              className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white text-xs font-bold py-2.5 rounded-xl shadow-md hover:scale-[1.02] transition-transform"
            >
              SEND RECOVERY EMAIL
            </Button>
            <Button variant="ghost" onClick={() => setShowForgotPinModal(false)} className="w-full text-xs font-bold py-2.5 rounded-xl">
              CANCEL
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showVerifyPinModal} onOpenChange={setShowVerifyPinModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Verify Identity</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px]">
              Please enter your 6-digit PIN to confirm this security change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="relative">
              <Input 
                type={showOldPin ? "text" : "password"} 
                maxLength={6} 
                value={oldPin} 
                onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))} 
                placeholder="••••••" 
                className="text-center text-xl tracking-[1em] font-mono pr-10" 
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowOldPin(!showOldPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] transition-colors"
              >
                {showOldPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter className="flex flex-col gap-2">
            <Button onClick={handleVerifyAndEnableBiometric} disabled={savingPin} className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white">
              {savingPin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify PIN
            </Button>
            <Button variant="ghost" onClick={() => setShowVerifyPinModal(false)} disabled={savingPin} className="w-full">Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable App Lock Modal */}
      <AlertDialog open={showDisableLockModal} onOpenChange={setShowDisableLockModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-red-600">Disable App Lock</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px]">
              Enter your current PIN to confirm. This will remove your PIN from all devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="relative">
              <Input
                type={showDisablePin ? 'text' : 'password'}
                maxLength={6}
                value={disablePinInput}
                onChange={e => setDisablePinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter current PIN"
                className="text-center text-xl tracking-[1em] font-mono pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowDisablePin(!showDisablePin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6275AF] hover:text-[#0F172A] transition-colors"
              >
                {showDisablePin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter className="flex flex-col gap-2">
            <Button onClick={handleDisableLock} disabled={disablingLock} className="w-full bg-red-500 hover:bg-red-600 text-white">
              {disablingLock ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Disable App Lock
            </Button>
            <Button variant="ghost" onClick={() => setShowDisableLockModal(false)} disabled={disablingLock} className="w-full">Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CurrentLocationUpdateModal
        open={showLocationUpdateModal}
        status={locationUpdateStatus}
        errorMessage={locationUpdateError}
        theme={theme}
        onClose={() => {
          if (locationUpdateStatus === 'loading') return;
          setShowLocationUpdateModal(false);
          setLocationUpdateStatus('idle');
        }}
        onConfirm={handleConfirmLiveLocationUpdate}
        onRetry={handleConfirmLiveLocationUpdate}
      />

      {/* Precise Location Adjust Modal */}
      {showAdjustLocationModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg p-5 rounded-2xl bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
                <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] uppercase tracking-tight">
                  Adjust Precise Location
                </h3>
              </div>
              <button
                onClick={() => setShowAdjustLocationModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#6275AF] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="bg-blue-50 dark:bg-blue-950/30 discuss:bg-[#262626] border border-blue-200 dark:border-blue-800 discuss:border-[#333] rounded-xl px-3 py-2.5 flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">📍</span>
              <p className="text-xs text-blue-800 dark:text-blue-200 discuss:text-[#9CA3AF] leading-relaxed font-medium">
                <strong>Tap anywhere on the map</strong> to drop your pin at that location, or <strong>drag the existing marker</strong> to move it. Once you're happy with the position, tap <strong>"Confirm Pin Location"</strong> to save.
              </p>
            </div>

            {/* Coordinates Real-time Display */}
            {tempCoords && (
              <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#111] p-3 rounded-xl border border-neutral-200 dark:border-white/5 discuss:border-black flex justify-between items-center text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6275AF] dark:text-[#94A3B8]">Latitude</span>
                  <span className="font-mono font-bold text-sm text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#EF4444]">
                    {tempCoords.latitude.toFixed(6)}
                  </span>
                </div>
                <div className="h-6 w-[1px] bg-neutral-300 dark:bg-white/10 discuss:bg-[#333]" />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6275AF] dark:text-[#94A3B8]">Longitude</span>
                  <span className="font-mono font-bold text-sm text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#EF4444]">
                    {tempCoords.longitude.toFixed(6)}
                  </span>
                </div>
              </div>
            )}

            {/* Map Area */}
            <div className="relative w-full h-[300px] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 discuss:border-black shadow-inner">
              <div
                ref={adjustMapContainerRef}
                className={`w-full h-full ${
                  theme === 'dark' ? 'dark-map' : theme === 'discuss-black' ? 'discuss-black-map' : ''
                }`}
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] pt-3">
              <Button
                variant="outline"
                onClick={() => setShowAdjustLocationModal(false)}
                className="flex-1 text-xs font-bold uppercase py-2.5 discuss:border-black text-neutral-600 dark:text-neutral-300 discuss:text-black hover:bg-black/5 dark:hover:bg-white/5 rounded-xl active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdjustedLocation}
                className="flex-1 text-xs font-bold uppercase py-2.5 rounded-xl bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-md shadow-blue-500/20 discuss:shadow-red-500/20 hover:brightness-105 active:scale-95 transition-all"
              >
                Confirm Pin Location
              </Button>
            </div>
          </div>
        </div>
      )}

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
