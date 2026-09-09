import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-signal-1', username: 'signalcreator', photo_url: 'https://cdn.com/avatar.jpg' },
  }),
}));

jest.mock('@/components/UserAvatar', () => {
  return function MockUserAvatar() {
    return <div data-testid="mock-avatar" />;
  };
});

jest.mock('@/components/MediaUpload', () => {
  return function MockMediaUpload({ type, disabled }) {
    return <div data-testid={`mock-media-upload-${type}`} data-disabled={disabled}>Mock Media Upload</div>;
  };
});

jest.mock('@/lib/storiesDb', () => ({
  createStory: jest.fn(),
}));

jest.mock('@/lib/interactionFeedback', () => ({
  playPublishSound: jest.fn(),
}));

import SignalStoryCreator from './SignalStoryCreator';

describe('SignalStoryCreator Flat Writing Surface & Functionality', () => {
  it('renders flat writing surface without heavy bordered card container', () => {
    const html = renderToStaticMarkup(
      <SignalStoryCreator open={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );

    // Flat textarea classes (bg-transparent, border-0, p-0)
    expect(html).toContain('bg-transparent');
    expect(html).toContain('border-0');
    expect(html).toContain('New Signal');
    expect(html).toContain('Text Signal');
    expect(html).toContain('Image Signal');
    expect(html).toContain('350');
    expect(html).toContain('Post Signal');

    // Does not have old bordered card styling on textarea
    expect(html).not.toContain('rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50');
  });
});
