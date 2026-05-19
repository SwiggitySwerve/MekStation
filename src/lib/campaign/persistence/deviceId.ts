/**
 * Device id
 *
 * Per design D6 / Open-Question resolution: the campaign envelope records
 * which device wrote a snapshot. The identity store does not expose a
 * stable device-scoped id (it is friend-code / public-key scoped), so we
 * mint a persisted UUID once per browser and reuse it.
 *
 * SSR-safe: on the server (no `localStorage`) a stable sentinel is
 * returned so server-side envelope builds never throw.
 *
 * @spec openspec/changes/add-campaign-persistence/design.md (D6, Open Questions)
 */

const DEVICE_ID_STORAGE_KEY = 'mekstation:campaign-device-id';

/** Sentinel returned when no browser storage is available (SSR). */
const SERVER_DEVICE_ID = 'server';

/**
 * Get the stable device id for this browser, minting and persisting a new
 * UUID on first call. Returns the `server` sentinel under SSR.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return SERVER_DEVICE_ID;
  }
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.length > 0) {
      return existing;
    }
    const minted = mintUuid();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, minted);
    return minted;
  } catch {
    // localStorage can throw in private-mode / quota-exceeded — fall back
    // to an ephemeral id rather than failing the save.
    return mintUuid();
  }
}

/**
 * Mint a UUID. Uses `crypto.randomUUID` when available, with a
 * sufficiently-random fallback for older runtimes.
 */
function mintUuid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + two random segments. Not RFC-4122 strict but
  // collision-safe enough for a per-device tag.
  const rand = (): string => Math.random().toString(36).slice(2, 10);
  return `device-${Date.now().toString(36)}-${rand()}-${rand()}`;
}
