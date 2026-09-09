import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, className }) => <a href={to} className={className}>{children}</a>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/feed' }),
}), { virtual: true });

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'test-user', username: 'tester' },
  }),
}));

jest.mock('../lib/db', () => ({
  getUnreadNotificationsCount: jest.fn().mockResolvedValue(0),
}));

jest.mock('./CreatePostModal', () => () => <div data-testid="create-post-modal" />);

import Sidebar from './Sidebar';

describe('Sidebar navigation', () => {
  it('renders primary navigation items without any Discuss AI entry', () => {
    const html = renderToStaticMarkup(<Sidebar />);

    // Verify TalentGraph is present
    expect(html).toContain('TalentGraph');

    // Verify Home, Chats, DevRadar, Bookmarks are present
    expect(html).toContain('Home');
    expect(html).toContain('Chats');
    expect(html).toContain('DevRadar');
    expect(html).toContain('Bookmarks');

    // Verify Discuss AI has been completely removed
    expect(html).not.toContain('Discuss AI');
    expect(html).not.toContain('AI Assistant');
  });
});
