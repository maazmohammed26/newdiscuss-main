jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children }) => children,
}), { virtual: true });

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogClose: ({ children }) => <div>{children}</div>,
}));

jest.mock('@/components/UserAvatar', () => {
  return function MockUserAvatar() {
    return <div data-testid="mock-avatar" />;
  };
});

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1', username: 'antigravity_dev', photo_url: null },
  }),
}));

jest.mock('@/components/MediaUpload', () => {
  return function MockMediaUpload({ type }) {
    return <div data-testid={`mock-media-upload-${type}`}>Mock Media Upload ({type})</div>;
  };
});

jest.mock('@/lib/db', () => ({
  createPost: jest.fn(),
}));

jest.mock('@/lib/pulseDb', () => ({
  createPulse: jest.fn(),
}));

jest.mock('@/lib/interactionFeedback', () => ({
  playPublishSound: jest.fn(),
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CreatePostModal from './CreatePostModal';

describe('CreatePostModal - Pulse Tab & Icon Standardization', () => {
  it('renders without runtime reference error when initialType is pulse', () => {
    // This explicitly proves IoVideocam is gone and replaced with Lucide Video icon
    let html = '';
    expect(() => {
      html = renderToStaticMarkup(
        <CreatePostModal
          open={true}
          onClose={jest.fn()}
          onCreated={jest.fn()}
          initialType="pulse"
        />
      );
    }).not.toThrow();

    expect(html).toContain('Publish Pulse');
    expect(html).toContain('Video Upload');
    expect(html).toContain('Add a caption for your Pulse video...');
    expect(html).toContain('lucide-video');
  });

  it('renders Discussion tab without separate hashtag input and includes inline hashtag notice', () => {
    const html = renderToStaticMarkup(
      <CreatePostModal
        open={true}
        onClose={jest.fn()}
        onCreated={jest.fn()}
        initialType="discussion"
      />
    );

    expect(html).toContain('Share Discussion');
    expect(html).toContain('Type thoughts and #hashtags naturally...');
    // Separate hashtag input box must NOT exist
    expect(html).not.toContain('placeholder="Add hashtags');
  });
});
