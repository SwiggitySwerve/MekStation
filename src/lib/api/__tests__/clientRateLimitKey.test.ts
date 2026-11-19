import type { NextApiRequest } from 'next';

import { clientRateLimitKey } from '../security';

function req(
  remoteAddress: string | undefined,
  forwardedFor?: string | string[],
): NextApiRequest {
  return {
    socket: remoteAddress === undefined ? undefined : { remoteAddress },
    headers:
      forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor },
  } as unknown as NextApiRequest;
}

// PARITY-PLAN 1.0.92: X-Forwarded-For is client-supplied, so a network peer
// (for example a client of the container's published port) must not be able to
// rotate it to evade the KDF rate limit.
describe('clientRateLimitKey', () => {
  it('keys a network peer by its socket address and ignores X-Forwarded-For', () => {
    expect(clientRateLimitKey(req('172.17.0.1', '203.0.113.7'), 'r')).toBe(
      'r:172.17.0.1',
    );
    expect(clientRateLimitKey(req('172.17.0.1', '203.0.113.8'), 'r')).toBe(
      'r:172.17.0.1',
    );
    expect(clientRateLimitKey(req('192.168.1.10', ['198.51.100.1']), 'r')).toBe(
      'r:192.168.1.10',
    );
  });

  it('honours X-Forwarded-For from a loopback hop, as before', () => {
    for (const peer of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
      expect(clientRateLimitKey(req(peer, '203.0.113.7, 10.0.0.1'), 'r')).toBe(
        'r:203.0.113.7',
      );
    }
    expect(clientRateLimitKey(req(undefined, '203.0.113.9'), 'r')).toBe(
      'r:203.0.113.9',
    );
  });

  it('falls back to the peer address, then unknown', () => {
    expect(clientRateLimitKey(req('127.0.0.1'), 'r')).toBe('r:127.0.0.1');
    expect(clientRateLimitKey(req(undefined), 'r')).toBe('r:unknown');
  });
});
