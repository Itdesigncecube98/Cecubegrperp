import { getClientIp } from '../serverAudit';

function makeRequest(headers) {
  return { headers: new Headers(headers) };
}

describe('getClientIp', () => {
  test('prefers the hosting provider client IP header', () => {
    expect(getClientIp(makeRequest({
      'cf-connecting-ip': '198.51.100.10',
      'x-real-ip': '198.51.100.20',
    }))).toBe('198.51.100.10');
  });

  test('falls back to the forwarded client IP when the proxy IP is loopback', () => {
    expect(getClientIp(makeRequest({
      'x-real-ip': '127.0.0.1',
      'x-forwarded-for': '198.51.100.10, 10.0.0.5',
    }))).toBe('198.51.100.10');
  });

  test('prefers a valid real IP over a forwarded chain', () => {
    expect(getClientIp(makeRequest({
      'x-real-ip': '198.51.100.20',
      'x-forwarded-for': '203.0.113.99',
    }))).toBe('198.51.100.20');
  });

  test('does not report loopback as the visitor IP', () => {
    expect(getClientIp(makeRequest({
      'x-real-ip': '127.0.0.1',
      'x-forwarded-for': '::1',
    }))).toBe('unknown');
  });
});
