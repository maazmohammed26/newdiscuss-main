import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { isUserVerified } from '@/lib/verification';
import MediaUpload from '@/components/MediaUpload';
import {
  getUserProfile,
  updateFullName,
  updateBio,
  updateSocialLinks,
  updateBannerTheme,
  BIO_CHAR_LIMIT,
  MAX_SOCIAL_LINKS,
} from '@/lib/userProfileDb';
import { BANNER_PRESETS, getBannerPreset, getBannerGradientClass, resolveBanner } from '@/lib/bannerPresets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function EditProfilePage() {
  const { user, patchUser } = useAuth();
  const navigate = useNavigate();

  // Profile data from database
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Banner State (null means legacy banner or default)
  const [bannerThemeId, setBannerThemeId] = useState(null);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Avatar Modal State
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Display Name State
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Bio State
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // Links State
  const [links, setLinks] = useState([]);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [savingNewLink, setSavingNewLink] = useState(false);

  const [editingLinkIdx, setEditingLinkIdx] = useState(null);
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [savingEditLink, setSavingEditLink] = useState(false);

  // Load existing profile data
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    getUserProfile(user.id)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setProfileData(data);
          setBannerThemeId(data.bannerThemeId || null);
          setNameInput(data.fullName || user.full_name || '');
          setBioInput(data.bio || user.bio || '');
          setLinks(Array.isArray(data.socialLinks) ? data.socialLinks : []);
        } else {
          setNameInput(user.full_name || '');
          setBioInput(user.bio || '');
        }
      })
      .catch((err) => console.warn('Error loading profile in EditProfilePage:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.full_name, user?.bio]);

  // Handler: Select Banner Preset
  const handleSelectBanner = async (presetId) => {
    if (!user?.id || presetId === bannerThemeId) return;
    const prev = bannerThemeId;
    setBannerThemeId(presetId);
    setSavingBanner(true);
    try {
      await updateBannerTheme(user.id, presetId);
      setProfileData((prevData) => ({ ...(prevData || {}), bannerThemeId: presetId }));
      toast.success('Banner updated');
    } catch (err) {
      setBannerThemeId(prev);
      toast.error('Failed to update banner');
    } finally {
      setSavingBanner(false);
    }
  };

  // Handler: Save Avatar Picture
  const handleConfirmAvatar = async () => {
    if (!user?.id || !pendingAvatar) return;
    const prevPhoto = user.photo_url || null;
    setSavingAvatar(true);

    // Optimistic instantaneous sync across all components
    try {
      const { broadcastAvatarUpdate } = await import('@/components/UserAvatar');
      broadcastAvatarUpdate(user.id, pendingAvatar);
    } catch (_) {}
    patchUser({ photo_url: pendingAvatar });
    setShowAvatarPicker(false);

    try {
      const { updateProfilePicture } = await import('@/lib/db');
      await updateProfilePicture(user.id, pendingAvatar);
      setPendingAvatar(null);
      toast.success('Profile picture updated');
    } catch (err) {
      // Rollback to previous picture on error
      try {
        const { broadcastAvatarUpdate } = await import('@/components/UserAvatar');
        broadcastAvatarUpdate(user.id, prevPhoto);
      } catch (_) {}
      patchUser({ photo_url: prevPhoto });
      toast.error('Failed to update picture');
    } finally {
      setSavingAvatar(false);
    }
  };

  // Handler: Remove Avatar Picture
  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    const prevPhoto = user.photo_url || null;
    setSavingAvatar(true);

    // Optimistic instantaneous sync across all components
    try {
      const { broadcastAvatarUpdate } = await import('@/components/UserAvatar');
      broadcastAvatarUpdate(user.id, null);
    } catch (_) {}
    patchUser({ photo_url: null });
    setShowAvatarPicker(false);

    try {
      const { updateProfilePicture } = await import('@/lib/db');
      await updateProfilePicture(user.id, null);
      toast.success('Profile picture removed');
    } catch (err) {
      // Rollback on error
      try {
        const { broadcastAvatarUpdate } = await import('@/components/UserAvatar');
        broadcastAvatarUpdate(user.id, prevPhoto);
      } catch (_) {}
      patchUser({ photo_url: prevPhoto });
      toast.error('Failed to remove picture');
    } finally {
      setSavingAvatar(false);
    }
  };

  // Handler: Save Display Name
  const handleSaveName = async () => {
    if (!user?.id) return;
    setSavingName(true);
    try {
      const trimmed = nameInput.trim();
      const updated = await updateFullName(user.id, trimmed);
      setProfileData(updated);
      patchUser({ full_name: trimmed });
      setEditingName(false);
      toast.success('Display name updated');
    } catch (err) {
      toast.error('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  // Handler: Save Bio
  const handleSaveBio = async () => {
    if (!user?.id) return;
    setSavingBio(true);
    try {
      const trimmed = bioInput.trim();
      const updated = await updateBio(user.id, trimmed);
      setProfileData(updated);
      patchUser({ bio: trimmed });
      setEditingBio(false);
      toast.success('Bio updated');
    } catch (err) {
      toast.error('Failed to save bio');
    } finally {
      setSavingBio(false);
    }
  };

  // Handler: Add Link
  const handleAddLink = async () => {
    if (!user?.id) return;
    const urlTrimmed = newLinkUrl.trim();
    if (!urlTrimmed) {
      toast.error('Please enter a valid URL');
      return;
    }
    if (links.length >= MAX_SOCIAL_LINKS) {
      toast.error(`Maximum ${MAX_SOCIAL_LINKS} links allowed`);
      return;
    }
    setSavingNewLink(true);
    let finalUrl = urlTrimmed;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }
    let label = newLinkLabel.trim();
    if (!label) {
      try {
        label = new URL(finalUrl).hostname.replace(/^www\./, '');
      } catch {
        label = 'Link';
      }
    }
    const prev = [...links];
    const newLinks = [...links, { name: label, platform: 'website', url: finalUrl }];
    setLinks(newLinks);
    try {
      const updated = await updateSocialLinks(user.id, newLinks);
      setLinks(updated.socialLinks || newLinks);
      setAddingLink(false);
      setNewLinkLabel('');
      setNewLinkUrl('');
      toast.success('Link added');
    } catch (err) {
      setLinks(prev);
      toast.error('Failed to add link');
    } finally {
      setSavingNewLink(false);
    }
  };

  // Handler: Save Edited Link
  const handleSaveEditLink = async (index) => {
    if (!user?.id) return;
    const urlTrimmed = editLinkUrl.trim();
    if (!urlTrimmed) {
      toast.error('Please enter a valid URL');
      return;
    }
    setSavingEditLink(true);
    let finalUrl = urlTrimmed;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }
    let label = editLinkLabel.trim();
    if (!label) {
      try {
        label = new URL(finalUrl).hostname.replace(/^www\./, '');
      } catch {
        label = 'Link';
      }
    }
    const prev = [...links];
    const updatedList = [...links];
    updatedList[index] = { name: label, platform: 'website', url: finalUrl };
    setLinks(updatedList);
    try {
      const updated = await updateSocialLinks(user.id, updatedList);
      setLinks(updated.socialLinks || updatedList);
      setEditingLinkIdx(null);
      toast.success('Link updated');
    } catch (err) {
      setLinks(prev);
      toast.error('Failed to save link');
    } finally {
      setSavingEditLink(false);
    }
  };

  // Handler: Delete Link
  const handleDeleteLink = async (index) => {
    if (!user?.id) return;
    const prev = [...links];
    const updatedList = links.filter((_, idx) => idx !== index);
    setLinks(updatedList);
    try {
      const updated = await updateSocialLinks(user.id, updatedList);
      setLinks(updated.socialLinks || updatedList);
      toast.success('Link removed');
    } catch (err) {
      setLinks(prev);
      toast.error('Failed to remove link');
    }
  };

  const displayName = profileData?.fullName || user?.full_name || 'Not set';
  const displayBio = profileData?.bio || user?.bio || '';

  const resolvedBanner = useMemo(() => {
    return resolveBanner({
      bannerThemeId,
      bannerUrl: profileData?.bannerUrl,
      banner_url: user?.banner_url
    });
  }, [bannerThemeId, profileData?.bannerUrl, user?.banner_url]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white pb-32 select-none">
      <Header />
      <div className="w-full max-w-5xl lg:max-w-[1240px] mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] justify-center gap-6">
          <Sidebar />

          <main className="w-full max-w-2xl mx-auto min-w-0 flex-1 px-4 py-3">
            {/* Top Navigation */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200 dark:border-[#262626]">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5px]" />
                <span>Done</span>
              </button>
              <h1 className="text-base font-bold text-neutral-900 dark:text-white">
                Edit Profile
              </h1>
              <div className="w-12" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Section 1: Banner & Avatar */}
                <div className="space-y-4">
                  {/* Banner Preview */}
                  <div className="relative rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-[#262626]">
                    {resolvedBanner.type === 'image' ? (
                      <div className="w-full h-32 sm:h-36 relative overflow-hidden bg-neutral-900">
                        <img src={resolvedBanner.url} alt="Profile banner" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-full h-32 sm:h-36 ${resolvedBanner.className} transition-all duration-300 relative`}>
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                      </div>
                    )}

                    <div className="p-4 bg-neutral-50 dark:bg-[#111111] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                          Profile Banner
                        </span>
                        <span className="text-xs text-neutral-400">
                          {resolvedBanner.type === 'image' ? 'Custom Banner Image' : (resolvedBanner.preset?.name || 'Discuss Theme')}
                        </span>
                      </div>
                      <Button
                        onClick={() => setShowBannerPicker(!showBannerPicker)}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>{showBannerPicker ? 'Close Swatches' : 'Change Theme'}</span>
                      </Button>
                    </div>

                    {/* 20 Gradient Presets Grid */}
                    {showBannerPicker && (
                      <div className="p-4 border-t border-neutral-200/80 dark:border-[#262626] bg-white dark:bg-black">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                          Select from 20 premium gradient themes:
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                          {BANNER_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => handleSelectBanner(preset.id)}
                              disabled={savingBanner}
                              title={preset.name}
                              className={`group relative h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                bannerThemeId === preset.id
                                  ? 'border-[#0095F6] scale-105 shadow-md ring-2 ring-[#0095F6]/30'
                                  : 'border-transparent hover:border-neutral-400 dark:hover:border-neutral-600 opacity-80 hover:opacity-100'
                              }`}
                            >
                              <div className={`w-full h-full bg-gradient-to-r ${preset.className}`} />
                              {bannerThemeId === preset.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Avatar Edit Row */}
                  <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-[#202020]">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-full ring-2 ring-neutral-200 dark:ring-neutral-800 p-0.5 shrink-0">
                        <UserAvatar
                          src={user?.photo_url}
                          username={user?.username}
                          userId={user?.id}
                          priority
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                          Profile Photo
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {user?.photo_url ? 'Custom avatar configured' : 'Using default avatar'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1" />
                        <span>Change</span>
                      </Button>
                      {user?.photo_url && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={savingAvatar}
                          className="text-xs text-red-500 hover:underline px-2 py-1 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Avatar Upload Dropdown/Form */}
                  {showAvatarPicker && (
                    <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-neutral-50 dark:bg-[#111111] space-y-3">
                      {!pendingAvatar ? (
                        <MediaUpload
                          type="image"
                          folder="profiles"
                          onUploadComplete={(result) => setPendingAvatar(result.url)}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-2">
                          <img
                            src={pendingAvatar}
                            alt="Avatar preview"
                            className="w-20 h-20 rounded-full object-cover border-2 border-neutral-300"
                          />
                          <p className="text-xs font-medium">Confirm new profile picture?</p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setPendingAvatar(null)}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleConfirmAvatar}
                              disabled={savingAvatar}
                              size="sm"
                              className="bg-[#0095F6] hover:bg-[#1877F2] text-white"
                            >
                              {savingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Photo'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Display Name */}
                <div className="py-3.5 border-b border-neutral-100 dark:border-[#202020]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Display Name
                    </span>
                    {!editingName && (
                      <button
                        onClick={() => {
                          setEditingName(true);
                          setNameInput(profileData?.fullName || user?.full_name || '');
                        }}
                        className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
                      >
                        {profileData?.fullName || user?.full_name ? 'Edit' : '+ Add'}
                      </button>
                    )}
                  </div>

                  {editingName ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your full name"
                        maxLength={50}
                        className="h-10 text-sm"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setEditingName(false)}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveName}
                          disabled={savingName}
                          size="sm"
                          className="bg-[#0095F6] hover:bg-[#1877F2] text-white"
                        >
                          {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {displayName}
                    </p>
                  )}
                </div>

                {/* Section 3: Username */}
                <div className="py-3.5 border-b border-neutral-100 dark:border-[#202020]">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
                    Username
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      @{user?.username}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Unique handle
                    </span>
                  </div>
                </div>

                {/* Section 4: Bio */}
                <div className="py-3.5 border-b border-neutral-100 dark:border-[#202020]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Bio ({displayBio.length}/{BIO_CHAR_LIMIT})
                    </span>
                    {!editingBio && (
                      <button
                        onClick={() => {
                          setEditingBio(true);
                          setBioInput(profileData?.bio || user?.bio || '');
                        }}
                        className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
                      >
                        {displayBio ? 'Edit' : '+ Add'}
                      </button>
                    )}
                  </div>

                  {editingBio ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value.slice(0, BIO_CHAR_LIMIT))}
                        placeholder="Tell the community about yourself, your tech stack, or projects..."
                        rows={3}
                        className="text-sm resize-none"
                        autoFocus
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
                          {savingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                      {displayBio || <span className="text-neutral-400">No bio provided</span>}
                    </p>
                  )}
                </div>

                {/* Section 5: Profile & Social Links */}
                <div className="py-3.5 border-b border-neutral-100 dark:border-[#202020] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Profile Links ({links.length}/{MAX_SOCIAL_LINKS})
                    </span>
                    {!addingLink && links.length < MAX_SOCIAL_LINKS && (
                      <button
                        onClick={() => setAddingLink(true)}
                        className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Link</span>
                      </button>
                    )}
                  </div>

                  {/* Add Link Form */}
                  {addingLink && (
                    <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-[#262626] bg-neutral-50 dark:bg-[#111111] space-y-2.5">
                      <Input
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        placeholder="Link title (e.g. GitHub, Portfolio, Twitter)"
                        className="h-9 text-xs"
                      />
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-9 text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => { setAddingLink(false); setNewLinkLabel(''); setNewLinkUrl(''); }}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddLink}
                          disabled={savingNewLink}
                          size="sm"
                          className="h-8 text-xs bg-[#0095F6] hover:bg-[#1877F2] text-white"
                        >
                          {savingNewLink ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Existing Links List */}
                  {links.length > 0 ? (
                    <div className="space-y-2">
                      {links.map((link, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-neutral-50 dark:bg-[#111111] border border-neutral-200/60 dark:border-[#222222]"
                        >
                          {editingLinkIdx === idx ? (
                            <div className="space-y-2">
                              <Input
                                value={editLinkLabel}
                                onChange={(e) => setEditLinkLabel(e.target.value)}
                                placeholder="Link title"
                                className="h-8 text-xs"
                              />
                              <Input
                                value={editLinkUrl}
                                onChange={(e) => setEditLinkUrl(e.target.value)}
                                placeholder="URL"
                                className="h-8 text-xs"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => setEditingLinkIdx(null)}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => handleSaveEditLink(idx)}
                                  disabled={savingEditLink}
                                  size="sm"
                                  className="h-7 text-xs bg-[#0095F6] text-white"
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                                    {link.name || link.platform || 'Link'}
                                  </span>
                                  <span className="text-[11px] text-neutral-400 block truncate max-w-xs sm:max-w-md">
                                    {link.url}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingLinkIdx(idx);
                                    setEditLinkLabel(link.name || link.platform || '');
                                    setEditLinkUrl(link.url || '');
                                  }}
                                  className="text-xs font-semibold text-[#0095F6] hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteLink(idx)}
                                  className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    !addingLink && (
                      <p className="text-xs text-neutral-400 italic">
                        No links added yet. Tap Add Link above to share your GitHub, portfolio, or socials.
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
