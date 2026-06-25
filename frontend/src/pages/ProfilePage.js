import UserAvatar from '@/components/UserAvatar';
import MediaUpload from '@/components/MediaUpload';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import L from 'leaflet';
import { getPosts, getUser } from '@/lib/db';
import { getUserPulses } from '@/lib/pulseDb';
import { getEligibleDiscussionsCount, OFFICIAL_BADGES, BadgeIcon } from '@/components/Badges';
import { getUserTalentGraph, updateUserSkills, saveAIInsights, logAIAction } from '@/lib/talentGraphDb';
import { discoverUserSkills, analyzeUserProfile } from '@/lib/ai';

const PREDEFINED_SKILLS = [
  'React', 'Node.js', 'Python', 'Cybersecurity', 'Data Science',
  'AI/ML', 'Firebase', 'Supabase', 'Flutter', 'DevOps', 'UI/UX', 'Cloud'
];

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
import Sidebar from '@/components/Sidebar';
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
  Eye, EyeOff, MessageSquare, Shield, Smartphone, Fingerprint as BiometricIcon, SendHorizontal as Send, MapPin, Trophy
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

  // Online Visibility Setting
  const [onlineVisibility, setOnlineVisibility] = useState(true);
  const [showOnlineVisibilityConfirm, setShowOnlineVisibilityConfirm] = useState(false);
  const [pendingVisibilityValue, setPendingVisibilityValue] = useState(true);
  // Collapsible settings categories toggles
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // Discussion Achievements badge states
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);


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

  // TalentGraph states
  const [skills, setSkills] = useState([]);
  const [editingSkills, setEditingSkills] = useState(false);
  const [selectedSkillsInput, setSelectedSkillsInput] = useState([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);

  const [aiInsights, setAiInsights] = useState(null);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [analyzingProfile, setAnalyzingProfile] = useState(false);

  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [discoveringSkills, setDiscoveringSkills] = useState(false);

  // Fetch skills and insights from database
  useEffect(() => {
    if (user?.id) {
      getUserTalentGraph(user.id).then(tg => {
        if (tg) {
          setSkills(tg.skills || []);
          setAiInsights(tg.aiInsights || null);
        }
      }).catch(console.error);
    }
  }, [user?.id]);

  const handleSaveSkills = async () => {
    if (selectedSkillsInput.length === 0) {
      toast.error('Please select or enter at least one skill.');
      return;
    }
    setSavingSkills(true);
    try {
      await updateUserSkills(user.id, selectedSkillsInput);
      setSkills(selectedSkillsInput);
      setEditingSkills(false);
      await logAIAction(user.id, 'skills_update', `Updated skills manually: ${selectedSkillsInput.join(', ')}`);
      toast.success('Skills updated');
    } catch (err) {
      toast.error('Failed to update skills');
    } finally {
      setSavingSkills(false);
    }
  };

  const handleAddCustomSkillInProfile = () => {
    const skill = customSkillInput.trim();
    if (!skill) return;
    if (selectedSkillsInput.some(s => s.toLowerCase() === skill.toLowerCase())) {
      toast.error('Skill already selected');
      return;
    }
    if (selectedSkillsInput.length >= 6) {
      toast.error('Maximum of 6 skills allowed');
      return;
    }
    setSelectedSkillsInput(prev => [...prev, skill]);
    setCustomSkillInput('');
  };

  const handleDiscoverSkills = async () => {
    setDiscoveringSkills(true);
    try {
      const bio = profileData?.bio || '';
      const result = await discoverUserSkills(bio, userPosts);
      if (result && result.suggestedSkills && result.suggestedSkills.length > 0) {
        const filtered = result.suggestedSkills.filter(s => !skills.some(cs => cs.toLowerCase() === s.toLowerCase()));
        if (filtered.length === 0) {
          toast.info('No new skills discovered based on your profile.');
        } else {
          setSuggestedSkills(filtered);
          toast.success('AI suggested skills based on your posts');
        }
      } else {
        toast.info('No skills detected from your posts.');
      }
    } catch (err) {
      toast.error('AI is currently busy. Try again later.');
    } finally {
      setDiscoveringSkills(false);
    }
  };

  const handleAddSuggestedSkill = async (skill) => {
    if (skills.length >= 6) {
      toast.error('Maximum of 6 skills allowed.');
      return;
    }
    const updated = [...skills, skill];
    try {
      await updateUserSkills(user.id, updated);
      setSkills(updated);
      setSuggestedSkills(prev => prev.filter(s => s !== skill));
      await logAIAction(user.id, 'skill_discovered', `Added AI discovered skill: ${skill}`);
      toast.success(`Added ${skill}`);
    } catch (err) {
      toast.error('Failed to add skill');
    }
  };

  const handleAnalyzeProfile = async () => {
    setAnalyzingProfile(true);
    try {
      const bio = profileData?.bio || '';
      const result = await analyzeUserProfile(bio, skills, userPosts);
      if (result) {
        await saveAIInsights(user.id, result);
        setAiInsights(result);
        await logAIAction(user.id, 'profile_analysis', 'Regenerated profile AI Insights');
        toast.success('AI Insights generated');
      } else {
        toast.error('Failed to generate insights');
      }
    } catch (err) {
      toast.error('AI is currently busy. Try again later.');
    } finally {
      setAnalyzingProfile(false);
    }
  };

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
          if (data && data.isOnlineVisible !== undefined) {
            setOnlineVisibility(data.isOnlineVisible);
          }
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

  const eligibleCount = getEligibleDiscussionsCount(userPosts);
  const unlockedBadgesCount = OFFICIAL_BADGES.filter(b => eligibleCount >= b.target).length;

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] pb-28">
      <Header />
      <div className="w-full max-w-5xl lg:max-w-[1300px] mx-auto px-4 lg:px-6 py-6 md:py-10 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 mt-6">
          <Sidebar />
          <div className="min-w-0 flex-1">
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
          <div className="relative group mx-auto mb-5 w-24 h-24 overflow-visible">
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
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-[#2563EB] discuss:bg-[#EF4444] text-white rounded-full shadow-lg hover:scale-110 transition-transform border-2 border-white dark:border-[#1E293B] discuss:border-[#121212] z-10">
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

        </div>

        {/* ==================== ACHIEVEMENTS & BADGES ==================== */}
        <div className="mt-6 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border discuss:border-[#333333] rounded-2xl overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-neutral-50/50 dark:hover:bg-[#0F172A]/40 discuss:hover:bg-[#222222]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-[15px] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Discussion Achievements</h3>
                <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5">Earn official badges by publishing high-quality technical discussions</p>
              </div>
            </div>
            {showAchievements ? <ChevronUp className="w-5 h-5 text-[#6275AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF]" />}
          </button>

          {showAchievements && (
            <div className="px-6 pb-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] text-left animate-in slide-in-from-top-2 duration-300 space-y-5">
              <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] border border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] px-4 py-2 rounded-xl shrink-0 inline-flex items-center gap-2">
                <span className="text-xs text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] font-bold">Unlocked:</span>
                <span className="text-sm font-black text-blue-600 discuss:text-[#EF4444]">{unlockedBadgesCount} / 5</span>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-4">
                {OFFICIAL_BADGES.map((badge) => {
                  const isLocked = eligibleCount < badge.target;
                  return (
                    <button
                      key={badge.id}
                      onClick={() => handleBadgeClick(badge)}
                      className="flex flex-col items-center p-4 rounded-2xl bg-neutral-50/70 dark:bg-[#0F172A]/40 discuss:bg-[#222222]/30 hover:bg-neutral-100 dark:hover:bg-[#0F172A]/80 discuss:hover:bg-[#222222]/60 border border-neutral-200/50 dark:border-white/5 discuss:border-white/5 hover:border-neutral-300 dark:hover:border-white/10 discuss:hover:border-white/10 hover:shadow-md transition-all duration-300 active:scale-95 group"
                    >
                      <div className="relative mb-2 shrink-0">
                        <BadgeIcon badge={badge} isLocked={isLocked} size="md" className="group-hover:scale-105 transition-transform" />
                      </div>
                      <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 discuss:text-neutral-300 text-center line-clamp-1">
                        {badge.badgeText}
                      </span>
                      <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-500 discuss:text-neutral-500 mt-1">
                        {eligibleCount >= badge.target ? (
                          <span className="text-emerald-500 font-extrabold uppercase">Unlocked</span>
                        ) : (
                          <span>{eligibleCount} / {badge.target}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ==================== SETTINGS CATEGORIES STACK ==================== */}
        <div className="mt-6 space-y-4">

          {/* Category 1: Profile Details */}
          <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border discuss:border-[#333333] rounded-2xl overflow-hidden transition-all duration-300">
            <button
              onClick={() => setShowProfileSettings(!showProfileSettings)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-neutral-50/50 dark:hover:bg-[#0F172A]/40 discuss:hover:bg-[#222222]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-[15px] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Profile Details</h3>
                  <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5">Manage your display name, bio, social links, and theme</p>
                </div>
              </div>
              {showProfileSettings ? <ChevronUp className="w-5 h-5 text-[#6275AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF]" />}
            </button>

            {showProfileSettings && (
              <div className="px-6 pb-6 pt-2 space-y-4 border-t border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] text-left animate-in slide-in-from-top-2 duration-300">
                {/* Loading indicator for profile data */}
                {loadingProfile && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6275AF]" />
                    <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs">Loading profile details...</span>
                  </div>
                )}

                {/* Full Name Section */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                      Full Name
                      <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-normal">(optional)</span>
                    </label>
                    {!editingFullName && profileData?.fullName && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] discuss:hover:bg-[#1a1a1a] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-xl shadow-lg">
                          <DropdownMenuItem onClick={() => { setEditingFullName(true); setFullNameInput(profileData.fullName || ''); }} className="cursor-pointer text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] focus:bg-[#F5F5F7] dark:focus:bg-[#0F172A] discuss:focus:bg-[#262626] rounded-lg">
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteFullNameConfirm(true)} className="cursor-pointer text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444] rounded-lg">
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
                        className="flex-1 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm rounded-xl"
                      />
                      <Button onClick={handleSaveFullName} disabled={savingFullName || !fullNameInput.trim()} size="sm"
                        className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white rounded-xl px-3.5">
                        {savingFullName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button onClick={() => setEditingFullName(false)} size="sm" variant="outline"
                        className="border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#6275AF] rounded-xl px-3.5">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : profileData?.fullName ? (
                    <p className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm pl-6">{profileData.fullName}</p>
                  ) : (
                    <button onClick={() => { setEditingFullName(true); setFullNameInput(''); }}
                      className="text-[#2563EB] discuss:text-[#EF4444] hover:underline text-sm flex items-center gap-1.5 pl-6 font-medium">
                      <Plus className="w-4 h-4" /> Add full name
                    </button>
                  )}
                </div>

                {/* Bio Section */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                      Bio
                      <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-normal">(max {BIO_CHAR_LIMIT} chars)</span>
                    </label>
                    {!editingBio && profileData?.bio && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] discuss:hover:bg-[#1a1a1a] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-xl shadow-lg">
                          <DropdownMenuItem onClick={() => { setEditingBio(true); setBioInput(profileData.bio || ''); }} className="cursor-pointer text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] focus:bg-[#F5F5F7] dark:focus:bg-[#0F172A] discuss:focus:bg-[#262626] rounded-lg">
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteBioConfirm(true)} className="cursor-pointer text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444] rounded-lg">
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
                        className="w-full bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm resize-none rounded-xl p-3"
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${bioInput.length >= BIO_CHAR_LIMIT ? 'text-[#EF4444] font-bold' : 'text-[#6275AF] dark:text-[#94A3B8]'}`}>
                          {bioInput.length}/{BIO_CHAR_LIMIT}
                        </span>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveBio} disabled={savingBio || !bioInput.trim()} size="sm"
                            className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white rounded-xl px-4">
                            {savingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                          </Button>
                          <Button onClick={() => setEditingBio(false)} size="sm" variant="outline"
                            className="border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#6275AF] rounded-xl px-4">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : profileData?.bio ? (
                    <p className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm pl-6 whitespace-pre-wrap leading-relaxed">{profileData.bio}</p>
                  ) : (
                    <button onClick={() => { setEditingBio(true); setBioInput(''); }}
                      className="text-[#2563EB] discuss:text-[#EF4444] hover:underline text-sm flex items-center gap-1.5 pl-6 font-medium">
                      <Plus className="w-4 h-4" /> Add bio
                    </button>
                  )}
                </div>

                {/* Social Links Section */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333]">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-semibold flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                      Social Links
                      <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-normal">(max {MAX_SOCIAL_LINKS})</span>
                    </label>
                    <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-bold bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                      {profileData?.socialLinks?.length || 0}/{MAX_SOCIAL_LINKS}
                    </span>
                  </div>

                  {/* Existing Links */}
                  {profileData?.socialLinks?.length > 0 && (
                    <div className="space-y-2 mb-3 pl-6">
                      {profileData.socialLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] p-2 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
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
                              <Button onClick={() => handleEditLink(index)} disabled={savingLink} size="sm" className="h-7 px-2.5 bg-[#2563EB] discuss:bg-[#EF4444] rounded-lg">
                                {savingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </Button>
                              <Button onClick={() => setEditingLinkIndex(null)} size="sm" variant="ghost" className="h-7 px-2.5 rounded-lg">
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <a href={link.url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 text-[#2563EB] discuss:text-[#60A5FA] hover:underline text-sm font-semibold flex items-center gap-1.5 truncate">
                                {link.name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 rounded hover:bg-[#F5F5F7] dark:hover:bg-[#0F172A] discuss:hover:bg-[#262626] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-xl">
                                  <DropdownMenuItem onClick={() => { setEditingLinkIndex(index); setEditLinkName(link.name); setEditLinkUrl(link.url); }} className="cursor-pointer text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] focus:bg-[#F5F5F7] dark:focus:bg-[#0F172A] discuss:focus:bg-[#262626] rounded-lg">
                                    <Pencil className="w-4 h-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeleteLinkConfirm(index)} className="cursor-pointer text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444] rounded-lg">
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
                  <div className="pl-6">
                    {addingLink ? (
                      <div className="space-y-2 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                        <Input 
                          value={newLinkName} 
                          onChange={(e) => setNewLinkName(e.target.value)}
                          placeholder="Link name (e.g., LinkedIn, GitHub)"
                          className="w-full text-xs bg-transparent rounded-lg"
                        />
                        <Input 
                          value={newLinkUrl} 
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="URL (e.g., https://github.com/username)"
                          className="w-full text-xs bg-transparent rounded-lg"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button onClick={handleAddLink} disabled={savingLink || !newLinkName.trim() || !newLinkUrl.trim()} size="sm"
                            className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white rounded-lg px-3">
                            {savingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Link'}
                          </Button>
                          <Button onClick={() => { setAddingLink(false); setNewLinkName(''); setNewLinkUrl(''); }} size="sm" variant="outline"
                            className="border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#6275AF] rounded-lg px-3">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : !maxLinksReached ? (
                      <button onClick={() => setAddingLink(true)}
                        className="text-[#2563EB] discuss:text-[#EF4444] hover:underline text-sm flex items-center gap-1.5 font-medium">
                        <Plus className="w-4 h-4" /> <span>Add social link</span>
                      </button>
                    ) : (
                      <p className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-bold"><span>Maximum links reached</span></p>
                    )}
                  </div>
                </div>

                {/* Skills Section */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                      Skills
                      <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs font-normal">(max 6 skills)</span>
                    </label>
                    {!editingSkills && skills.length > 0 && (
                      <button onClick={() => { setEditingSkills(true); setSelectedSkillsInput(skills); }}
                        className="p-1.5 rounded hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] discuss:hover:bg-[#1a1a1a] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] transition-colors cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {editingSkills ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {PREDEFINED_SKILLS.map(s => {
                          const isSel = selectedSkillsInput.includes(s);
                          return (
                            <button key={s} type="button" onClick={() => {
                              if (isSel) {
                                setSelectedSkillsInput(prev => prev.filter(x => x !== s));
                              } else {
                                if (selectedSkillsInput.length >= 6) {
                                  toast.error('Maximum of 6 skills allowed');
                                  return;
                                }
                                setSelectedSkillsInput(prev => [...prev, s]);
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer ${isSel ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900' : 'bg-transparent text-neutral-600 border-neutral-200 dark:text-neutral-400 dark:border-neutral-800'}`}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={customSkillInput} 
                          onChange={(e) => setCustomSkillInput(e.target.value)}
                          placeholder="Custom skill"
                          className="flex-1 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm h-8"
                          maxLength={20}
                        />
                        <Button onClick={handleAddCustomSkillInProfile} size="sm" variant="outline" className="h-8 text-xs border-[#E2E8F0] cursor-pointer">Add</Button>
                      </div>
                      
                      {selectedSkillsInput.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedSkillsInput.map(s => (
                            <span key={s} className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded text-xs">
                              {s}
                              <button type="button" onClick={() => setSelectedSkillsInput(prev => prev.filter(x => x !== s))} className="text-red-500 font-bold ml-1 cursor-pointer">&times;</button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-2">
                        <Button onClick={handleSaveSkills} disabled={savingSkills} size="sm" className="bg-[#2563EB] discuss:bg-[#EF4444] text-white cursor-pointer">
                          Save
                        </Button>
                        <Button onClick={() => setEditingSkills(false)} size="sm" variant="outline" className="border-[#E2E8F0] cursor-pointer">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {skills.map(s => (
                        <span key={s} className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] text-neutral-800 dark:text-neutral-200 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-xs font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => { setEditingSkills(true); setSelectedSkillsInput([]); }}
                      className="text-[#2563EB] discuss:text-[#EF4444] hover:underline text-sm flex items-center gap-1.5 pl-6 font-medium cursor-pointer">
                      <Plus className="w-4 h-4" /> <span>Add skills</span>
                    </button>
                  )}

                  {/* AI Skill Discovery Sub-widget */}
                  {!editingSkills && (
                    <div className="mt-4 pt-3 border-t border-neutral-200/50 dark:border-neutral-800/50 pl-6">
                      {suggestedSkills.length > 0 ? (
                        <div className="space-y-2 bg-blue-50/30 dark:bg-blue-950/10 p-2.5 rounded-lg border border-blue-200/40 dark:border-blue-900/40">
                          <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                            AI noticed you work with:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestedSkills.map(s => (
                              <button key={s} onClick={() => handleAddSuggestedSkill(s)}
                                className="bg-white dark:bg-neutral-850 hover:bg-neutral-100 text-[#2563EB] dark:text-[#60A5FA] px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-900 font-semibold transition-colors cursor-pointer">
                                + {s}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setSuggestedSkills([])} className="text-[10px] text-neutral-400 hover:text-neutral-600 block mt-1 cursor-pointer">Dismiss suggestions</button>
                        </div>
                      ) : (
                        <button
                          onClick={handleDiscoverSkills}
                          disabled={discoveringSkills}
                          className="text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {discoveringSkills ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Discovering skills...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] discuss:text-[#EF4444]" />
                              <span>Scan profile for technical skills (AI)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Display Theme Selector */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-semibold flex items-center gap-2">
                      🎨 Application Theme
                    </span>
                  </div>
                  <div className="pl-6">
                    <ThemeSelector />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category 2: App Security */}
          <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border discuss:border-[#333333] rounded-2xl overflow-hidden transition-all duration-300">
            <button
              onClick={() => setShowSecuritySettings(!showSecuritySettings)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-neutral-50/50 dark:hover:bg-[#0F172A]/40 discuss:hover:bg-[#222222]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-[15px] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">App Security</h3>
                  <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5">Configure PIN lock, biometric parameters, and lockout limits</p>
                </div>
              </div>
              {showSecuritySettings ? <ChevronUp className="w-5 h-5 text-[#6275AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF]" />}
            </button>

            {showSecuritySettings && (
              <div className="px-6 pb-6 pt-2 space-y-4 border-t border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] text-left animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-bold">App Lock Protection</span>
                    <button
                      onClick={() => setShowSecurityInfo(prev => !prev)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${showSecurityInfo ? 'bg-[#2563EB] text-white shadow' : 'bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20'}`}
                      aria-label="Security info"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {remoteSettings?.pin && (
                    <button
                      onClick={lockNow}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] discuss:text-[#EF4444] px-3 py-1.5 rounded-xl bg-[#2563EB]/10 discuss:bg-[#EF4444]/10 hover:bg-[#2563EB]/20 discuss:hover:bg-[#EF4444]/20 transition-all shadow-sm active:scale-95"
                      title="Lock the app now"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Now</span>
                    </button>
                  )}
                </div>

                {/* Info Dropdown */}
                {showSecurityInfo && (
                  <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/15 animate-in slide-in-from-top-2 duration-300">
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
                  <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] discuss:border discuss:border-[#333333] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${localSettings?.enabled ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]' : 'bg-[#6275AF]/10 text-[#6275AF]'}`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">PIN Lock Status</p>
                        <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5">
                          <span>{localSettings?.enabled
                            ? (localSettings?.type === 'biometric' ? 'Active - Biometric + PIN' : 'Active - PIN only')
                            : 'Protect app access with a secure PIN'}</span>
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
                    <div className="space-y-3 pl-2 animate-in slide-in-from-top-2 duration-300">
                      {biometricAvailable && (
                        <div className="flex items-center justify-between border border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] rounded-xl p-4 bg-[#F8FAFC] dark:bg-slate-950/20">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${localSettings?.type === 'biometric' ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]' : 'bg-[#6275AF]/10 text-[#6275AF]'}`}>
                              <BiometricIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">FaceID / Fingerprint</p>
                              <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5">
                                <span>{localSettings?.type === 'biometric' ? 'Active - PIN as backup fallback' : 'Tap to register biometric scanner'}</span>
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
                      <Button onClick={() => setShowChangePinModal(true)} variant="outline" size="sm" className="w-full text-xs text-[#6275AF] flex items-center justify-center gap-2 rounded-xl py-4 hover:bg-neutral-50 border-neutral-200 dark:border-white/5">
                        <Key className="w-4 h-4" />
                        <span>Change Security PIN Code</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Category 3: DevRadar Telemetry */}
          <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border discuss:border-[#333333] rounded-2xl overflow-hidden transition-all duration-300">
            <button
              onClick={() => setShowLocationSettings(!showLocationSettings)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-neutral-50/50 dark:hover:bg-[#0F172A]/40 discuss:hover:bg-[#222222]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-[15px] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">DevRadar Telemetry</h3>
                  <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5">Manage live geolocated node broadcasts and pin calibration</p>
                </div>
              </div>
              {showLocationSettings ? <ChevronUp className="w-5 h-5 text-[#6275AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF]" />}
            </button>

            {showLocationSettings && (
              <div className="px-6 pb-6 pt-2 space-y-4 border-t border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] text-left animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                    <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-bold">DevRadar Telemetry Network</span>
                  </div>
                  
                  {/* Dynamic Status Live Pulse Indicator */}
                  {shareLocation ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
                      <span>Telemetry Broadcast Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-wider bg-neutral-500/10 text-neutral-500 border border-neutral-500/25 rounded-full">
                      <span className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-600 rounded-full" />
                      <span>Telemetry Offline</span>
                    </div>
                  )}
                </div>

                {/* Theme-Tailored Premium Layout Panel */}
                <div className={`p-5 transition-all duration-300 ${
                  theme === 'discuss-black'
                    ? 'border border-[#FF007F]/20 bg-[#13131A]/90 hover:border-[#FF007F]/35 shadow-[0_4px_25px_rgba(255,0,127,0.06)] rounded-2xl'
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
                          ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]' 
                          : 'bg-neutral-500/10 text-neutral-400 dark:text-neutral-500'
                      }`}>
                        <MapPin className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-extrabold tracking-tight text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">
                          Geospatial Broadcast State
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
                      className={`relative inline-flex h-6 w-11 items-center transition-all duration-300 focus:outline-none rounded-full ${
                        shareLocation 
                          ? theme === 'discuss-black'
                            ? 'bg-[#FF007F]'
                            : 'bg-[#EF4444]'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform bg-white transition-transform rounded-full ${shareLocation ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className={`mt-4 pt-4 border-t flex flex-col gap-2.5 ${
                    theme === 'discuss-light' ? 'border-black' : 'border-[#E2E8F0] dark:border-white/5'
                  }`}>
                    <Button
                      onClick={() => {
                        setLocationUpdateError('');
                        setLocationUpdateStatus('idle');
                        setShowLocationUpdateModal(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-black uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all rounded-xl py-3 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Update Current Coordinates</span>
                    </Button>

                    {shareLocation && locationCoords && (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center text-xs px-1">
                          <span className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] font-bold">Node Coordinates:</span>
                          <span className="font-mono font-bold text-blue-600 discuss:text-[#EF4444]">
                            {locationCoords.latitude.toFixed(6)}° N, {locationCoords.longitude.toFixed(6)}° E
                          </span>
                        </div>
                        <Button
                          onClick={handleOpenAdjustModal}
                          variant="outline"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${onlineVisibility ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${onlineVisibility ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Category 4: Notifications & Integrations */}
          <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border discuss:border-[#333333] rounded-2xl overflow-hidden transition-all duration-300">
            <button
              onClick={() => setShowNotificationSettings(!showNotificationSettings)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-neutral-50/50 dark:hover:bg-[#0F172A]/40 discuss:hover:bg-[#222222]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-[15px] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Notifications & Integrations</h3>
                  <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-0.5">Toggle push alerts, configure Telegram bot, and Discord sync</p>
                </div>
              </div>
              {showNotificationSettings ? <ChevronUp className="w-5 h-5 text-[#6275AF]" /> : <ChevronDown className="w-5 h-5 text-[#6275AF]" />}
            </button>

            {showNotificationSettings && (
              <div className="px-6 pb-6 pt-2 space-y-4 border-t border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] text-left animate-in slide-in-from-top-2 duration-300">
                {/* Standard Notification Switch */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333]">
                  <NotificationToggle />
                </div>

                {/* ==================== TELEGRAM NOTIFICATIONS ==================== */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#229ED9]/10 flex items-center justify-center rounded-xl">
                        <Send className="w-5 h-5 text-[#229ED9]" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Telegram Alerts</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${telegramConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`}></span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6275AF] dark:text-[#94A3B8]">
                            {telegramConnected ? <span>Active & Verified</span> : <span>Disconnected</span>}
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
                    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] rounded-xl p-4 shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 text-[#229ED9]">
                        <MessageSquare className="w-4 h-4" />
                        <p className="text-xs font-bold">Bot Connectivity Guide</p>
                      </div>
                      
                      <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                        <span>Discuss uses an automated delivery bot on Telegram to bypass browser push limitations. Link your chat in seconds:</span>
                      </p>

                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="bg-neutral-50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-neutral-100 dark:border-white/5">
                          <p className="text-[10px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">1. AUTHENTICATE WITH BOT</p>
                          <p className="text-[10px] text-[#6275AF] mb-2">Send <span className="font-semibold text-[#229ED9]">/start</span> to retrieve your secure Chat ID.</p>
                          <a href="https://t.me/DiscussNotifications_bot" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 bg-[#229ED9] hover:bg-[#1c80b0] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm">
                            <span>Launch Telegram Bot</span> <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <div className="bg-neutral-50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-neutral-100 dark:border-white/5">
                          <p className="text-[10px] font-bold text-amber-500 mb-1">ALTERNATIVE: GET ID INSTANTLY</p>
                          <p className="text-[10px] text-[#6275AF]">Open <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] font-bold hover:underline">@userinfobot</a> on Telegram and send a message. It returns your numeric ID immediately!</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Telegram inputs */}
                  {loadingTelegram ? (
                    <div className="flex items-center justify-center py-4 bg-white dark:bg-[#1E293B] rounded-xl border border-dashed border-[#CBD5E1]">
                      <Loader2 className="w-5 h-5 animate-spin text-[#229ED9]" />
                    </div>
                  ) : telegramConnected ? (
                    <div className="space-y-3">
                      <div className="bg-white dark:bg-[#1E293B] border border-neutral-200 dark:border-white/5 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Active Link</p>
                            <p className="text-[12px] font-mono font-bold text-[#475569] dark:text-[#94A3B8]">{telegramChatIdInput}</p>
                          </div>
                        </div>
                        <button onClick={handleDisconnectTelegram} disabled={savingTelegram} className="text-[#6275AF] hover:text-[#EF4444] p-2 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Privacy Card */}
                      <div className="bg-white dark:bg-[#1E293B] border border-neutral-200 dark:border-white/5 rounded-xl p-3.5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${telegramPrivacy ? 'bg-[#6275AF]/10 text-[#6275AF]' : 'bg-[#229ED9]/10 text-[#229ED9]'}`}>
                              {telegramPrivacy ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </div>
                            <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Message Previews</span>
                          </div>
                          <button
                            onClick={handleToggleTelegramPrivacy}
                            disabled={savingTelegram}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${telegramPrivacy ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-green-500'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${telegramPrivacy ? 'translate-x-0.5' : 'translate-x-4.5'}`} />
                          </button>
                        </div>
                        <p className="text-[10px] text-[#6275AF] dark:text-[#94A3B8] leading-relaxed">
                          {telegramPrivacy 
                            ? <span>Incognito Mode: Only notifies you of the message source. Full content is only visible inside the Discuss app.</span> 
                            : <span>Real-time Delivery: Pushes complete message text and image previews directly to your Telegram chat.</span>}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2 p-1 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus-within:border-[#229ED9] transition-all">
                        <Input
                          value={telegramChatIdInput}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === '' || /^-?\d+$/.test(v)) setTelegramChatIdInput(v);
                          }}
                          placeholder="Telegram Chat ID (e.g. 872125...)"
                          className="flex-1 bg-transparent border-none focus-visible:ring-0 text-xs font-mono h-9"
                        />
                        <Button
                          onClick={handleSaveTelegram}
                          disabled={savingTelegram || !telegramChatIdInput.trim()}
                          className="bg-[#229ED9] hover:bg-[#1c80b0] text-white font-bold px-4 h-9 rounded-lg transition-all"
                        >
                          {savingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Connect</span>}
                        </Button>
                      </div>
                      <p className="text-center text-[10px] text-[#6275AF] font-semibold italic">
                         <span>Note: Telegram notifications use industry-standard encryption for privacy.</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* ==================== DISCORD NOTIFICATIONS ==================== */}
                <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] p-4 rounded-xl discuss:border discuss:border-[#333333] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#5865F2]/10 flex items-center justify-center rounded-xl">
                        <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.054-.108.001-.23-.106-.271a12.978 12.978 0 0 1-1.883-.894.083.083 0 0 1-.006-.139c.156-.117.311-.235.459-.356a.075.075 0 0 1 .079-.011c3.923 1.793 8.18 1.793 12.061 0a.075.075 0 0 1 .079.011c.148.121.303.239.459.356a.083.083 0 0 1-.006.139 13.06 13.06 0 0 1-1.883.894.083.083 0 0 0-.106.271c.352.699.764 1.365 1.226 1.994.053.072.03.1.084.028a19.839 19.839 0 0 0 6.002-3.03.085.085 0 0 0 .032-.057c.492-5.156-.844-9.626-3.59-13.66a.065.065 0 0 0-.032-.027zM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.947 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Discord Alerts</h3>
                          <span className="bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">Coming Soon</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6275AF] dark:text-[#94A3B8]">Disconnected</span>
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
                    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333] rounded-xl p-4 shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 text-[#5865F2]">
                        <ShieldCheck className="w-4 h-4" />
                        <p className="text-xs font-bold">Privacy & Security Protocol</p>
                      </div>
                      
                      <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                        To maintain privacy, Discuss uses an encrypted notification bridge. Discord requires a mutual server connection before allowing encrypted DMs:
                      </p>

                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="bg-neutral-50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-neutral-100 dark:border-white/5">
                          <p className="text-[10px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">1. JOIN OFFICIAL SERVER <span className="text-red-500 font-bold">(REQUIRED)</span></p>
                          <p className="text-[10px] text-[#6275AF] mb-2">A shared server connection is mandatory for the bot to verify your identity.</p>
                          <a href="https://discord.gg/FNhRA5EK" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm">
                            <span>Join Discuss Server</span> <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <div className="bg-neutral-50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-neutral-100 dark:border-white/5">
                          <p className="text-[10px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">2. CONFIGURE USER ID</p>
                          <p className="text-[10px] text-[#6275AF]">Enable Developer Mode in Discord settings, right-click your profile, and select <span className="font-semibold text-[#5865F2]">Copy User ID</span>.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discord input */}
                  <div className="opacity-50 pointer-events-none select-none">
                    <div className="space-y-3">
                      <div className="flex gap-2 p-1 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
                        <Input
                          disabled
                          placeholder="Discord User ID (e.g. 123456789...)"
                          className="flex-1 bg-transparent border-none focus-visible:ring-0 text-xs font-mono h-9"
                        />
                        <Button
                          disabled
                          className="bg-[#5865F2] text-white font-bold px-4 h-9 rounded-lg"
                        >
                          <span>Connect</span>
                        </Button>
                      </div>
                      <p className="text-center text-[10px] text-[#6275AF] font-semibold italic">
                         <span>Note: Discord notifications are currently under development.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      {/* Online Status Visibility Confirmation Modal */}
      {showOnlineVisibilityConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0F172A] discuss:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-white/10 discuss:border-[#333333] rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-2 rounded-full ${pendingVisibilityValue ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                {pendingVisibilityValue ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">
                  {pendingVisibilityValue ? 'Show Online Status?' : 'Hide Online Status?'}
                </h3>
                <p className="mt-1.5 text-xs text-[#6275AF] dark:text-[#94A3B8] leading-relaxed">
                  {pendingVisibilityValue 
                    ? "If you turn this on, other users will be able to see when you are online and your last seen time across Discuss." 
                    : "If you turn this off, you will appear completely offline to everyone. You won't have a green dot on DevRadar or anywhere else."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowOnlineVisibilityConfirm(false)}
                className="flex-1 text-xs font-bold px-3 py-2.5 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#F5F5F7] dark:hover:bg-[#1E293B] discuss:hover:bg-[#262626] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOnlineVisibility}
                className={`flex-1 text-xs font-bold px-3 py-2.5 rounded-xl transition-all active:scale-95 text-white ${pendingVisibilityValue ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#EF4444] hover:bg-[#DC2626]'}`}
              >
                {pendingVisibilityValue ? 'Show Status' : 'Hide Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Detail Dialog Modal */}
      <AlertDialog open={showBadgeModal} onOpenChange={setShowBadgeModal}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-2xl shadow-2xl p-6">
          {selectedBadge && (
            <div className="space-y-6 text-left">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] uppercase tracking-tight flex items-center gap-2">
                  🏅 Badge Details
                </h3>
                <button
                  onClick={() => setShowBadgeModal(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-[#334155] discuss:hover:bg-[#262626] text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-neutral-50/70 dark:bg-[#0F172A]/40 discuss:bg-[#222222]/30 border border-neutral-100 dark:border-white/5 discuss:border-white/5">
                <div className="relative mb-4">
                  <BadgeIcon badge={selectedBadge} isLocked={eligibleCount < selectedBadge.target} size="lg" />
                </div>
                <h4 className="text-base font-extrabold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">
                  {selectedBadge.name}
                </h4>
                <p className="text-xs text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mt-2 px-4 leading-relaxed font-semibold">
                  {selectedBadge.description}
                </p>
                
                <div className="mt-4 bg-white dark:bg-[#0F172A] discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-[#334155] discuss:border-[#333333] px-4 py-2 rounded-xl shadow-sm">
                  <span className="text-xs text-neutral-500 font-bold">Status: </span>
                  {eligibleCount >= selectedBadge.target ? (
                    <span className="text-emerald-500 text-xs font-black uppercase tracking-wider">Unlocked</span>
                  ) : (
                    <span className="text-amber-500 text-xs font-black uppercase tracking-wider">Locked ({eligibleCount}/{selectedBadge.target})</span>
                  )}
                </div>
              </div>

              {/* Rules section */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  How to achieve:
                </h5>
                <div className="bg-[#EF4444]/5 dark:bg-[#EF4444]/10 discuss:bg-[#EF4444]/5 border border-[#EF4444]/10 rounded-2xl p-4">
                  <p className="text-xs text-[#b91c1c] dark:text-[#EF4444] discuss:text-[#F87171] leading-relaxed font-semibold">
                    {selectedBadge.rules}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-neutral-500">Discussions count progress:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">{eligibleCount} / {selectedBadge.target}</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 discuss:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      eligibleCount >= selectedBadge.target 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 discuss:from-red-500 discuss:to-orange-500'
                    }`}
                    style={{ width: `${Math.min(100, (eligibleCount / selectedBadge.target) * 100)}%` }}
                  />
                </div>
              </div>

              <Button
                onClick={() => setShowBadgeModal(false)}
                className="w-full bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white font-bold py-3 rounded-xl text-xs uppercase"
              >
                Got It
              </Button>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>

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
