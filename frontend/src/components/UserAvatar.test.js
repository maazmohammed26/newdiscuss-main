import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

const mockCurrentUser = {
  id: 'usr-self-1',
  username: 'maaz',
  photo_url: 'https://cdn.example.com/maaz-current.jpg',
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
  }),
}));

jest.mock('@/contexts/HighlightsContext', () => ({
  useHighlights: () => ({
    usersWithStories: new Set(),
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

import UserAvatar, {
  resolveCanonicalAvatarUrl,
  getDeterministicInitials,
  broadcastAvatarUpdate,
  getStoredAvatar,
  setStoredAvatar,
} from './UserAvatar';

describe('UserAvatar Universal Resolution and Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolveCanonicalAvatarUrl follows exact fallback priority', () => {
    expect(resolveCanonicalAvatarUrl(null)).toBe('');
    expect(resolveCanonicalAvatarUrl('https://example.com/direct.jpg')).toBe('https://example.com/direct.jpg');

    // photo_url primary
    expect(resolveCanonicalAvatarUrl({
      photo_url: 'https://cdn.com/primary.jpg',
      photoURL: 'https://cdn.com/auth.jpg',
      authorPhotoUrl: 'https://cdn.com/old.jpg',
    })).toBe('https://cdn.com/primary.jpg');

    // photoURL secondary
    expect(resolveCanonicalAvatarUrl({
      photoURL: 'https://cdn.com/auth.jpg',
      authorPhotoUrl: 'https://cdn.com/old.jpg',
    })).toBe('https://cdn.com/auth.jpg');

    // legacy profile_image
    expect(resolveCanonicalAvatarUrl({
      profile_image: 'https://cdn.com/legacy.jpg',
      authorPhotoUrl: 'https://cdn.com/old.jpg',
    })).toBe('https://cdn.com/legacy.jpg');

    // snapshot authorPhotoUrl
    expect(resolveCanonicalAvatarUrl({
      authorPhotoUrl: 'https://cdn.com/old.jpg',
    })).toBe('https://cdn.com/old.jpg');
  });

  it('getDeterministicInitials handles multi-word names and usernames correctly', () => {
    expect(getDeterministicInitials('Mohammed Maaz')).toBe('MM');
    expect(getDeterministicInitials('Maaz')).toBe('MA');
    expect(getDeterministicInitials('M')).toBe('M');
    expect(getDeterministicInitials('')).toBe('?');
    expect(getDeterministicInitials(null)).toBe('?');
  });

  it('renders current user avatar from canonical current user photo with circular fit', () => {
    const html = renderToStaticMarkup(
      <UserAvatar
        userId="usr-self-1"
        src="https://cdn.example.com/old-stale.jpg"
        username="maaz"
      />
    );

    expect(html).toContain('src="https://cdn.example.com/maaz-current.jpg"');
    expect(html).toContain('object-fit:cover');
    expect(html).toContain('object-position:center');
    expect(html).toContain('rounded-full');
  });

  it('falls back to deterministic initials when user has no image', () => {
    const html = renderToStaticMarkup(
      <UserAvatar
        userId="usr-no-pic"
        src=""
        username="Alex Developer"
      />
    );

    expect(html).toContain('AD');
    expect(html).toContain('rounded-full');
    expect(html).not.toContain('<img');
  });

  it('updates cache and broadcasts when broadcastAvatarUpdate is called', () => {
    const targetUserId = 'usr-colleague-55';
    setStoredAvatar(targetUserId, 'https://cdn.com/colleague-v1.jpg');
    expect(getStoredAvatar(targetUserId)).toBe('https://cdn.com/colleague-v1.jpg');

    broadcastAvatarUpdate(targetUserId, 'https://cdn.com/colleague-v2-new.jpg');
    expect(getStoredAvatar(targetUserId)).toBe('https://cdn.com/colleague-v2-new.jpg');

    // Rendering with targetUserId should resolve from stored avatar
    const html = renderToStaticMarkup(
      <UserAvatar
        userId={targetUserId}
        username="colleague"
      />
    );
    expect(html).toContain('src="https://cdn.com/colleague-v2-new.jpg"');
  });

  it('same canonical avatar resolves consistently across Profile, PostCard, and Comments', () => {
    const authorId = 'usr-author-777';
    const updatedAuthorAvatar = 'https://cdn.com/author-new-avatar.png';
    setStoredAvatar(authorId, updatedAuthorAvatar);

    // Simulated Profile avatar rendering
    const profileHtml = renderToStaticMarkup(
      <UserAvatar
        userId={authorId}
        src="https://cdn.com/stale-profile-snapshot.png"
        username="authorUser"
        className="w-24 h-24 rounded-full object-cover"
      />
    );

    // Simulated PostCard author avatar rendering
    const postHtml = renderToStaticMarkup(
      <UserAvatar
        userId={authorId}
        src="https://cdn.com/stale-post-snapshot.png"
        username="authorUser"
        className="w-full h-full object-cover rounded-full"
      />
    );

    // Simulated Comments reply avatar rendering
    const commentHtml = renderToStaticMarkup(
      <UserAvatar
        userId={authorId}
        src="https://cdn.com/stale-comment-snapshot.png"
        username="authorUser"
        className="w-6 h-6 object-cover"
      />
    );

    // All three must resolve to the identical current updated avatar!
    expect(profileHtml).toContain(`src="${updatedAuthorAvatar}"`);
    expect(postHtml).toContain(`src="${updatedAuthorAvatar}"`);
    expect(commentHtml).toContain(`src="${updatedAuthorAvatar}"`);
  });

  it('falls back to deterministic initials if image resource is blocked or invalid', () => {
    const html = renderToStaticMarkup(
      <UserAvatar
        userId="usr-blocked-url"
        src="https://drive.google.com/file/d/12345/view"
        username="David Developer"
      />
    );

    expect(html).toContain('DD');
    expect(html).not.toContain('drive.google.com');
  });
});

