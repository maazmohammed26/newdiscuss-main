import React from 'react';
import ReactDOMServer from 'react-dom/server';
import MediaUpload from './MediaUpload';

describe('MediaUpload Universal Trigger', () => {
  it('renders the compact upload trigger button with accessible label for image', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<MediaUpload type="image" />);
    expect(html).toContain('add-media-trigger');
    expect(html).toContain('Add media');
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/*"');
  });

  it('renders the compact upload trigger button with accessible label for video', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<MediaUpload type="video" />);
    expect(html).toContain('add-media-trigger');
    expect(html).toContain('Add video');
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="video/*"');
  });

  it('renders disabled state with custom disabled message when disabled', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <MediaUpload disabled={true} disabledMessage="Upload limit reached" />
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('Upload limit reached');
  });
});
