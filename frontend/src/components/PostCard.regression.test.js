import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to, ...rest }) => <a href={to} {...rest}>{children}</a>,
}), { virtual: true });

// Mock child modals and media components
jest.mock('@/components/MediaCarousel', () => function MockCarousel() {
  return <div data-testid="mock-carousel" />;
});
jest.mock('@/components/FullscreenMedia', () => function MockFullscreen() {
  return <div data-testid="mock-fullscreen" />;
});
jest.mock('@/components/UserPreviewModal', () => function MockUserPreview() {
  return <div data-testid="mock-user-preview" />;
});
jest.mock('@/components/ExternalLinkModal', () => function MockExtLink() {
  return <div data-testid="mock-ext-link" />;
});
jest.mock('@/components/ShareModal', () => function MockShare() {
  return <div data-testid="mock-share" />;
});
jest.mock('@/components/EditPostModal', () => function MockEdit() {
  return <div data-testid="mock-edit" />;
});
jest.mock('@/components/ReportModal', () => function MockReport() {
  return <div data-testid="mock-report" />;
});
jest.mock('@/components/UserAvatar', () => function MockUserAvatar() {
  return <div data-testid="mock-avatar" />;
});
jest.mock('@/components/CommentsSection', () => function MockComments() {
  return <div data-testid="mock-comments" />;
});

// Mock database operations
jest.mock('@/lib/db', () => ({
  deletePost: jest.fn(),
  updatePost: jest.fn(),
}));
jest.mock('@/features/posts/voteRepository', () => ({
  queuePostVote: jest.fn(),
}));
jest.mock('@/lib/commentsDb', () => ({
  createCommentFirestore: jest.fn(),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1', username: 'tester' },
  }),
}));
jest.mock('@/contexts/HighlightsContext', () => ({
  useHighlights: () => ({
    usersWithStories: new Set(),
    storyGroups: [],
    seenStoryIds: new Set(),
  }),
}));

import PostCard from './PostCard';

describe('PostCard Hook Regression Test', () => {
  const samplePost = {
    id: 'post-101',
    content: 'Discussing #react hooks and performance with #javascript',
    author_id: 'test-user-1',
    author_username: 'tester',
    author_photo_url: null,
    timestamp: new Date().toISOString(),
    type: 'discussion',
    upvote_count: 5,
    downvote_count: 0,
    hashtags: ['react', 'javascript'],
    comment_count: 2,
  };

  it('renders without ReferenceError: useCallback is not defined', () => {
    let html = '';
    expect(() => {
      html = renderToStaticMarkup(
        <PostCard
          post={samplePost}
          currentUser={{ id: 'test-user-1', username: 'tester' }}
          onDeleted={jest.fn()}
          onUpdated={jest.fn()}
          onVoteChanged={jest.fn()}
          onTagClick={jest.fn()}
        />
      );
    }).not.toThrow();

    expect(html).toContain('post-card-post-101');
    expect(html).toContain('#react');
    expect(html).toContain('#javascript');
  });
});
