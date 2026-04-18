/**
 * derivePlayerId — pure helper that converts an Ed25519 public key into a
 * stable, network-addressable `pid_<base58>` string.
 *
 * Why derive from the public key directly:
 *   - The id and the verification key are inherently linked, so the
 *     server can never accept a token whose `playerId` doesn't match the
 *     embedded `publicKey` (cf. `verifyPlayerToken`).
 *   - The id is deterministic across sessions, machines, and restarts —
 *     no central directory is required.
 *
 * Encoding choice:
 *   - Base58 (Bitcoin alphabet) for URL-safe, double-click-selectable
 *     ids without `+/=` punctuation.
 *   - First 20 bytes of the public key (160 bits), which gives a >2^80
 *     collision resistance — far more than enough for player ids and
 *     short enough to fit in logs / UI.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 */

/** Bitcoin / IPFS base58 alphabet — no 0/O/I/l ambiguity. */
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** First N bytes of the public key used as the id payload. */
const PLAYER_ID_BYTES = 20;

/** All player ids start with this prefix so they're greppable in logs. */
export const PLAYER_ID_PREFIX = 'pid_';

/**
 * Encode a Uint8Array as base58. Standard "scan-from-MSB" big-int
 * algorithm — small enough that we don't pull in a dependency.
 */
function toBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  // Count leading zero bytes — each becomes a leading '1' in the output.
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros += 1;
  }

  // Build the big-integer value, then divmod by 58 repeatedly.
  // Use `BigInt(n)` (function form) instead of `0n` literals so this
  // file compiles under the project's `target: es5` tsconfig — same
  // pattern IdentityService uses for friend-code encoding.
  let value = BigInt(0);
  const eight = BigInt(8);
  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << eight) | BigInt(bytes[i]);
  }

  const out: string[] = [];
  const base = BigInt(58);
  const zero = BigInt(0);
  while (value > zero) {
    const rem = Number(value % base);
    out.push(BASE58_ALPHABET[rem]);
    value = value / base;
  }
  for (let i = 0; i < leadingZeros; i += 1) {
    out.push(BASE58_ALPHABET[0]);
  }
  return out.reverse().join('');
}

/**
 * Derive the stable player id from raw Ed25519 public key bytes.
 * Throws if the input is too short (defensive — Ed25519 public keys are
 * always 32 bytes, but we tolerate slightly larger inputs from PKCS8
 * export blobs).
 */
export function derivePlayerId(publicKeyBytes: Uint8Array): string {
  if (publicKeyBytes.length < PLAYER_ID_BYTES) {
    throw new Error(
      `derivePlayerId: public key too short (${publicKeyBytes.length} < ${PLAYER_ID_BYTES})`,
    );
  }
  const slice = publicKeyBytes.slice(0, PLAYER_ID_BYTES);
  return `${PLAYER_ID_PREFIX}${toBase58(slice)}`;
}

/**
 * Cheap structural check used by zod schemas + REST input validation.
 * Doesn't verify the bytes round-trip — only that the shape matches.
 */
export function isPlayerIdShape(s: string): boolean {
  if (!s.startsWith(PLAYER_ID_PREFIX)) return false;
  const tail = s.slice(PLAYER_ID_PREFIX.length);
  if (tail.length === 0) return false;
  for (const ch of tail) {
    if (BASE58_ALPHABET.indexOf(ch) === -1) return false;
  }
  return true;
}
