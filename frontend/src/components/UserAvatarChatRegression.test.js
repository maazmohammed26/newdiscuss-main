import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/chat' }),
}), { virtual: true });

const mockCurrentUser = {
  id: 'usr-current-test',
  username: 'currentuser',
  photo_url: 'https://cdn.com/current.jpg',
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
  }),
}));

jest.mock('@/contexts/HighlightsContext', () => ({
  useHighlights: () => ({
    usersWithStories: new Set(['usr-story-1']),
    storyGroups: [],
    seenStoryIds: new Set(),
  }),
}));

jest.mock('@/lib/firebase', () => ({
  database: {},
  ref: jest.fn((_, path) => path),
  onValue: jest.fn(() => jest.fn()),
  off: jest.fn(),
}));

import UserAvatar from './UserAvatar';

describe('Chat Avatar Regression & Sizing Audit Suite', () => {
  it('1. Chat row avatar with size={48} and className="w-12 h-12" has strict 48px dimensions and cannot expand', () => {
    const html = renderToStaticMarkup(
      <div className="relative shrink-0 w-12 h-12">
        <UserAvatar
          userId="usr-chat-partner"
          src="https://cdn.example.com/large-profile-photo-4000x4000.jpg"
          username="chatpartner"
          size={48}
          className="w-12 h-12"
        />
      </div>
    );

    expect(html).toContain('class="relative shrink-0 w-12 h-12"');
    expect(html).toContain('width:48px');
    expect(html).toContain('height:48px');
    expect(html).toContain('min-width:48px');
    expect(html).toContain('min-height:48px');
    expect(html).toContain('max-width:48px');
    expect(html).toContain('max-height:48px');
    expect(html).toContain('aspect-ratio:1 / 1');
    expect(html).toContain('rounded-full');
    expect(html).not.toContain('width:100%');
  });

  it('2. Chat row avatar without size prop respects caller Tailwind className without inline 100% override', () => {
    const html = renderToStaticMarkup(
      <UserAvatar
        userId="usr-chat-default"
        src="https://cdn.example.com/normal-photo.jpg"
        username="defaultchat"
        className="w-12 h-12"
      />
    );

    // Must NOT force inline width: 100% or height: 100%
    expect(html).not.toContain('width:100%');
    expect(html).not.toContain('height:100%');
    expect(html).toContain('w-12 h-12');
    expect(html).toContain('rounded-full');
    expect(html).toContain('aspect-ratio:1 / 1');
  });

  it('3. Letter inbox and thread 40px avatar remains strictly 40px', () => {
    const html = renderToStaticMarkup(
      <div className="w-10 h-10 rounded-full aspect-square overflow-hidden bg-neutral-100 flex items-center justify-center shrink-0">
        <UserAvatar
          userId="usr-letter-counterpart"
          src="https://cdn.example.com/counterpart.jpg"
          username="counterpart"
          size={40}
          className="w-10 h-10"
          interactive={false}
          fit="cover"
        />
      </div>
    );

    expect(html).toContain('width:40px');
    expect(html).toContain('height:40px');
    expect(html).toContain('min-width:40px');
    expect(html).toContain('min-height:40px');
    expect(html).toContain('aspect-ratio:1 / 1');
  });

  it('4. Letter composer 48px avatar remains strictly 48px', () => {
    const html = renderToStaticMarkup(
      <div className="w-12 h-12 rounded-full aspect-square overflow-hidden bg-neutral-800 shrink-0">
        <UserAvatar
          userId="usr-letter-recipient"
          src="https://cdn.example.com/recipient.jpg"
          username="recipient"
          size={48}
          className="w-12 h-12"
          interactive={false}
          fit="cover"
        />
      </div>
    );

    expect(html).toContain('width:48px');
    expect(html).toContain('height:48px');
    expect(html).toContain('min-width:48px');
    expect(html).toContain('min-height:48px');
    expect(html).toContain('aspect-ratio:1 / 1');
  });

  it('5. Extreme aspect ratio image preserves contain fallback with neutral background when fit="cover" is passed', () => {
    const html = renderToStaticMarkup(
      <UserAvatar
        userId="usr-extreme-photo"
        src="https://cdn.example.com/panorama.jpg"
        username="panouser"
        size={40}
        fit="cover"
        interactive={false}
      />
    );

    expect(html).toContain('aspect-ratio:1 / 1');
    expect(html).toContain('width:40px');
    expect(html).toContain('height:40px');
    expect(html).toContain('object-fit:cover');
  });

  it('6. Explicit full fill via w-full h-full applies 100% only when requested', () => {
    const html = renderToStaticMarkup(
      <UserAvatar
        src="https://cdn.example.com/fullfill.jpg"
        username="fullfilluser"
        className="w-full h-full"
        interactive={false}
      />
    );

    expect(html).toContain('width:100%');
    expect(html).toContain('height:100%');
  });
});
