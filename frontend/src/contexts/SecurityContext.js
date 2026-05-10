import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  shouldLock, 
  setLastUnlocked, 
  getLocalSecuritySettings, 
  saveLocalSecuritySettings,
  registerFailedAttempt,
  resetFailedAttempts,
  saveRemotePin
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
  const { user, logout } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [localSettings, setLocalSettings] = useState(() => getLocalSecuritySettings());
  const [remoteSettings, setRemoteSettings] = useState(null);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const loadingRemote = useRef(true);

  // Sync with Remote DB
  useEffect(() => {
    if (!user?.id) {
      setRemoteSettings(null);
      setIsLocked(false);
      return;
    }

    const securityRef = ref(secondaryDatabase, `userSecurity/${user.id}`);
    const unsub = onValue(securityRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRemoteSettings(data);
        
        // Handle global lockout
        if (data.lockoutUntil && data.lockoutUntil > Date.now()) {
          setLockoutUntil(data.lockoutUntil);
          setIsLocked(true);
        } else {
          setLockoutUntil(null);
          // Check local lock logic after remote data is loaded
          if (loadingRemote.current) {
            if (shouldLock()) setIsLocked(true);
            loadingRemote.current = false;
          }
        }
      } else {
        loadingRemote.current = false;
        if (shouldLock()) setIsLocked(true);
      }
    });

    return () => unsub();
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
    if (!remoteSettings?.pin) return true; // No PIN set yet
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
      await resetFailedAttempts(user?.id);
      return true;
    }
    return false;
  };

  const updatePin = async (newPin) => {
    if (!user?.id) return;
    await saveRemotePin(user.id, newPin);
    if (!localSettings?.enabled) {
      const updated = { ...localSettings, enabled: true, type: 'pin' };
      setLocalSettings(updated);
      saveLocalSecuritySettings(updated);
    }
  };

  const setSecurityEnabled = (enabled) => {
    const updated = { ...localSettings, enabled };
    if (!enabled) updated.type = 'none';
    setLocalSettings(updated);
    saveLocalSecuritySettings(updated);
  };

  const setSecurityType = (type) => {
    const updated = { ...localSettings, type };
    setLocalSettings(updated);
    saveLocalSecuritySettings(updated);
  };

  const value = {
    isLocked,
    setIsLocked,
    unlock,
    localSettings: localSettings || { enabled: false, type: 'none' },
    remoteSettings,
    lockoutUntil,
    updatePin,
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
      isLocked: false
    };
  }
  return context;
}
