/** LSC-1S: operator writes authenticate the primary vault without switching it.
 * Every request, including replay, consumes the route-wide window before KDF. */

import { createHash } from 'node:crypto';

import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';

import { createSingleton } from '../core/createSingleton';
import { getIdentityRepository } from './IdentityRepository';
import {
  encryptWithPassword,
  decryptWithPassword,
  fromBase64,
  generateKeyPair,
  toBase64,
} from './IdentityService';
import {
  LOCAL_SEAT_IDS,
  LocalSeatCredentialRepository,
  type LocalSeatId,
  type LocalSeatWriteResult,
} from './LocalSeatCredentialRepository';

/** Root-recommended defaults pending owner answers (CF-LSC0-15). */
export const LOCAL_SEAT_POLICY = {
  attemptWindowMs: 60_000,
  maxMintAttemptsPerWindow: 10,
  maxOperatorAttemptsPerWindow: 5,
  maxFailures: 5,
  lockoutMs: 60_000,
  defaultTtlMs: 60 * 60 * 1000,
  maxTtlMs: 60 * 60 * 1000,
} as const;

export type LocalSeatErrorCode =
  | 'invalid-credentials'
  | 'operator-denied'
  | 'operator-unavailable'
  | 'throttled'
  | 'generation-conflict'
  | 'operation-mismatch'
  | 'internal-error';

export class LocalSeatCredentialError extends Error {
  constructor(
    readonly code: LocalSeatErrorCode,
    readonly detail: { retryAfterMs?: number; currentGeneration?: number } = {},
  ) {
    super(code);
    this.name = 'LocalSeatCredentialError';
  }
}

/** Public, non-secret seat metadata. */
export interface ILocalSeatPublic {
  readonly seatId: LocalSeatId;
  readonly status: 'unprovisioned' | 'active' | 'revoked';
  readonly label: string | null;
  readonly playerId: string | null;
  readonly generation: number;
  readonly lockedUntil: string | null;
}

export interface IOperatorWrite {
  readonly operatorPassword: string;
  readonly seatId: LocalSeatId;
  readonly expectedGeneration: number;
  readonly operationId: string;
}

export interface ILocalSeatWriteOutcome {
  readonly replayed: boolean;
  readonly seats: ILocalSeatPublic[];
}

export type OperatorVerification = 'ok' | 'denied' | 'missing';

export interface ILocalSeatServiceDeps {
  readonly repository?: LocalSeatCredentialRepository;
  readonly verifyOperatorPassword?: (
    password: string,
  ) => Promise<OperatorVerification>;
  readonly now?: () => number;
}

async function verifyPrimaryVaultPassword(
  password: string,
): Promise<OperatorVerification> {
  const stored = await getIdentityRepository().getActive();
  if (!stored) return 'missing';
  try {
    const key = await decryptWithPassword(stored.encryptedPrivateKey, password);
    key.fill(0);
    return 'ok';
  } catch {
    return 'denied';
  }
}

/** Fixed route-wide window; one instance per guarded route. */
export class AttemptWindow {
  private startMs: number | null = null;
  private count = 0;
  constructor(private readonly max: number) {}
  take(nowMs: number): void {
    if (
      this.startMs === null ||
      nowMs - this.startMs >= LOCAL_SEAT_POLICY.attemptWindowMs
    ) {
      this.startMs = nowMs;
      this.count = 0;
    }
    this.count += 1;
    if (this.count > this.max) {
      throw new LocalSeatCredentialError('throttled', {
        retryAfterMs: this.startMs + LOCAL_SEAT_POLICY.attemptWindowMs - nowMs,
      });
    }
  }
}

export class LocalSeatCredentialService {
  protected readonly repository: LocalSeatCredentialRepository;
  protected readonly now: () => number;
  private readonly verifyOperator: (
    password: string,
  ) => Promise<OperatorVerification>;
  private readonly operatorWindow = new AttemptWindow(
    LOCAL_SEAT_POLICY.maxOperatorAttemptsPerWindow,
  );

  constructor(deps: ILocalSeatServiceDeps = {}) {
    this.repository = deps.repository ?? new LocalSeatCredentialRepository();
    this.verifyOperator =
      deps.verifyOperatorPassword ?? verifyPrimaryVaultPassword;
    this.now = deps.now ?? Date.now;
  }

  listSeats(): ILocalSeatPublic[] {
    try {
      const nowMs = this.now();
      return LOCAL_SEAT_IDS.map((seatId) => {
        const row = this.repository.get(seatId);
        return {
          seatId,
          status: !row
            ? 'unprovisioned'
            : row.revokedAt !== null
              ? 'revoked'
              : 'active',
          label: row?.label ?? null,
          playerId: row ? derivePlayerId(fromBase64(row.publicKey)) : null,
          generation: row?.generation ?? 0,
          lockedUntil:
            row && row.lockedUntilMs > nowMs
              ? new Date(row.lockedUntilMs).toISOString()
              : null,
        };
      });
    } catch {
      throw new LocalSeatCredentialError('internal-error');
    }
  }

  async provision(
    input: IOperatorWrite & {
      readonly password: string;
      readonly label: string;
    },
  ): Promise<ILocalSeatWriteOutcome> {
    return this.operatorWrite(input, async () => {
      const keyPair = await generateKeyPair();
      try {
        const encryptedPrivateKey = await encryptWithPassword(
          keyPair.privateKey,
          input.password,
        );
        return this.repository.provision({
          ...this.writeBase(input, 'provision', input.label),
          label: input.label,
          publicKey: toBase64(keyPair.publicKey),
          encryptedPrivateKey,
        });
      } finally {
        keyPair.privateKey.fill(0);
      }
    });
  }

  async revoke(input: IOperatorWrite): Promise<ILocalSeatWriteOutcome> {
    return this.operatorWrite(input, () =>
      this.repository.revoke(this.writeBase(input, 'revoke', '')),
    );
  }

  private async operatorWrite(
    input: IOperatorWrite,
    apply: () => LocalSeatWriteResult | Promise<LocalSeatWriteResult>,
  ): Promise<ILocalSeatWriteOutcome> {
    try {
      await this.authorizeOperator(input.operatorPassword);
      return this.settle(await apply());
    } catch (error) {
      throw error instanceof LocalSeatCredentialError
        ? error
        : new LocalSeatCredentialError('internal-error');
    }
  }

  private async authorizeOperator(password: string): Promise<void> {
    this.operatorWindow.take(this.now());
    const verdict = await this.verifyOperator(password);
    if (verdict === 'missing') {
      throw new LocalSeatCredentialError('operator-unavailable');
    }
    if (verdict !== 'ok') throw new LocalSeatCredentialError('operator-denied');
  }

  /** The fingerprint covers non-secret parameters only, never a password. */
  private writeBase(input: IOperatorWrite, kind: string, label: string) {
    const { seatId, expectedGeneration, operationId } = input;
    return {
      operationId,
      seatId,
      expectedGeneration,
      fingerprint: createHash('sha256')
        .update(JSON.stringify({ kind, seatId, expectedGeneration, label }))
        .digest('hex'),
      nowIso: new Date(this.now()).toISOString(),
    };
  }

  private settle(result: LocalSeatWriteResult): ILocalSeatWriteOutcome {
    if (result.kind === 'operation-mismatch') {
      throw new LocalSeatCredentialError('operation-mismatch');
    }
    if (result.kind === 'generation-conflict') {
      throw new LocalSeatCredentialError('generation-conflict', {
        currentGeneration: result.currentGeneration,
      });
    }
    return { replayed: result.kind === 'replayed', seats: this.listSeats() };
  }
}

const serviceFactory = createSingleton(() => new LocalSeatCredentialService());

export function getLocalSeatCredentialService(): LocalSeatCredentialService {
  return serviceFactory.get();
}

export function resetLocalSeatCredentialService(): void {
  serviceFactory.reset();
}
