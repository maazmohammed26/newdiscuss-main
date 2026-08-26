import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { getFriendsWithDetails } from '@/lib/relationshipsDb';
import {
  CALL_MAX_PARTICIPANTS,
  createAudioCall,
  declineAudioCall,
  friendlyCallError,
  formatCallDuration,
  inviteAudioCallParticipant,
  joinAudioCall,
  leaveAudioCall,
  subscribeToCall,
  subscribeToIncomingCalls,
} from '@/lib/audioCallService';

const AudioCallContext = createContext(null);
const CALL_GUIDE_KEY = 'discuss_audio_calling_guide_v1';

const requestMicrophone = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone calling is not supported on this device.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  stream.getTracks().forEach((track) => track.stop());
};

const useRingtone = (enabled) => {
  const contextRef = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const playPulse = () => {
      if (cancelled) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const context = contextRef.current || new AudioContext();
        contextRef.current = context;
        [0, 0.28].forEach((delay) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = delay ? 620 : 520;
          gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.22);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(context.currentTime + delay);
          oscillator.stop(context.currentTime + delay + 0.24);
        });
      } catch (_) {}
    };
    playPulse();
    const interval = window.setInterval(playPulse, 1900);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled]);
};

function CallingGuide({ onContinue, onClose }) {
  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white px-6 pb-7 pt-5 text-neutral-950 shadow-2xl dark:bg-[#101010] dark:text-white sm:rounded-[28px]">
        <div className="flex justify-end">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300" aria-label="Close calling guide">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="font-serif text-sm italic text-[#ED4956]">Discuss 2.0</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Audio calling is here.</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Call a friend directly from your private conversation. You can add up to two more friends, mute your microphone, control call audio, and continue using Discuss while the call stays minimized.
        </p>
        <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
          <div className="py-4"><p className="font-semibold">Your calling privacy</p><p className="mt-1 text-neutral-500 dark:text-neutral-400">Turn audio calling on or off from the conversation menu. Friends cannot call you while it is off.</p></div>
          <div className="py-4"><p className="font-semibold">Private conversations only</p><p className="mt-1 text-neutral-500 dark:text-neutral-400">Group chats do not include calling. A private call can temporarily include up to four people.</p></div>
          <div className="py-4"><p className="font-semibold">Call history</p><p className="mt-1 text-neutral-500 dark:text-neutral-400">Discuss saves only participants, time, status and duration. Audio is never recorded or stored.</p></div>
        </div>
        <p className="mt-5 font-serif text-sm italic leading-5 text-[#ED4956]">
          This is the first phase of Discuss audio calling. We are continuing to improve connection quality and availability.
        </p>
        <button onClick={onContinue} className="mt-6 h-12 w-full rounded-xl bg-neutral-950 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black">
          Continue to call
        </button>
      </div>
    </div>
  );
}

function IncomingCall({ invite, onAccept, onDecline, busy }) {
  useRingtone(Boolean(invite) && !busy);
  if (!invite) return null;
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-white px-6 text-neutral-950 dark:bg-black dark:text-white">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Incoming Discuss audio call</p>
        <UserAvatar src={invite.caller?.photoUrl} username={invite.caller?.username} priority className="mx-auto mt-9 h-32 w-32 shadow-xl" />
        <h2 className="mt-6 truncate text-3xl font-semibold tracking-[-0.04em]">{invite.caller?.username || 'Discuss user'}</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">is calling you</p>
        <div className="mt-16 flex items-center justify-center gap-16">
          <button disabled={busy} onClick={onDecline} className="flex flex-col items-center gap-3 disabled:opacity-50">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ED4956] text-white shadow-lg"><PhoneOff className="h-7 w-7" /></span>
            <span className="text-xs font-medium">Decline</span>
          </button>
          <button disabled={busy} onClick={onAccept} className="flex flex-col items-center gap-3 disabled:opacity-50">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-lg"><Phone className="h-7 w-7" /></span>
            <span className="text-xs font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ParticipantTile({ participant, active, currentUserId }) {
  const muted = participant.state === 'joined' && participant.muted;
  return (
    <div className={`relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[24px] border bg-neutral-100 px-3 py-5 transition-all dark:bg-[#171717] ${active ? 'border-transparent shadow-[0_0_0_2px_#22C55E,0_0_28px_rgba(0,149,246,0.30),0_0_42px_rgba(237,73,86,0.18)]' : 'border-neutral-200 dark:border-neutral-800'}`}>
      <UserAvatar src={participant.photoUrl} username={participant.username} priority className="h-20 w-20 sm:h-24 sm:w-24" />
      <p className="mt-4 max-w-full truncate text-sm font-semibold">{participant.id === currentUserId ? 'You' : participant.username}</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{participant.state === 'invited' ? 'Invited' : participant.state === 'left' ? 'Left call' : 'In call'}</p>
      {muted && <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-black"><MicOff className="h-3.5 w-3.5" /></span>}
    </div>
  );
}

function ParticipantPicker({ friends, participants, onInvite, onClose, inviting }) {
  const available = friends.filter((friend) => !participants?.[friend.id] || ['left', 'declined'].includes(participants[friend.id].state));
  return (
    <div className="fixed inset-0 z-[205] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[75dvh] w-full max-w-md overflow-y-auto rounded-t-[26px] bg-white p-5 text-neutral-950 dark:bg-[#111] dark:text-white sm:rounded-[26px]">
        <div className="flex items-center justify-between">
          <div><h3 className="text-lg font-semibold">Add to this call</h3><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Choose one of your friends</p></div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 space-y-2">
          {available.length ? available.map((friend) => (
            <button key={friend.id} disabled={inviting} onClick={() => onInvite(friend.id)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-900">
              <UserAvatar src={friend.photo_url} username={friend.username} className="h-11 w-11" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{friend.username}</p><p className="mt-0.5 text-xs text-neutral-500">Friend</p></div>
              <span className="text-xs font-semibold text-[#0095F6]">Invite</span>
            </button>
          )) : <p className="py-10 text-center text-sm text-neutral-500">No other friends are available to add.</p>}
        </div>
      </div>
    </div>
  );
}

function ActiveCallScreen({ session, user, muted, remoteMuted, speakerEnabled, activeSpeakers, elapsed, onToggleMute, onToggleSpeaker, onLeave, onMinimize, onOpenPicker }) {
  const call = session.call;
  const participants = Object.values(call?.participants || {});
  const connected = participants.filter((participant) => !['declined', 'left'].includes(participant.state));
  const isConnected = call?.status === 'active' || Boolean(call?.startedAt);
  return (
    <div className="fixed inset-0 z-[175] flex flex-col overflow-hidden bg-white text-neutral-950 dark:bg-black dark:text-white">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
        <button onClick={onMinimize} className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900" aria-label="Return to Discuss"><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-center"><p className="text-sm font-semibold">Discuss audio</p><p className="mt-0.5 text-xs text-neutral-500">{isConnected ? formatCallDuration(elapsed) : session.phase === 'connecting' ? 'Connecting' : 'Calling'}</p></div>
        <button disabled={connected.length >= CALL_MAX_PARTICIPANTS || !isConnected} onClick={onOpenPicker} className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 disabled:opacity-35 dark:bg-neutral-900" aria-label="Add participant"><UserPlus className="h-5 w-5" /></button>
      </div>
      <div className={`mx-auto grid min-h-0 w-full max-w-3xl flex-1 gap-3 px-4 py-3 ${connected.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'} ${connected.length > 2 ? 'grid-rows-2' : ''}`}>
        {connected.map((participant) => (
          <ParticipantTile key={participant.id} participant={{ ...participant, muted: participant.id === user.id ? muted : Boolean(remoteMuted[participant.id]) }} active={activeSpeakers.includes(participant.id)} currentUserId={user.id} />
        ))}
      </div>
      <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex max-w-sm items-center justify-center gap-6 rounded-[28px] bg-neutral-100 px-5 py-4 shadow-sm dark:bg-[#171717]">
          <button onClick={onToggleSpeaker} className="flex flex-col items-center gap-1.5 text-[10px] font-medium"><span className={`flex h-12 w-12 items-center justify-center rounded-full ${speakerEnabled ? 'bg-white text-black shadow-sm dark:bg-neutral-800 dark:text-white' : 'bg-neutral-300 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>{speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</span>Speaker</button>
          <button onClick={onLeave} className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ED4956] text-white shadow-lg" aria-label="Leave call"><PhoneOff className="h-7 w-7" /></button>
          <button onClick={onToggleMute} className="flex flex-col items-center gap-1.5 text-[10px] font-medium"><span className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? 'bg-neutral-300 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' : 'bg-white text-black shadow-sm dark:bg-neutral-800 dark:text-white'}`}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</span>{muted ? 'Unmute' : 'Mute'}</button>
        </div>
      </div>
    </div>
  );
}

export function AudioCallProvider({ children }) {
  const { user } = useAuth();
  const roomRef = useRef(null);
  const audioContainerRef = useRef(null);
  const callUnsubscribeRef = useRef(null);
  const pendingStartRef = useRef(null);
  const [incoming, setIncoming] = useState(null);
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [activeSpeakers, setActiveSpeakers] = useState([]);
  const [remoteMuted, setRemoteMuted] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [friends, setFriends] = useState([]);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user?.id) return undefined;
    return subscribeToIncomingCalls(user.id, (invites) => {
      if (!session) setIncoming(invites[0] || null);
    });
  }, [user?.id, session]);

  useEffect(() => {
    if (!incoming?.expiresAt) return undefined;
    const remaining = Math.max(0, incoming.expiresAt - Date.now());
    const timer = window.setTimeout(() => setIncoming(null), remaining);
    return () => window.clearTimeout(timer);
  }, [incoming?.expiresAt]);

  useEffect(() => {
    if (!session?.call?.startedAt) {
      setElapsed(0);
      return undefined;
    }
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - session.call.startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [session?.call?.startedAt]);

  const disconnectRoom = useCallback(() => {
    callUnsubscribeRef.current?.();
    callUnsubscribeRef.current = null;
    const room = roomRef.current;
    if (room) {
      room.disconnect(true);
      roomRef.current = null;
    }
    if (audioContainerRef.current) audioContainerRef.current.replaceChildren();
    setActiveSpeakers([]);
    setRemoteMuted({});
  }, []);

  useEffect(() => () => disconnectRoom(), [disconnectRoom]);

  const watchCall = useCallback((callId) => {
    callUnsubscribeRef.current?.();
    callUnsubscribeRef.current = subscribeToCall(callId, (call) => {
      if (!call || call.finalizedAt || ['completed', 'missed', 'declined'].includes(call.status)) {
        disconnectRoom();
        setSession(null);
        setMinimized(false);
        return;
      }
      setSession((current) => current ? { ...current, call, phase: call.status === 'active' ? 'active' : current.phase } : current);
    });
  }, [disconnectRoom]);

  const connectRoom = useCallback(async ({ call, serverUrl, token }, phase) => {
    const { Room, RoomEvent, Track } = await import('livekit-client');
    const room = new Room({ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: false });
    roomRef.current = room;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio || !audioContainerRef.current) return;
      const element = track.attach();
      element.autoplay = true;
      element.playsInline = true;
      element.muted = !speakerEnabled;
      audioContainerRef.current.appendChild(element);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((element) => element.remove());
    });
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => setActiveSpeakers(speakers.map((speaker) => speaker.identity)));
    room.on(RoomEvent.TrackMuted, (_, participant) => {
      if (participant?.identity) setRemoteMuted((current) => ({ ...current, [participant.identity]: true }));
    });
    room.on(RoomEvent.TrackUnmuted, (_, participant) => {
      if (participant?.identity) setRemoteMuted((current) => ({ ...current, [participant.identity]: false }));
    });
    room.on(RoomEvent.Reconnecting, () => setSession((current) => current ? { ...current, phase: 'connecting' } : current));
    room.on(RoomEvent.Reconnected, () => setSession((current) => current ? { ...current, phase: 'active' } : current));
    await room.connect(serverUrl, token, { autoSubscribe: true });
    await room.startAudio().catch(() => {});
    await room.localParticipant.setMicrophoneEnabled(true);
    setMuted(false);
    setSession({ call, phase });
    watchCall(call.id);
  }, [speakerEnabled, watchCall]);

  const executeStart = useCallback(async ({ targetId, chatId }) => {
    setBusy(true);
    let createdCallId = null;
    try {
      await requestMicrophone();
      const result = await createAudioCall(targetId, chatId);
      createdCallId = result.call?.id || null;
      await connectRoom(result, 'calling');
      setIncoming(null);
      setMinimized(false);
    } catch (error) {
      disconnectRoom();
      if (createdCallId) leaveAudioCall(createdCallId).catch(() => {});
      toast.error(friendlyCallError(error));
    } finally {
      setBusy(false);
    }
  }, [connectRoom, disconnectRoom]);

  const startAudioCall = useCallback((targetId, chatId) => {
    if (session || busy) return;
    const request = { targetId, chatId };
    if (localStorage.getItem(CALL_GUIDE_KEY) !== 'seen') {
      pendingStartRef.current = request;
      setShowGuide(true);
      return;
    }
    executeStart(request);
  }, [busy, executeStart, session]);

  const acceptIncoming = useCallback(async () => {
    if (!incoming || busy) return;
    setBusy(true);
    const incomingCallId = incoming.callId || incoming.id;
    let joined = false;
    try {
      await requestMicrophone();
      const result = await joinAudioCall(incomingCallId);
      joined = true;
      await connectRoom(result, 'active');
      setIncoming(null);
      setMinimized(false);
    } catch (error) {
      disconnectRoom();
      if (joined) leaveAudioCall(incomingCallId).catch(() => {});
      toast.error(friendlyCallError(error));
    } finally {
      setBusy(false);
    }
  }, [busy, connectRoom, disconnectRoom, incoming]);

  const declineIncoming = useCallback(async () => {
    if (!incoming || busy) return;
    setBusy(true);
    try { await declineAudioCall(incoming.callId || incoming.id); } catch (_) {}
    setIncoming(null);
    setBusy(false);
  }, [busy, incoming]);

  const endCall = useCallback(async () => {
    const callId = session?.call?.id;
    disconnectRoom();
    setSession(null);
    setMinimized(false);
    if (callId) leaveAudioCall(callId).catch(() => {});
  }, [disconnectRoom, session?.call?.id]);

  useEffect(() => {
    if (!session?.call?.expiresAt || session.call.startedAt) return undefined;
    const remaining = Math.max(0, session.call.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      endCall();
      toast('The call was not answered.');
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [endCall, session?.call?.expiresAt, session?.call?.startedAt]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
    } catch (error) {
      toast.error('Microphone control is unavailable. Check your device permission.');
    }
  }, [muted]);

  const toggleSpeaker = useCallback(() => {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    audioContainerRef.current?.querySelectorAll('audio').forEach((element) => { element.muted = !next; });
  }, [speakerEnabled]);

  const openPicker = useCallback(async () => {
    const currentCount = Object.values(session?.call?.participants || {}).filter((person) => !['left', 'declined'].includes(person.state)).length;
    if (!user?.id || currentCount >= CALL_MAX_PARTICIPANTS) return;
    setShowPicker(true);
    const list = await getFriendsWithDetails(user.id).catch(() => []);
    setFriends(list);
  }, [session?.call?.participants, user?.id]);

  const inviteParticipant = useCallback(async (targetId) => {
    if (!session?.call?.id) return;
    setInviting(true);
    try {
      await inviteAudioCallParticipant(session.call.id, targetId);
      setShowPicker(false);
      toast.success('Call invitation sent.');
    } catch (error) {
      toast.error(friendlyCallError(error));
    } finally {
      setInviting(false);
    }
  }, [session?.call?.id]);

  const value = useMemo(() => ({
    activeCall: session?.call || null,
    isCalling: Boolean(session),
    startAudioCall,
    restoreCall: () => setMinimized(false),
  }), [session, startAudioCall]);

  return (
    <AudioCallContext.Provider value={value}>
      {children}
      <div ref={audioContainerRef} className="hidden" aria-hidden />
      {showGuide && (
        <CallingGuide
          onClose={() => { pendingStartRef.current = null; setShowGuide(false); }}
          onContinue={() => {
            const request = pendingStartRef.current;
            localStorage.setItem(CALL_GUIDE_KEY, 'seen');
            pendingStartRef.current = null;
            setShowGuide(false);
            if (request) executeStart(request);
          }}
        />
      )}
      {!session && <IncomingCall invite={incoming} onAccept={acceptIncoming} onDecline={declineIncoming} busy={busy} />}
      {session && !minimized && (
        <ActiveCallScreen
          session={session}
          user={user}
          muted={muted}
          remoteMuted={remoteMuted}
          speakerEnabled={speakerEnabled}
          activeSpeakers={activeSpeakers}
          elapsed={elapsed}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onLeave={endCall}
          onMinimize={() => setMinimized(true)}
          onOpenPicker={openPicker}
        />
      )}
      {session && minimized && (
        <button onClick={() => setMinimized(false)} className="fixed bottom-24 right-4 z-[165] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-neutral-950 py-2 pl-2 pr-4 text-white shadow-2xl dark:bg-white dark:text-black" aria-label="Return to audio call">
          <UserAvatar src={Object.values(session.call?.participants || {}).find((person) => person.id !== user?.id)?.photoUrl} username={Object.values(session.call?.participants || {}).find((person) => person.id !== user?.id)?.username} className="h-9 w-9" />
          <span className="min-w-0 text-left"><span className="block truncate text-xs font-semibold">Audio call</span><span className="block text-[10px] opacity-70">{session.call?.startedAt ? formatCallDuration(elapsed) : 'Calling'}</span></span>
          <Phone className="h-4 w-4 text-[#22C55E]" />
        </button>
      )}
      {showPicker && session && (
        <ParticipantPicker friends={friends} participants={session.call?.participants} onInvite={inviteParticipant} onClose={() => setShowPicker(false)} inviting={inviting} />
      )}
    </AudioCallContext.Provider>
  );
}

export const useAudioCall = () => {
  const context = useContext(AudioCallContext);
  if (!context) throw new Error('useAudioCall must be used inside AudioCallProvider');
  return context;
};
