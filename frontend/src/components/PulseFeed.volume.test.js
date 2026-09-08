import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1', id: 'user-1', username: 'tester' } }),
}));

jest.mock('@/components/UserAvatar', () => function MockUserAvatar() {
  return <div data-testid="mock-avatar" />;
});

jest.mock('@/lib/relationshipsDb', () => ({
  getRelationshipStatus: jest.fn(() => Promise.resolve('none')),
  sendFriendRequest: jest.fn(),
  unfollowFriend: jest.fn(),
  RELATIONSHIP_STATUS: { NONE: 'none', FRIENDS: 'friends' },
}));

jest.mock('@/lib/pulseDb', () => ({
  deletePulse: jest.fn(),
  editPulseCaption: jest.fn(),
}));

jest.mock('@/lib/reportService', () => ({
  hasUserReportedTarget: jest.fn(() => false),
}));

jest.mock('./PulseFeed.css', () => ({}), { virtual: true });

import PulseFeed from './PulseFeed';

describe('Pulse Volume and Legacy Icon Audit', () => {
  it('contains zero references to legacy react-icons IoVolume in PulseFeed.jsx', () => {
    const pulseFeedContent = fs.readFileSync(
      path.resolve(__dirname, 'PulseFeed.jsx'),
      'utf8'
    );
    expect(pulseFeedContent).not.toContain('IoVolumeHigh');
    expect(pulseFeedContent).not.toContain('IoVolumeMute');
    expect(pulseFeedContent).not.toContain('IoVolumeOff');
    expect(pulseFeedContent).not.toContain('react-icons/io');
    expect(pulseFeedContent).not.toContain('react-icons/io5');
    expect(pulseFeedContent).toContain('Volume2');
    expect(pulseFeedContent).toContain('VolumeX');
  });

  it('renders PulseFeed with sound controls without ReferenceError: IoVolumeHigh is not defined', () => {
    const samplePulses = [
      {
        id: 'pulse-1',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
        caption: 'Building with Lucide and React #dev',
        hashtags: ['dev'],
        authorId: 'user-2',
        authorUsername: 'alice',
        likesCount: 12,
        createdAt: Date.now(),
      },
    ];

    let html = '';
    expect(() => {
      html = renderToStaticMarkup(
        <PulseFeed
          pulses={samplePulses}
          userId="user-1"
          onLike={jest.fn()}
          checkLiked={jest.fn(() => Promise.resolve(false))}
          onRefresh={jest.fn()}
        />
      );
    }).not.toThrow();

    expect(html).toContain('pulse-item');
    expect(html).toContain('mute-control');
  });
});
