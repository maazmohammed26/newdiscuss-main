import { buildDeepLink, normalizeDeepLink } from './deepLinks';

describe('deep links', () => {
  it('builds encoded entity routes', () => {
    expect(buildDeepLink('post', { postId: 'post/one' })).toBe('/post/post%2Fone');
    expect(buildDeepLink('group', { groupId: 'team one' })).toBe('/group/team%20one');
  });

  it('accepts local, production and native Discuss links', () => {
    expect(normalizeDeepLink('/chat/user-1?from=push')).toBe('/chat/user-1?from=push');
    expect(normalizeDeepLink('https://discussit.in/post/post-1')).toBe('/post/post-1');
    expect(normalizeDeepLink('discuss://group/group-1')).toBe('/group/group-1');
  });

  it('rejects external and script URLs', () => {
    expect(normalizeDeepLink('https://example.com/steal')).toBe('/');
    expect(normalizeDeepLink('javascript:alert(1)')).toBe('/');
  });
});
