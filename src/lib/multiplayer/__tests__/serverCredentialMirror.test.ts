/**
 * `server.js` carries an inlined mirror of the credential protocol
 * (umbrella task 6.3). It is CommonJS at the repo root and cannot
 * import the TypeScript module, so the constants and the decode are
 * duplicated — and a duplicate can drift.
 *
 * Drift here is silent and total: the client would offer
 * `mekstation.token.…` and the server would look for something else,
 * so every upgrade would fail authentication with a token that is
 * perfectly valid. This reads both files and refuses to let the two
 * disagree.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  WS_CREDENTIAL_PREFIX,
  WS_PROTOCOL_VERSION,
} from '../socketCredentialProtocol';

const repoRoot = path.resolve(__dirname, '../../../..');
// Line endings are normalised: the repo checks out CRLF on Windows and
// LF elsewhere, and a mirror test that passes on one platform only is
// worse than none.
const serverSource = normalizeEol(
  fs.readFileSync(path.join(repoRoot, 'server.js'), 'utf8'),
);

/** Strip carriage returns so the assertions below are platform-blind. */
function normalizeEol(source: string): string {
  return source.split('\r\n').join('\n');
}

describe('server.js credential mirror', () => {
  it('declares the same subprotocol names as the module', () => {
    expect(serverSource).toContain(
      `const WS_PROTOCOL_VERSION = '${WS_PROTOCOL_VERSION}';`,
    );
    expect(serverSource).toContain(
      `const WS_CREDENTIAL_PREFIX = '${WS_CREDENTIAL_PREFIX}';`,
    );
  });

  it('reads the credential from the header, not the query string', () => {
    expect(serverSource).toContain(
      "readCredentialProtocol(\n          req.headers['sec-websocket-protocol'],\n        )",
    );
    // The one surviving mention of the query token is the REFUSAL. If
    // this assertion ever fails because the token is read from the
    // query again, the credential is back in the URL.
    expect(serverSource).toContain('reason=token-in-url');
  });

  it('echoes only the version marker back to the client', () => {
    // Selecting the credential subprotocol would put the token into a
    // response header, undoing the reason it left the URL.
    expect(serverSource).toContain(
      'protocols.has(WS_PROTOCOL_VERSION) ? WS_PROTOCOL_VERSION : false',
    );
  });

  it('threads expectedScope into the existing verifyWireToken site', () => {
    expect(serverSource).toContain(
      "channel === 'campaign'\n          ? { kind: 'campaign-session', id: matchId }\n          : { kind: 'match', id: matchId }",
    );
    expect(serverSource).toContain(
      'verifyWireToken(token, Date.now(), expectedScope)',
    );
  });
});
