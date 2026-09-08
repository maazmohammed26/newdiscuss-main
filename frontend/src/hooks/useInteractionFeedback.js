import { useState, useEffect, useCallback } from 'react';
import {
  getInteractionSoundsEnabled,
  setInteractionSoundsEnabled,
  playMessageSendSound,
  playPublishSound,
  playCommentSound,
  playBookmarkSound,
} from '@/lib/interactionFeedback';

export function useInteractionFeedback() {
  const [soundsEnabled, setSoundsEnabled] = useState(getInteractionSoundsEnabled);

  useEffect(() => {
    const handleSync = (e) => {
      setSoundsEnabled(e.detail?.enabled ?? getInteractionSoundsEnabled());
    };
    window.addEventListener('discuss:sound-setting-change', handleSync);
    return () => window.removeEventListener('discuss:sound-setting-change', handleSync);
  }, []);

  const toggleSounds = useCallback((val) => {
    const nextVal = typeof val === 'boolean' ? val : !soundsEnabled;
    setInteractionSoundsEnabled(nextVal);
    setSoundsEnabled(nextVal);
  }, [soundsEnabled]);

  return {
    soundsEnabled,
    toggleSounds,
    playMessageSend: playMessageSendSound,
    playPublish: playPublishSound,
    playCommentSend: playCommentSound,
    playBookmark: playBookmarkSound,
  };
}

export default useInteractionFeedback;
