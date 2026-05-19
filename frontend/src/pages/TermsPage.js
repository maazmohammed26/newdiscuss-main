import { Link } from 'react-router-dom';
import { Shield, Lock, Database, Smartphone, ArrowLeft, CheckCircle } from 'lucide-react';
import DiscussLogo from '@/components/DiscussLogo';
import AdminMessageBanner from '@/components/AdminMessageBanner';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-[#E1E0CC] flex flex-col relative overflow-hidden">
      {/* Visual noise overlay */}
      <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />
      <AdminMessageBanner />

      {/* Floating header / top nav */}
      <header className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-50 backdrop-blur-md bg-black/40 border-b border-white/10">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border border-white/10 bg-black/50 text-xs font-bold text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#DC2626]" />
          <span>Back to Home</span>
        </Link>
        <Link to="/" className="flex items-center gap-0.5 select-none bg-black/50 px-3 py-1.5 rounded-full border border-white/5">
          <DiscussLogo size="sm" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 pt-28 pb-16 relative z-10 w-full">
        {/* Page title and header capsule */}
        <div className="relative bg-[#101010] rounded-2xl shadow-2xl p-6 md:p-8 border border-white/5 pt-1.5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#DC2626]/10 rounded-xl flex items-center justify-center border border-[#DC2626]/20">
              <Shield className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white leading-tight">Terms and Conditions</h1>
              <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider mt-1">Last updated: May 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-gray-300 text-[14px] leading-relaxed font-medium">
            <p>
              Welcome to **Discuss**. By registering an account or accessing our services, you agree to comply with and be bound by the following terms. Please read them carefully.
            </p>

            <div className="bg-[#181818] rounded-xl p-4 border border-white/5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                <Lock className="w-4 h-4 text-[#DC2626]" />
                1. Data Encryption & Security
              </h3>
              <p className="text-xs text-gray-400">
                All account credentials and chat history are secured using state-of-the-art encryption protocols. We employ AES-256 encryption for data at rest and TLS 1.3 for data in transit. Passwords are salted and hashed using bcrypt to guarantee total integrity.
              </p>
            </div>

            <div className="bg-[#181818] rounded-xl p-4 border border-white/5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                <Database className="w-4 h-4 text-[#2563EB]" />
                2. Database Governance
              </h3>
              <p className="text-xs text-gray-400">
                We employ secure Firebase Cloud Databases for instant real-time synchronization. Your session data is governed by strict security rules, fully compliant with SOC 1, SOC 2, and ISO 27001 industrial requirements.
              </p>
            </div>

            <div className="bg-[#181818] rounded-xl p-4 border border-white/5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                <Smartphone className="w-4 h-4 text-[#DC2626]" />
                3. Progressive Web Application (PWA)
              </h3>
              <p className="text-xs text-gray-400">
                Our platform is PWA-enabled, allowing direct home screen installs, offline client-side caching, and instant cross-platform background push notifications.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2 text-white">4. User Responsibilities</h3>
              <p className="text-xs text-gray-400">By maintaining an active user profile, you commit to:</p>
              <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside mt-2">
                <li>Providing accurate registration details.</li>
                <li>Keeping password and device recovery credentials confidential.</li>
                <li>Refraining from harassment, spamming, or malicious API scraping.</li>
                <li>Reporting vulnerabilities responsibly through our secure channels.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2 text-white">5. Account Deletion & Deactivation</h3>
              <p className="text-xs text-gray-400">
                You hold complete ownership of your personal data. You are free to deactivate or delete your account at any time directly through your profile settings, which completely purges your private information.
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#DC2626]/10 to-[#2563EB]/10 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-white font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  Using Discuss constitutes full acceptance of these terms. If you do not agree, please discontinue service usage.
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-white/5 relative z-10 bg-black">
        <p className="text-gray-500 text-xs font-semibold">
          <span>Developed by </span>
          <a href="https://www.maazportfolio.site/" target="_blank" rel="noopener noreferrer" className="shining-red-blue-text font-black hover:underline">
            &lt;mma/&gt;
          </a>
        </p>
      </footer>
      <style>{`
        @keyframes shine-red-blue {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shining-red-blue-text {
          background: linear-gradient(120deg, #DC2626 25%, #93C5FD 50%, #2563EB 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-red-blue 3.5s linear infinite;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.25);
          font-weight: 800;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
