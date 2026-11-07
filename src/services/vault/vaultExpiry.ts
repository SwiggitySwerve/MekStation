/** Vault expiry rules; see vault-sharing.rules.md. */

// SQLite returns NULL for an unparseable date, so only a parsed future
// instant (or an explicitly unlimited NULL expiry) grants access.
export const VALID_VAULT_EXPIRY_SQL =
  '(expires_at IS NULL OR julianday(expires_at) > julianday(?))';

function parseVaultExpiry(expiresAt: string | null): Date | null {
  if (expiresAt === null) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid expiry date format');
  }
  return date;
}

export function normalizeVaultExpiry(expiresAt: string | null): string | null {
  return parseVaultExpiry(expiresAt)?.toISOString() ?? null;
}

export function isVaultExpiryValid(
  expiresAt: string | null,
  now = Date.now(),
): boolean {
  try {
    const date = parseVaultExpiry(expiresAt);
    return date === null || date.getTime() > now;
  } catch {
    // Corrupt persisted values must never become unlimited access.
    return false;
  }
}
