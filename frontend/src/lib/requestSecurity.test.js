const { isAllowedOrigin } = require('../../server/requestSecurity');

describe('server request origin validation', () => {
  it.each([
    [undefined, 'www.discussit.in'],
    ['null', 'www.discussit.in'],
    ['file://', 'www.discussit.in'],
    ['capacitor://localhost', 'www.discussit.in'],
    ['https://discussit.in', 'www.discussit.in'],
    ['https://www.discussit.in', 'discussit.in'],
    ['https://newdiscuss-main.vercel.app', 'newdiscuss-main.vercel.app'],
  ])('allows supported web and native origin %s', (origin, host) => {
    expect(isAllowedOrigin(origin, host)).toBe(true);
  });

  it.each([
    ['https://attacker.example', 'www.discussit.in'],
    ['not a url', 'www.discussit.in'],
  ])('rejects untrusted origin %s', (origin, host) => {
    expect(isAllowedOrigin(origin, host)).toBe(false);
  });
});

