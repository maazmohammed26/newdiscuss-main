const ROUTES = Object.freeze({
  home: () => '/',
  post: ({ postId }) => `/post/${encodeURIComponent(postId)}`,
  profile: ({ userId }) => `/user/${encodeURIComponent(userId)}`,
  chat: ({ userId }) => `/chat/${encodeURIComponent(userId)}`,
  group: ({ groupId }) => `/group/${encodeURIComponent(groupId)}`,
  group_chat: ({ groupId }) => `/group/${encodeURIComponent(groupId)}`,
  notifications: () => '/notifications',
});

export const buildDeepLink = (type, params = {}) => {
  try {
    return (ROUTES[type] || ROUTES.home)(params);
  } catch (_) {
    return '/';
  }
};

export const normalizeDeepLink = (value) => {
  if (!value) return '/';
  try {
    const raw = String(value).trim();
    if (/^discuss:\/\//i.test(raw)) {
      const parsedNative = new URL(raw);
      const nativePath = `/${parsedNative.hostname}${parsedNative.pathname}`;
      return `${nativePath}${parsedNative.search}${parsedNative.hash}`;
    }
    const parsed = new URL(raw, 'https://www.discussit.in');
    if (!['discussit.in', 'www.discussit.in'].includes(parsed.hostname)) return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch (_) {
    return '/';
  }
};
