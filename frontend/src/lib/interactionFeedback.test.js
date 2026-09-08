import {
  getInteractionSoundsEnabled,
  setInteractionSoundsEnabled,
  playMessageSendSound,
  playPublishSound,
  playCommentSound,
  playBookmarkSound,
} from './interactionFeedback';

describe('interactionFeedback Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('defaults interaction sounds to true (ON)', () => {
    expect(getInteractionSoundsEnabled()).toBe(true);
  });

  test('sets and persists interaction sound preference to false', () => {
    setInteractionSoundsEnabled(false);
    expect(getInteractionSoundsEnabled()).toBe(false);
    expect(localStorage.getItem('discuss_interaction_sounds')).toBe('false');
  });

  test('restores interaction sound preference to true', () => {
    setInteractionSoundsEnabled(false);
    expect(getInteractionSoundsEnabled()).toBe(false);
    setInteractionSoundsEnabled(true);
    expect(getInteractionSoundsEnabled()).toBe(true);
    expect(localStorage.getItem('discuss_interaction_sounds')).toBe('true');
  });

  test('sound triggers execute safely without crashing in test environment', () => {
    expect(() => {
      playMessageSendSound();
      playPublishSound();
      playCommentSound();
      playBookmarkSound();
    }).not.toThrow();
  });
});
