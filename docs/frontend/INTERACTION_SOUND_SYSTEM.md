# Discuss Interaction Sound System Specification

## 1. Overview
The Discuss Interaction Sound System provides subtle, physical confirmation for high-value user actions (sending a message, publishing a discussion/project, sending comments, saving bookmarks) via the Web Audio API without requiring external audio asset downloads.

## 2. Acoustic Profile & Synthesized Waveforms
- **Message Send**: Soft tactile "tak" (synthesized sine wave ramping down from 420Hz to 140Hz over 45ms, peak gain 0.12, stop at 48ms).
- **Post / Discussion / Project Publish**: Harmonious confirmation chord (dual sine waves at 520Hz and 780Hz with soft attack, peak gain 0.08, exponential decay over 75ms, stop at 80ms).
- **Comment / Reply Send**: Gentle tactile tick (triangle wave ramping down from 320Hz to 180Hz over 35ms, peak gain 0.09, stop at 38ms).
- **Bookmark / Save**: Micro soft tap (sine wave ramping down from 600Hz to 280Hz over 25ms, peak gain 0.07, stop at 28ms).

No harsh square waves, no loud chimes, no cartoon sounds.

## 3. Configuration & Persistence
- **Default State**: `ON`
- **Toggle Location**: Profile -> Settings -> Interaction Sounds -> On / Off
- **Storage**: `localStorage.getItem('discuss_interaction_sounds')` (persisted as boolean `'true'` / `'false'`) with real-time `discuss:sound-setting-change` window event sync.
- **Throttling**: 100ms debounce interval (`THROTTLE_MS = 100`) between sound triggers to prevent acoustic clutter during rapid user interactions.

## 4. Accessibility & Fallbacks
Audio feedback is purely additive. Every action is accompanied by instant optimistic visual feedback. When muted, disabled in settings, or in quiet environments, visual cues communicate full state.
