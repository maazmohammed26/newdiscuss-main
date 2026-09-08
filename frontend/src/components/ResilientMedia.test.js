import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResilientMedia from './ResilientMedia';

describe('ResilientMedia Component', () => {
  it('renders img element for remote media source', () => {
    const html = renderToStaticMarkup(
      <ResilientMedia
        src="https://example.com/sample.jpg"
        alt="Valid sample"
      />
    );

    expect(html).toContain('<img');
    expect(html).toContain('sample.jpg');
    expect(html).toContain('aspect-square');
  });

  it('renders clean unavailable placeholder when src is missing or empty', () => {
    const html = renderToStaticMarkup(
      <ResilientMedia
        src=""
        alt="Empty test"
      />
    );

    expect(html).toContain('Media unavailable');
    expect(html).toContain('aspect-square');
    expect(html).not.toContain('<img');
  });
});
