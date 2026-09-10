import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, className, ...props }) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/about' }),
}), { virtual: true });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

jest.mock('@/assets/maaz-portrait.png', () => 'maaz-portrait.png', { virtual: true });

import AboutPage from './AboutPage';

describe('Discuss AboutPage — Personal Maaz Section & Metadata', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    window.scrollTo = jest.fn();
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
    const schemaScript = document.getElementById('about-maaz-jsonld');
    if (schemaScript) schemaScript.remove();
  });

  it('renders official About page pillars, Maaz personal section, and closing note', () => {
    const html = renderToStaticMarkup(<AboutPage />);

    // 1. Core About pillars
    expect(html).toContain('About Discuss');
    expect(html).toContain('A developer network built for signal, not noise.');
    expect(html).toContain('Useful conversation');
    expect(html).toContain('Real developer connection');
    expect(html).toContain('Private by design');

    // 2. Maaz personal section
    expect(html).toContain('The person behind Discuss');
    expect(html).toContain('Hey, I’m Maaz.');
    expect(html).toContain('I’m the person building Discuss. I wanted a place where developers could share ideas');

    // 3. Links
    expect(html).toContain('Portfolio');
    expect(html).toContain('https://www.maazprofile.tech/');
    expect(html).toContain('LinkedIn');
    expect(html).toContain('https://www.linkedin.com/in/mohammed-maaz-a-0aa730217/');

    // 4. Closing personal note
    expect(html).toContain('A note from me');
    expect(html).toContain('Discuss is still growing, but the idea is simple');
    expect(html).toContain('— Maaz');

    // 5. Independent product section
    expect(html).toContain('Designed and built in Bengaluru.');
  });

  it('toggles color filter on portrait when tapped or clicked', async () => {
    await act(async () => {
      root.render(<AboutPage />);
    });

    const portraitButton = container.querySelector('[role="button"][aria-label*="Mohammed Maaz A"]');
    expect(portraitButton).toBeTruthy();

    const img = portraitButton.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('maaz-portrait.png');
    expect(img.className).toContain('grayscale');

    // Tap/click to reveal color
    await act(async () => {
      portraitButton.click();
    });

    expect(img.className).toContain('grayscale-0');

    // Tap again to toggle back
    await act(async () => {
      portraitButton.click();
    });

    expect(img.className).toContain('grayscale');
  });

  it('injects JSON-LD Schema metadata for Mohammed Maaz A and Discuss', async () => {
    await act(async () => {
      root.render(<AboutPage />);
    });

    const script = document.getElementById('about-maaz-jsonld');
    expect(script).toBeTruthy();

    const data = JSON.parse(script.text);
    expect(data['@context']).toBe('https://schema.org');

    const person = data['@graph'].find((item) => item['@type'] === 'Person');
    expect(person).toBeTruthy();
    expect(person.name).toBe('Mohammed Maaz A');
    expect(person.url).toBe('https://www.maazprofile.tech/');
    expect(person.sameAs).toContain('https://www.linkedin.com/in/mohammed-maaz-a-0aa730217/');

    const org = data['@graph'].find((item) => item['@type'] === 'Organization');
    expect(org).toBeTruthy();
    expect(org.name).toBe('Discuss');
  });
});
