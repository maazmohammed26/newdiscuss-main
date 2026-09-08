import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ProfileSocialLinks from './ProfileSocialLinks';

describe('ProfileSocialLinks Component', () => {
  test('renders nothing when links array is empty or undefined', () => {
    const htmlEmpty = ReactDOMServer.renderToStaticMarkup(<ProfileSocialLinks links={[]} />);
    expect(htmlEmpty).toBe('');

    const htmlNull = ReactDOMServer.renderToStaticMarkup(<ProfileSocialLinks links={null} />);
    expect(htmlNull).toBe('');
  });

  test('renders clickable links with safe external target and compact neutral style', () => {
    const links = [
      { name: 'My GitHub', url: 'https://github.com/discuss-dev' },
      { name: '', url: 'linkedin.com/in/discuss-founder' },
      { label: 'Portfolio', url: 'https://mywebsite.io' },
    ];

    const html = ReactDOMServer.renderToStaticMarkup(<ProfileSocialLinks links={links} />);

    // Check safe target and rel
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');

    // Check automatic https prefixing
    expect(html).toContain('href="https://linkedin.com/in/discuss-founder"');
    expect(html).toContain('href="https://github.com/discuss-dev"');

    // Check labels
    expect(html).toContain('My GitHub');
    expect(html).toContain('LinkedIn');
    expect(html).toContain('Portfolio');
  });

  test('caps rendering to maximum 5 links', () => {
    const links = Array.from({ length: 8 }, (_, i) => ({
      name: `Link ${i + 1}`,
      url: `https://example${i + 1}.com`,
    }));

    const html = ReactDOMServer.renderToStaticMarkup(<ProfileSocialLinks links={links} />);
    expect(html).toContain('Link 1');
    expect(html).toContain('Link 5');
    expect(html).not.toContain('Link 6');
  });
});
