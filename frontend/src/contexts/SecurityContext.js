import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  shouldLock, 
  setLastUnlocked, 
  getSecuritySettings, 
  saveSecuritySettings,
  verifyBiometric
} from '@/lib/securityService';
import { useAuth } from './AuthContext';

const SecurityContext = createContext();

export function SecurityProvider({ children }) {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [settings, setSettings] = useState(getSecuritySettings());

  // Check lock on mount and when app becomes active
  useEffect(() => {
    if (!user) {
      setIsLocked(false);
      return;
    }

    const checkLock = () => {
      if (shouldLock()) {
        setIsLocked(true);
      }
    };

    // Check immediately
    checkLock();

    // Check when window gets focus
    window.addEventListener('focus', checkLock);
    return () => window.removeEventListener('focus', checkLock);
  }, [user]);

  const unlock = (method, value) => {
    const currentSettings = getSecuritySettings();
    
    if (method === 'pin') {
      if (value === currentSettings.pin) {
        setIsLocked(false);
        setLastUnlocked();
        return true;
      }
    } else if (method === 'biometric') {
      setIsLocked(false);
      setLastUnlocked();
      return true;
    }
    return false;
  };

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSecuritySettings(updated);
  };

  const value = {
    isLocked,
    setIsLocked,
    unlock,
    settings,
    updateSettings
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  return useContext(SecurityContext);
}
