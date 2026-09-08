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
  Sun,
  Moon,
  Monitor,
  Lock,
  Bell,
  Volume2,
  VolumeX,
  MapPin,
  FileText,
  LogOut,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  ExternalLink,
  Shield,
} from 'lucide-react';
import {
  getUserLocation,
} from '@/lib/firebaseSixth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const { theme, themeMode, setTheme } = useTheme();
  const { soundsEnabled, toggleSounds } = useInteractionFeedback();
  const {
    localSettings,
    updatePin,
    setSecurityEnabled,
    disableAppLock,
  } = useSecurity();

  // Redirect legacy ?section=profile to dedicated /profile/edit
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'profile') {
      navigate('/profile/edit', { replace: true });
    }
  }, [location.search, navigate]);

  // Single expanded accordion section
  const [openSection, setOpenSection] = useState(null);
  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  // Security PIN states (strictly PIN only, no fake biometrics)
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // Location / DevRadar state
  const [userLocation, setUserLocation] = useState(null);

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    getUserLocation(user.id)
      .then((loc) => {
        if (isMounted && loc) setUserLocation(loc);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Handle PIN save
  const handleSavePin = async () => {
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    setSavingPin(true);
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
    } finally {
      setSavingPin(false);
    }
  };

  // Theme label
  const currentThemeLabel = themeMode === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  // Sections definition
  const sections = [
    {
      id: 'appearance',
      label: 'Appearance',
      subtitle: currentThemeLabel,
      icon: Sun,
      renderContent: () => (
        <div className="py-2 space-y-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Choose how Discuss looks on this device:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setTheme(id);
                  toast.success(`Theme set to ${label}`);
                }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  themeMode === id
                    ? 'border-[#0095F6] bg-[#0095F6]/5 font-bold text-[#0095F6]'
                    : 'border-neutral-200 dark:border-[#262626] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security & App Lock',
      subtitle: localSettings?.enabled ? 'PIN configured' : 'Off',
      icon: Lock,
      renderContent: () => (
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-white block">
                PIN Protection
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Require a 4-digit PIN every time Discuss opens
              </span>
            </div>
            <button
              onClick={() => {
                if (localSettings?.enabled) {
                  disableAppLock();
                  toast.success('PIN lock disabled');
                } else {
                  setShowPinModal(true);
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                localSettings?.enabled ? 'bg-[#0095F6]' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
              role="switch"
              aria-checked={localSettings?.enabled}
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
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                PIN is active on this device
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
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      subtitle: 'Push alerts & mentions',
      icon: Bell,
      renderContent: () => (
        <div className="py-2">
          <NotificationToggle />
        </div>
      ),
    },
    {
      id: 'audio',
      label: 'Audio Feedback',
      subtitle: soundsEnabled ? 'On' : 'Off',
      icon: soundsEnabled ? Volume2 : VolumeX,
      renderContent: () => (
        <div className="py-2 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white block">
              In-App Audio Feedback
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Subtle audio clicks when voting, sending messages, or reacting
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
      ),
    },
    {
      id: 'location',
      label: 'Location & DevRadar',
      subtitle: userLocation?.city ? userLocation.city : 'Radar coordinates',
      icon: MapPin,
      renderContent: () => (
        <div className="py-2 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white block">
              DevRadar Proximity
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {userLocation?.city
                ? `${userLocation.city} (${userLocation.latitude?.toFixed(2)}, ${userLocation.longitude?.toFixed(2)})`
                : 'Coordinates not shared on radar'}
            </span>
          </div>
          <Button
            onClick={() => navigate('/devradar')}
            variant="outline"
            size="sm"
            className="text-xs gap-1"
          >
            <span>Open Radar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
    {
      id: 'legal',
      label: 'Community & Legal',
      subtitle: 'Guidelines, terms, privacy',
      icon: FileText,
      renderContent: () => (
        <div className="py-1 divide-y divide-neutral-100 dark:divide-[#202020]">
          {[
            { label: 'Community Guidelines', path: '/guidelines' },
            { label: 'Terms of Service', path: '/terms' },
            { label: 'Privacy Policy', path: '/privacy' },
            { label: 'Support & Help', path: '/support' },
          ].map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full py-3 flex items-center justify-between text-left hover:text-[#0095F6] transition-colors cursor-pointer group"
            >
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-[#0095F6]">
                {label}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#0095F6] transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white pb-32 select-none">
      <Header />
      <div className="w-full max-w-5xl lg:max-w-[1240px] mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] justify-center gap-6">
          <Sidebar />

          <main className="w-full max-w-2xl mx-auto min-w-0 flex-1 px-4 py-3">
            {/* Top Navigation */}
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-neutral-200 dark:border-[#262626]">
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

            {/* Flat Full-Width Section Rows */}
            <div className="divide-y divide-neutral-200/80 dark:divide-[#222222]">
              {sections.map((section) => {
                const Icon = section.icon;
                const isOpen = openSection === section.id;
                return (
                  <div key={section.id} className="py-1">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full py-4 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/40 px-2 rounded-xl transition-colors cursor-pointer group"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Icon className="w-5 h-5 text-neutral-500 dark:text-neutral-400 shrink-0 stroke-[1.8px]" />
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-neutral-900 dark:text-white block truncate">
                            {section.label}
                          </span>
                          {section.subtitle && (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500 block truncate">
                              {section.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0 ml-2" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-1 duration-200">
                        {section.renderContent()}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Logout Row */}
              <div className="py-2">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-4 flex items-center justify-between text-left hover:bg-red-50/50 dark:hover:bg-red-950/20 px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <LogOut className="w-5 h-5 text-red-500 shrink-0 stroke-[1.8px]" />
                    <div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400 block truncate">
                        Log Out
                      </span>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 block truncate">
                        End your current session on this device
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400 opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* PIN Setup Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[#262626] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {localSettings?.enabled ? 'Update PIN' : 'Set Up App Lock PIN'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Enter a 4-to-6 digit PIN to lock Discuss when inactive.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                  New PIN
                </label>
                <Input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter PIN"
                  maxLength={6}
                  className="h-10 text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                  Confirm PIN
                </label>
                <Input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Confirm PIN"
                  maxLength={6}
                  className="h-10 text-center text-lg tracking-widest"
                />
              </div>

              {pinError && (
                <p className="text-xs text-red-500 font-semibold">{pinError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => {
                  setShowPinModal(false);
                  setNewPin('');
                  setConfirmPin('');
                  setPinError('');
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePin}
                disabled={savingPin || newPin.length < 4}
                size="sm"
                className="bg-[#0095F6] hover:bg-[#1877F2] text-white"
              >
                {savingPin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save PIN'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-2xl dark:bg-[#141414] dark:border-[#262626]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Log Out of Discuss?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-neutral-400">
              You will need to sign back in to access your discussions and messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl dark:border-neutral-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                signOut?.();
                navigate('/login');
              }}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
