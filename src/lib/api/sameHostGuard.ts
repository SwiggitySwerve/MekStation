/**
 * Same-host request guard: the one owner of the Host, Origin and
 * Sec-Fetch-Site rule for the loopback API and the WebSocket upgrade.
 *
 * Pure: it reads header values and returns a verdict. `server.js` calls it
 * once in front of Next (every `/api` request) and in front of every
 * upgrade; the credential routes call it again so a direct handler call
 * (`next dev`, unit tests) refuses before it parses a body or runs a KDF.
 *
 * The rule is the one `local-seats` shipped with, unchanged:
 *  - Host is a literal loopback authority with an optional valid port
 *    (no DNS name, so a rebinding page cannot present one);
 *  - Origin is absent, or equals `http(s)://<Host>`;
 *  - Sec-Fetch-Site is absent, `same-origin` or `none`.
 * Forwarded headers confer no authority. A request with no Origin and no
 * fetch metadata (curl, Node, Playwright `request`, Electron main) is
 * admitted by design: the guard stops browser-mediated attacks only.
 *
 * @spec openspec/specs/multiplayer-server/spec.md
 */

import type { IncomingHttpHeaders } from 'node:http';

export type SameHostRefusal = 'host' | 'origin' | 'fetch-site';

export type SameHostVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SameHostRefusal };

/** Body text for a refusal written by the entry guard. */
export const SAME_HOST_REFUSAL_ERROR = 'Same-host requests only';

const LOOPBACK_AUTHORITY =
  /^(localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?$/;

/** Apply the Host, Origin and Sec-Fetch-Site rule to one request's headers. */
export function evaluateSameHost(
  headers: IncomingHttpHeaders,
): SameHostVerdict {
  const host = headers.host;
  if (typeof host !== 'string') return { ok: false, reason: 'host' };
  const authority = LOOPBACK_AUTHORITY.exec(host);
  if (
    !authority ||
    (authority[2] && (Number(authority[2]) < 1 || Number(authority[2]) > 65535))
  ) {
    return { ok: false, reason: 'host' };
  }
  const origin = headers.origin;
  if (
    origin !== undefined &&
    origin !== `http://${host}` &&
    origin !== `https://${host}`
  ) {
    return { ok: false, reason: 'origin' };
  }
  const site = headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin' && site !== 'none') {
    return { ok: false, reason: 'fetch-site' };
  }
  return { ok: true };
}

export function isSameHostRequest(req: {
  readonly headers: IncomingHttpHeaders;
}): boolean {
  return evaluateSameHost(req.headers).ok;
}

/**
 * Write the 403 for a request that fails the rule. Returns true when it
 * refused, so a handler reads `if (rejectUnlessSameHost(req, res)) return;`.
 */
export function rejectUnlessSameHost(
  req: { readonly headers: IncomingHttpHeaders },
  res: {
    status(code: number): { json(body: { error: string }): unknown };
  },
  error: string = SAME_HOST_REFUSAL_ERROR,
): boolean {
  if (isSameHostRequest(req)) return false;
  res.status(403).json({ error });
  return true;
}

/** The path of a request target: no query, fragment or absolute-form origin. */
function targetPath(target: string): string {
  return target
    .replace(/[?#][\s\S]*$/, '')
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '');
}

/** Decode a segment up to three times, or null if it is malformed. */
function decodeSegment(segment: string): string | null {
  let value = segment;
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      return null;
    }
  }
  return value;
}

/**
 * Recognise an API prefix without letting decoded parameter content erase it.
 * Apply this to both the raw path and Next's URL-parsed pathname: Next matches
 * dynamic routes against the dot-resolved, still-encoded pathname and decodes
 * their parameters afterwards.
 */
function leadsWithApiSegment(target: string): boolean {
  const first = targetPath(target)
    .replace(/\\/g, '/')
    .split('/')
    .find((segment) => segment !== '');
  const name = first === undefined ? '' : decodeSegment(first);
  return name === null || name.toLowerCase() === 'api';
}

/** Preserve the existing conservative decoded reading, or null if malformed. */
function routedPath(target: string): string | null {
  let path = targetPath(target);
  for (let pass = 0; pass < 3; pass += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return null;
    }
    if (decoded === path) break;
    path = decoded;
  }
  const segments: string[] = [];
  for (const segment of path.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return `/${segments.join('/')}`.toLowerCase();
}

/** A decoded path under `/api`, or one that could not be decoded. */
function isApiPath(path: string | null): boolean {
  return path === null || path === '/api' || path.startsWith('/api/');
}

/**
 * Whether a raw request target addresses an API route. Errs toward true:
 * a target that cannot be decoded is guarded, and encoded, doubled-slash,
 * dot-segment, backslash and upper-case spellings of `/api` are guarded.
 * Any reading suffices: the fully decoded target, the decoded URL-parsed
 * pathname, the raw prefix, or the URL-parsed prefix. The decoded pathname
 * reading over-approximates a static-route lookup that decodes the whole
 * pathname; built Next 16.2.11 answers those spellings with its 404 page, so
 * it guards against routing differences, not a reproduced bypass. Parameter
 * content cannot undo a prefix recognised by another reading.
 */
export function isApiRequestTarget(target: string | undefined): boolean {
  const raw = target ?? '/';
  let pathname: string;
  try {
    // Collapse leading slashes so `//x` is not read as an authority.
    pathname = new URL(`http://n${targetPath(raw).replace(/^\/+/, '/')}`)
      .pathname;
  } catch {
    return true;
  }
  return (
    isApiPath(routedPath(raw)) ||
    isApiPath(routedPath(pathname)) ||
    leadsWithApiSegment(raw) ||
    leadsWithApiSegment(pathname)
  );
}

/**
 * The entry decision for `server.js`: every upgrade, and every HTTP request
 * addressed to an API route, must satisfy the same-host rule.
 */
export function evaluateEntryRequest(input: {
  readonly target: string | undefined;
  readonly headers: IncomingHttpHeaders;
  readonly isUpgrade: boolean;
}): SameHostVerdict {
  if (!input.isUpgrade && !isApiRequestTarget(input.target))
    return { ok: true };
  return evaluateSameHost(input.headers);
}
