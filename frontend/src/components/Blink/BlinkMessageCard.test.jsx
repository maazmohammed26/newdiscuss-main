jest.mock('../../lib/firebase', () => ({
  database: {},
  ref: jest.fn((db, path) => ({ path })),
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('../../lib/firebaseThird', () => ({
  thirdDatabase: {},
  ref: jest.fn((db, path) => ({ path })),
  get: jest.fn(),
  set: jest.fn(),
  push: jest.fn(() => ({ key: 'msg_test_123' })),
  update: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('../../lib/firebaseFourth', () => ({
  fourthDatabase: {},
  ref: jest.fn((db, path) => ({ path })),
  get: jest.fn(),
  set: jest.fn(),
  push: jest.fn(() => ({ key: 'group_msg_123' })),
  update: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('../../lib/chatsDb', () => ({
  generateChatId: (a, b) => [a, b].sort().join('_'),
  getOrCreateChat: jest.fn().mockResolvedValue({ id: 'chat_userA_userB' }),
}));

jest.mock('../../lib/notificationTransport', () => ({
  sendRemoteNotification: jest.fn(),
}));

jest.mock('../../lib/pushNotificationService', () => ({
  notifyChatMessage: jest.fn(),
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BlinkMessageCard, { BlinkBadge } from './BlinkMessageCard';

describe('BlinkMessageCard Component', () => {
  const baseMessage = {
    id: 'msg_123',
    type: 'blink',
    sender: 'user_a',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
    viewed: false
  };

  describe('BlinkBadge', () => {
    it('renders the custom Discuss badge with blue <, red />, and clean Blink text without camera emojis', () => {
      const html = renderToStaticMarkup(<BlinkBadge />);
      expect(html).toContain('&lt;');
      expect(html).toContain('Blink');
      expect(html).toContain('/&gt;');
      expect(html).toContain('text-[#0095F6]');
      expect(html).toContain('text-[#EF4444]');
      expect(html).not.toContain('📸');
    });
  });

  describe('Recipient View', () => {
    it('renders Unopened state for recipient with Tap to view · View once', () => {
      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={baseMessage}
          currentUserId="user_b"
          isOwn={false}
        />
      );

      expect(html).toContain('Tap to view · View once');
      expect(html).toContain('Blink');
      expect(html).not.toContain('📸');
    });

    it('renders Opened state for recipient after closing', () => {
      const viewedMessage = {
        ...baseMessage,
        viewed: true,
        viewedAt: new Date().toISOString()
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={viewedMessage}
          currentUserId="user_b"
          isOwn={false}
        />
      );

      expect(html).toContain('Opened · Cannot be viewed again');
    });

    it('renders Blink expired state for recipient after 24 hours without viewing', () => {
      const expiredMessage = {
        ...baseMessage,
        expired: true,
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={expiredMessage}
          currentUserId="user_b"
          isOwn={false}
        />
      );

      expect(html).toContain('Blink expired');
    });
  });

  describe('Sender View', () => {
    it('renders Waiting to be viewed state immediately after sending', () => {
      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={baseMessage}
          currentUserId="user_a"
          isOwn={true}
        />
      );

      expect(html).toContain('Waiting to be viewed');
      expect(html).toContain('Blink');
      expect(html).not.toContain('📸');
    });

    it('renders Opened state when recipient opens it', () => {
      const openedMessage = {
        ...baseMessage,
        viewed: true,
        viewedAt: new Date().toISOString()
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={openedMessage}
          currentUserId="user_a"
          isOwn={true}
        />
      );

      expect(html).toContain('Opened');
    });

    it('renders Expired state after 24 hours if never opened', () => {
      const expiredMessage = {
        ...baseMessage,
        expired: true,
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={expiredMessage}
          currentUserId="user_a"
          isOwn={true}
        />
      );

      expect(html).toContain('Expired');
    });

    it('displays screenshot signal if captured', () => {
      const screenshotMsg = {
        ...baseMessage,
        screenshotBy: 'alex'
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={screenshotMsg}
          currentUserId="user_a"
          isOwn={true}
        />
      );

      expect(html).toContain('alex may have captured your Blink.');
    });
  });

  describe('Group Blink per-member isolation', () => {
    it('renders Waiting to be viewed for sender if no members viewed yet', () => {
      const groupMsg = {
        ...baseMessage,
        viewedBy: {}
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={groupMsg}
          currentUserId="user_a"
          isOwn={true}
          isGroup={true}
        />
      );

      expect(html).toContain('Waiting to be viewed');
    });

    it('renders Opened · Viewed by count for sender when members view', () => {
      const groupMsg = {
        ...baseMessage,
        viewedBy: {
          user_b: { viewedAt: new Date().toISOString() },
          user_c: { viewedAt: new Date().toISOString() }
        }
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={groupMsg}
          currentUserId="user_a"
          isOwn={true}
          isGroup={true}
        />
      );

      expect(html).toContain('Opened · Viewed by 2 members');
    });

    it('does not mark the group Blink as viewed for member C if only member B viewed it', () => {
      const groupMsg = {
        ...baseMessage,
        viewedBy: {
          user_b: { viewedAt: new Date().toISOString() }
        }
      };

      const html = renderToStaticMarkup(
        <BlinkMessageCard
          message={groupMsg}
          currentUserId="user_c"
          isOwn={false}
          isGroup={true}
        />
      );

      expect(html).toContain('Tap to view · View once');
    });
  });
});
