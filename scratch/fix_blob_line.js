const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend/src/pages/ProfilePage.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find line 1107 (index 1106) which has the blob
const blobLineIndex = lines.findIndex(l => l.includes('END PROFILE FIELDS') && l.includes('handleToggleSecurity'));

if (blobLineIndex === -1) {
  console.log('Blob line not found!');
  process.exit(1);
}

console.log('Found blob at line:', blobLineIndex + 1);

const newLines = [
  `          {/* ==================== END PROFILE FIELDS ==================== */}`,
  ``,
  `          {/* ==================== APP SECURITY ==================== */}`,
  `          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">`,
  `            <div className="flex items-center gap-2 mb-4">`,
  `              <Shield className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />`,
  `              <span className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm font-medium">App Security</span>`,
  `            </div>`,
  `            <div className="space-y-4">`,
  `              <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] discuss:border discuss:border-[#333333] rounded-xl p-4">`,
  `                <div className="flex items-center gap-3">`,
  `                  <div className={\`p-2 rounded-lg \${localSettings?.enabled ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]' : 'bg-[#6275AF]/10 text-[#6275AF]'}\`}>`,
  `                    <Smartphone className="w-5 h-5" />`,
  `                  </div>`,
  `                  <div>`,
  `                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">App Lock</p>`,
  `                    <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">PIN or Biometrics on launch</p>`,
  `                  </div>`,
  `                </div>`,
  `                <button`,
  `                  onClick={handleToggleSecurity}`,
  `                  className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none \${localSettings?.enabled ? 'bg-[#2563EB] discuss:bg-[#EF4444]' : 'bg-neutral-200 dark:bg-neutral-700'}\`}`,
  `                >`,
  `                  <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${localSettings?.enabled ? 'translate-x-6' : 'translate-x-1'}\`} />`,
  `                </button>`,
  `              </div>`,
  ``,
  `              {localSettings?.enabled && (`,
  `                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">`,
  `                  {biometricAvailable && (`,
  `                    <div className="flex items-center justify-between border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-xl p-4">`,
  `                      <div className="flex items-center gap-3">`,
  `                        <div className={\`p-2 rounded-lg \${localSettings?.type === 'biometric' ? 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444]' : 'bg-[#6275AF]/10 text-[#6275AF]'}\`}>`,
  `                          <BiometricIcon className="w-5 h-5" />`,
  `                        </div>`,
  `                        <div>`,
  `                          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Biometrics</p>`,
  `                          <p className="text-[11px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF]">Use FaceID / Fingerprint</p>`,
  `                        </div>`,
  `                      </div>`,
  `                      <button`,
  `                        onClick={handleBiometricToggle}`,
  `                        disabled={testingBiometric}`,
  `                        className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none \${localSettings?.type === 'biometric' ? 'bg-[#2563EB] discuss:bg-[#EF4444]' : 'bg-neutral-200 dark:bg-neutral-700'}\`}`,
  `                      >`,
  `                        <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${localSettings?.type === 'biometric' ? 'translate-x-6' : 'translate-x-1'}\`} />`,
  `                      </button>`,
  `                    </div>`,
  `                  )}`,
  `                  <Button onClick={() => setShowChangePinModal(true)} variant="outline" size="sm" className="w-full text-xs text-[#6275AF]">`,
  `                    Change Security PIN`,
  `                  </Button>`,
  `                </div>`,
  `              )}`,
  ``,
  `              <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">`,
  `                <Info className="w-3.5 h-3.5 text-blue-500" />`,
  `                <p className="text-[10px] text-blue-600 dark:text-blue-400">`,
  `                  PIN synced across devices. Biometrics are device-specific.`,
  `                </p>`,
  `              </div>`,
  `            </div>`,
  `          </div>`,
];

// Replace the blob line with the new clean lines
lines.splice(blobLineIndex, 1, ...newLines);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('ProfilePage.js security UI fixed successfully!');
