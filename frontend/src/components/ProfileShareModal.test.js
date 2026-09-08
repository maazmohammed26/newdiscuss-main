import React from 'react';
import ReactDOMServer from 'react-dom/server';

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, 'data-testid': testId }) => (
    <div data-testid={testId || 'dialog-content'}>{children}</div>
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
});
