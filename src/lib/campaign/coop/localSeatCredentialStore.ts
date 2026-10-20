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
