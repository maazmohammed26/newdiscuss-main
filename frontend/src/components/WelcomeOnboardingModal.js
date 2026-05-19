import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Terminal, Activity, MessageSquare, Shield, ArrowRight } from 'lucide-react';

export default function WelcomeOnboardingModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#101010] border-[#E5E7EB] dark:border-[#222222] p-6 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow Top Border Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

        <DialogHeader className="pt-2">
          <DialogTitle className="font-heading text-xl md:text-2xl font-black text-[#111827] dark:text-[#FFFFFF] text-center tracking-tight">
            Welcome to <span style={{ background: 'linear-gradient(120deg, #DC2626 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="font-black">&lt;Discuss/&gt;</span>
          </DialogTitle>
          <p className="text-center text-xs text-gray-400 uppercase tracking-widest font-bold pt-1">
            Developer Communication Hub
          </p>
        </DialogHeader>

        {/* Message from Founder & Developer */}
        <div className="mt-5 bg-gray-50 dark:bg-[#161616] border border-gray-100 dark:border-[#222222] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#DC2626] to-[#2563EB] flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-md">
              MMA
            </div>
            <div>
              <h4 className="text-[13px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider mb-0.5">
                Mohammed Maaz
              </h4>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold mb-2">
                Founder & Developer
              </p>
              <p className="text-[13px] leading-relaxed text-gray-600 dark:text-[#A0A090] font-medium italic">
                "Hey! Thank you for joining Discuss. I built this ecosystem to provide engineers and builders with a high-signal, zero-noise environment for technical collaboration. No ads, no algorithmic feeds, just raw developer exchange. Enjoy the platform!"
              </p>
            </div>
          </div>
        </div>

        {/* Core Tech Features */}
        <div className="mt-5 space-y-3.5">
          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            Ecosystem Core Features
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Feature 1: Pulse */}
            <div className="p-4 bg-gray-50 dark:bg-[#161616] border border-gray-100 dark:border-[#222222] rounded-xl flex gap-3 items-start">
              <Terminal className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wide">Pulse Log</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal font-medium">
                  Share live technical updates, repository links, and code insights.
                </p>
              </div>
            </div>

            {/* Feature 2: Signal */}
            <div className="p-4 bg-gray-50 dark:bg-[#161616] border border-gray-100 dark:border-[#222222] rounded-xl flex gap-3 items-start">
              <Activity className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wide">Signal Broadcast</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal font-medium">
                  Stay updated with trending logs and quick temporary builder highlights.
                </p>
              </div>
            </div>

            {/* Feature 3: Chats */}
            <div className="p-4 bg-gray-50 dark:bg-[#161616] border border-gray-100 dark:border-[#222222] rounded-xl flex gap-3 items-start">
              <MessageSquare className="w-5 h-5 text-gray-600 dark:text-[#E1E0CC] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wide">Ecosystem Chats</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal font-medium">
                  Instant messaging, direct chats, and modular engineering conversations.
                </p>
              </div>
            </div>

            {/* Feature 4: Security */}
            <div className="p-4 bg-gray-50 dark:bg-[#161616] border border-gray-100 dark:border-[#222222] rounded-xl flex gap-3 items-start">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wide">Session Security</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal font-medium">
                  Advanced lock screen protection, PIN safety, and data control.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#DC2626] to-[#2563EB] hover:opacity-90 text-white font-bold rounded-xl py-5 flex items-center justify-center gap-2 text-sm shadow-md transition-all uppercase tracking-wider"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
