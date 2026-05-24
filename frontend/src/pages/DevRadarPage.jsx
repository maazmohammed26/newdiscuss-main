import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { subscribeToPublicLocations, getUserLocation, saveUserLocation } from '@/lib/firebaseSixth';
import { ArrowLeft, MapPin, Loader2, ExternalLink, X, Navigation, User, ChevronLeft, Sparkles, Compass, ShieldCheck, Check, Radar } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import UserAvatar from '@/components/UserAvatar';
import { useHighlights } from '@/contexts/HighlightsContext';
import CurrentLocationUpdateModal from '@/components/CurrentLocationUpdateModal';
import { toast } from 'sonner';
import {
  DEVRADAR_PROMPT_SNOOZE_MS,
  LOCATION_REQUEST_COOLDOWN_MS,
  LOCATION_SUCCESS_CLOSE_DELAY_MS,
  getCurrentPositionWithAndroidSupport,
  getFriendlyLocationErrorMessage,
} from '@/lib/locationPermission';
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
  const { usersWithStories } = useHighlights();
  const [activeUser, setActiveUser] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showLocationUpdateModal, setShowLocationUpdateModal] = useState(false);
  const [locationUpdateStatus, setLocationUpdateStatus] = useState('idle');
  const [locationUpdateError, setLocationUpdateError] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [myCoordsLoaded, setMyCoordsLoaded] = useState(false);

  const centeredRef = useRef(false);
  const locationRequestCooldownRef = useRef(0);
  const autoPromptShownRef = useRef(false);

  const formatLastSeen = (loc) => {
    if (!loc) return '';
    const lastSeenTime = loc.lastSeen || (loc.lastUpdated ? new Date(loc.lastUpdated).getTime() : 0);
    if (!lastSeenTime) return 'Offline';
    
    const diffMs = Date.now() - lastSeenTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const date = new Date(lastSeenTime);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const activeUserLoc = activeUser ? locations.find(l => l.userId === activeUser.userId) || activeUser : null;
  
  const isActiveUserOnline = activeUserLoc
    ? (activeUserLoc.userId === user?.id || (activeUserLoc.isOnline === true && (Date.now() - (activeUserLoc.lastSeen || (activeUserLoc.lastUpdated ? new Date(activeUserLoc.lastUpdated).getTime() : 0)) < 20000)))
    : false;

  const onlineCount = locations.filter(loc => {
    if (loc.isOnline !== true) return false;
    const lastSeenTime = loc.lastSeen || (loc.lastUpdated ? new Date(loc.lastUpdated).getTime() : 0);
    return (Date.now() - lastSeenTime) < 20000;
  }).length;


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
      } finally {
        setMyCoordsLoaded(true);
      }
    };
    fetchMyCoords();
  }, [user?.id]);

  useEffect(() => {
    const canEvaluatePrompt = !loading && !!user?.id && myCoordsLoaded && !myCoords && !autoPromptShownRef.current;
    if (!canEvaluatePrompt) return;
    const snoozeUntil = Number(sessionStorage.getItem('devradarLocationPromptSnoozeUntil') || 0);
    if (Date.now() < snoozeUntil) return;
    autoPromptShownRef.current = true;
    setLocationUpdateStatus('idle');
    setLocationUpdateError('');
    setShowLocationUpdateModal(true);
  }, [loading, user?.id, myCoords, myCoordsLoaded]);

  // 3. Subscribe to public locations
  useEffect(() => {
    const unsubscribe = subscribeToPublicLocations((publicList) => {
      setLocations(publicList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 4. Initialize Vanilla Leaflet Map ONCE (does not recreation on coordinate updates!)
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapInstanceRef.current) return;

    // Use default center for first render
    const initialCenter = [20.5937, 78.9629]; // Default: Geographical center of India
    const initialZoom = 5;

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

    setMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [loading]);

  // Centering map smoothly on user location when it first loads without map re-creation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && myCoords && !centeredRef.current && mapReady) {
      map.setView([myCoords.lat, myCoords.lng], 13, { animate: true });
      centeredRef.current = true;
    }
  }, [myCoords, mapReady]);

  // 5. Sync Markers on Map when locations list updates or map becomes ready
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup || !mapReady) return;

    // Clear old markers
    markersGroup.clearLayers();

    // Map each public user to a Marker, applying deterministic offset if they share exact coordinates
    const processedLocations = locations.map(loc => ({ ...loc }));
    const coordinateCounts = {};

    processedLocations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;
      const latVal = parseFloat(loc.latitude).toFixed(5);
      const lngVal = parseFloat(loc.longitude).toFixed(5);
      const coordKey = `${latVal}_${lngVal}`;

      if (coordinateCounts[coordKey]) {
        const idx = coordinateCounts[coordKey]++;
        const angle = (idx * 60) * (Math.PI / 180);
        const layer = Math.ceil(idx / 6);
        const radius = 0.0005 * layer;
        loc.latitude = parseFloat(loc.latitude) + radius * Math.cos(angle);
        loc.longitude = parseFloat(loc.longitude) + radius * Math.sin(angle);
      } else {
        coordinateCounts[coordKey] = 1;
      }
    });

    processedLocations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const isMe = loc.userId === user?.id;

      // Custom high-end DivIcon containing the user's real avatar!
      const avatarUrl = loc.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${loc.username}`;
      
      const pinColor = isMe 
        ? (isDiscussBlack ? '#FF007F' : isDiscussLight ? '#EF4444' : '#2563EB')
        : (isDiscussBlack ? '#A855F7' : isDiscussLight ? '#10B981' : '#6366F1');

      const lastSeenTime = loc.lastSeen || (loc.lastUpdated ? new Date(loc.lastUpdated).getTime() : 0);
      const isActuallyOnline = isMe || (loc.isOnline === true && (Date.now() - lastSeenTime < 20000));
      const dotClass = isActuallyOnline
        ? 'devradar-status-dot-online'
        : 'devradar-status-dot-offline';

      const hasStory = loc.userId !== user?.id && usersWithStories && usersWithStories.has(loc.userId);
      const ringWrapperStart = hasStory ? `<div class="story-shining-portal-ring-wrapper inline-block relative"><div class="story-shining-portal-ring"></div>` : '';
      const ringWrapperEnd = hasStory ? `</div>` : '';

      const avatarMarkup = `
        ${ringWrapperStart}
        <div title="${isActuallyOnline ? 'Online' : formatLastSeen(loc) === 'Offline' ? 'Offline' : 'Last seen ' + formatLastSeen(loc)}" class="devradar-avatar-wrap cursor-pointer">
          <div class="devradar-avatar-circle" style="border-color: ${pinColor}">
            <img
              src="${avatarUrl}"
              alt="${loc.username || 'User'}"
              class="devradar-avatar-image"
              style="position:absolute;inset:0;display:block;width:100%;height:100%;min-width:100%;min-height:100%;max-width:none;max-height:none;object-fit:cover;object-position:center center;"
              onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${loc.username}';this.style.width='100%';this.style.height='100%';this.style.minWidth='100%';this.style.minHeight='100%';this.style.maxWidth='none';this.style.maxHeight='none';this.style.objectFit='cover';this.style.objectPosition='center center';"
              onload="this.style.width='100%';this.style.height='100%';this.style.minWidth='100%';this.style.minHeight='100%';this.style.maxWidth='none';this.style.maxHeight='none';this.style.objectFit='cover';this.style.objectPosition='center center';"
            />
          </div>
          <span class="devradar-status-dot ${dotClass}"></span>
        </div>
        ${ringWrapperEnd}
      `;

      const markerIcon = L.divIcon({
        html: avatarMarkup,
        className: 'custom-dev-marker-container',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: markerIcon });
      
      // When marker is clicked, slide in details
      marker.on('click', () => {
        setActiveUser(loc);
        map.setView([loc.latitude, loc.longitude], 14, { animate: true, duration: 0.8 });
      });

      marker.addTo(markersGroup);
    });
  }, [locations, user?.id, isDiscussBlack, isDiscussLight, mapReady, usersWithStories]);

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
        toast.info('Go to DevRadar settings and turn on Location Sharing to see yourself on the map!');
      }, 300);
    }
  };

  const handleConfirmLiveLocationUpdate = async () => {
    const now = Date.now();
    const isCoolingDown = now - locationRequestCooldownRef.current < LOCATION_REQUEST_COOLDOWN_MS;
    const isCurrentlyUpdating = updatingLocation;
    const hasUserId = !!user?.id;
    if (isCoolingDown) {
      toast.info('Please wait a moment before requesting location again.');
      return;
    }
    if (isCurrentlyUpdating || !hasUserId) return;
    locationRequestCooldownRef.current = now;

    setUpdatingLocation(true);
    setLocationUpdateStatus('loading');
    setLocationUpdateError('');

    const result = await getCurrentPositionWithAndroidSupport();
    if (!result.ok) {
      setUpdatingLocation(false);
      if (result.reason === 'blocked') {
        setLocationUpdateStatus('blocked');
        return;
      }
      setLocationUpdateStatus('error');
      setLocationUpdateError(getFriendlyLocationErrorMessage(result.reason));
      return;
    }

    const { latitude, longitude } = result.position.coords;
    try {
      const existingLoc = await getUserLocation(user.id);
      const payload = {
        latitude,
        longitude,
        isPublic: existingLoc?.isPublic ?? true,
        username: existingLoc?.username || user.username || user.displayName || '',
        fullName: existingLoc?.fullName || '',
        bio: existingLoc?.bio || '',
        photo_url: existingLoc?.photo_url || user.photo_url || user.photoURL || '',
        verified: existingLoc?.verified ?? user.verified ?? false,
      };

      await saveUserLocation(user.id, payload);
      setMyCoords({ lat: latitude, lng: longitude });
      setLocations((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const meIndex = next.findIndex((loc) => loc.userId === user.id);
        const meLocation = { userId: user.id, ...payload };
        if (meIndex >= 0) {
          next[meIndex] = { ...next[meIndex], ...meLocation };
        } else {
          next.push(meLocation);
        }
        return next;
      });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 14, { animate: true, duration: 0.8 });
      }
      setLocationUpdateStatus('success');
      toast.success('Current location updated in DevRadar.');
      setTimeout(() => {
        setShowLocationUpdateModal(false);
        setLocationUpdateStatus('idle');
      }, LOCATION_SUCCESS_CLOSE_DELAY_MS);
    } catch (err) {
      console.error(err);
      setLocationUpdateStatus('error');
      setLocationUpdateError('Failed to sync your location. Please retry.');
      toast.error('Failed to update location.');
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Outer panel theme background & borders
  let headerClass = '';
  let containerClass = '';
  let cardClass = '';
  let mapThemeClass = '';
  let settingsOverlayClass = '';
  let techieBoxClass = '';

  if (isLight) {
    headerClass = 'bg-white/80 border-neutral-200 text-neutral-800 backdrop-blur-md';
    containerClass = 'bg-[#F3F4F6] text-neutral-800';
    cardClass = 'bg-white/95 border-neutral-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] text-neutral-800';
    settingsOverlayClass = 'bg-white/95 border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] text-slate-700 rounded-2xl';
    techieBoxClass = 'bg-white/90 border-slate-200/80 shadow-[0_15px_40px_rgba(0,0,0,0.06)] text-slate-800 rounded-2xl border backdrop-blur-2xl';
    mapThemeClass = '';
  } else if (isDark) {
    headerClass = 'bg-[#0F172A]/80 border-white/10 text-white backdrop-blur-md';
    containerClass = 'bg-[#0b0f19] text-white';
    cardClass = 'bg-[#0F172A]/95 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-white';
    settingsOverlayClass = 'bg-[#0F172A]/95 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] text-neutral-200 rounded-2xl';
    techieBoxClass = 'bg-slate-950/80 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-white rounded-2xl border backdrop-blur-2xl';
    mapThemeClass = 'dark-map';
  } else if (isDiscussLight) {
    headerClass = 'bg-white border-b-2 border-black text-black';
    containerClass = 'bg-white text-black';
    cardClass = 'bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] text-black rounded-none';
    settingsOverlayClass = 'bg-white border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] text-black rounded-none';
    techieBoxClass = 'bg-white border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)] text-black rounded-none';
    mapThemeClass = '';
  } else if (isDiscussBlack) {
    headerClass = 'bg-[#13131A]/80 border-[#FF007F]/20 text-[#F5F5F5] backdrop-blur-md';
    containerClass = 'bg-[#0D0D12] text-[#F5F5F5]';
    cardClass = 'bg-[#13131A]/95 border-[#FF007F]/30 shadow-[0_8px_32px_rgba(0,0,0,0.8),_0_0_15px_rgba(255,0,127,0.15)] text-[#F5F5F5] rounded-3xl';
    settingsOverlayClass = 'bg-[#13131A] border border-[#FF007F]/40 shadow-[0_4px_25px_rgba(255,0,127,0.2)] text-[#F5F5F5] rounded-2xl';
    techieBoxClass = 'bg-[#13131A]/95 border border-[#FF007F]/40 shadow-[0_8px_32px_rgba(0,0,0,0.8),_0_0_25px_rgba(255,0,127,0.25)] text-[#F5F5F5] rounded-3xl';
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
          {onlineCount > 0 && (
            <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 animate-pulse">
              {onlineCount} Devs Online
            </div>
          )}
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
      {!loading && (
        <button
          onClick={() => {
            setLocationUpdateStatus('idle');
            setLocationUpdateError('');
            setShowLocationUpdateModal(true);
          }}
          className={`absolute right-4 bottom-24 z-[1001] w-12 h-12 flex items-center justify-center shadow-xl transition-all active:scale-95 ${
            isDiscussBlack
              ? 'bg-[#FF007F] text-black rounded-2xl'
              : isDiscussLight
              ? 'bg-[#EF4444] text-white border-2 border-black rounded-none'
              : isDark
              ? 'bg-blue-600 text-white rounded-2xl border border-white/10'
              : 'bg-white text-blue-600 rounded-2xl border border-slate-200'
          }`}
          aria-label="Update Current Location"
        >
          <MapPin className={`w-5 h-5 ${updatingLocation ? 'animate-pulse' : ''}`} />
        </button>
      )}

      {/* Recenter / Action Panel overlay in case no current location shared */}
      {!myCoords && !loading && (
        <div className={`absolute top-20 left-4 z-[999] max-w-[280px] p-4 border backdrop-blur-md transition-all ${settingsOverlayClass}`}>
          <div className="flex items-start gap-2.5">
            <span className={`text-base shrink-0 ${isDiscussBlack ? 'text-[#FF007F]' : isDiscussLight ? 'text-[#EF4444]' : 'text-blue-500'}`}>📍</span>
            <div>
              <p className="text-[11px] font-bold leading-relaxed">
                You aren't visible on the map. Turn on Location Sharing in your profile to show up and center the map on your location!
              </p>
              <div className="mt-2.5">
                <Link to="/profile" className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all hover:underline ${
                  isDiscussBlack ? 'text-[#FF007F] hover:text-[#FF007F]/80' : isDiscussLight ? 'text-black underline font-black' : 'text-[#2563EB] hover:text-blue-700'
                }`}>
                  <span>Go to Settings</span>
                  <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAILS PROFILE SLIDE DRAWER ────────────────────────────────────── */}
      <div className={`absolute bottom-0 left-0 right-0 z-[1001] p-4 flex justify-center transition-all duration-500 ${
        activeUser 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className={`w-full max-w-md p-5 border relative overflow-hidden ${techieBoxClass}`}>
          
          {/* Subtle neon glowing accent inside the card in retro black */}
          {isDiscussBlack && (
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF007F] to-transparent animate-pulse" />
          )}

          {/* Glowing cybernetic corner HUD highlights color-coded to theme */}
          {isDiscussBlack && (
            <>
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#FF007F] pointer-events-none" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#FF007F] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#FF007F] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#FF007F] pointer-events-none" />
            </>
          )}
          {isDiscussLight && (
            <>
              <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-black pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-4 border-r-4 border-black pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-4 border-l-4 border-black pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-4 border-r-4 border-black pointer-events-none" />
            </>
          )}
          {isDark && (
            <>
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-white/30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-white/30 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-white/30 pointer-events-none" />
            </>
          )}
          {isLight && (
            <>
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-slate-300 pointer-events-none" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-slate-300 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-slate-300 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-slate-300 pointer-events-none" />
            </>
          )}

          {/* Close Button / Back Arrow */}
          <button 
            onClick={() => setActiveUser(null)}
            className={`absolute top-3.5 right-3.5 p-1.5 rounded-full active:scale-95 transition-all ${
              isDiscussBlack ? 'hover:bg-[#FF007F]/10 text-[#FF007F]' : isDiscussLight ? 'hover:bg-black/5 text-black border border-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
            }`}
            aria-label="Back to Map"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Technical Telemetry Row */}
          <div className="flex items-center justify-between border-b pb-2 mb-3.5 border-black/5 dark:border-white/5 font-mono text-[9px] uppercase tracking-wider pr-8">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full relative flex`}>
                {isActiveUserOnline && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isDiscussBlack ? 'bg-[#FF007F]' : isDiscussLight ? 'bg-[#EF4444]' : 'bg-emerald-400'
                  }`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isActiveUserOnline
                    ? (isDiscussBlack ? 'bg-[#FF007F]' : isDiscussLight ? 'bg-[#EF4444]' : 'bg-emerald-500')
                    : 'bg-gray-400 dark:bg-gray-500'
                }`} />
              </span>
              <span className={
                isActiveUserOnline
                  ? (isDiscussBlack ? 'text-[#FF007F] font-bold' : isDiscussLight ? 'text-black font-black' : 'text-emerald-500 font-bold')
                  : 'text-neutral-400 dark:text-neutral-500 font-bold'
              }>
                {isActiveUserOnline ? 'beacon [online]' : `beacon [offline] - last seen: ${formatLastSeen(activeUserLoc)}`}
              </span>
            </div>
            <div className={
              isDiscussBlack ? 'text-[#FF007F]/75 font-semibold' : isDiscussLight ? 'text-black/70 font-bold' : 'text-neutral-400 dark:text-neutral-400 font-semibold'
            }>
              {activeUser?.latitude && activeUser?.longitude 
                ? `LOC: ${parseFloat(activeUser.latitude).toFixed(4)}° N, ${parseFloat(activeUser.longitude).toFixed(4)}° E` 
                : 'COORDS OFFLINE'}
            </div>
          </div>

          {/* User Details Layout */}
          <div className="flex gap-4 items-start pr-6 mt-1">
            <div className="relative shrink-0">
              <UserAvatar
                userId={activeUser?.userId}
                src={activeUser?.photo_url}
                username={activeUser?.username || 'Dev'}
                className={`w-14 h-14 border shrink-0 ${
                  isDiscussBlack ? 'border-[#FF007F]/40 shadow-[0_0_10px_rgba(255,0,127,0.2)]' : isDiscussLight ? 'border-2 border-black rounded-none' : 'border-neutral-200 dark:border-white/10'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={`text-base font-black truncate ${
                  isDiscussBlack ? 'text-[#F5F5F5]' : isDiscussLight ? 'text-black font-black' : 'text-neutral-900 dark:text-white'
                }`}>
                  {activeUser?.fullName || activeUser?.username || 'Developer'}
                </h3>
                {activeUser?.verified && <VerifiedBadge size="sm" />}
              </div>
              <p className={`text-xs font-mono font-semibold ${
                isDiscussBlack ? 'text-[#FF007F]/80' : isDiscussLight ? 'text-black/60 font-black' : 'text-slate-400 dark:text-slate-400'
              }`}>
                @{activeUser?.username || 'username'}
              </p>
              
              {activeUser?.bio ? (
                <p className={`text-xs mt-2.5 leading-relaxed line-clamp-3 ${
                  isDiscussBlack ? 'text-neutral-300' : isDiscussLight ? 'text-black font-semibold' : 'text-neutral-600 dark:text-neutral-300'
                }`}>
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
              className={`flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase px-4 py-3 cursor-pointer ${
                isDiscussBlack 
                  ? 'border border-[#FF007F]/40 text-[#FF007F] bg-black/40 hover:bg-[#FF007F]/10 hover:border-[#FF007F] font-mono shadow-[0_0_10px_rgba(255,0,127,0.05)] active:scale-[0.95] duration-200 transition-all rounded-xl' 
                  : isDiscussLight 
                  ? 'border-2 border-black text-black bg-white hover:bg-black hover:text-white font-black rounded-none shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-[0.95]' 
                  : isDark 
                  ? 'border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all duration-200 active:scale-[0.95] rounded-xl' 
                  : 'border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-all duration-200 active:scale-[0.95] rounded-xl'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Map</span>
            </button>
            
            <Link
              to={`/user/${activeUser?.userId}`}
              state={{ fromMap: true }}
              className={`flex-1 flex items-center justify-center gap-2 text-xs font-extrabold uppercase px-4 py-3 cursor-pointer ${
                isDiscussBlack 
                  ? 'bg-[#FF007F] text-black font-black hover:bg-[#FF007F]/90 shadow-[0_0_15px_rgba(255,0,127,0.3)] active:scale-[0.95] transition-all duration-200 rounded-xl' 
                  : isDiscussLight 
                  ? 'border-2 border-black bg-[#EF4444] text-white hover:bg-white hover:text-[#EF4444] font-black rounded-none shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-[0.95]' 
                  : isDark 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-[0.95] rounded-xl' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/10 transition-all duration-200 active:scale-[0.95] rounded-xl'
              }`}
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

      <CurrentLocationUpdateModal
        open={showLocationUpdateModal}
        status={locationUpdateStatus}
        errorMessage={locationUpdateError}
        theme={theme}
        onClose={() => {
          if (locationUpdateStatus === 'loading') return;
          setShowLocationUpdateModal(false);
          if (locationUpdateStatus !== 'success') {
            sessionStorage.setItem('devradarLocationPromptSnoozeUntil', String(Date.now() + DEVRADAR_PROMPT_SNOOZE_MS));
          }
          setLocationUpdateStatus('idle');
        }}
        onConfirm={handleConfirmLiveLocationUpdate}
        onRetry={handleConfirmLiveLocationUpdate}
      />

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
          width: 40px !important;
          height: 40px !important;
          overflow: visible !important;
          contain: layout paint style;
        }
        .leaflet-marker-icon {
          background: none !important;
          border: none !important;
          overflow: visible !important;
        }
        .devradar-avatar-wrap {
          position: relative;
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          max-width: 40px;
          max-height: 40px;
          aspect-ratio: 1 / 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          box-sizing: border-box;
          line-height: 0;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          transition: transform 0.2s ease;
        }
        .devradar-avatar-wrap:hover {
          transform: scale(1.1);
        }
        .devradar-avatar-wrap:active {
          transform: scale(0.95);
        }
        .devradar-avatar-circle {
          position: relative;
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          max-width: 40px;
          max-height: 40px;
          aspect-ratio: 1 / 1;
          border-radius: 9999px;
          border: 2px solid #ffffff;
          overflow: hidden;
          background-color: #0F172A;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.28), 0 2px 6px rgba(15, 23, 42, 0.2);
          isolation: isolate;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          box-sizing: border-box;
        }
        .devradar-avatar-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          min-width: 100%;
          min-height: 100%;
          max-width: none;
          max-height: none;
          display: block;
          border-radius: 9999px;
          object-fit: cover;
          object-position: center;
          image-rendering: auto;
          pointer-events: none;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
        .devradar-status-dot {
          position: absolute;
          top: 0;
          right: 0;
          transform: translate(35%, -35%);
          width: 12px;
          height: 12px;
          min-width: 12px;
          min-height: 12px;
          border-radius: 9999px;
          border: 2px solid #ffffff;
          z-index: 40;
          box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.15);
          pointer-events: none;
        }
        .devradar-status-dot-online {
          background: #10B981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.9);
          animation: devradar-dot-pulse 1.4s ease-in-out infinite;
        }
        .devradar-status-dot-offline {
          background: #9CA3AF;
        }
        /* Custom avatar marker animations */
        .custom-dev-marker-container .devradar-avatar-wrap {
          animation: marker-drop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes devradar-dot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes marker-drop {
          0% { transform: translateY(-20px) scale(0.5); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  );
}
