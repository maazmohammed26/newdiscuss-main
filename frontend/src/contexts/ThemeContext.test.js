import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider, useTheme } from './ThemeContext';

describe('ThemeContext canonical controller', () => {
  beforeEach(() => {
    // Reset mock storage
    const storage = {};
    global.localStorage = {
      getItem: (key) => storage[key] || null,
      setItem: (key, val) => { storage[key] = String(val); },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    };

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('renders ThemeProvider and provides theme, themeMode, and setTheme', () => {
    let capturedContext = null;

    function TestConsumer() {
      capturedContext = useTheme();
      return <div id="theme-output">{capturedContext.theme}</div>;
    }

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(html).toContain('light');
    expect(capturedContext).toBeDefined();
    expect(capturedContext.theme).toBe('light');
    expect(capturedContext.themeMode).toBe('light');
    expect(typeof capturedContext.setTheme).toBe('function');
    expect(typeof capturedContext.changeTheme).toBe('function');
    expect(typeof capturedContext.toggleTheme).toBe('function');

    // Calling setTheme must NOT throw TypeError
    expect(() => {
      capturedContext.setTheme('dark');
    }).not.toThrow();

    expect(() => {
      capturedContext.setTheme('system');
    }).not.toThrow();
  });

  it('initializes from saved localStorage preference', () => {
    localStorage.setItem('discuss_theme', 'dark');
    let capturedContext = null;

    function TestConsumer() {
      capturedContext = useTheme();
      return <div id="theme-output">{capturedContext.theme}</div>;
    }

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(html).toContain('dark');
    expect(capturedContext.theme).toBe('dark');
    expect(capturedContext.themeMode).toBe('dark');
  });

  it('handles system preference without error', () => {
    localStorage.setItem('discuss_theme', 'system');
    let capturedContext = null;

    function TestConsumer() {
      capturedContext = useTheme();
      return <div id="theme-output">{capturedContext.theme}</div>;
    }

    expect(() => {
      renderToStaticMarkup(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    }).not.toThrow();

    expect(capturedContext.themeMode).toBe('system');
    expect(['light', 'dark']).toContain(capturedContext.theme);
  });
});

