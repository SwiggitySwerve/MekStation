/**
 * The socket credential leaves the URL (umbrella task 6.3).
 *
 * Two things are proven here: the transform survives a real token
 * round-trip, and the offered subprotocol is legal to put in the
 * header at all. The second matters more than it looks — an illegal
 * subprotocol name does not fail loudly, it fails as a handshake the
 * browser refuses for reasons it will not explain.
 *
 * The `server.js` mirror is pinned separately (`serverCredentialMirror`).
 */

import {
  WS_CREDENTIAL_PREFIX,
  WS_PROTOCOL_VERSION,
  credentialProtocols,
  fromBase64Url,
  readCredentialProtocol,
  toBase64Url,
} from '../socketCredentialProtocol';

// Contains every character standard base64 emits that a subprotocol
// name may not: `+`, `/`, and trailing `=` padding. Its length is a
// real base64 length (a multiple of 4 with padding) - a fixture that
// is not would fail the round-trip for a reason the transform is not
// responsible for.
const AWKWARD_TOKEN = 'ab+c/de+fg/hij==';

describe('socket credential protocol', () => {
  it('round-trips a token containing every base64-only character', () => {
    expect(fromBase64Url(toBase64Url(AWKWARD_TOKEN))).toBe(AWKWARD_TOKEN);
  });

  it('offers a credential legal as an RFC-6455 subprotocol name', () => {
    const [version, credential] = credentialProtocols(AWKWARD_TOKEN);

    expect(version).toBe(WS_PROTOCOL_VERSION);
    // `/` and `=` are not in the RFC-7230 token production a
    // subprotocol name must satisfy. A raw base64 token carries both,
    // which is the whole reason for the transform.
    expect(credential).not.toMatch(/[/=]/);
    expect(credential.startsWith(WS_CREDENTIAL_PREFIX)).toBe(true);
  });

  it('reads the credential back out of a full header value', () => {
    const header = credentialProtocols(AWKWARD_TOKEN).join(', ');

    expect(readCredentialProtocol(header)).toBe(AWKWARD_TOKEN);
  });

  it('treats a header with no credential as unauthenticated', () => {
    // Absent must read as null so the caller refuses. Returning
    // anything truthy here would make an unauthenticated upgrade look
    // like an authenticated one.
    expect(readCredentialProtocol(WS_PROTOCOL_VERSION)).toBeNull();
    expect(readCredentialProtocol(undefined)).toBeNull();
    expect(readCredentialProtocol('')).toBeNull();
    expect(readCredentialProtocol(WS_CREDENTIAL_PREFIX)).toBeNull();
  });
});
