import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  shouldLock,
  setLastUnlocked,
  getLocalSecuritySettings,
  saveLocalSecuritySettings,
  registerFailedAttempt,
  resetFailedAttempts,
  saveRemotePin,
  removeRemotePin
} from '@/lib/securityService';
import { secondaryDatabase, ref, onValue } from '@/lib/firebaseSecondary';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const SecurityContext = createContext({
  localSettings: { enabled: false, type: 'none' },
  isLocked: false,
  lockoutUntil: null
});

export function SecurityProvider({ children }) {
  const { user, logout: authLogout } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [localSettings, setLocalSettings] = useState(() => getLocalSecuritySettings());
  const [remoteSettings, setRemoteSettings] = useState(null);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [resolving, setResolving] = useState(true);
  const loadingRemote = useRef(true);
  // Always-fresh ref — avoids stale closures in async callbacks
  const localSettingsRef = useRef(localSettings);
  useEffect(() => { localSettingsRef.current = localSettings; }, [localSettings]);

  /**
   * KEY FIX: Sync with Remote DB.
   * When a PIN exists in Firebase, automatically enable localSettings on this device.
   * This solves the cross-device "no PIN set" problem.
   */
  useEffect(() => {
    if (!user?.id) {
      setRemoteSettings(null);
      setIsLocked(false);
      loadingRemote.current = true;
      return;
    }

    const securityRef = ref(secondaryDatabase, `userSecurity/${user.id}`);
    const unsub = onValue(securityRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRemoteSettings(data);

        // ── Cross-device sync ──────────────────────────────────────────────
        // If a PIN exists in DB but this device doesn't have lock enabled yet,
        // auto-enable it. This is the fix for "logs in on new device, no PIN".
        if (data.pin) {
          const currentLocal = localSettingsRef.current;
          if (!currentLocal.enabled) {
            const updated = { ...currentLocal, enabled: true, type: 'pin' };
            setLocalSettings(updated);
            saveLocalSecuritySettings(updated);
            localSettingsRef.current = updated; // Keep ref in sync immediately
          }
        }
        // ──────────────────────────────────────────────────────────────────

        if (data.lockoutUntil && data.lockoutUntil > Date.now()) {
          setLockoutUntil(data.lockoutUntil);
          setIsLocked(true);
          setResolving(false);
        } else {
          setLockoutUntil(null);
          if (loadingRemote.current) {
            loadingRemote.current = false;
            // ── Persistence Check ──────────────────────────────────────────
            // If manual lock is set or no recent unlock, lock the screen
            if (data.pin) {
              const lastUnlocked = localStorage.getItem('discuss_last_unlocked');
              const manualLock = localStorage.getItem('discuss_manual_lock') === 'true';
              
              if (manualLock || !lastUnlocked) {
                setIsLocked(true);
              } else {
                const elapsed = Date.now() - parseInt(lastUnlocked);
                if (elapsed > 5 * 60 * 1000) setIsLocked(true);
              }
            }
            setResolving(false);
          }
        }
      } else {
        // No remote record — disable local lock if it was auto-enabled
        setRemoteSettings(null);
        if (loadingRemote.current) {
          loadingRemote.current = false;
          setResolving(false);
        }
        // If no DB record, ensure local is cleared too
        const currentLocal = localSettingsRef.current;
        if (currentLocal.enabled) {
          const updated = { enabled: false, type: 'none' };
          setLocalSettings(updated);
          saveLocalSecuritySettings(updated);
          localSettingsRef.current = updated;
        }
      }
    });

    return () => {
      unsub();
      loadingRemote.current = true;
    };
  }, [user?.id]);

  // Handle focus lock check
  useEffect(() => {
    const checkLock = () => {
      if (shouldLock()) setIsLocked(true);
    };
    window.addEventListener('focus', checkLock);
    return () => window.removeEventListener('focus', checkLock);
  }, []);

  const verifyPin = (inputPin) => {
    if (!remoteSettings?.pin) return false; // No PIN set — reject (don't silently allow)
    return inputPin === remoteSettings.pin;
  };

  const unlock = async (method, value) => {
    if (lockoutUntil && lockoutUntil > Date.now()) {
      toast.error('System locked. Please wait.');
      return false;
    }

    if (method === 'pin') {
      if (verifyPin(value)) {
        setIsLocked(false);
        setLastUnlocked();
        localStorage.removeItem('discuss_manual_lock');
        await resetFailedAttempts(user?.id);
        return true;
      } else {
        const lockedUntil = await registerFailedAttempt(user?.id);
        if (lockedUntil) {
          setLockoutUntil(lockedUntil);
          toast.error('Too many attempts. System locked for 5 minutes.');
        }
        return false;
      }
    } else if (method === 'biometric') {
      setIsLocked(false);
      setLastUnlocked();
      localStorage.removeItem('discuss_manual_lock');
      await resetFailedAttempts(user?.id);
      return true;
    }
    return false;
  };

  /**
   * lockNow — manually triggers the lock screen without logging out.
   */
  const lockNow = () => {
    localStorage.removeItem('discuss_last_unlocked');
    localStorage.setItem('discuss_manual_lock', 'true');
    setIsLocked(true);
  };

  /**
   * updatePin — saves PIN to Firebase, updates local state optimistically,
   * enables lock, and marks the session as unlocked (5-min timer starts now).
   */
  const updatePin = async (newPin) => {
    if (!user?.id) throw new Error('Not authenticated');

    await saveRemotePin(user.id, newPin);

    setRemoteSettings(prev => ({
      ...(prev || {}),
      pin: newPin,
      updatedAt: new Date().toISOString()
    }));

    const currentLocal = localSettingsRef.current;
    const updated = { ...currentLocal, enabled: true, type: 'pin' };
    setLocalSettings(updated);
    saveLocalSecuritySettings(updated);
    localSettingsRef.current = updated;

    // Mark session as just-unlocked so it won't lock immediately after setting
    setLastUnlocked();
  };

  /**
   * disableAppLock — verifies PIN, removes from DB, clears local settings.
   */
  const disableAppLock = async (currentPin) => {
    if (!verifyPin(currentPin)) {
      throw new Error('Incorrect PIN');
    }
    await removeRemotePin(user?.id);
    setRemoteSettings(null);
    const updated = { enabled: false, type: 'none' };
    setLocalSettings(updated);
    saveLocalSecuritySettings(updated);
    localSettingsRef.current = updated;
    localStorage.removeItem('discuss_last_unlocked');
  };

  /**
   * logout — fully logs out from the account (goes to login page).
   */
  const logout = async () => {
    localStorage.removeItem('discuss_last_unlocked');
    // On logout, disable biometrics on this device (revert to PIN only)
    const currentLocal = localSettingsRef.current;
    if (currentLocal.enabled) {
      const updated = { ...currentLocal, type: 'pin' };
      setLocalSettings(updated);
      saveLocalSecuritySettings(updated);
      localSettingsRef.current = updated;
    }
    await authLogout();
  };

  const setSecurityEnabled = (enabled) => {
    const current = localSettingsRef.current;
    const updated = { ...current, enabled };
    if (!enabled) updated.type = 'none';
    setLocalSettings(updated);
    saveLocalSecuritySettings(updated);
    localSettingsRef.current = updated;
  };

  const setSecurityType = (type) => {
    const current = localSettingsRef.current;
    const updated = { ...current, type };
    setLocalSettings(updated);
    saveLocalSecuritySettings(updated);
    localSettingsRef.current = updated;
  };

  const value = {
    isLocked,
    setIsLocked,
    unlock,
    lockNow,
    localSettings: localSettings || { enabled: false, type: 'none' },
    remoteSettings,
    lockoutUntil,
    resolving,
    updatePin,
    disableAppLock,
    setSecurityEnabled,
    setSecurityType,
    verifyPin,
    logout
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    return {
      localSettings: { enabled: false, type: 'none' },
      isLocked: false,
      lockNow: () => {}
    };
  }
  return context;
}
