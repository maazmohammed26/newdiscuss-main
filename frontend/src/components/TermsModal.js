import { useState, useRef, useEffect } from 'react';
import { Shield, Database, Lock, Smartphone, CheckCircle, X } from 'lucide-react';

export default function TermsModal({ open, onClose, onAccept, showAcceptButton = false }) {
  const scrollRef = useRef(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto select-none">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-lg bg-[#101010] border border-white/5 rounded-2xl my-8 shadow-2xl flex flex-col pt-1 animate-in fade-in slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top thick gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

        {/* Custom close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-gray-400 hover:text-white transition-all active:scale-95 z-50 shadow-inner"
          title="Close Terms"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-2 flex-shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#DC2626]" />
            Terms and Conditions
          </h2>
        </div>

        {/* Scrollable Content Area */}
        <div
          ref={scrollRef}
          className="overflow-y-auto px-6 py-4 terms-scroll max-h-[60vh]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.terms-scroll::-webkit-scrollbar { display: none; }`}</style>

          <div className="space-y-6 text-gray-300 text-sm leading-relaxed font-medium">
            <p className="text-gray-500 font-mono text-xs">Last updated: May 2026</p>

            <div className="bg-[#181818] rounded-xl p-4 border border-white/5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                <Lock className="w-4 h-4 text-[#DC2626]" />
                Data Encryption & Security
              </h3>
              <p className="text-xs text-gray-400">
                All your data is encrypted using industry-standard encryption protocols. We employ AES-256 encryption for data at rest and TLS 1.3 for data in transit. Your passwords are hashed using bcrypt with salt rounds, ensuring they can never be retrieved or exposed.
              </p>
            </div>

            <div className="bg-[#181818] rounded-xl p-4 border border-white/5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                <Database className="w-4 h-4 text-[#2563EB]" />
                Firebase Database Usage
              </h3>
              <p className="text-xs text-gray-400">
                We use Google Firebase Realtime Database, a secure, scalable, and reliable cloud database solution. Firebase provides automatic data synchronization, offline support, and is compliant with major security standards including SOC 1, SOC 2, and ISO 27001.
              </p>
            </div>

            <div className="bg-[#181818] rounded-xl p-4 border border-white/5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                <Shield className="w-4 h-4 text-[#DC2626]" />
                Full Security Assurance
              </h3>
              <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                <li>Secure authentication via Firebase Auth</li>
                <li>Real-time security rules enforcement</li>
                <li>Protection against XSS, CSRF, and injection attacks</li>
                <li>Regular security audits and updates</li>
                <li>GDPR and CCPA compliant data handling</li>
                <li>No third-party data sharing without consent</li>
              </ul>
            </div>

            <div className="bg-[#181818] rounded-xl p-4 border border-white/5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                <Smartphone className="w-4 h-4 text-[#2563EB]" />
                Progressive Web App (PWA) Enabled
              </h3>
              <p className="text-xs text-gray-400">
                Our platform is PWA-enabled, allowing you to install it on your device for a native app-like experience. Features include offline access, push notifications, and seamless updates without app store downloads.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2 text-white">User Responsibilities</h3>
              <p className="text-xs text-gray-400">By using this platform, you agree to:</p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside mt-2">
                <li>Provide accurate and truthful information</li>
                <li>Keep your login credentials secure</li>
                <li>Not engage in harassment, spam, or malicious activities</li>
                <li>Respect intellectual property rights</li>
                <li>Report any security vulnerabilities responsibly</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2 text-white">Content Guidelines</h3>
              <p className="text-xs text-gray-400">
                Users are responsible for the content they post. We reserve the right to remove content that violates our community guidelines, including but not limited to hate speech, illegal content, or spam.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2 text-white">Account Termination</h3>
              <p className="text-xs text-gray-400">
                We reserve the right to suspend or terminate accounts that violate these terms. Users may also delete their accounts at any time through their profile settings.
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#DC2626]/10 to-[#2563EB]/10 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-white font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#2563EB]" />
                By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by all the conditions stated above.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 flex-shrink-0">
          {showAcceptButton ? (
            <button
              onClick={() => { if (onAccept) onAccept(); }}
              className="w-full bg-gradient-to-r from-[#DC2626] to-[#2563EB] text-white hover:opacity-95 active:scale-95 transition-all rounded-xl py-3 h-12 font-black shadow-lg text-[14px]"
            >
              I Accept the Terms and Conditions
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-[#181818] hover:bg-[#202020] border border-white/5 text-[#E1E0CC] rounded-xl py-3 h-12 font-bold transition-all active:scale-95"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
