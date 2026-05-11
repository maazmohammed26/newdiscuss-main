import React, { useState, useEffect } from 'react';
import { useSecurity } from '@/contexts/SecurityContext';
import { verifyBiometric } from '@/lib/securityService';
import { ShieldCheck, ShieldAlert, Delete, LogOut, Lock, Info, Clock, Fingerprint } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const QUOTES = [
  "Your privacy is our priority.",
  "Security is not a product, but a process.",
  "Protecting your conversations, one bit at a time.",
  "Encrypted. Secure. Private.",
  "Discuss with confidence.",
  "Your data belongs to you."
];

export default function SecurityLockScreen() {
  const { unlock, localSettings, lockoutUntil, logout } = useSecurity();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Lockout countdown
  useEffect(() => {
    if (!lockoutUntil) return;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % QUOTES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-trigger biometric if that's the lock type
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (localSettings?.enabled && localSettings?.type === 'biometric' && !lockoutUntil) {
      handleBiometricUnlock();
    }
  }, [lockoutUntil]);

  const handleBiometricUnlock = async () => {
    setVerifying(true);
    setIsBiometricLoading(true);
    try {
      const success = await verifyBiometric();
      if (success) {
        await unlock('biometric');
      } else {
        toast.error('Biometric verification failed. Use your PIN instead.');
      }
    } catch {
      toast.error('Biometric verification failed. Use your PIN instead.');
    } finally {
      setVerifying(false);
      setIsBiometricLoading(false);
    }
  };

  const handlePinInput = (num) => {
    if (lockoutUntil) return;
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === 6) {
        unlock('pin', newPin).then(success => {
          if (!success) {
            setError(true);
            setPin('');
            // Don't toast here — SecurityContext toasts on lockout already
          }
        });
      }
    }
  };

  const removeLast = () => !lockoutUntil && setPin(prev => prev.slice(0, -1));

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFullLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#0F172A] discuss:bg-[#121212] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-6 py-10">
        <div className="max-w-xs w-full flex flex-col items-center">

          {/* App Logo */}
          <div className="mb-6 flex flex-col items-center">
            <img
              src="/favicon-new.png"
              alt="Discuss"
              className="w-20 h-20 rounded-2xl shadow-lg object-cover"
            />
          </div>

          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white discuss:text-[#F5F5F5] mb-2 tracking-tight flex items-center gap-2">
            {isBiometricLoading ? (
              <Fingerprint className="w-6 h-6 text-[#2563EB] discuss:text-[#EF4444] animate-pulse" />
            ) : lockoutUntil ? (
              <Clock className="w-6 h-6 text-yellow-500 animate-pulse" />
            ) : error ? (
              <ShieldAlert className="w-6 h-6 text-red-500" />
            ) : (
              <Lock className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
            )}
            {isBiometricLoading ? 'Verifying...' : lockoutUntil ? 'Locked Out' : 'Discuss Secure'}
          </h1>

          <div className="h-6 mb-8 overflow-hidden">
            <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-sm text-center italic">
              {isBiometricLoading
                ? 'Please verify your identity'
                : lockoutUntil
                ? 'Security lockout active for your protection'
                : QUOTES[quoteIndex]}
            </p>
          </div>

          {/* PIN dots / Lockout / Biometric */}
          {lockoutUntil ? (
            <div className="w-full bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 mb-6 border border-red-200 dark:border-red-800/30 flex flex-col items-center gap-4">
              <span className="text-4xl font-mono font-bold text-red-600 dark:text-red-400">
                {formatTime(timeLeft)}
              </span>
              <p className="text-xs text-red-500 text-center font-medium">
                Too many failed attempts. Try again in {formatTime(timeLeft)}.
              </p>
            </div>
          ) : isBiometricLoading ? (
            <div className="w-full bg-[#F5F5F7]/50 dark:bg-[#1E293B]/20 rounded-2xl p-8 mb-6 border border-[#E2E8F0]/50 flex flex-col items-center gap-4">
              <Fingerprint className="w-16 h-16 text-[#2563EB] discuss:text-[#EF4444] animate-pulse" />
              <p className="text-sm text-[#6275AF] dark:text-[#94A3B8] text-center">
                Touch the fingerprint sensor or look at the camera
              </p>
            </div>
          ) : (
            <div className="w-full bg-[#F5F5F7]/50 dark:bg-[#1E293B]/20 rounded-2xl p-6 mb-6 border border-[#E2E8F0]/50 dark:border-[#334155]/20">
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4 mb-2">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        i < pin.length
                          ? 'bg-[#2563EB] discuss:bg-[#EF4444] scale-125 shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                          : 'bg-[#E2E8F0] dark:bg-[#334155] discuss:bg-[#333333]'
                      } ${error ? 'bg-red-500 scale-100' : ''}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[#6275AF] dark:text-[#94A3B8] uppercase tracking-widest font-semibold">
                  {error ? 'Incorrect PIN — Try again' : 'Enter Passcode'}
                </p>
              </div>
            </div>
          )}

          {/* Number Pad */}
          <div className={`grid grid-cols-3 gap-5 w-full max-w-[280px] ${lockoutUntil || isBiometricLoading ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-[#F5F5F7] dark:bg-[#1E293B] discuss:bg-[#1a1a1a] text-[#0F172A] dark:text-white discuss:text-[#F5F5F5] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] discuss:hover:bg-[#262626] transition-all active:scale-90"
              >
                {num}
              </button>
            ))}
            {/* Biometric / empty bottom-left slot */}
            <div className="flex items-center justify-center">
              {localSettings?.type === 'biometric' && (
                <button
                  onClick={handleBiometricUnlock}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-[#2563EB] discuss:text-[#EF4444] hover:bg-[#F0F7FF] discuss:hover:bg-[#EF4444]/10 transition-all active:scale-90"
                  disabled={verifying}
                  aria-label="Verify with biometrics"
                >
                  <Fingerprint className="w-10 h-10" />
                </button>
              )}
            </div>
            <button
              onClick={() => handlePinInput('0')}
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-[#F5F5F7] dark:bg-[#1E293B] discuss:bg-[#1a1a1a] text-[#0F172A] dark:text-white discuss:text-[#F5F5F5] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] discuss:hover:bg-[#262626] transition-all active:scale-90"
            >
              0
            </button>
            <button
              onClick={removeLast}
              className="w-16 h-16 rounded-full flex items-center justify-center text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#F5F5F7] dark:hover:bg-[#1E293B] transition-all active:scale-90"
              aria-label="Delete last digit"
            >
              <Delete className="w-7 h-7" />
            </button>
          </div>

          {/* Bottom actions */}
          <div className="mt-8 flex flex-col items-center gap-3 w-full">
            {/* Sync info */}
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-lg">
              <Info className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
              <p className="text-[10px] text-yellow-700 font-medium">
                Synchronized PIN. Change on one device, it updates all.
              </p>
            </div>

            {/* Logout button — shows confirm */}
            {!showLogoutConfirm ? (
              <Button
                onClick={() => setShowLogoutConfirm(true)}
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout from Account
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-2 w-full bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800/30">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium text-center">
                  This will fully sign you out.
                </p>
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={handleFullLogout}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Yes, Logout
                  </Button>
                  <Button
                    onClick={() => setShowLogoutConfirm(false)}
                    variant="outline"
                    className="flex-1 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
