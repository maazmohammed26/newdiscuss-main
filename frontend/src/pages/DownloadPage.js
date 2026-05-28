import { useState, useEffect } from 'react';
import { Star, Download, Smartphone, Check, Clock, ShieldCheck, Zap, MessageSquare, Flame, PlayCircle, Eye, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';

/**
 * DownloadPage — Premium App Store & Play Store styled landing page
 * Renders release notes, screenshots, direct APK download button, and PWA installs
 */
export default function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
    };
  }, []);

  const handleAPKDownload = () => {
    toast.success('Your Discuss Android APK download is starting...');
    window.location.href = '/app/discussit.apk';
  };

  const handlePWAInstall = async () => {
    if (!deferredPrompt) {
      toast.info('To install the web app, open your browser settings and click "Add to Home Screen" or "Install App".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Discuss successfully installed!');
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] pb-20 select-none">
      <Header />

      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        
        {/* Main App Store Layout Header */}
        <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-[24px] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] p-6 md:p-8 shadow-card flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative overflow-hidden">
          <div className="bg-noise absolute inset-0 opacity-[0.06] pointer-events-none" />

          {/* Large App Store Styled Icon */}
          <div className="flex-shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-[28px] bg-gradient-to-br from-[#2563EB] to-[#DC2626] discuss:from-[#EF4444] discuss:to-[#2563EB] discuss-black:from-[#FF007F] discuss-black:to-[#2563EB] flex items-center justify-center shadow-2xl relative border border-white/15">
            <span className="font-extrabold text-5xl md:text-6xl tracking-tighter text-white font-mono animate-pulse">D</span>
            <div className="absolute -bottom-2 bg-neutral-900/90 text-white text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-white/10 uppercase shadow-md">
              Official
            </div>
          </div>

          {/* App Store Metadata Panel */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">Discuss</h1>
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1 mx-auto md:mx-0">
                <Clock className="w-3.5 h-3.5" />
                Coming soon on Play Store
              </span>
            </div>
            
            <p className="text-lg text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] font-medium mt-1">
              Connect, Share & Discover
            </p>
            <p className="text-sm font-semibold text-[#2563EB] discuss:text-[#EF4444] discuss-black:text-[#FF007F] mt-1.5">
              Discuss Official App
            </p>

            {/* Quick Specs Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-5 py-3 border-t border-b border-neutral-100 dark:border-neutral-700/50 discuss:border-[#333333]/50">
              <div className="text-center px-2">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Rating</p>
                <p className="text-sm font-bold mt-0.5 flex items-center gap-0.5 justify-center">
                  4.8 <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </p>
              </div>
              <div className="w-[1px] h-7 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />
              
              <div className="text-center px-2">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Downloads</p>
                <p className="text-sm font-bold mt-0.5">10K+</p>
              </div>
              <div className="w-[1px] h-7 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />

              <div className="text-center px-2">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Size</p>
                <p className="text-sm font-bold mt-0.5">~8.4 MB</p>
              </div>
              <div className="w-[1px] h-7 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />

              <div className="text-center px-2">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Age Rating</p>
                <p className="text-sm font-bold mt-0.5">Rated 3+</p>
              </div>
            </div>

            {/* Direct Downloads Call to Action */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleAPKDownload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#2563EB] to-[#DC2626] discuss:from-[#EF4444] discuss:to-[#2563EB] discuss-black:from-[#FF007F] discuss-black:to-[#2563EB] hover:opacity-95 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg active:scale-[0.98] w-full"
              >
                <Download className="w-5 h-5 animate-bounce" />
                Download Direct APK (Android)
              </button>

              <button
                onClick={handlePWAInstall}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] hover:bg-neutral-200 dark:hover:bg-neutral-600 discuss:hover:bg-[#333333] border border-neutral-300 dark:border-neutral-600 discuss:border-[#404040] text-neutral-800 dark:text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] w-full"
              >
                <Smartphone className="w-5 h-5" />
                Install Web App (PWA)
              </button>
            </div>
            
            <p className="text-[11px] text-neutral-400 italic text-center md:text-left mt-2">
              *APK placeholder is staged successfully in the public directory. Drop your compiled APK here at any time.
            </p>
          </div>
        </div>

        {/* Dynamic Features Screenshots Slider */}
        <div className="mt-10">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
            App Screen Previews
          </h3>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {/* Screen 1: Feed */}
            <div className="w-[260px] flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-3xl p-3 shadow-lg snap-start">
              <div className="aspect-[9/16] bg-[#121212] rounded-2xl p-3 flex flex-col justify-between border border-neutral-800">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-red-600 flex items-center justify-center text-[10px] text-white font-extrabold font-mono">D</div>
                  <span className="text-[9px] text-[#EF4444] font-bold">Trending Discussions</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="bg-[#1e1e1e] p-2.5 rounded-xl border border-neutral-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-700" />
                      <span className="text-[10px] font-bold">@dev_guru</span>
                    </div>
                    <p className="text-[10px] text-neutral-300">Just launched new serverless auth bridge flow. Works 100% glitch-free on mobile webviews!</p>
                  </div>
                  <div className="bg-[#1e1e1e] p-2.5 rounded-xl border border-neutral-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-700" />
                      <span className="text-[10px] font-bold">@react_queen</span>
                    </div>
                    <p className="text-[10px] text-neutral-300">Fast in-memory cache implemented. Feed opens in under 0ms now. Instant speed is real!</p>
                  </div>
                </div>
                <div className="text-[9px] text-neutral-500 text-center border-t border-neutral-800 pt-2">Discuss Feed Screen</div>
              </div>
            </div>

            {/* Screen 2: Chats */}
            <div className="w-[260px] flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-3xl p-3 shadow-lg snap-start">
              <div className="aspect-[9/16] bg-[#121212] rounded-2xl p-3 flex flex-col justify-between border border-neutral-800">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[10px] font-bold">Chats</span>
                  <MessageSquare className="w-3.5 h-3.5 text-[#EF4444]" />
                </div>
                <div className="flex-1 flex flex-col justify-start gap-2.5 mt-3">
                  <div className="flex items-center gap-2.5 p-2 bg-[#1e1e1e] rounded-xl border border-neutral-800">
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">M</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate">Mohammed Maaz</p>
                      <p className="text-[8px] text-neutral-400 truncate">Hello, did you push changes?</p>
                    </div>
                    <span className="text-[8px] text-[#EF4444] font-bold shrink-0">Just now</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 bg-[#1e1e1e] rounded-xl border border-neutral-800 opacity-60">
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">J</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate">John Doe</p>
                      <p className="text-[8px] text-neutral-400 truncate">Project discussion is ready</p>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-neutral-500 text-center border-t border-neutral-800 pt-2">Chat List Screen</div>
              </div>
            </div>

            {/* Screen 3: Pulse */}
            <div className="w-[260px] flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-3xl p-3 shadow-lg snap-start">
              <div className="aspect-[9/16] bg-[#121212] rounded-2xl p-3 flex flex-col justify-between border border-neutral-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 flex flex-col justify-between p-3 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white">Pulse Live</span>
                    <PlayCircle className="w-4 h-4 text-red-500 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 text-left text-white">
                    <p className="text-[10px] font-bold">@discuss_member</p>
                    <p className="text-[8px] text-neutral-300 leading-normal">Sharing the new smooth animations on PWA mobile app open. So responsive!</p>
                  </div>
                </div>
                {/* Visual Video Placeholder */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#2563EB]/40 to-[#DC2626]/40 pointer-events-none" />
                <div className="h-6" aria-hidden />
                <div className="text-[9px] text-white/50 text-center z-10">High-speed Video Pulse Screen</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Description & Features List */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Main Description Column */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Release notes block */}
            <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] p-5 shadow-sm">
              <h3 className="text-md font-bold border-b border-neutral-100 dark:border-neutral-700/50 discuss:border-[#333333]/50 pb-2 mb-3">
                What's New in Version 1.2.0
              </h3>
              <ul className="text-xs text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Premium Auth Bridge</strong>: Smooth and secure Google Sign-in flow designed for wrapped mobile WebView apps.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Lightning Speed Caching</strong>: Brand new in-memory caching system that loads posts and conversations instantly upon navigating tabs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Seamless Splash Guard</strong>: A beautiful, cinematic loading splash screen preventing any flashes or visual glitches on startup.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Full-Width Tablet Layout</strong>: Expanded container designs for wide tablet screens, restoring a gorgeous full-screen chat experience.</span>
                </li>
              </ul>
            </div>

            {/* App Store Description Block */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] pb-2">
                About Discuss
              </h2>
              
              <p className="text-sm text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] leading-relaxed">
                Discuss is a modern social platform built for real conversations, vibrant communities, and meaningful connections. Create posts, explore trending discussions, discover people nearby, and communicate securely in real time — all within a clean, fast, and modern experience.
              </p>

              {/* Sub-features grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                
                <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Social & Community
                  </h4>
                  <ul className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] list-disc list-inside space-y-1.5 pl-1 pt-1.5">
                    <li>Create & share public posts</li>
                    <li>Explore trending discussions</li>
                    <li>Follow creators and discover people</li>
                    <li>Likes, comments & interactions</li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#2563EB] discuss:text-[#EF4444]" />
                    Real-Time Chats
                  </h4>
                  <ul className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] list-disc list-inside space-y-1.5 pl-1 pt-1.5">
                    <li>Secure private messaging</li>
                    <li>Instant push notifications</li>
                    <li>Instant local caching engine</li>
                    <li>Live-synchronized updates</li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                    Media Sharing & Pulse
                  </h4>
                  <ul className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] list-disc list-inside space-y-1.5 pl-1 pt-1.5">
                    <li>Upload & share media content</li>
                    <li>High-performance Pulse videos</li>
                    <li>Interactive community layout</li>
                    <li>Smooth fluid UI transitions</li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    Privacy & Security
                  </h4>
                  <ul className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] list-disc list-inside space-y-1.5 pl-1 pt-1.5">
                    <li>Secure Firebase credentials</li>
                    <li>Encrypted database bridges</li>
                    <li>Biometric screen locker</li>
                    <li>Private, protected database</li>
                  </ul>
                </div>

              </div>

              <div className="bg-[#2563EB]/5 dark:bg-neutral-800 discuss:bg-[#EF4444]/5 rounded-2xl border border-[#2563EB]/10 discuss:border-[#EF4444]/10 p-5 mt-6">
                <h4 className="font-bold text-sm text-neutral-800 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444] animate-pulse" />
                  Why Choose Discuss?
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] leading-relaxed mt-2">
                  Discuss helps people connect, communicate, and share ideas through a safe, interactive, and community-driven social platform designed for modern conversations. Whether you want to express your thoughts, discover communities, collaborate with others, or build meaningful connections — Discuss brings everything together in one place.
                </p>
              </div>

            </div>

          </div>

          {/* Right Information Specification Column */}
          <div className="md:col-span-4 space-y-6">
            <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-700/50 discuss:border-[#333333]/50 pb-2">
                Information
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-neutral-400 font-medium">Developer</p>
                  <p className="font-semibold text-neutral-800 dark:text-white mt-0.5">Discuss Official App</p>
                </div>
                <div>
                  <p className="text-neutral-400 font-medium">Size</p>
                  <p className="font-semibold text-neutral-800 dark:text-white mt-0.5">8.4 MB (Android APK)</p>
                </div>
                <div>
                  <p className="text-neutral-400 font-medium">Category</p>
                  <p className="font-semibold text-neutral-800 dark:text-white mt-0.5">Social / Community</p>
                </div>
                <div>
                  <p className="text-neutral-400 font-medium">Compatibility</p>
                  <p className="font-semibold text-neutral-800 dark:text-white mt-0.5">Requires Android 8.0+ / Safari on iOS / Chrome Desktop</p>
                </div>
                <div>
                  <p className="text-neutral-400 font-medium">Languages</p>
                  <p className="font-semibold text-neutral-800 dark:text-white mt-0.5">English</p>
                </div>
                <div>
                  <p className="text-neutral-400 font-medium">License</p>
                  <p className="font-semibold text-neutral-800 dark:text-white mt-0.5">Free / Open Ecosystem</p>
                </div>
              </div>
            </div>

            {/* Quick Security Badge */}
            <div className="bg-green-500/5 rounded-2xl border border-green-500/10 p-4.5 flex gap-3.5 items-start">
              <ShieldCheck className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs text-green-600 dark:text-green-400">100% Secure APK</h5>
                <p className="text-[10px] text-neutral-500 leading-normal mt-0.5">Verified clean download. Compiled with secure Firebase Authentication and encrypted endpoints.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
