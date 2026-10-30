/**
 * API-SAME-HOST-1: the one Host, Origin and Sec-Fetch-Site rule.
 *
 * The rule rows are the ones `local-seats` shipped with
 * (localSeatCredentials.test.ts) and must stay true after the rule moved
 * here. The request-target rows pin which paths the entry guard covers.
 */

import {
  evaluateEntryRequest,
  evaluateSameHost,
  isApiRequestTarget,
  isSameHostRequest,
  rejectUnlessSameHost,
} from '@/lib/api/sameHostGuard';

const LOOPBACK = { host: '127.0.0.1:3001' };

describe('evaluateSameHost', () => {
  it.each([
    '127.0.0.1:3001',
    'localhost:3600',
    '[::1]:3001',
    'localhost',
    '127.0.0.1',
    '[::1]',
    '127.0.0.1:1',
    '127.0.0.1:65535',
  ])('admits the literal loopback host %s', (host) => {
    expect(evaluateSameHost({ host })).toEqual({ ok: true });
    expect(
      evaluateSameHost({
        host,
        origin: `http://${host}`,
        'sec-fetch-site': 'same-origin',
      }),
    ).toEqual({ ok: true });
    expect(evaluateSameHost({ host, origin: `https://${host}` })).toEqual({
      ok: true,
    });
  });

  it.each([
    ['a non-loopback host', { host: 'evil.example:3001' }],
    [
      'a rebinding host with a matching origin',
      { host: 'evil.example:3001', origin: 'http://evil.example:3001' },
    ],
    ['a resolving DNS alias', { host: '127.0.0.1.nip.io:3001' }],
    ['a loopback prefix', { host: 'localhost.evil.example' }],
    ['a loopback suffix', { host: 'evil-localhost' }],
    ['userinfo smuggling', { host: 'localhost@evil.example' }],
    ['an unbracketed IPv6 literal', { host: '::1' }],
    ['another loopback address', { host: '127.0.0.2:3001' }],
    ['the unspecified address', { host: '0.0.0.0:3001' }],
    ['port 0', { host: '127.0.0.1:0' }],
    ['port 65536', { host: '127.0.0.1:65536' }],
    ['an empty port', { host: '127.0.0.1:' }],
    ['a missing host', {}],
    ['a repeated host header', { host: ['localhost', 'evil.example'] }],
  ])('refuses %s as a host failure', (_label, headers) => {
    const verdict = evaluateSameHost(headers as never);
    expect(verdict).toEqual({ ok: false, reason: 'host' });
  });

  it.each([
    ['a cross-site origin', { ...LOOPBACK, origin: 'http://evil.example' }],
    ['the null origin', { ...LOOPBACK, origin: 'null' }],
    ['a different port', { ...LOOPBACK, origin: 'http://127.0.0.1:3002' }],
    [
      'a different loopback spelling',
      { ...LOOPBACK, origin: 'http://localhost:3001' },
    ],
    ['a non-http scheme', { ...LOOPBACK, origin: 'ftp://127.0.0.1:3001' }],
    ['an empty origin', { ...LOOPBACK, origin: '' }],
  ])('refuses %s as an origin failure', (_label, headers) => {
    expect(evaluateSameHost(headers)).toEqual({ ok: false, reason: 'origin' });
  });

  it.each(['cross-site', 'same-site', 'CROSS-SITE', '', 'same-origin, none'])(
    'refuses Sec-Fetch-Site %p as a fetch-site failure',
    (site) => {
      expect(evaluateSameHost({ ...LOOPBACK, 'sec-fetch-site': site })).toEqual(
        { ok: false, reason: 'fetch-site' },
      );
    },
  );

  it('admits requests that carry no Origin and no fetch metadata', () => {
    expect(evaluateSameHost(LOOPBACK)).toEqual({ ok: true });
    expect(evaluateSameHost({ ...LOOPBACK, 'sec-fetch-site': 'none' })).toEqual(
      { ok: true },
    );
  });

  it('gives forwarded headers no authority', () => {
    expect(
      evaluateSameHost({
        host: 'evil.example',
        'x-forwarded-host': '127.0.0.1:3001',
        forwarded: 'host=127.0.0.1:3001',
        'x-forwarded-for': '127.0.0.1',
      }),
    ).toEqual({ ok: false, reason: 'host' });
    expect(
      evaluateSameHost({
        ...LOOPBACK,
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'https',
      }),
    ).toEqual({ ok: true });
  });
});

describe('isSameHostRequest and rejectUnlessSameHost', () => {
  it('answers from the same verdict', () => {
    expect(isSameHostRequest({ headers: LOOPBACK })).toBe(true);
    expect(isSameHostRequest({ headers: { host: 'evil.example' } })).toBe(
      false,
    );
  });

  it('writes a 403 with the supplied text and reports that it refused', () => {
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) };
    expect(
      rejectUnlessSameHost({ headers: { host: 'evil.example' } }, res, 'no'),
    ).toBe(true);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'no' });
  });

  it('writes nothing for a same-host request', () => {
    const res = { status: jest.fn() };
    expect(rejectUnlessSameHost({ headers: LOOPBACK }, res)).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('isApiRequestTarget', () => {
  it.each([
    '/api',
    '/api/',
    '/api/health',
    '/api/vault/share?x=1',
    '/api/units/custom/abc%2Fdef',
    '//api/vault/identity',
    '///api/x',
    '/./api/x',
    '/foo/../api/x',
    '/%61pi/x',
    '/%2561pi/x',
    '/api%2Fx',
    '/API/x',
    '/\\api/x',
    '/api\\x',
    'http://evil.example/api/vault/share',
    '/api/%E0%A4%A',
    '/%',
    // The decoded reading still guards what the raw reading alone would miss.
    '/foo/../api',
    '/foo/../API/x',
    '/x\\..\\api/y',
    '/api%252Fx',
    '/gameplay/%E0%A4%A',
  ])('treats %s as an API route', (target) => {
    expect(isApiRequestTarget(target)).toBe(true);
  });

  // Different URL readings can disagree; any supported API reading is guarded.
  it.each([
    '/..%2fapi',
    '/%2f/API',
    '/%5c/api',
    '/%2fapi',
    '/\\/api/..',
    '/\\/api/%2e%2e',
  ])('guards the conservative API spelling %s', (target) => {
    expect(isApiRequestTarget(target)).toBe(true);
  });

  // F1: Next matches a dynamic route against the still-encoded pathname and
  // decodes the parameter afterwards, so a parameter that decodes to `../..`
  // must not erase the `/api` prefix that routing already used.
  it.each([
    '/api/pilots/%2e%2e%2f%2e%2e',
    '/api/pilots/%2E%2e%2F%2e%2E',
    '/api/pilots/%2e%2e%5c%2e%2e',
    '/api/pilots/%5c..%5c..',
    '/api/pilots/%252e%252e%252f%252e%252e',
    '/api/pilots/%2e%2e%2f%2e%2e?x=1#y',
    '/api/vault/share/abc%2F..%2F..%2F..%2F..%2Fx',
    '/api/campaigns/%2e%2e%2F%2e%2e%2F%2e%2e%2Fx',
    '/api/units/custom/abc/versions/1%2F..%2F..%2F..%2F..%2F..%2F..%2Fx',
    '/api/units/custom/abc/versions/1%5C..%5C..%5Cx',
    '/api/units/custom/abc/revert/1%2F..%2F..%2F..%2F..%2F..%2F..%2Fx',
    '/api/replay-library/%2e%2e/%2e%2e',
    '/%61pi/pilots/%2e%2e%2f%2e%2e',
    '/\\api/pilots/%2e%2e%2f%2e%2e',
    '//api/pilots/%2e%2e%2f%2e%2e',
    '/API/pilots/%2E%2E%2F%2E%2E',
    'http://evil.example/api/pilots/%2e%2e%2f%2e%2e',
  ])('keeps the API prefix of the dynamic-route target %s', (target) => {
    expect(isApiRequestTarget(target)).toBe(true);
  });

  it.each([
    '/x/../api/pilots/%2e%2e%2f%2e%2e',
    '/%2e/api/pilots/%2e%2e%2f%2e%2e',
    '/x/%2e%2e/api/pilots/%2e%2e%2f%2e%2e',
    '/./api/campaigns/%2e%2e%2F%2e%2e%2Fx',
  ])(
    'guards the API pathname after Next resolves dot segments in %s',
    (target) => {
      expect(isApiRequestTarget(target)).toBe(true);
    },
  );

  // N1: a static-route lookup that decoded the whole dot-resolved pathname
  // would land on `/api/...` after a dot segment popped only the encoded
  // segment. Built Next answers these with its 404 page; the guard still
  // refuses them rather than rely on that routing.
  it.each([
    '/a%2fb/../api%2fhealth',
    '/a%2fb/%2e%2e/api%2fhealth',
    '/a%2fb/../api%2fvault%2fidentity',
    '/a%2fb/../api%2fvault%2fsign',
    '/a%2fb/../%61pi%2fhealth',
  ])('guards the decoded static-route spelling %s', (target) => {
    expect(isApiRequestTarget(target)).toBe(true);
  });

  it.each([
    '/',
    '/index',
    '/gameplay/campaigns',
    '/a%2fb/../gameplay%2fcampaigns',
    '/_next/static/chunks/app.js',
    '/_next/webpack-hmr',
    '/apiary',
    '/apis/x',
    '/x/api/y',
    '/__playwright_e2e_ready__?runId=1',
    '/apiary/%2e%2e%2fx',
    '/x/%2e%2e%2f%2e%2e%2fy',
    '/gameplay/campaigns/%2e%2e%2f%2e%2e',
    '/x/%2e%2e/gameplay/campaigns/%2e%2e%2f%2e%2e',
    '/_next/static/chunks/a%2fb.js',
  ])('leaves %s to Next', (target) => {
    expect(isApiRequestTarget(target)).toBe(false);
  });

  it('treats a missing target as the root', () => {
    expect(isApiRequestTarget(undefined)).toBe(false);
  });
});

describe('evaluateEntryRequest', () => {
  const evil = { host: 'evil.example' };

  it('refuses a bad host on an API route and admits the same host elsewhere', () => {
    expect(
      evaluateEntryRequest({
        target: '/api/health',
        headers: evil,
        isUpgrade: false,
      }),
    ).toEqual({ ok: false, reason: 'host' });
    expect(
      evaluateEntryRequest({
        target: '/gameplay',
        headers: evil,
        isUpgrade: false,
      }),
    ).toEqual({ ok: true });
  });

  it('judges every upgrade, whatever its path', () => {
    for (const target of [
      '/api/multiplayer/socket',
      '/_next/webpack-hmr',
      '/x',
    ]) {
      expect(
        evaluateEntryRequest({
          target,
          headers: { ...LOOPBACK, origin: 'http://evil.example' },
          isUpgrade: true,
        }),
      ).toEqual({ ok: false, reason: 'origin' });
    }
  });

  it('admits a same-host API request and a browser upgrade from its own origin', () => {
    expect(
      evaluateEntryRequest({
        target: '/api/health',
        headers: LOOPBACK,
        isUpgrade: false,
      }),
    ).toEqual({ ok: true });
    expect(
      evaluateEntryRequest({
        target: '/api/multiplayer/socket?matchId=m',
        headers: { ...LOOPBACK, origin: 'http://127.0.0.1:3001' },
        isUpgrade: true,
      }),
    ).toEqual({ ok: true });
  });
});
