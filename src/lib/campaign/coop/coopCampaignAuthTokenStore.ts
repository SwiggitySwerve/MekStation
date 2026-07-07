export interface ICoopCampaignStoredToken {
  readonly matchId: string;
  readonly playerId: string;
  readonly wireToken: string;
  readonly displayName: string;
}

const STORAGE_PREFIX = 'mekstation.coopCampaign.token.';

function storageKey(matchId: string): string {
  return `${STORAGE_PREFIX}${matchId}`;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage ?? null;
}

export function storeCoopCampaignToken(token: ICoopCampaignStoredToken): void {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(storageKey(token.matchId), JSON.stringify(token));
}

export function readCoopCampaignToken(
  matchId: string | null | undefined,
): ICoopCampaignStoredToken | null {
  if (!matchId) return null;
  const storage = getSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(storageKey(matchId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ICoopCampaignStoredToken>;
    if (
      parsed.matchId === matchId &&
      typeof parsed.playerId === 'string' &&
      typeof parsed.wireToken === 'string' &&
      typeof parsed.displayName === 'string'
    ) {
      return {
        matchId,
        playerId: parsed.playerId,
        wireToken: parsed.wireToken,
        displayName: parsed.displayName,
      };
    }
  } catch {
    // ignore malformed session storage
  }
  storage.removeItem(storageKey(matchId));
  return null;
}

export function clearCoopCampaignToken(matchId: string): void {
  getSessionStorage()?.removeItem(storageKey(matchId));
}
