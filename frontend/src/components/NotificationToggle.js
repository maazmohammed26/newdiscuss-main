// Notification Toggle Component for Profile Page
// Bell icon with ON/OFF toggle for push notifications and message previews privacy settings

import { useState, useEffect } from 'react';
import {
  isPushSupported,
  isIOS,
  isPWAInstalled,
  getIOSVersion,
  canUsePush,
  getPermissionStatus,
  registerPushSubscription,
  unsubscribePush,
  isNotificationsEnabled,
  isNotificationPreviewEnabled,
  setNotificationPreviewEnabled
} from '@/lib/pushNotificationService';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, BellOff, Loader2, AlertCircle, Smartphone, Info, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationToggle({ compact = false }) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(isNotificationPreviewEnabled());
  const [isAndroidApp, setIsAndroidApp] = useState(false);
  const { theme } = useTheme();
  const isBlack = theme === 'discuss-black';
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setEnabled(isNotificationsEnabled());
        setPreviewEnabled(isNotificationPreviewEnabled());
        setIsAndroidApp(window.median !== undefined || navigator.userAgent.includes('Android'));
      } catch (error) {
        console.error('Error checking notification status:', error);
      }
      setLoading(false);
    };
    checkStatus();
  }, []);
  
  const handleToggle = async () => {
    if (toggling) return;
    
    const isAndroidAppWrapper = window.median !== undefined || navigator.userAgent.includes('Android');
    
    if (!isAndroidAppWrapper) {
      if (isIOS() && !isPWAInstalled()) {
        setShowIOSHelp(true);
        toast.error('Install the app first', {
          description: 'Add Discuss to your Home Screen to enable notifications'
        });
        return;
      }
      
      if (isIOS() && getIOSVersion() < 16.4) {
        toast.error('iOS 16.4+ required', {
          description: 'Update your iOS to enable push notifications'
        });
        return;
      }
      
      if (!isPushSupported()) {
        toast.error('Not supported', {
          description: 'Push notifications are not supported on this browser'
        });
        return;
      }
    }
    
    setToggling(true);
    
    try {
      if (!enabled) {
        if (isAndroidAppWrapper) {
          // Inside Android APK - simply save preferences locally and sync
          localStorage.setItem('discuss_notifications_enabled', 'true');
          setEnabled(true);
          toast.success('Notifications enabled! 🔔');
          
          // Request native permissions via Median bridge if OneSignal is initialized
          if (window.median && window.median.onesignal) {
            try {
              window.median.onesignal.register();
            } catch (e) {
              console.warn('[OneSignal] Native permission register call failed:', e.message);
            }
          }
        } else {
          const subscription = await registerPushSubscription();
          if (subscription) {
            setEnabled(true);
            toast.success('Notifications enabled! 🔔');
          } else {
            const permission = getPermissionStatus();
            if (permission === 'denied') {
              toast.error('Permission denied', {
                description: 'Please enable notifications in your browser settings'
              });
            } else {
              toast.error('Could not enable notifications');
            }
          }
        }
      } else {
        if (isAndroidAppWrapper) {
          localStorage.setItem('discuss_notifications_enabled', 'false');
          setEnabled(false);
          toast.success('Notifications disabled');
        } else {
          await unsubscribePush();
          setEnabled(false);
          toast.success('Notifications disabled');
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('Something went wrong');
    }
    
    setToggling(false);
  };

  const handlePreviewToggle = () => {
    const newVal = !previewEnabled;
    setPreviewEnabled(newVal);
    setNotificationPreviewEnabled(newVal, user?.id);
    toast.success(newVal ? 'Message previews enabled' : 'Message previews hidden');
  };
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {!compact && <span className="text-sm">Loading...</span>}
      </div>
    );
  }
  
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={toggling}
        className={`relative ${enabled ? 'text-primary' : 'text-muted-foreground'}`}
        title={enabled ? 'Notifications ON' : 'Notifications OFF'}
      >
        {toggling ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : enabled ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </Button>
    );
  }
  
  // ── discuss-black inline styles ──
  const containerStyle = isBlack
    ? { backgroundColor: '#1A1A24', borderRadius: '8px', border: '1px solid rgba(255,0,127,0.15)' }
    : {};
  const titleStyle = isBlack ? { color: '#F0F0F8' } : {};
  const subStyle = isBlack ? { color: '#9090A8' } : {};
  const iconStyle = isBlack
    ? { color: enabled ? '#FF007F' : '#9090A8' }
    : {};

  return (
    <div className="space-y-3 text-left">
      <div
        className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
        style={containerStyle}
      >
        <div className="flex items-center gap-3">
          {enabled ? (
            <Bell className="h-5 w-5 text-primary" style={iconStyle} />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" style={iconStyle} />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm" style={titleStyle}>Push Notifications</p>
              <span className="font-mono text-[9px] font-black uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded animate-pulse">
                Android App
              </span>
              {/* Info Icon */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="text-muted-foreground hover:text-primary transition-colors flex items-center"
                    style={isBlack ? { color: '#9090A8' } : {}}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-sm bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] p-4 text-left" align="start">
                  <div className="space-y-2">
                    <p className="font-medium text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">About Notifications</p>
                    <ul className="text-muted-foreground text-xs space-y-1">
                      <li>• Notifications are synced in real-time.</li>
                      <li>• Firebase auth-linked device segments are delivered automatically.</li>
                      <li>• Includes full support for lock screen privacy masking.</li>
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground" style={subStyle}>
              {enabled ? "You'll receive alerts for messages & updates" : 'Enable to get notified'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {toggling && <Loader2 className="h-4 w-4 animate-spin" style={isBlack ? { color: '#FF007F' } : {}} />}
          {/* Switch with forced discuss-black styling via CSS custom properties */}
          <div
            style={isBlack ? {
              '--switch-bg-off': '#2A2A38',
              '--switch-bg-on': '#FF007F',
            } : {}}
          >
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={toggling}
              style={isBlack
                ? {
                    backgroundColor: enabled ? '#FF007F' : '#2A2A38',
                    borderColor: enabled ? '#FF007F' : 'rgba(255,0,127,0.3)',
                  }
                : {}}
            />
          </div>
        </div>
      </div>
      
      {/* Notification Privacy Setting (Message Previews) */}
      {enabled && (
        <div 
          className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/15 animate-in slide-in-from-top-1 duration-200"
          style={isBlack ? { backgroundColor: '#13131A', border: '1px dashed rgba(255,0,127,0.1)' } : {}}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${previewEnabled ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}
                 style={isBlack ? { color: previewEnabled ? '#FF007F' : '#9090A8', backgroundColor: previewEnabled ? 'rgba(255,0,127,0.1)' : 'rgba(144,144,168,0.1)' } : {}}>
              {previewEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5]" style={titleStyle}>Message Previews</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]" style={subStyle}>
                {previewEnabled ? 'Display sender names and text previews in alerts' : 'Hide alert details for secure lock screen privacy'}
              </p>
            </div>
          </div>
          <div
            style={isBlack ? {
              '--switch-bg-off': '#2A2A38',
              '--switch-bg-on': '#FF007F',
            } : {}}
          >
            <Switch
              checked={previewEnabled}
              onCheckedChange={handlePreviewToggle}
              style={isBlack
                ? {
                    backgroundColor: previewEnabled ? '#FF007F' : '#2A2A38',
                    borderColor: previewEnabled ? '#FF007F' : 'rgba(255,0,127,0.3)',
                  }
                : {}}
            />
          </div>
        </div>
      )}

      {/* Android App Status Indicator / Monospace Tag */}
      <div 
        className="p-3 rounded-xl bg-[#10B981]/5 dark:bg-[#10B981]/5 border border-[#10B981]/15 flex items-center justify-between mt-2.5"
        style={isBlack ? { backgroundColor: '#13131A', border: '1px solid rgba(16,185,129,0.1)' } : {}}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#10B981]/10 rounded-lg flex items-center justify-center text-[#10B981]">
            <Smartphone className="w-4.5 h-4.5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] font-black uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded">
                Android App Configured
              </span>
              {isAndroidApp && (
                <span className="w-2 h-2 bg-[#10B981] rounded-full animate-ping shadow-[0_0_8px_#10B981]" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[210px] leading-relaxed" style={subStyle}>
              {isAndroidApp 
                ? 'Pulsing Android telemetry connected! Direct mobile push notifications fully enabled via OneSignal.' 
                : 'Standard push notifications active. Install the Android App for targeted mobile alerts.'}
            </p>
          </div>
        </div>
      </div>

      {/* iOS Help */}
      {showIOSHelp && isIOS() && !isPWAInstalled() && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Smartphone className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">Install the app first</p>
            <p className="text-muted-foreground text-xs mt-1" style={isBlack ? { color: '#9090A8' } : {}}>
              Tap the share button <span className="inline-block px-1">⬆️</span> then "Add to Home Screen" to enable notifications on iOS.
            </p>
          </div>
        </div>
      )}
      
      {/* Permission denied help */}
      {getPermissionStatus() === 'denied' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-left">
            <p className="font-medium text-red-600 dark:text-red-400">Permission blocked</p>
            <p className="text-muted-foreground text-xs mt-1" style={isBlack ? { color: '#9090A8' } : {}}>
              Notifications are blocked. Please enable them in your browser/device settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
