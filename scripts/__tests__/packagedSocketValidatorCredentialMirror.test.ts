/**
 * `scripts/validate-multiplayer-packaged-socket.mjs` is a THIRD copy of
 * the socket credential wiring, after `src/lib/multiplayer/client.ts`
 * (the canonical consumer) and `server.js` (pinned by
 * `src/lib/multiplayer/__tests__/serverCredentialMirror.test.ts`).
 *
 * It is a bare-node ESM script with no TypeScript loader, so it cannot
 * import `socketCredentialProtocol.ts` — the same constraint that forced
 * the `server.js` mirror. A duplicate can drift, and this one did: PR
 * #1357 moved every first-party caller off the URL carrier and made the
 * URL carrier a hard 400, but missed this file. The validator carried
 * the stale `&token=` carrier for 21 days and every packaged-socket run
 * — camp-00 receipts and the desktop packaged-Electron smoke alike —
 * died on `Unexpected server response: 400`. Nothing read this file, so
 * nothing caught it.
 *
 * This test reads it and refuses to let the copies disagree again.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  WS_CREDENTIAL_PREFIX,
  WS_PROTOCOL_VERSION,
  toBase64Url,
} from '@/lib/multiplayer/socketCredentialProtocol';

const repoRoot = path.resolve(__dirname, '..', '..');
const validatorPath = path.join(
  repoRoot,
  'scripts',
  'validate-multiplayer-packaged-socket.mjs',
);
// Line endings are normalised: the repo checks out CRLF on Windows and
// LF elsewhere, and a mirror test that passes on one platform only is
// worse than none.
const validatorSource = fs
  .readFileSync(validatorPath, 'utf8')
  .split('\r\n')
  .join('\n');

/**
 * Lift the validator's own `toBase64Url` body out of the source and
 * make it callable, so the parity assertion below compares BEHAVIOUR
 * rather than two spellings of the same regex chain. A transform drift
 * would present as a 401 (token decodes to garbage), not the 400 this
 * file was written for, so text equality is not enough.
 */
function extractMirroredToBase64Url(): (base64: string) => string {
  const match = validatorSource.match(
    /function toBase64Url\(base64\) \{\n([\s\S]*?)\n\}/,
  );
  if (!match) {
    throw new Error(
      'validate-multiplayer-packaged-socket.mjs declares no `function toBase64Url(base64)` mirror',
    );
  }
  return new Function('base64', match[1]) as (base64: string) => string;
}

describe('packaged-socket validator credential mirror', () => {
  it('declares the same subprotocol names as the module', () => {
    expect(validatorSource).toContain(
      `const WS_PROTOCOL_VERSION = '${WS_PROTOCOL_VERSION}';`,
    );
    expect(validatorSource).toContain(
      `const WS_CREDENTIAL_PREFIX = '${WS_CREDENTIAL_PREFIX}';`,
    );
  });

  it('encodes the credential byte-identically to the module', () => {
    const mirrored = extractMirroredToBase64Url();
    // Fixtures chosen to exercise every character the base64url
    // transform touches: `+`, `/`, and one and two trailing `=` pads.
    // Real wire tokens are base64 of a JSON blob, so all three occur.
    const fixtures = [
      '',
      'abc',
      'a+b/c',
      'a+b/c=',
      'a+b/c==',
      '++//++//',
      Buffer.from(
        JSON.stringify({ v: 1, pid: 'pid_abc', exp: 1789 }),
        'utf8',
      ).toString('base64'),
    ];
    for (const fixture of fixtures) {
      expect(mirrored(fixture)).toBe(toBase64Url(fixture));
    }
  });

  it('offers the credential on the subprotocol, not in the socket URL', () => {
    // The defect in one assertion. `&token=` / `?token=` / `token=${`
    // are the URL-construction shapes; the SessionJoin payload's
    // `token: wireToken` property is a different thing and must keep
    // working.
    expect(validatorSource).not.toMatch(/[?&]token=/);
    expect(validatorSource).not.toMatch(/token=\$\{/);
    // And the carrier that replaced it is actually handed to `ws`.
    expect(validatorSource).toContain(
      'new WebSocket(url, credentialProtocols(wireToken)',
    );
  });

  it('keeps a pre-await replay rejection observable', () => {
    // `replayPromise` is constructed at :278 but not awaited until
    // :396. Its `ws.once('error')` timer fires before the awaited
    // open-promise's, so without this guard a handshake failure becomes
    // an unhandled rejection that kills the process — skipping both
    // `finally` blocks, which is why a failed run left `.next` behind
    // and printed a bare throw instead of the diagnostic.
    expect(validatorSource).toContain('replayPromise.catch(() => {});');
  });
});
