/**
 * Carrying the socket credential in the WebSocket subprotocol header
 * instead of the URL.
 *
 * A query string is the worst place for a bearer token: it lands in
 * access logs, proxy logs, and crash reports, none of which are
 * expected to hold secrets. A browser cannot set arbitrary headers on
 * a WebSocket handshake, but it CAN offer subprotocols, and those
 * travel in `Sec-WebSocket-Protocol` - a real header, out of the URL.
 *
 * The client offers two: a plain version marker and the credential.
 * The server echoes ONLY the version marker, so the credential never
 * appears in a response header either.
 *
 * Base64url rather than base64, because RFC 6455 subprotocol names use
 * the RFC 7230 `token` production, which excludes `/` and `=` - both of
 * which standard base64 emits. The transform is on the base64 TEXT, not
 * a second round of encoding, so what the server hands to the verifier
 * is byte-for-byte the wire token the client held.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (6.3)
 */

/** Offered and echoed. Carries no secret. */
export const WS_PROTOCOL_VERSION = 'mekstation.v1';

/** Prefix of the credential-bearing subprotocol. Never echoed. */
export const WS_CREDENTIAL_PREFIX = 'mekstation.token.';

/** Rewrite standard base64 text into the subprotocol-safe alphabet. */
export function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Reverse `toBase64Url`. Padding is restored because some base64
 * decoders reject an unpadded string, and the wire token is handed
 * straight to one.
 */
export function fromBase64Url(base64url: string): string {
  const restored = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = restored.length % 4;
  if (remainder === 0) return restored;
  // A remainder of 1 is not producible by base64 and would decode to
  // garbage; leave it alone so the caller's decoder rejects it rather
  // than silently accepting a padded corruption.
  if (remainder === 1) return restored;
  return restored + '='.repeat(4 - remainder);
}

/**
 * The subprotocol list a client offers. The version marker comes first
 * so a server that only understands the version still has something it
 * can select.
 */
export function credentialProtocols(wireToken: string): string[] {
  return [WS_PROTOCOL_VERSION, WS_CREDENTIAL_PREFIX + toBase64Url(wireToken)];
}

/**
 * Pull the wire token out of a `Sec-WebSocket-Protocol` header value.
 * Returns null when no credential subprotocol was offered - which the
 * caller must treat as "unauthenticated", never as "allow".
 */
export function readCredentialProtocol(
  header: string | undefined | null,
): string | null {
  if (!header) return null;
  for (const raw of header.split(',')) {
    const entry = raw.trim();
    if (!entry.startsWith(WS_CREDENTIAL_PREFIX)) continue;
    const encoded = entry.slice(WS_CREDENTIAL_PREFIX.length);
    if (encoded.length === 0) return null;
    return fromBase64Url(encoded);
  }
  return null;
}
