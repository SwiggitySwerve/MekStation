/**
 * Tests for derivePlayerId — proves it's deterministic, prefixed, and
 * sensitive to key bytes.
 */

import {
  derivePlayerId,
  isPlayerIdShape,
  PLAYER_ID_PREFIX,
} from '../playerIdFromPublicKey';

function makeKey(seed: number): Uint8Array {
  // Deterministic 32-byte "key" — not cryptographically meaningful, just
  // bytes for the encoder to chew on.
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = (seed * (i + 1)) & 0xff;
  }
  return bytes;
}

describe('derivePlayerId', () => {
  it('starts with the pid_ prefix', () => {
    const id = derivePlayerId(makeKey(7));
    expect(id.startsWith(PLAYER_ID_PREFIX)).toBe(true);
  });

  it('is deterministic for the same input', () => {
    const a = derivePlayerId(makeKey(123));
    const b = derivePlayerId(makeKey(123));
    expect(a).toBe(b);
  });

  it('produces different ids for different keys', () => {
    const a = derivePlayerId(makeKey(1));
    const b = derivePlayerId(makeKey(2));
    expect(a).not.toBe(b);
  });

  it('throws on under-length input', () => {
    expect(() => derivePlayerId(new Uint8Array(5))).toThrow();
  });

  it('isPlayerIdShape accepts derived ids', () => {
    const id = derivePlayerId(makeKey(42));
    expect(isPlayerIdShape(id)).toBe(true);
  });

  it('isPlayerIdShape rejects malformed strings', () => {
    expect(isPlayerIdShape('')).toBe(false);
    expect(isPlayerIdShape('pid_')).toBe(false);
    expect(isPlayerIdShape('p_abc')).toBe(false);
    // 0/O/I/l are NOT in the base58 alphabet — must be rejected.
    expect(isPlayerIdShape('pid_0OIl')).toBe(false);
  });
});
