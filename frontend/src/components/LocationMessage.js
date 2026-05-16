import React, { useState } from 'react';
import { MapPin, Navigation, Map as MapIcon } from 'lucide-react';
import MapSelectorModal from './MapSelectorModal';

export default function LocationMessage({ location, isOwn }) {
  const [showMapSelector, setShowMapSelector] = useState(false);

  if (!location) return null;

  const { latitude, longitude, address } = location;

  return (
    <div className="w-full min-w-[200px] max-w-[260px] overflow-hidden">
      <div 
        onClick={() => setShowMapSelector(true)}
        className={`cursor-pointer rounded-xl overflow-hidden border transition-all hover:scale-[1.02] active:scale-[0.98] ${
          isOwn 
            ? 'bg-white/10 border-white/20' 
            : 'bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-800'
        }`}
      >
        {/* Map Placeholder/Preview */}
        <div className={`h-24 w-full flex flex-col items-center justify-center relative overflow-hidden ${
          isOwn ? 'bg-blue-600/30' : 'bg-blue-100 dark:bg-blue-900/20'
        }`}>
          {/* Subtle grid pattern for map look */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
          
          <div className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 ${
            isOwn ? 'bg-white text-blue-600 shadow-lg' : 'bg-blue-600 text-white shadow-lg'
          }`}>
            <MapPin className="w-6 h-6 animate-bounce" />
          </div>
          
          <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-white font-medium uppercase tracking-wider">
            Live Location
          </div>
        </div>

        {/* Location Info */}
        <div className="p-3">
          <p className={`text-xs font-semibold mb-1 truncate ${isOwn ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'}`}>
            {address || 'Shared Location'}
          </p>
          <div className={`flex items-center gap-1 text-[10px] opacity-70 ${isOwn ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'}`}>
            <Navigation className="w-3 h-3" />
            <span>{latitude.toFixed(4)}°, {longitude.toFixed(4)}°</span>
          </div>
          
          <button 
            className={`mt-3 w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              isOwn 
                ? 'bg-white text-blue-600 hover:bg-blue-50' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <MapIcon className="w-3 h-3" />
            View on Map
          </button>
        </div>
      </div>

      <MapSelectorModal 
        isOpen={showMapSelector} 
        onOpenChange={setShowMapSelector} 
        location={location} 
      />
    </div>
  );
}
