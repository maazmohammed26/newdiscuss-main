import { normalizeFeedCursor, selectFeedWindow } from './firebaseFeedSource';

const rows = Array.from({ length: 25 }, (_, index) => ({
  id: String(index).padStart(2, '0'),
  timestamp: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
}));

test('selectFeedWindow drops the look-ahead row and returns a stable oldest cursor', () => {
  const page = selectFeedWindow(rows, 20);

  expect(page.posts).toHaveLength(20);
  expect(page.posts[0].id).toBe('24');
  expect(page.posts[19].id).toBe('05');
  expect(page.cursor).toEqual({ id: '05', timestamp: rows[5].timestamp });
  expect(page.hasMore).toBe(true);
});

test('selectFeedWindow reports the final page', () => {
  const page = selectFeedWindow(rows.slice(0, 4), 20);

  expect(page.posts.map((item) => item.id)).toEqual(['03', '02', '01', '00']);
  expect(page.hasMore).toBe(false);
});

test('normalizeFeedCursor rejects incomplete cursors', () => {
  expect(normalizeFeedCursor(null)).toBeNull();
  expect(normalizeFeedCursor({ id: 'one' })).toBeNull();
  expect(normalizeFeedCursor({ timestamp: 1 })).toBeNull();
  expect(normalizeFeedCursor({ id: 7, timestamp: 0 })).toEqual({ id: '7', timestamp: 0 });
});
