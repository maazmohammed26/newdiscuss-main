import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Map, Navigation, ExternalLink, Globe } from 'lucide-react';

export default function MapSelectorModal({ isOpen, onOpenChange, location }) {
  if (!location) return null;

  const { latitude, longitude, address } = location;

  const openGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
    onOpenChange(false);
  };

  const openAppleMaps = () => {
    window.open(`maps://maps.apple.com/?q=${latitude},${longitude}`, '_blank');
    onOpenChange(false);
  };

  const openWaze = () => {
    window.open(`https://www.waze.com/ul?ll=${latitude},${longitude}&navigate=yes`, '_blank');
    onOpenChange(false);
  };

  const openBrowser = () => {
    window.open(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`, '_blank');
    onOpenChange(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xs rounded-2xl dark:bg-neutral-900 discuss:bg-[#1a1a1a] border-neutral-200 dark:border-neutral-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-lg font-bold">
            Open with
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="grid gap-3 py-2">
          <button
            onClick={openGoogleMaps}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#262626] hover:opacity-80 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">Google Maps</p>
              <p className="text-xs text-neutral-500">Fast and reliable</p>
            </div>
          </button>

          {isIOS && (
            <button
              onClick={openAppleMaps}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#262626] hover:opacity-80 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                <Map className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">Apple Maps</p>
                <p className="text-xs text-neutral-500">Native iOS experience</p>
              </div>
            </button>
          )}

          <button
            onClick={openWaze}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#262626] hover:opacity-80 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">Waze</p>
              <p className="text-xs text-neutral-500">Traffic-aware routing</p>
            </div>
          </button>

          <button
            onClick={openBrowser}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#262626] hover:opacity-80 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <ExternalLink className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">Web Browser</p>
              <p className="text-xs text-neutral-500">Open in OpenStreetMap</p>
            </div>
          </button>
        </div>

        <AlertDialogCancel className="w-full rounded-xl border-neutral-200 dark:border-neutral-800">
          Cancel
        </AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
