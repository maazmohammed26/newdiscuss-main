import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      uid: 'test-user-123',
      username: 'maazdev',
      full_name: 'Mohammed Maaz A.',
      photo_url: 'https://example.com/avatar.jpg',
      verified: true,
    },
  }),
}));

jest.mock('@/lib/userProfileDb', () => ({
  getUserProfile: jest.fn(() => Promise.resolve({ fullName: 'Mohammed Maaz A.' })),
}));

jest.mock('@/lib/relationshipsDb', () => ({
  getFriendsWithDetails: jest.fn(() => Promise.resolve([{ id: 'friend-1' }, { id: 'friend-2' }])),
}));

jest.mock('@/components/UserAvatar', () => function MockUserAvatar() {
  return <div data-testid="mock-avatar" />;
});

jest.mock('@/components/VerifiedBadge', () => function MockVerifiedBadge() {
  return <span data-testid="verified-badge">✓</span>;
});

import AccountPanel from './AccountPanel';

describe('AccountPanel Component VNext', () => {
  it('renders compact identity block and main navigation actions', () => {
    const html = renderToStaticMarkup(
      <AccountPanel open={true} onClose={jest.fn()} />
    );

    expect(html).toContain('Account');
    expect(html).toContain('@maazdev');
    expect(html).toContain('View Profile');
    expect(html).toContain('Your Posts');
    expect(html).toContain('Friends &amp; Connections');
    expect(html).toContain('Bookmarks');
    expect(html).toContain('Settings &amp; Privacy');
  });

  it('renders null when open is false', () => {
    const html = renderToStaticMarkup(
      <AccountPanel open={false} onClose={jest.fn()} />
    );
    expect(html).toBe('');
  });
});
