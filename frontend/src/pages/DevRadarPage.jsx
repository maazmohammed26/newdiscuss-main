import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { subscribeToPublicLocations, getUserLocation } from '@/lib/firebaseSixth';
import { ArrowLeft, MapPin, Loader2, ExternalLink, X, Navigation, User, ChevronLeft, Sparkles, Compass, ShieldCheck, Check, Radar } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import UserAvatar from '@/components/UserAvatar';
import L from 'leaflet';

// Fix leaflet default marker icon assets for safety
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function DevRadarPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('devradar_tutorial_seen_v2');
    if (!seen) {
      setShowWelcomeModal(true);
    }
  }, []);

  const handleCloseWelcomeModal = () => {
    localStorage.setItem('devradar_tutorial_seen_v2', 'true');
    setShowWelcomeModal(false);
  };

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isDiscussLight = theme === 'discuss-light';
  const isDiscussBlack = theme === 'discuss-black';

  // Dynamic helper functions for theme-tailored styling
  const getThemeTextClass = () => {
    if (isDiscussBlack) return 'text-[#FF007F]';
    if (isDiscussLight) return 'text-[#EF4444]';
    return 'text-[#2563EB]';
  };

  const getThemeBorderClass = () => {
    if (isDiscussBlack) return 'border-[#FF007F]/40';
    if (isDiscussLight) return 'border-[#EF4444]/40';
    return 'border-[#2563EB]/40';
  };

  const getThemeInnerBorderClass = () => {
    if (isDiscussBlack) return 'border-[#FF007F]/25';
    if (isDiscussLight) return 'border-[#EF4444]/25';
    return 'border-[#2563EB]/25';
  };

  const getThemeBgClass = () => {
    if (isDiscussBlack) return 'bg-[#FF007F]/5 border-[#FF007F]/15';
    if (isDiscussLight) return 'bg-[#EF4444]/5 border-[#EF4444]/15';
    return 'bg-[#2563EB]/5 border-[#2563EB]/15';
  };

  // 1. Load Leaflet CSS stylesheet dynamically to ensure it loads in React 19 cleanly
  useEffect(() => {
    const linkId = 'leaflet-css-cdn';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // 2. Fetch current user's stored location to center the map on it
  useEffect(() => {
    if (!user?.id) return;
    const fetchMyCoords = async () => {
      try {
        const loc = await getUserLocation(user.id);
        if (loc && loc.latitude && loc.longitude) {
          setMyCoords({ lat: loc.latitude, lng: loc.longitude });
        }
      } catch (err) {
        console.warn('Could not retrieve current user location from 6th DB:', err);
      }
    };
    fetchMyCoords();
  }, [user?.id]);

  // 3. Subscribe to public locations
  useEffect(() => {
    const unsubscribe = subscribeToPublicLocations((publicList) => {
      setLocations(publicList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 4. Initialize Vanilla Leaflet Map
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;

    // Center coordinates: My coordinates or default center (India / Global center)
    const initialCenter = myCoords 
      ? [myCoords.lat, myCoords.lng] 
      : [20.5937, 78.9629]; // Default: Geographical center of India

    const initialZoom = myCoords ? 13 : 5;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // Custom position zoom control added below
    }).setView(initialCenter, initialZoom);

    mapInstanceRef.current = map;

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom positioned Zoom control
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Create marker cluster / layer group
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, myCoords]);

  // 5. Sync Markers on Map when locations list updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    // Clear old markers
    markersGroup.clearLayers();

    // Map each public user to a Marker
    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const isMe = loc.userId === user?.id;

      // Custom high-end DivIcon containing the user's real avatar!
      const avatarUrl = loc.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${loc.username}`;
      
      const pinColor = isMe 
        ? (isDiscussBlack ? '#FF007F' : isDiscussLight ? '#EF4444' : '#2563EB')
        : (isDiscussBlack ? '#A855F7' : isDiscussLight ? '#10B981' : '#6366F1');

      const avatarMarkup = `
        <div class="relative w-10 h-10 rounded-full border-2 border-white shadow-xl bg-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95" style="border-color: ${pinColor}">
          <img src="${avatarUrl}" class="w-full h-full rounded-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${loc.username}'" />
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${isMe ? 'bg-green-500 animate-pulse' : 'bg-indigo-500'}"></span>
        </div>
        <div class="w-4 h-4 rounded-full bg-black/15 blur-sm mx-auto -mt-1 scale-x-150"></div>
      `;

      const markerIcon = L.divIcon({
        html: avatarMarkup,
        className: 'custom-dev-marker-container',
        iconSize: [40, 50],
        iconAnchor: [20, 45],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: markerIcon });
      
      // When marker is clicked, slide in details
      marker.on('click', () => {
        setActiveUser(loc);
        map.setView([loc.latitude, loc.longitude], 14, { animate: true, duration: 0.8 });
      });

      marker.addTo(markersGroup);
    });
  }, [locations, user?.id, isDiscussBlack, isDiscussLight]);

  // Recenter map on user's coordinates
  const handleRecenter = () => {
    if (mapInstanceRef.current && myCoords) {
      mapInstanceRef.current.setView([myCoords.lat, myCoords.lng], 14, {
        animate: true,
        duration: 0.8
      });
      // Optionally trigger own card
      const meLoc = locations.find(l => l.userId === user?.id);
      if (meLoc) {
        setActiveUser(meLoc);
      }
    } else {
      // Prompt user to enable
      navigate('/profile');
      setTimeout(() => {
        const toast = require('sonner').toast;
        toast.info('Go to DevRadar settings and turn on Location Sharing to see yourself on the map!');
      }, 300);
    }
  };

  // Outer panel theme background & borders
  let headerClass = '';
  let containerClass = '';
  let cardClass = '';
  let mapThemeClass = '';

  if (isLight) {
    headerClass = 'bg-white/80 border-neutral-200 text-neutral-800 backdrop-blur-md';
    containerClass = 'bg-[#F3F4F6] text-neutral-800';
    cardClass = 'bg-white/95 border-neutral-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] text-neutral-800';
    mapThemeClass = '';
  } else if (isDark) {
    headerClass = 'bg-[#0F172A]/80 border-white/10 text-white backdrop-blur-md';
    containerClass = 'bg-[#0b0f19] text-white';
    cardClass = 'bg-[#0F172A]/95 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-white';
    mapThemeClass = 'dark-map';
  } else if (isDiscussLight) {
    headerClass = 'bg-white border-b-2 border-black text-black';
    containerClass = 'bg-white text-black';
    cardClass = 'bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] text-black rounded-none';
    mapThemeClass = '';
  } else if (isDiscussBlack) {
    headerClass = 'bg-[#13131A]/80 border-[#FF007F]/20 text-[#F5F5F5] backdrop-blur-md';
    containerClass = 'bg-[#0D0D12] text-[#F5F5F5]';
    cardClass = 'bg-[#13131A]/95 border-[#FF007F]/30 shadow-[0_8px_32px_rgba(0,0,0,0.8),_0_0_15px_rgba(255,0,127,0.15)] text-[#F5F5F5] rounded-3xl';
    mapThemeClass = 'discuss-black-map';
  }

  return (
    <div className={`relative flex flex-col w-full h-[100vh] overflow-hidden ${containerClass}`}>
      
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <header className={`absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 h-16 border-b ${headerClass}`}>
        <div className="flex items-center gap-3">
          <Link to="/feed" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[17px] font-black tracking-tight uppercase flex items-center">
              <span>DevRadar</span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">Developer Mapping</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {myCoords && (
            <button 
              onClick={handleRecenter}
              className={`p-2 rounded-xl border border-[#E2E8F0] dark:border-white/10 discuss:border-black transition-all hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 text-xs font-bold active:scale-95`}
            >
              <Navigation className="w-3.5 h-3.5 rotate-45 text-[#2563EB] discuss:text-[#EF4444]" />
              <span className="hidden sm:inline">My Position</span>
            </button>
          )}
          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 animate-pulse">
            {locations.length} Devs Online
          </div>
        </div>
      </header>

      {/* ── MAP CONTAINER ─────────────────────────────────────────────────────── */}
      <div className="relative w-full h-full pt-16">
        {loading ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/90 dark:bg-[#0D0D12]/95 backdrop-blur-md">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full border-2 border-dashed ${getThemeBorderClass()} animate-spin`} style={{ animationDuration: '6s' }}></div>
              <div className={`absolute inset-2 rounded-full border border-dashed ${getThemeInnerBorderClass()} animate-spin`} style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
              <div className={`absolute inset-4 rounded-full border ${getThemeBgClass()} flex items-center justify-center`}>
                <Radar className={`w-8 h-8 ${getThemeTextClass()} animate-pulse`} />
              </div>
            </div>
            <p className={`text-[10px] uppercase font-black tracking-widest ${getThemeTextClass()} animate-pulse`}>
              Syncing DevRadar Coordinates...
            </p>
          </div>
        ) : null}
        
        {/* Leaflet map object */}
        <div 
          ref={mapContainerRef} 
          className={`w-full h-full z-10 ${mapThemeClass}`} 
        />
      </div>

      {/* ── RADAR CONTROLS & DOCKS ───────────────────────────────────────────── */}
      {/* Recenter / Action Panel overlay in case no current location shared */}
      {!myCoords && !loading && (
        <div className="absolute top-20 left-4 z-[999] max-w-[280px] p-3 rounded-2xl bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md border border-neutral-200 dark:border-white/10 shadow-md">
          <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 leading-snug">
            📍 You aren't visible on the map. Turn on Location Sharing in your profile to show up and center the map on your location!
          </p>
          <Link to="/profile" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] discuss:text-[#EF4444] hover:underline">
            Go to Settings <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>
      )}

      {/* ── DETAILS PROFILE SLIDE DRAWER ────────────────────────────────────── */}
      <div className={`absolute bottom-0 left-0 right-0 z-[1001] p-4 flex justify-center transition-all duration-500 ${
        activeUser 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className={`w-full max-w-md p-5 border backdrop-blur-xl relative overflow-hidden ${cardClass}`}>
          {/* Subtle neon glowing accent inside the card in retro black */}
          {isDiscussBlack && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF007F]/40 to-transparent" />
          )}

          {/* Close Button / Back Arrow */}
          <button 
            onClick={() => setActiveUser(null)}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            aria-label="Back to Map"
          >
            <X className="w-4 h-4" />
          </button>

          {/* User Details Layout */}
          <div className="flex gap-4 items-start pr-6">
            <UserAvatar
              src={activeUser?.photo_url}
              username={activeUser?.username || 'Dev'}
              className="w-14 h-14 border border-black/10 dark:border-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-black truncate text-neutral-900 dark:text-white discuss:text-black discuss-black:text-[#F5F5F5]">
                  {activeUser?.fullName || activeUser?.username || 'Developer'}
                </h3>
                {activeUser?.verified && <VerifiedBadge size="sm" />}
              </div>
              <p className="text-xs font-semibold text-[#6275AF] dark:text-[#94A3B8] discuss:text-black/60 discuss-black:text-[#9CA3AF]">
                @{activeUser?.username || 'username'}
              </p>
              
              {activeUser?.bio ? (
                <p className="text-xs mt-2.5 text-neutral-600 dark:text-neutral-300 discuss:text-neutral-700 discuss-black:text-neutral-300 line-clamp-3 leading-relaxed">
                  {activeUser.bio}
                </p>
              ) : (
                <p className="text-xs mt-2.5 italic text-neutral-400 font-medium">
                  No biography provided yet.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setActiveUser(null)}
              className="flex items-center justify-center gap-1 text-xs font-extrabold uppercase px-4 py-3 rounded-xl border border-neutral-300 dark:border-white/10 discuss:border-black text-neutral-600 dark:text-neutral-300 discuss:text-black hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Map</span>
            </button>
            
            <Link
              to={`/user/${activeUser?.userId}`}
              className="flex-1 flex items-center justify-center gap-2 text-xs font-extrabold uppercase px-4 py-3 rounded-xl bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-md shadow-blue-500/20 discuss:shadow-red-500/20 hover:brightness-105 active:scale-95 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>View Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* DevRadar One-time Feature Introduction Banner */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-lg p-6 border backdrop-blur-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${cardClass}`}>
            
            {/* Elegant neon glowing top accent for retro black theme */}
            {isDiscussBlack && (
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#FF007F] to-transparent animate-pulse" />
            )}

                    {/* Content Container */}
            <div className="flex flex-col text-left">
              {/* Header Title Only - Clean & Minimalist */}
              <div className="mb-4">
                <h3 className="text-lg font-black tracking-tight uppercase text-neutral-900 dark:text-white discuss:text-black discuss-black:text-[#F5F5F5]">
                  New Feature: DevRadar
                </h3>
                <p className={`text-[10px] uppercase font-extrabold tracking-widest ${getThemeTextClass()} opacity-90 mt-0.5`}>Interactive Developer Map</p>
              </div>

              {/* Technical Tagline */}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 discuss:text-neutral-700 discuss-black:text-neutral-300 mb-5 leading-relaxed">
                Deploy your coordinate node to the interactive community cluster. **DevRadar** establishes real-time peer discovery, enabling visual mapping of nearby engineers, developers, and students. Node specifications:
              </p>

              {/* Bullet Points - Professional and Icon-less */}
              <div className="flex flex-col gap-4 mb-6">
                
                <div className="text-left border-l-2 border-neutral-300 dark:border-white/10 discuss:border-black pl-3 py-0.5">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 discuss:text-black discuss-black:text-[#F5F5F5]">Geospatial Node Discovery</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 discuss:text-neutral-600 discuss-black:text-[#9CA3AF] mt-1 leading-relaxed">
                    Geolocate active developers, system architects, and students within your immediate network. Hover over node markers to interface with live user credentials and profiles.
                  </p>
                </div>

                <div className="text-left border-l-2 border-neutral-300 dark:border-white/10 discuss:border-black pl-3 py-0.5">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 discuss:text-black discuss-black:text-[#F5F5F5]">Precision Calibration Protocol</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 discuss:text-neutral-600 discuss-black:text-[#9CA3AF] mt-1 leading-relaxed">
                    Compensate for coarse ISP routing or cellular geolocation offsets. Access your secure Location Settings panel to drag and calibrate your precision node pin directly onto physical coordinates.
                  </p>
                </div>

                <div className="text-left border-l-2 border-neutral-300 dark:border-white/10 discuss:border-black pl-3 py-0.5">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 discuss:text-black discuss-black:text-[#F5F5F5]">Encrypted Opt-In Telemetry</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 discuss:text-neutral-600 discuss-black:text-[#9CA3AF] mt-1 leading-relaxed">
                    Your coordinate broadcast remains completely isolated by default. Telemetry is only shared upon explicit opt-in authentication, and can be terminated instantly.
                  </p>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 border-t border-neutral-200 dark:border-white/10 discuss:border-black pt-4">
                <button
                  onClick={() => {
                    handleCloseWelcomeModal();
                    navigate('/profile');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase px-4 py-3 rounded-xl border border-neutral-300 dark:border-white/10 discuss:border-black ${getThemeTextClass()} hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Configure Location</span>
                </button>
                <button
                  onClick={handleCloseWelcomeModal}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase px-4 py-3 rounded-xl ${isDiscussBlack ? 'bg-[#FF007F] shadow-[#FF007F]/20' : isDiscussLight ? 'bg-[#EF4444] shadow-[#EF4444]/20' : 'bg-[#2563EB] shadow-blue-500/20'} text-white shadow-md hover:brightness-105 active:scale-95 transition-all`}
                >
                  <Radar className="w-4 h-4 text-white" />
                  <span>Start Exploring</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Global styling overrides for Leaflet map styling */}
      <style>{`
        /* Dynamic CSS tile filters for premium dark-mode map integration */
        .dark-map .leaflet-tile-container {
          filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(90%) !important;
        }
        .discuss-black-map .leaflet-tile-container {
          filter: invert(100%) hue-rotate(180deg) brightness(78%) contrast(92%) !important;
        }
        .dark-map .leaflet-container {
          background: #0b0f19 !important;
        }
        .discuss-black-map .leaflet-container {
          background: #0D0D12 !important;
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
          font-family: inherit;
        }
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .leaflet-bar a {
          background-color: rgba(255,255,255,0.9) !important;
          color: #0F172A !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          transition: all 0.2s !important;
        }
        .dark-map .leaflet-bar a,
        .discuss-black-map .leaflet-bar a {
          background-color: rgba(15, 23, 42, 0.9) !important;
          color: #F8FAFC !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-bar a:hover {
          background-color: #FFFFFF !important;
        }
        .dark-map .leaflet-bar a:hover,
        .discuss-black-map .leaflet-bar a:hover {
          background-color: #1E293B !important;
        }
        .custom-dev-marker-container {
          background: none !important;
          border: none !important;
        }
        .leaflet-marker-icon {
          background: none !important;
          border: none !important;
        }
        /* Custom avatar marker animations */
        .custom-dev-marker-container div {
          animation: marker-drop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes marker-drop {
          0% { transform: translateY(-20px) scale(0.5); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  );
}
