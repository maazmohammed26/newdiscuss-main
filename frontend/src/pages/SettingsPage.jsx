import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSecurity } from '@/contexts/SecurityContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NotificationToggle from '@/components/NotificationToggle';
import { useInteractionFeedback } from '@/hooks/useInteractionFeedback';
import {
  ArrowLeft,
  User,
  Shield,
  Moon,
  Sun,
  Monitor,
  MapPin,
  Bell,
  Volume2,
  VolumeX,
  FileText,
  Lock,
  Smartphone,
  ExternalLink,
  LogOut,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Check,
  X,
  HelpCircle,
  Award,
  Sparkles,
  Send,
  MoreHorizontal
} from 'lucide-react';
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
  MAX_SOCIAL_LINKS,
} from '@/lib/userProfileDb';
import {
  getUserLocation,
  saveUserLocation,
  deleteUserLocation,
} from '@/lib/firebaseSixth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { soundsEnabled, toggleSounds } = useInteractionFeedback();
  const {
    localSettings,
    remoteSettings,
    updatePin,
    setSecurityEnabled,
    setSecurityType,
    disableAppLock,
  } = useSecurity();

  // Profile data
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Full Name states
  const [editingFullName, setEditingFullName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user?.full_name || user?.name || '');
  const [savingFullName, setSavingFullName] = useState(false);
  const [deleteFullNameConfirm, setDeleteFullNameConfirm] = useState(false);

  // Bio states
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [deleteBioConfirm, setDeleteBioConfirm] = useState(false);

  // Social link states
  const [showAddSocialLink, setShowAddSocialLink] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState('github');
  const [socialUrl, setSocialUrl] = useState('');
  const [editingSocialIndex, setEditingSocialIndex] = useState(null);
  const [savingSocialLink, setSavingSocialLink] = useState(false);

  // Security states
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Load profile data
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    getUserProfile(user.id)
      .then((data) => {
        if (mounted && data) {
          setProfileData(data);
          if (data.fullName) setFullNameInput(data.fullName);
          if (data.bio) setBioInput(data.bio);
        }
      })
      .catch((err) => console.warn('Error loading profile:', err))
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    getUserLocation(user.id)
      .then((loc) => {
        if (mounted && loc) setUserLocation(loc);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Handle contextual ?section=profile routing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'profile') {
      setEditingFullName(true);
      setEditingBio(true);
      const timer = setTimeout(() => {
        const el = document.getElementById('settings-profile-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const nameInput = document.getElementById('settings-display-name-input');
        if (nameInput) {
          nameInput.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  // Full Name handlers
  const handleSaveFullName = async () => {
    if (!user?.id) return;
    setSavingFullName(true);
    try {
      const updated = await updateFullName(user.id, fullNameInput.trim());
      setProfileData(updated);
      setEditingFullName(false);
      toast.success('Full name updated');
    } catch (err) {
      toast.error('Failed to update name');
    } finally {
      setSavingFullName(false);
    }
  };

  const handleDeleteFullName = async () => {
    if (!user?.id) return;
    try {
      const updated = await deleteFullName(user.id);
      setProfileData(updated);
      setFullNameInput('');
      setDeleteFullNameConfirm(false);
      toast.success('Full name removed');
    } catch (err) {
      toast.error('Failed to remove name');
    }
  };

  // Bio handlers
  const handleSaveBio = async () => {
    if (!user?.id) return;
    setSavingBio(true);
    try {
      const updated = await updateBio(user.id, bioInput.trim());
      setProfileData(updated);
      setEditingBio(false);
      toast.success('Bio updated');
    } catch (err) {
      toast.error('Failed to update bio');
    } finally {
      setSavingBio(false);
    }
  };

  const handleDeleteBio = async () => {
    if (!user?.id) return;
    try {
      const updated = await deleteBio(user.id);
      setProfileData(updated);
      setBioInput('');
      setDeleteBioConfirm(false);
      toast.success('Bio removed');
    } catch (err) {
      toast.error('Failed to remove bio');
    }
  };

  // Social link handlers
  const handleSaveSocialLink = async () => {
    if (!user?.id || !socialUrl.trim()) return;
    setSavingSocialLink(true);
    try {
      let updated;
      if (editingSocialIndex !== null) {
        updated = await editSocialLink(user.id, editingSocialIndex, {
          platform: socialPlatform,
          url: socialUrl.trim(),
        });
      } else {
        updated = await addSocialLink(user.id, {
          platform: socialPlatform,
          url: socialUrl.trim(),
        });
      }
      setProfileData(updated);
      setShowAddSocialLink(false);
      setSocialUrl('');
      setEditingSocialIndex(null);
      toast.success('Social link saved');
    } catch (err) {
      toast.error('Failed to save link');
    } finally {
      setSavingSocialLink(false);
    }
  };

  const handleDeleteSocialLink = async (index) => {
    if (!user?.id) return;
    try {
      const updated = await deleteSocialLink(user.id, index);
      setProfileData(updated);
      toast.success('Social link removed');
    } catch (err) {
      toast.error('Failed to remove link');
    }
  };

  // App Lock PIN setup
  const handleSetPin = async () => {
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    try {
      await updatePin(newPin);
      setSecurityEnabled(true);
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
      setPinError('');
      toast.success('App lock PIN configured');
    } catch (err) {
      setPinError('Failed to save PIN');
    }
  };

  const isProfileContext = new URLSearchParams(location.search).get('section') === 'profile';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white pb-28 select-none">
      <Header />
      <div className="w-full max-w-5xl lg:max-w-[1240px] mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] justify-center gap-6">
          <Sidebar />

          <main className="w-full max-w-2xl mx-auto min-w-0 flex-1 px-4 py-3">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200 dark:border-[#262626]">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5px]" />
                <span>Back</span>
              </button>
              <h1 className="text-base font-bold text-neutral-900 dark:text-white">
                Settings & Privacy
              </h1>
              <div className="w-12" />
            </div>

            <div className="space-y-6">
              {/* Section 1: Account Profile Info */}
              <section
                id="settings-profile-section"
                className={`scroll-mt-6 bg-white dark:bg-[#111111] rounded-2xl border overflow-hidden shadow-xs transition-all duration-300 ${
                  isProfileContext
                    ? 'border-[#0095F6] ring-2 ring-[#0095F6]/30'
                    : 'border-neutral-200/80 dark:border-[#262626]'
                }`}
              >
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#222222] flex items-center gap-2.5">
                  <User className="w-4 h-4 text-[#0095F6]" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Profile Information
                  </h2>
                </div>

                <div className="p-5 space-y-4">
                  {/* Full Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        Display Name
                      </span>
                      {!editingFullName && profileData?.fullName && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingFullName(true); setFullNameInput(profileData.fullName); }}
                            className="text-xs font-semibold text-[#0095F6] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <span className="text-neutral-300 dark:text-neutral-700">•</span>
                          <button
                            onClick={() => setDeleteFullNameConfirm(true)}
                            className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {editingFullName ? (
                      <div className="flex gap-2">
                        <Input
                          id="settings-display-name-input"
                          value={fullNameInput}
                          onChange={(e) => setFullNameInput(e.target.value)}
                          placeholder="Your display name"
                          maxLength={50}
                          className="h-10 text-sm"
                        />
                        <Button
                          onClick={handleSaveFullName}
                          disabled={savingFullName}
                          size="sm"
                          className="bg-[#0095F6] hover:bg-[#1877F2] text-white"
                        >
                          {savingFullName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                        </Button>
                        <Button
                          onClick={() => setEditingFullName(false)}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/60 dark:border-[#262626]">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {profileData?.fullName || <span className="text-neutral-400">Not set</span>}
                        </span>
                        {!profileData?.fullName && (
                          <button
                            onClick={() => setEditingFullName(true)}
                            className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
                          >
                            + Add Name
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        Bio ({profileData?.bio?.length || 0}/{BIO_CHAR_LIMIT})
                      </span>
                      {!editingBio && profileData?.bio && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingBio(true); setBioInput(profileData.bio); }}
                            className="text-xs font-semibold text-[#0095F6] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <span className="text-neutral-300 dark:text-neutral-700">•</span>
                          <button
                            onClick={() => setDeleteBioConfirm(true)}
                            className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {editingBio ? (
                      <div className="space-y-2">
                        <Textarea
                          id="settings-bio-input"
                          value={bioInput}
                          onChange={(e) => setBioInput(e.target.value.slice(0, BIO_CHAR_LIMIT))}
                          placeholder="Tell the community about yourself..."
                          rows={3}
                          className="text-sm resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => setEditingBio(false)}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveBio}
                            disabled={savingBio}
                            size="sm"
                            className="bg-[#0095F6] hover:bg-[#1877F2] text-white"
                          >
                            {savingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Bio'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/60 dark:border-[#262626] flex items-center justify-between">
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                          {profileData?.bio || <span className="text-neutral-400">No bio provided</span>}
                        </p>
                        {!profileData?.bio && (
                          <button
                            onClick={() => setEditingBio(true)}
                            className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer shrink-0 ml-2"
                          >
                            + Add Bio
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        Social & Portfolio Links ({profileData?.socialLinks?.length || 0}/{MAX_SOCIAL_LINKS})
                      </span>
                      {(!profileData?.socialLinks || profileData.socialLinks.length < MAX_SOCIAL_LINKS) && !showAddSocialLink && (
                        <button
                          onClick={() => { setShowAddSocialLink(true); setEditingSocialIndex(null); setSocialUrl(''); }}
                          className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
                        >
                          + Add Link
                        </button>
                      )}
                    </div>

                    {showAddSocialLink && (
                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/80 dark:border-[#262626] space-y-2 mb-3">
                        <div className="flex gap-2">
                          <select
                            value={socialPlatform}
                            onChange={(e) => setSocialPlatform(e.target.value)}
                            className="h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#111111] px-3 text-xs font-semibold"
                          >
                            <option value="github">GitHub</option>
                            <option value="twitter">X / Twitter</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="website">Portfolio / Website</option>
                          </select>
                          <Input
                            value={socialUrl}
                            onChange={(e) => setSocialUrl(e.target.value)}
                            placeholder="https://..."
                            className="h-10 text-xs flex-1"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => setShowAddSocialLink(false)} variant="outline" size="sm">
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveSocialLink}
                            disabled={savingSocialLink}
                            size="sm"
                            className="bg-[#0095F6] hover:bg-[#1877F2] text-white"
                          >
                            {savingSocialLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {profileData?.socialLinks?.map((link, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/60 dark:border-[#262626]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold capitalize text-neutral-900 dark:text-white">
                              {link.platform}:
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px] sm:max-w-xs">
                              {link.url}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteSocialLink(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Appearance & Theme */}
              <section className="bg-white dark:bg-[#111111] rounded-2xl border border-neutral-200/80 dark:border-[#262626] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#222222] flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Appearance
                  </h2>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'border-[#0095F6] bg-[#0095F6]/5 font-bold text-[#0095F6]'
                          : 'border-neutral-200 dark:border-[#262626] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Sun className="w-5 h-5" />
                      <span className="text-xs">Light</span>
                    </button>

                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'border-[#0095F6] bg-[#0095F6]/5 font-bold text-[#0095F6]'
                          : 'border-neutral-200 dark:border-[#262626] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Moon className="w-5 h-5" />
                      <span className="text-xs">Dark</span>
                    </button>

                    <button
                      onClick={() => setTheme('system')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        theme === 'system'
                          ? 'border-[#0095F6] bg-[#0095F6]/5 font-bold text-[#0095F6]'
                          : 'border-neutral-200 dark:border-[#262626] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Monitor className="w-5 h-5" />
                      <span className="text-xs">System</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Section 3: App Security & Privacy */}
              <section className="bg-white dark:bg-[#111111] rounded-2xl border border-neutral-200/80 dark:border-[#262626] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#222222] flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-[#10B981]" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Security & App Lock
                  </h2>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                        Application Lock
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Require PIN or biometric authentication to open Discuss
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (localSettings?.enabled) {
                          disableAppLock();
                          toast.success('App lock disabled');
                        } else {
                          setShowPinModal(true);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        localSettings?.enabled ? 'bg-[#0095F6]' : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          localSettings?.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {localSettings?.enabled && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-[#222222] flex items-center justify-between">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        PIN configured
                      </span>
                      <button
                        onClick={() => setShowPinModal(true)}
                        className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
                      >
                        Change PIN
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Section 4: Notifications */}
              <section className="bg-white dark:bg-[#111111] rounded-2xl border border-neutral-200/80 dark:border-[#262626] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#222222] flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-[#ED4956]" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Notifications
                  </h2>
                </div>

                <div className="p-5">
                  <NotificationToggle />
                </div>
              </section>

              {/* Section 5: Interaction Sounds */}
              <section className="bg-white dark:bg-[#111111] rounded-2xl border border-neutral-200/80 dark:border-[#262626] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#222222] flex items-center gap-2.5">
                  {soundsEnabled ? (
                    <Volume2 className="w-4 h-4 text-neutral-900 dark:text-white" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-400" />
                  )}
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Audio Feedback
                  </h2>
                </div>

                <div className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                      In-App Audio Confirmation
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Subtle audio clicks when voting, sending messages, or commenting
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundsEnabled}
                    onClick={() => {
                      toggleSounds();
                      toast.success(soundsEnabled ? 'Audio feedback disabled' : 'Audio feedback enabled');
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      soundsEnabled ? 'bg-[#0095F6]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        soundsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </section>

              {/* Section 6: Location & DevRadar */}
              <section className="bg-white dark:bg-[#111111] rounded-2xl border border-neutral-200/80 dark:border-[#262626] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#222222] flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Location & DevRadar
                  </h2>
                </div>

                <div className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                      DevRadar Coordinates
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {userLocation ? `${userLocation.city || 'Active'} (${userLocation.latitude?.toFixed(2)}, ${userLocation.longitude?.toFixed(2)})` : 'No location shared'}
                    </span>
                  </div>

                  <Button
                    onClick={() => navigate('/devradar')}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    <span>Open Radar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </section>

              {/* Section 5: Legal & Community */}
              <section className="bg-white dark:bg-[#111111] rounded-2xl border border-neutral-200/80 dark:border-[#262626] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#222222] flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-neutral-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Community & Legal
                  </h2>
                </div>

                <div className="divide-y divide-neutral-100 dark:divide-[#222222]">
                  <button
                    onClick={() => navigate('/guidelines')}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Community Guidelines
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>

                  <button
                    onClick={() => navigate('/terms')}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Terms of Service
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>

                  <button
                    onClick={() => navigate('/privacy')}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Privacy Policy
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>

                  <button
                    onClick={() => navigate('/support')}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Contact Support
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
              </section>

              {/* Section 6: Log Out */}
              <div className="pt-2">
                <Button
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                  variant="outline"
                  className="w-full h-11 border-red-200 dark:border-red-950 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Full Name Delete Confirmation */}
      <AlertDialog open={deleteFullNameConfirm} onOpenChange={setDeleteFullNameConfirm}>
        <AlertDialogContent className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove display name?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile will revert to displaying your username @{user?.username}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFullName} className="bg-red-600 text-white hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bio Delete Confirmation */}
      <AlertDialog open={deleteBioConfirm} onOpenChange={setDeleteBioConfirm}>
        <AlertDialogContent className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bio?</AlertDialogTitle>
            <AlertDialogDescription>
              Your bio will be cleared from your public profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBio} className="bg-red-600 text-white hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              Configure App Lock PIN
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enter a 4 to 6 digit security PIN.
            </p>

            {pinError && (
              <p className="text-xs text-red-500 font-semibold mb-3">{pinError}</p>
            )}

            <div className="space-y-3 mb-5">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New PIN"
                className="h-11 text-center text-lg tracking-widest"
              />
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="h-11 text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowPinModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSetPin} className="flex-1 bg-[#0095F6] hover:bg-[#1877F2] text-white">
                Save PIN
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
