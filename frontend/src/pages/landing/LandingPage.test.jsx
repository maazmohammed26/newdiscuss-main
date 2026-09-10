import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, className, ...props }) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

let mockAuthState = {
  user: null,
  loading: false,
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

import LandingPage from '../LandingPage';

function setInputValue(input, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Discuss Public LandingPage (Production Hand-Drawn / Drawable UI)', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { user: null, loading: false };
    global.fetch = jest.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders official Discuss branding, all 7 visible regions, and real Discuss features', () => {
    const html = renderToStaticMarkup(<LandingPage />);

    // 1. Official Discuss Logo (renders "Discuss" in script font with < and /> tag marks)
    expect(html).toContain('Discuss');
    expect(html).toContain('&lt;');
    expect(html).toContain('/&gt;');

    // 2. Region 1: Header
    expect(html).toContain('Join Discuss');

    // 3. Region 2: Hero Section
    expect(html).toContain('Where developers');
    expect(html).toContain('think out loud');
    expect(html).toContain('Ask technical questions, share what you&#x27;re building');
    expect(html).toContain('Explore Discussions');
    expect(html).toContain('Firestore snapshot listener fire twice');
    expect(html).toContain('@alex_dev');
    expect(html).toContain('12 likes'); // Real Discuss interaction model

    // 4. Region 3: Story Section (ASK → SHARE → BUILD)
    expect(html).toContain('Where ideas turn into code');
    expect(html).toContain('Ask. Share. Build.');
    expect(html).toContain('Handling out-of-order WebSocket packet delivery');
    expect(html).toContain('LedgerProof');
    expect(html).toContain('FastAPI');
    expect(html).toContain('Public Repository');
    expect(html).toContain('Interactive Demo');
    expect(html).toContain('42 likes');

    // 5. Region 4: Discovery Section (TalentGraph + DevRadar)
    expect(html).toContain('Find developers who');
    expect(html).toContain('complement what you build');
    expect(html).toContain('TalentGraph');
    expect(html).toContain('DevRadar');
    expect(html).toContain('@arjun_dev');
    expect(html).toContain('@rahul_ts');
    expect(html).toContain('@neha_dev');

    // 6. Region 5: Mobile Access (Android Early Access + iOS PWA)
    expect(html).toContain('Take Discuss with you');
    expect(html).toContain('Discuss on Android');
    expect(html).toContain('Google Play Early Access');
    expect(html).toContain('Discuss on iPhone');

    // 7. Region 6: Final CTA Section
    expect(html).toContain('talk less?');
    expect(html).toContain('nah.');
    expect(html).toContain('discuss.');
    expect(html).toContain('ready to build with better peers?');

    // 8. Region 7: Footer
    expect(html).toContain('A focused, ad-free network');
    expect(html).toContain('ONYIIX');
    expect(html).toContain('/privacy');
    expect(html).toContain('/terms');
    expect(html).toContain('/guidelines');
  });

  it('validates invalid email on Android access form submission', async () => {
    await act(async () => {
      root.render(<LandingPage />);
    });

    const form = container.querySelector('form');
    const input = container.querySelector('#android-access-email');
    expect(form).toBeTruthy();
    expect(input).toBeTruthy();

    await act(async () => {
      setInputValue(input, 'invalid-email');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Enter a valid Google Play email.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits valid email to /api/android-access endpoint with honeypot', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Request sent. Check Google Play in 4–6 hours with this email.',
      }),
    });

    await act(async () => {
      root.render(<LandingPage />);
    });

    const form = container.querySelector('form');
    const input = container.querySelector('#android-access-email');

    await act(async () => {
      setInputValue(input, 'dev@example.com');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/android-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dev@example.com',
        website: '',
      }),
    });

    expect(container.textContent).toContain('Request sent.');
  });

  it('handles server failure during Android access submission', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Too many requests. Please try again later.',
      }),
    });

    await act(async () => {
      root.render(<LandingPage />);
    });

    const form = container.querySelector('form');
    const input = container.querySelector('#android-access-email');

    await act(async () => {
      setInputValue(input, 'dev@example.com');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Too many requests. Please try again later.');
  });

  it('toggles iOS PWA install help correctly', async () => {
    await act(async () => {
      root.render(<LandingPage />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const toggleButton = buttons.find((btn) => btn.textContent.includes('Install iOS PWA'));
    expect(toggleButton).toBeTruthy();

    await act(async () => {
      toggleButton.click();
    });

    expect(container.textContent).toContain('Add to Home Screen');
  });

  it('renders hero Play Store sketch icon and triggers navigation to Android access', async () => {
    await act(async () => {
      root.render(<LandingPage />);
    });

    const playStoreIconWrapper = container.querySelector('[data-testid="hero-playstore-icon"]');
    expect(playStoreIconWrapper).toBeTruthy();

    const playStoreBtn = playStoreIconWrapper.querySelector('button');
    expect(playStoreBtn).toBeTruthy();
    expect(playStoreBtn.getAttribute('aria-label')).toBe('Jump to Android early access');

    const mobileSection = container.querySelector('#mobile-access');
    expect(mobileSection).toBeTruthy();
    mobileSection.scrollIntoView = jest.fn();

    await act(async () => {
      playStoreBtn.click();
    });

    expect(mobileSection.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('redirects authenticated users to /feed', async () => {
    mockAuthState = {
      user: { uid: 'user_123' },
      loading: false,
    };

    await act(async () => {
      root.render(<LandingPage />);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/feed', { replace: true });
    expect(container.querySelector('#discuss-loading-screen')).toBeTruthy();
  });
});
