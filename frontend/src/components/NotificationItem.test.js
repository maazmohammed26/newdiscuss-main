import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NotificationItem from './NotificationItem';

describe('NotificationItem Static Markup & Layering', () => {
  const mockUnreadItem = {
    id: 'notif-1',
    title: 'Sarah liked your post',
    body: 'Sarah upvoted your discussion on React architecture.',
    read: false,
    createdAt: new Date('2026-09-08T12:00:00Z').toISOString(),
  };

  const mockReadItem = {
    id: 'notif-2',
    title: 'System announcement',
    body: 'New features available on Discuss.',
    read: true,
    createdAt: new Date('2026-09-07T12:00:00Z').toISOString(),
  };

  it('renders unread notification with fully opaque background to prevent red rail bleed-through', () => {
    const html = renderToStaticMarkup(
      <NotificationItem
        item={mockUnreadItem}
        onOpen={jest.fn()}
        onMarkRead={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(html).toContain('Sarah liked your post');
    expect(html).toContain('Sarah upvoted your discussion on React architecture.');

    // Foreground row must have solid opaque background
    expect(html).toContain('bg-[#EEF6FF]');
    expect(html).toContain('dark:bg-[#0D1E36]');

    // Must NOT have semi-transparent /70 or /20 background
    expect(html).not.toContain('bg-blue-50/70');
    expect(html).not.toContain('dark:bg-blue-950/20');
  });

  it('renders read notification with standard clean background', () => {
    const html = renderToStaticMarkup(
      <NotificationItem
        item={mockReadItem}
        onOpen={jest.fn()}
        onMarkRead={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(html).toContain('System announcement');
    expect(html).toContain('bg-white');
    expect(html).toContain('dark:bg-neutral-950');
  });

  it('places destructive delete rail with restrained width behind row', () => {
    const html = renderToStaticMarkup(
      <NotificationItem
        item={mockUnreadItem}
        onOpen={jest.fn()}
        onMarkRead={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    // Destructive rail with 88px width
    expect(html).toContain('w-[88px]');
    expect(html).toContain('bg-rose-600');
    expect(html).toContain('aria-label="Delete notification"');
    expect(html).toContain('Delete');
  });

  it('provides accessible Mark read action for unread notifications', () => {
    const html = renderToStaticMarkup(
      <NotificationItem
        item={mockUnreadItem}
        onOpen={jest.fn()}
        onMarkRead={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(html).toContain('Mark notification as read');
    expect(html).toContain('Mark read');
  });
});
