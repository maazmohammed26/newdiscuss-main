import {
  DELETED_MESSAGE_PREVIEW,
  isDeletedListPreview,
  lastMessageText,
  previewFromLastMessageString,
} from './chatMessageUtils';

describe('chat list message metadata normalization', () => {
  it('renders object-shaped lastMessage metadata as safe text', () => {
    const metadata = { sender: 'user-a', text: 'Blink', timestamp: '2026-09-06T18:00:00.000Z' };
    expect(lastMessageText(metadata)).toBe('Blink');
    expect(previewFromLastMessageString(metadata)).toBe('Blink');
  });

  it('never returns an object to React for malformed metadata', () => {
    expect(previewFromLastMessageString({ sender: 'user-a' })).toBe('No messages yet');
  });

  it('recognizes deleted previews in both string and metadata formats', () => {
    expect(isDeletedListPreview(DELETED_MESSAGE_PREVIEW)).toBe(true);
    expect(isDeletedListPreview({ text: DELETED_MESSAGE_PREVIEW })).toBe(true);
  });
});
