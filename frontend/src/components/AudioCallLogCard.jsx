import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { formatCallDuration } from '@/lib/audioCallService';

const safeDate = (value) => {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export default function AudioCallLogCard({ message }) {
  const [open, setOpen] = useState(false);
  const call = message.call || {};
  const participants = Array.isArray(call.participants) ? call.participants : [];
  const missed = call.status === 'missed' || call.status === 'declined';
  const label = call.status === 'declined'
    ? 'Audio call declined'
    : call.status === 'missed'
      ? 'Missed audio call'
      : 'Audio call';
  const detailDate = useMemo(() => safeDate(call.startedAt || call.endedAt || message.timestamp), [call.endedAt, call.startedAt, message.timestamp]);

  return (
    <>
      <div className="my-3 flex w-full justify-center px-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex max-w-[88%] items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-sm transition-colors ${missed ? 'border-[#ED4956]/35 bg-[#ED4956]/[0.06] text-[#B4232F] hover:bg-[#ED4956]/10 dark:text-[#FF7A85]' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-[#111] dark:text-neutral-200 dark:hover:bg-[#181818]'}`}
        >
          <span>{label}</span>
          {!missed && call.durationSeconds > 0 && <span className="text-neutral-400">{formatCallDuration(call.durationSeconds)}</span>}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Audio call details">
          <button className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} aria-label="Close call details" />
          <div className="relative w-full max-w-sm rounded-t-[26px] bg-white p-5 text-neutral-950 shadow-2xl dark:bg-[#111] dark:text-white sm:rounded-[26px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold tracking-[-0.02em]">{label}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {detailDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at {detailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-[#181818]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Duration</span>
                <span className="font-semibold">{call.durationSeconds > 0 ? formatCallDuration(call.durationSeconds) : 'Not connected'}</span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">Participants</p>
              {participants.length ? participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <UserAvatar src={participant.photoUrl} username={participant.username} className="h-10 w-10" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{participant.username || 'Discuss user'}</p>
                </div>
              )) : <p className="text-sm text-neutral-500">No participant joined.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function LiveAudioCallCard({ invite, onJoin, joining }) {
  if (!invite) return null;
  return (
    <div className="my-3 flex w-full justify-center px-3">
      <button
        type="button"
        disabled={joining}
        onClick={() => onJoin(invite)}
        className="max-w-[88%] rounded-full border border-[#22C55E]/45 bg-[#22C55E]/10 px-5 py-2.5 text-center text-xs font-semibold text-[#15803D] shadow-[0_0_24px_rgba(34,197,94,0.14)] transition-colors hover:bg-[#22C55E]/15 disabled:opacity-60 dark:text-[#72E69A]"
      >
        {joining ? 'Joining audio call' : `Live audio call with @${invite.caller?.username || 'Discuss user'} — tap to join`}
      </button>
    </div>
  );
}
