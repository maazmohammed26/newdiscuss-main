import React, { useState, useEffect, useMemo } from 'react';
import { useSecurity } from '@/contexts/SecurityContext';
import { useAuth } from '@/contexts/AuthContext';
import { verifyBiometric } from '@/lib/securityService';
import { Lock, Fingerprint, ShieldCheck, ShieldAlert, Delete, ArrowRight, Shield, Globe, Info } from 'lucide-react';
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
  const { unlock, settings } = useSecurity();
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % QUOTES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-trigger biometrics if enabled
    if (settings.enabled && settings.type === 'biometric') {
      handleBiometricUnlock();
    }
  }, []);

  const handleBiometricUnlock = async () => {
    setVerifying(true);
    const success = await verifyBiometric();
    if (success) {
      unlock('biometric');
    } else {
      toast.error('Biometric verification failed');
    }
    setVerifying(false);
  };

  const handlePinInput = (num) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 6) {
        if (unlock('pin', newPin)) {
          // Success
        } else {
          setError(true);
          setPin('');
          toast.error('Incorrect PIN');
        }
      }
    }
  };

  const removeLast = () => setPin(prev => prev.slice(0, -1));

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#0F172A] discuss:bg-[#121212] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-xs w-full flex flex-col items-center">
        
        {/* Animated Security Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-[#F5F5F7] dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-[2rem] flex items-center justify-center shadow-lg discuss:border discuss:border-[#333333] transition-all duration-300 transform hover:scale-105">
            {error ? (
              <ShieldAlert className="w-12 h-12 text-red-500 animate-shake" />
            ) : (
              <ShieldCheck className="w-12 h-12 text-[#2563EB] discuss:text-[#EF4444]" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-[#0F172A] discuss:bg-[#121212] rounded-full flex items-center justify-center shadow-sm border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <Lock className="w-4 h-4 text-[#6275AF]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white discuss:text-[#F5F5F5] mb-2 tracking-tight">
          Discuss Secure
        </h1>
        
        <div className="h-6 mb-8 overflow-hidden">
           <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-sm text-center italic animate-in slide-in-from-bottom-2 duration-700">
            {QUOTES[quoteIndex]}
          </p>
        </div>

        <div className="w-full bg-[#F5F5F7]/50 dark:bg-[#1E293B]/20 discuss:bg-[#1a1a1a]/50 rounded-2xl p-6 mb-8 border border-[#E2E8F0]/50 dark:border-[#334155]/20 discuss:border-[#333333]/50">
          <div className="flex flex-col items-center gap-4">
            {/* PIN Indicators */}
            <div className="flex gap-4 mb-2">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    i < pin.length 
                      ? 'bg-[#2563EB] discuss:bg-[#EF4444] scale-125 shadow-[0_0_10px_rgba(37,99,235,0.3)] discuss:shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                      : 'bg-[#E2E8F0] dark:bg-[#334155] discuss:bg-[#333333]'
                  } ${error ? 'animate-shake bg-red-500' : ''}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] uppercase tracking-widest font-semibold">
              Enter Passcode
            </p>
          </div>
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-5 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-[#F5F5F7] dark:bg-[#1E293B] discuss:bg-[#1a1a1a] text-[#0F172A] dark:text-white discuss:text-[#F5F5F5] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] discuss:hover:bg-[#262626] transition-all active:scale-90 border border-transparent hover:border-[#E2E8F0] dark:hover:border-[#334155] discuss:hover:border-[#333333]"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {settings.type === 'biometric' && (
              <button 
                onClick={handleBiometricUnlock}
                className="w-16 h-16 rounded-full flex items-center justify-center text-[#2563EB] discuss:text-[#EF4444] hover:bg-[#F0F7FF] discuss:hover:bg-[#EF4444]/10 transition-all active:scale-90"
                disabled={verifying}
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
            className="w-16 h-16 rounded-full flex items-center justify-center text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:bg-[#F5F5F7] dark:hover:bg-[#1E293B] discuss:hover:bg-[#1a1a1a] transition-all active:scale-90"
          >
            <Delete className="w-7 h-7" />
          </button>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs font-medium hover:underline opacity-60">
            Forgot Passcode? (Coming Soon)
          </button>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-lg">
            <Info className="w-3.5 h-3.5 text-yellow-600" />
            <p className="text-[10px] text-yellow-700 font-medium">
              Device-specific lock. Only active on this device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
