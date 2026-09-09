import React from 'react';
import ReactDOMServer from 'react-dom/server';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usr-self', username: 'self' } }),
}));

jest.mock('@/components/UserAvatar', () => {
  return function MockUserAvatar({ userId, username, src }) {
    return (
      <div data-testid="mock-avatar" data-user-id={userId} data-username={username} data-src={src}>
        {username?.[0] || '?'}
      </div>
    );
  };
});

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, 'data-testid': testId, className }) => (
    <div data-testid={testId || 'dialog-content'} className={className}>{children}</div>
  ),
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
}));

import ProfileShareModal from './ProfileShareModal';

describe('ProfileShareModal', () => {
  it('renders skeleton when target profile is unresolved', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ProfileShareModal open={true} onClose={jest.fn()} user={null} username="" />
    );
    expect(html).toContain('data-testid="share-skeleton"');
    expect(html).not.toContain('undefined');
  });

  it('resolves own profile URL correctly with canonical /user/:userId format', () => {
    const ownUser = {
      id: 'usr-own-999',
      username: 'ownhandle',
      fullName: 'Own Creator'
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <ProfileShareModal
        open={true}
        onClose={jest.fn()}
        user={ownUser}
        username={ownUser.username}
        isOwnProfile={true}
      />
    );

    expect(html).toContain('/user/usr-own-999');
    expect(html).toContain('@ownhandle');
    expect(html).toContain('Connect with me on Discuss!');
    expect(html).not.toContain('undefined');
  });

  it('resolves other-user profile URL and contextual message correctly without undefined', () => {
    const otherUser = {
      id: 'usr-other-123',
      username: 'otherdev',
      fullName: 'Jane Developer'
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <ProfileShareModal
        open={true}
        onClose={jest.fn()}
        user={otherUser}
        username={otherUser.username}
        isOwnProfile={false}
      />
    );

    expect(html).toContain('/user/usr-other-123');
    expect(html).toContain('@otherdev');
    expect(html).toContain('Check out Jane Developer (@otherdev) on Discuss:');
    expect(html).not.toContain('undefined');
  });

  it('does not fallback to accidental undefined if username is missing but id is present', () => {
    const userWithoutUsername = {
      id: 'usr-only-id-456'
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <ProfileShareModal
        open={true}
        onClose={jest.fn()}
        user={userWithoutUsername}
        isOwnProfile={false}
      />
    );

    expect(html).toContain('/user/usr-only-id-456');
    expect(html).not.toContain('undefined');
  });

  it('renders target user avatar and flat layout without nested card boxes', () => {
    const target = {
      id: 'usr-target-789',
      username: 'targetuser',
      fullName: 'Target User',
      photo_url: 'https://cdn.example.com/target.jpg'
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      <ProfileShareModal
        open={true}
        onClose={jest.fn()}
        user={target}
        username={target.username}
        isOwnProfile={false}
      />
    );

    // Identity and avatar rendered
    expect(html).toContain('data-testid="mock-avatar"');
    expect(html).toContain('data-user-id="usr-target-789"');
    expect(html).toContain('Target User');
    expect(html).toContain('@targetuser');

    // Flat structure: no heavy rounded nested boxes like "rounded-xl p-3 border border-neutral-200" around rows
    expect(html).not.toContain('bg-neutral-50 dark:bg-black rounded-xl p-3 border');

    // Safe truncation and responsive bounds
    expect(html).toContain('truncate');
    expect(html).toContain('min-w-0');
  });
});
