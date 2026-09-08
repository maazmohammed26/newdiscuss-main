import { createFeedRepository, mergeFeedPosts } from './feedRepository';

const post = (id, timestamp, extra = {}) => ({ id, timestamp, ...extra });

test('mergeFeedPosts deduplicates updates and keeps newest-first ordering', () => {
  const merged = mergeFeedPosts(
    [post('older', '2026-01-01T00:00:00.000Z'), post('same', '2026-01-02T00:00:00.000Z', { title: 'old' })],
    [post('newer', '2026-01-03T00:00:00.000Z'), post('same', '2026-01-02T00:00:00.000Z', { title: 'new' })]
  );

  expect(merged.map((item) => item.id)).toEqual(['newer', 'same', 'older']);
  expect(merged.find((item) => item.id === 'same').title).toBe('new');
});

test('repository fetches a page and persists it without changing the source result', async () => {
  const page = {
    posts: [post('one', '2026-01-01T00:00:00.000Z')],
    cursor: { id: 'one', timestamp: '2026-01-01T00:00:00.000Z' },
    hasMore: true,
  };
  const source = {
    fetchPage: jest.fn().mockResolvedValue(page),
    subscribeHead: jest.fn(),
  };
  const cache = {
    read: jest.fn(),
    writePage: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const repository = createFeedRepository({ source, cache });
  const cursor = { id: 'cursor', timestamp: '2026-01-02T00:00:00.000Z' };

  await expect(repository.fetchPage(cursor, 20)).resolves.toBe(page);
  expect(source.fetchPage).toHaveBeenCalledWith({ cursor, limit: 20 });
  expect(cache.writePage).toHaveBeenCalledWith(page, cursor);
});

test('realtime events update cache and reach repository consumers', async () => {
  let sourceHandlers;
  const source = {
    fetchPage: jest.fn(),
    subscribeHead: jest.fn((handlers) => {
      sourceHandlers = handlers;
      return jest.fn();
    }),
  };
  const cache = {
    read: jest.fn(),
    writePage: jest.fn(),
    upsert: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const repository = createFeedRepository({ source, cache });
  const handlers = { onUpsert: jest.fn(), onRemove: jest.fn() };

  repository.subscribeHead(handlers);
  sourceHandlers.onUpsert(post('new', '2026-01-01T00:00:00.000Z'));
  sourceHandlers.onRemove('old');
  await Promise.resolve();

  expect(cache.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'new' }));
  expect(cache.remove).toHaveBeenCalledWith('old');
  expect(handlers.onUpsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'new' }));
  expect(handlers.onRemove).toHaveBeenCalledWith('old');
});

test('repository rejects incomplete boundaries', () => {
  expect(() => createFeedRepository({ source: {}, cache: {} })).toThrow(TypeError);
});
