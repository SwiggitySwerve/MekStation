import { isPlayerIdShape } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import {
  decodeTokenFromWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';

import {
  clearCoopCampaignToken,
  readCoopCampaignToken,
  storeCoopCampaignToken,
} from './coopCampaignAuthTokenStore';

/** Browser request adapter: credentials remain request-local, never persisted. */
export type LocalSeatId = 'local-seat-1' | 'local-seat-2';
export interface ILocalSeatPublic {
  seatId: LocalSeatId;
  status: 'unprovisioned' | 'active' | 'revoked';
  label: string | null;
  playerId: string | null;
  generation: number;
  lockedUntil: string | null;
}
export interface ILocalSeatWriteOutcome {
  generation: number;
  replayed: boolean;
  seats: ILocalSeatPublic[];
}
interface IOperatorInput {
  seatId: LocalSeatId;
  expectedGeneration: number;
  operatorPassword: string;
}
export type LocalSeatWriteInput = IOperatorInput &
  (
    | { action: 'provision'; password: string; label: string }
    | { action: 'revoke' }
  );

const messages: Record<string, string> = {
  STORAGE_UNAVAILABLE:
    'Browser storage is unavailable. Sign-in could not be saved or fully removed; restore storage access and explicitly retry.',
  INVALID_CHOICE:
    'Saved credential choice is invalid. Forget it and choose again.',
  INVALID_TOKEN: 'The server returned an invalid or expired sign-in.',
  BINDING_REQUIRED:
    'The joined credential is unavailable. Forget this sign-in and reclaim through co-op entry.',
  IDENTITY_CHANGED:
    'This credential now belongs to a different player. Forget this sign-in and reclaim through co-op entry; the GM must admit the new identity.',
  OPERATOR_DENIED: 'Primary vault password was refused.',
  OPERATOR_IDENTITY_REQUIRED:
    'Create a primary vault identity in Settings first.',
  LOCAL_SEAT_DENIED: 'Local seat credentials were refused.',
  LOCAL_SEAT_THROTTLED: 'Local seat requests are throttled.',
  GENERATION_CONFLICT:
    'Seat changed. Review the refreshed seat and submit again.',
  OPERATION_MISMATCH:
    'Operation was refused. Review the refreshed seat and submit again.',
};
export class LocalSeatRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryAfter?: number,
    readonly currentGeneration?: number,
  ) {
    super(
      (messages[code] ?? 'Local seat request failed.') +
        (retryAfter ? ` Retry after ${retryAfter} seconds.` : ''),
    );
    this.name = 'LocalSeatRequestError';
  }
}

async function request(init: RequestInit): Promise<ILocalSeatWriteOutcome> {
  try {
    const response = await fetch('/api/multiplayer/auth/local-seats', {
      cache: 'no-store',
      credentials: 'same-origin',
      ...init,
    });
    const body = await response.json();
    if (!response.ok) {
      const code = Object.hasOwn(messages, body?.code)
        ? body.code
        : 'REQUEST_FAILED';
      const retry = Number(response.headers.get('Retry-After'));
      throw new LocalSeatRequestError(
        response.status,
        code,
        response.status === 429 && Number.isSafeInteger(retry) && retry > 0
          ? retry
          : undefined,
        code === 'GENERATION_CONFLICT' &&
          Number.isSafeInteger(body.currentGeneration) &&
          body.currentGeneration >= 0
          ? body.currentGeneration
          : undefined,
      );
    }
    return body as ILocalSeatWriteOutcome;
  } catch (error) {
    if (error instanceof LocalSeatRequestError) throw error;
    throw new LocalSeatRequestError(0, 'REQUEST_FAILED');
  }
}
export async function listLocalSeats(): Promise<ILocalSeatPublic[]> {
  return (await request({ method: 'GET' })).seats;
}
export function writeLocalSeat(
  input: LocalSeatWriteInput,
): Promise<ILocalSeatWriteOutcome> {
  return request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, operationId: crypto.randomUUID() }),
  });
}

/** Public choices only. Passwords and private keys never enter either store. */
export type CoopCredentialChoice = 'primary' | 'seat1' | 'seat2';
export interface ICoopCredentialBinding {
  matchId: string;
  choice: CoopCredentialChoice;
  playerId: string;
}
export interface IMintedCoopCredential {
  wireToken: string;
  token: IPlayerToken;
  displayName: string;
}
const CHOICE_KEY = 'mekstation.coopCredential.choice';
const BINDING_PREFIX = 'mekstation.coopCredential.joined.';
export const RENEWAL_WINDOW_MS = 4 * 60 * 1000;

export function isCoopCredentialChoice(
  value: unknown,
): value is CoopCredentialChoice {
  return value === 'primary' || value === 'seat1' || value === 'seat2';
}

function storageOperation<T>(operation: () => T): T {
  try {
    if (typeof window === 'undefined') throw new Error();
    return operation();
  } catch (error) {
    if (error instanceof LocalSeatRequestError) throw error;
    throw new LocalSeatRequestError(0, 'STORAGE_UNAVAILABLE');
  }
}

export function readCoopCredentialChoice(): CoopCredentialChoice {
  return storageOperation(() => {
    const raw = window.localStorage.getItem(CHOICE_KEY);
    if (raw === null) return 'primary';
    if (!isCoopCredentialChoice(raw))
      throw new LocalSeatRequestError(0, 'INVALID_CHOICE');
    return raw;
  });
}

export function writeCoopCredentialChoice(choice: CoopCredentialChoice): void {
  if (!isCoopCredentialChoice(choice))
    throw new LocalSeatRequestError(0, 'INVALID_CHOICE');
  storageOperation(() => window.localStorage.setItem(CHOICE_KEY, choice));
}

function bindingKey(matchId: string): string {
  if (!matchId) throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
  return `${BINDING_PREFIX}${matchId}`;
}

export function readRememberedCoopCredential(
  matchId: string,
): ICoopCredentialBinding {
  return storageOperation(() => {
    const raw = window.sessionStorage.getItem(bindingKey(matchId));
    let value: unknown;
    try {
      value = raw === null ? null : JSON.parse(raw);
    } catch {
      throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
    }
    if (!value || typeof value !== 'object')
      throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
    const binding = value as Record<string, unknown>;
    if (
      Object.keys(binding).length !== 3 ||
      binding.matchId !== matchId ||
      !isCoopCredentialChoice(binding.choice) ||
      typeof binding.playerId !== 'string' ||
      !isPlayerIdShape(binding.playerId)
    )
      throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
    return { matchId, choice: binding.choice, playerId: binding.playerId };
  });
}

/** Call after the existing per-match bearer store; never infer from next-join choice. */
export function rememberCoopCredential(
  matchId: string,
  choice: CoopCredentialChoice,
  playerId: string,
): void {
  if (!isCoopCredentialChoice(choice) || !isPlayerIdShape(playerId))
    throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
  storageOperation(() => {
    const stored = readCoopCampaignToken(matchId);
    const decoded = stored && decodeTokenFromWire(stored.wireToken);
    if (
      !stored ||
      stored.playerId !== playerId ||
      decoded?.playerId !== playerId
    )
      throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
    window.sessionStorage.setItem(
      bindingKey(matchId),
      JSON.stringify({ matchId, choice, playerId }),
    );
  });
}

/** Best effort across all keys; report any failure instead of claiming removal. */
export function forgetCoopCredential(matchId?: string): void {
  let failed = false;
  const removals = [() => window.localStorage.removeItem(CHOICE_KEY)];
  if (matchId)
    removals.push(
      () => window.sessionStorage.removeItem(bindingKey(matchId)),
      () => clearCoopCampaignToken(matchId),
    );
  for (const remove of removals) {
    try {
      storageOperation(remove);
    } catch {
      failed = true;
    }
  }
  if (failed) throw new LocalSeatRequestError(0, 'STORAGE_UNAVAILABLE');
}

/** One request per explicit submit; no retry, no response/error text reflection. */
export async function mintCoopCredential(
  choice: CoopCredentialChoice,
  password: string,
): Promise<IMintedCoopCredential> {
  if (!isCoopCredentialChoice(choice))
    throw new LocalSeatRequestError(0, 'INVALID_CHOICE');
  if (!password || password.length > 512)
    throw new LocalSeatRequestError(401, 'LOCAL_SEAT_DENIED');
  try {
    const response = await fetch(
      choice === 'primary'
        ? '/api/multiplayer/auth/token'
        : '/api/multiplayer/auth/local-seats',
      {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          choice === 'primary'
            ? { password }
            : {
                action: 'mint',
                seatId: choice === 'seat1' ? 'local-seat-1' : 'local-seat-2',
                password,
              },
        ),
      },
    );
    if (!response.ok) {
      const retry = Number(response.headers.get('Retry-After'));
      throw new LocalSeatRequestError(
        response.status,
        response.status === 401
          ? 'LOCAL_SEAT_DENIED'
          : response.status === 429
            ? 'LOCAL_SEAT_THROTTLED'
            : 'REQUEST_FAILED',
        response.status === 429 && Number.isSafeInteger(retry) && retry > 0
          ? retry
          : undefined,
      );
    }
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object')
      throw new LocalSeatRequestError(502, 'INVALID_TOKEN');
    const body = data as Record<string, unknown>;
    const token =
      typeof body.token === 'string' ? decodeTokenFromWire(body.token) : null;
    const issued = Date.parse(token?.issuedAt ?? '');
    const expires = Date.parse(token?.expiresAt ?? '');
    if (
      !token ||
      token.playerId !== body.playerId ||
      token.expiresAt !== body.expiresAt ||
      !Number.isFinite(issued) ||
      !Number.isFinite(expires) ||
      issued > Date.now() + 10_000 ||
      expires <= Date.now() ||
      expires <= issued ||
      expires - issued > (choice === 'primary' ? 6 : 1) * 60 * 60 * 1000 ||
      token.scope !== undefined ||
      typeof body.token !== 'string' ||
      typeof body.displayName !== 'string' ||
      !body.displayName.trim() ||
      body.displayName.length > 64
    )
      throw new LocalSeatRequestError(502, 'INVALID_TOKEN');
    return { wireToken: body.token, token, displayName: body.displayName };
  } catch (error) {
    if (error instanceof LocalSeatRequestError) throw error;
    throw new LocalSeatRequestError(0, 'REQUEST_FAILED');
  } finally {
    password = '';
  }
}

/** Public render snapshot only; bearer stays out of React state. */
export function readCoopCredentialStatus(
  matchId: string,
): ICoopCredentialBinding & { expiresAt: number } {
  return storageOperation(() => {
    const binding = readRememberedCoopCredential(matchId);
    const stored = readCoopCampaignToken(matchId);
    const token = stored && decodeTokenFromWire(stored.wireToken);
    const expiresAt = Date.parse(token?.expiresAt ?? '');
    if (
      !stored ||
      !token ||
      !Number.isFinite(expiresAt) ||
      stored.playerId !== binding.playerId ||
      token.playerId !== binding.playerId
    )
      throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
    return { ...binding, expiresAt };
  });
}

/** Recheck the match's public binding after minting before replacing its bearer. */
export function replaceCoopCredential(
  expected: ICoopCredentialBinding,
  minted: IMintedCoopCredential,
): void {
  storageOperation(() => {
    const wire = decodeTokenFromWire(minted.wireToken);
    const expiresAt = Date.parse(wire?.expiresAt ?? '');
    if (
      !wire ||
      wire.playerId !== minted.token.playerId ||
      wire.expiresAt !== minted.token.expiresAt ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    )
      throw new LocalSeatRequestError(0, 'INVALID_TOKEN');
    const current = readCoopCredentialStatus(expected.matchId);
    if (
      current.choice !== expected.choice ||
      current.playerId !== expected.playerId ||
      minted.token.playerId !== expected.playerId
    )
      throw new LocalSeatRequestError(0, 'IDENTITY_CHANGED');
    const stored = readCoopCampaignToken(expected.matchId);
    if (!stored) throw new LocalSeatRequestError(0, 'BINDING_REQUIRED');
    storeCoopCampaignToken({
      ...stored,
      wireToken: minted.wireToken,
      displayName: minted.displayName,
    });
  });
}
