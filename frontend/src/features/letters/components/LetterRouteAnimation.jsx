import React, { useMemo } from 'react';
import { calculateDistanceKm, getCityById } from '../city/indiaCities';
import { Send, MapPin } from 'lucide-react';

export default function LetterRouteAnimation({
  originCityLabel = 'Origin',
  destinationCityLabel = 'Destination',
  originCityId = null,
  destinationCityId = null,
  className = '',
}) {
  const distance = useMemo(() => {
    const origin = originCityId ? getCityById(originCityId) : null;
    const dest = destinationCityId ? getCityById(destinationCityId) : null;
    if (origin?.lat && dest?.lat) {
      return calculateDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng);
    }
    return null;
  }, [originCityId, destinationCityId]);

  return (
    <div className={`relative flex flex-col items-center py-2 px-4 select-none ${className}`}>
      {/* Flight SVG trajectory */}
      <div className="w-full max-w-sm flex items-center justify-between gap-3">
        {/* Origin */}
        <div className="flex items-center gap-1.5 shrink-0 text-left">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[90px]">
              {originCityLabel}
            </span>
            <span className="text-[9px] text-zinc-400 uppercase tracking-wide">Origin</span>
          </div>
        </div>

        {/* Dynamic Curved SVG Arc */}
        <div className="relative flex-1 h-8 flex items-center justify-center">
          <svg
            className="w-full h-8 overflow-visible"
            viewBox="0 0 160 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Arc Path */}
            <path
              d="M 5 24 Q 80 4, 155 24"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="text-zinc-300 dark:text-zinc-700"
            />
            {/* Animated Flight Path */}
            <path
              d="M 5 24 Q 80 4, 155 24"
              stroke="url(#planeGradient)"
              strokeWidth="2"
              strokeDasharray="160"
              strokeDashoffset="160"
              className="animate-[dash_2.5s_ease-in-out_infinite]"
            />
            {/* Gradients */}
            <defs>
              <linearGradient id="planeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Gliding paper plane icon indicator */}
          <div className="absolute top-0 text-amber-500 animate-pulse">
            <Send className="w-3.5 h-3.5 rotate-45 -translate-y-1" />
          </div>

          {/* Distance badge if known */}
          {distance && (
            <span className="absolute -bottom-3 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              ~{distance} km
            </span>
          )}
        </div>

        {/* Destination */}
        <div className="flex items-center gap-1.5 shrink-0 text-right">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[90px]">
              {destinationCityLabel}
            </span>
            <span className="text-[9px] text-zinc-400 uppercase tracking-wide">Destination</span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
        </div>
      </div>
    </div>
  );
}
