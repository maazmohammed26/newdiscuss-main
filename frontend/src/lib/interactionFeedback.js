// Centralized Interaction Feedback Service for Discuss
// High-performance, zero-latency Web Audio API sound generator.

let audioCtx = null;
let lastSoundTime = 0;
const THROTTLE_MS = 100;
const SETTINGS_KEY = 'discuss_interaction_sounds';

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function getInteractionSoundsEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved === null ? true : saved !== 'false';
  } catch (_) {
    return true;
  }
}

export function setInteractionSoundsEnabled(enabled) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('discuss:sound-setting-change', { detail: { enabled } }));
  } catch (_) {}
}

function canPlaySound() {
  if (!getInteractionSoundsEnabled()) return false;
  const now = Date.now();
  if (now - lastSoundTime < THROTTLE_MS) return false;
  lastSoundTime = now;
  return true;
}

// 1. Message Send: Soft tactile "tak"
export function playMessageSendSound() {
  if (!canPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.048);
  } catch (_) {}
}

// 2. Publish (Discussion / Project / Post): Subtle confirmation chord
export function playPublishSound() {
  if (!canPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [520, 780].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    });
  } catch (_) {}
}

// 3. Comment / Reply Send: Gentle tactile tick
export function playCommentSound() {
  if (!canPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.038);
  } catch (_) {}
}

// 4. Bookmark / Save: Micro soft tap
export function playBookmarkSound() {
  if (!canPlaySound()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.025);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.028);
  } catch (_) {}
}
