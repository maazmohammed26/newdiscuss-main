const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend/src/pages/ProfilePage.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add imports if missing
if (!content.includes('Shield')) {
    content = content.replace(
        "import { Eye, EyeOff, MessageSquare } from 'lucide-react';",
        "import { Eye, EyeOff, MessageSquare, Shield, Smartphone, Fingerprint as BiometricIcon, Lock } from 'lucide-react';"
    );
}

// Add state and logic before "const initials ="
const logic = `
  // Security settings
  const { localSettings, updatePin, setSecurityEnabled, setSecurityType, verifyPin } = useSecurity();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showVerifyPinModal, setShowVerifyPinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [testingBiometric, setTestingBiometric] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => { 
    if (typeof isBiometricSupported === 'function') {
      isBiometricSupported().then(setBiometricAvailable); 
    }
  }, []);

  const handleToggleSecurity = async () => { 
    if (!localSettings.enabled) { 
      setShowPinModal(true); 
    } else { 
      setSecurityEnabled(false); 
      toast.success('App lock disabled'); 
    } 
  };
  
  const handleSavePinAndEnable = async () => { 
    if (newPin.length !== 6) { toast.error('PIN must be 6 digits'); return; } 
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; } 
    await updatePin(newPin); 
    setSecurityEnabled(true); 
    setSecurityType('pin'); 
    setShowPinModal(false); 
    setNewPin(''); 
    setConfirmPin(''); 
    toast.success('App lock enabled and synced'); 
  };
  
  const handleUpdatePin = async () => { 
    if (!verifyPin(oldPin)) { toast.error('Incorrect old PIN'); return; } 
    if (newPin.length !== 6) { toast.error('New PIN must be 6 digits'); return; } 
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; } 
    await updatePin(newPin); 
    setShowChangePinModal(false); 
    setOldPin(''); 
    setNewPin(''); 
    setConfirmPin(''); 
    toast.success('PIN updated successfully'); 
  };
  
  const handleBiometricToggle = () => { 
    if (localSettings.type === 'biometric') { 
      setSecurityType('pin'); 
    } else { 
      setPendingAction('biometric'); 
      setShowVerifyPinModal(true); 
    } 
  };
  
  const handleVerifySuccess = async () => { 
    if (!verifyPin(oldPin)) { toast.error('Incorrect PIN'); return; } 
    if (pendingAction === 'biometric') { 
      setTestingBiometric(true); 
      const success = await registerBiometric(user?.username || 'User'); 
      if (success) { 
        setSecurityType('biometric'); 
        toast.success('Biometric lock enabled'); 
      } else { 
        toast.error('Registration failed'); 
      } 
      setTestingBiometric(false); 
    } 
    setShowVerifyPinModal(false); 
    setOldPin(''); 
  };
`;

if (!content.includes('handleToggleSecurity')) {
    content = content.replace('const initials =', logic + '\n  const initials =');
}

// Add UI after "END PROFILE FIELDS"
const ui = `
          {/* ==================== APP SECURITY ==================== */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
              <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-medium">App Security</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] discuss:border discuss:border-[#333333] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={"p-2 rounded-lg " + (localSettings.enabled ? "bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]" : "bg-[#6275AF]/10 text-[#6275AF]")}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">App Lock</p>
                    <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">PIN or Biometrics on launch</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleSecurity}
                  className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none " + (localSettings.enabled ? "bg-[#2563EB] discuss:bg-[#EF4444]" : "bg-neutral-200 dark:bg-neutral-700")}
                >
                  <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (localSettings.enabled ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>

              {localSettings.enabled && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  {biometricAvailable && (
                    <div className="flex items-center justify-between border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className={"p-2 rounded-lg " + (localSettings.type === "biometric" ? "bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]" : "bg-[#6275AF]/10 text-[#6275AF]")}>
                          <BiometricIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Biometrics</p>
                          <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">Use FaceID/Fingerprint</p>
                        </div>
                      </div>
                      <button
                        onClick={handleBiometricToggle}
                        disabled={testingBiometric}
                        className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none " + (localSettings.type === "biometric" ? "bg-[#2563EB] discuss:bg-[#EF4444]" : "bg-neutral-200 dark:bg-neutral-700")}
                      >
                        <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (localSettings.type === "biometric" ? "translate-x-6" : "translate-x-1")} />
                      </button>
                    </div>
                  )}
                  <Button onClick={() => setShowChangePinModal(true)} variant="outline" size="sm" className="w-full text-xs text-[#6275AF]">
                    Change Security PIN
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  Note: PIN is synced across devices. Biometrics are local.
                </p>
              </div>
            </div>
          </div>
`;

if (!content.includes('App Security')) {
    content = content.replace('{/* ==================== END PROFILE FIELDS ==================== */}', '{/* ==================== END PROFILE FIELDS ==================== */}\n' + ui);
}

// Add Modals before final </div>
const modals = `
      {/* PIN Modals */}
      <AlertDialog open={showPinModal} onOpenChange={setShowPinModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Set Security PIN</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px]">
              Set a 6-digit PIN. This will protect your account on all devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">New PIN</label>
              <Input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\\D/g, ''))} placeholder="••••••" className="text-center text-xl tracking-[1em] font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">Confirm PIN</label>
              <Input type="password" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\\D/g, ''))} placeholder="••••••" className="text-center text-xl tracking-[1em] font-mono" />
            </div>
          </div>
          <AlertDialogFooter className="flex flex-col gap-2">
            <Button onClick={handleSavePinAndEnable} className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white">Save & Enable</Button>
            <Button variant="ghost" onClick={() => setShowPinModal(false)} className="w-full">Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showChangePinModal} onOpenChange={setShowChangePinModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Change PIN</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">Old PIN</label>
              <Input type="password" maxLength={6} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\\D/g, ''))} placeholder="••••••" className="text-center text-xl tracking-[1em] font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">New PIN</label>
              <Input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\\D/g, ''))} placeholder="••••••" className="text-center text-xl tracking-[1em] font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#6275AF]">Confirm New PIN</label>
              <Input type="password" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\\D/g, ''))} placeholder="••••••" className="text-center text-xl tracking-[1em] font-mono" />
            </div>
          </div>
          <AlertDialogFooter className="flex flex-col gap-2">
            <Button onClick={handleUpdatePin} className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white">Update PIN</Button>
            <Button variant="ghost" onClick={() => setShowChangePinModal(false)} className="w-full">Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showVerifyPinModal} onOpenChange={setShowVerifyPinModal}>
        <AlertDialogContent className="max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Verify Identity</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px]">
              Please enter your 6-digit PIN to confirm this security change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input type="password" maxLength={6} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\\D/g, ''))} placeholder="••••••" className="text-center text-xl tracking-[1em] font-mono" />
          </div>
          <AlertDialogFooter className="flex flex-col gap-2">
            <Button onClick={handleVerifySuccess} className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white">Verify PIN</Button>
            <Button variant="ghost" onClick={() => setShowVerifyPinModal(false)} className="w-full">Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
`;

if (!content.includes('showVerifyPinModal')) {
    content = content.replace('<style>{`', modals + '\n      <style>{`');
}

fs.writeFileSync(filePath, content);
console.log('ProfilePage.js updated with security UI');
