/** LSC-1S: operator writes authenticate the primary vault without switching it.
 * Every request, including replay, consumes the route-wide window before KDF. */

import { createHash } from 'node:crypto';

import { canonicalTokenPayload } from '@/lib/multiplayer/server/auth';
import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

import { createSingleton } from '../core/createSingleton';
import { getIdentityRepository } from './IdentityRepository';
import {
  encryptWithPassword,
  decryptWithPassword,
  fromBase64,
  generateKeyPair,
  toBase64,
  signData,
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
  | 'not-revocable'
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
  readonly generation: number;
  readonly seats: ILocalSeatPublic[];
}

export interface ILocalSeatToken {
  readonly token: string;
  readonly playerId: string;
  readonly publicKey: string;
  readonly displayName: string;
  readonly expiresAt: string;
  readonly seatId: LocalSeatId;
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

  private readonly mintWindow = new AttemptWindow(
    LOCAL_SEAT_POLICY.maxMintAttemptsPerWindow,
  );
  private readonly minting = new Set<LocalSeatId>();

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

  async mint(input: {
    readonly seatId: LocalSeatId;
    readonly password: string;
    readonly ttlMs?: number;
  }): Promise<ILocalSeatToken> {
    let key: Uint8Array<ArrayBuffer> | undefined;
    let claimed = false;
    try {
      const nowMs = this.now();
      this.mintWindow.take(nowMs);
      if (this.minting.has(input.seatId)) {
        throw new LocalSeatCredentialError('throttled', { retryAfterMs: 1000 });
      }
      const row = this.repository.get(input.seatId);
      if (!row || row.revokedAt !== null) {
        throw new LocalSeatCredentialError('invalid-credentials');
      }
      if (row.lockedUntilMs > nowMs) {
        throw new LocalSeatCredentialError('throttled', {
          retryAfterMs: row.lockedUntilMs - nowMs,
        });
      }
      this.minting.add(input.seatId);
      claimed = true;
      try {
        // WebCrypto decrypt returns an ArrayBuffer-backed plaintext view.
        key = (await decryptWithPassword(
          row.encryptedPrivateKey,
          input.password,
        )) as Uint8Array<ArrayBuffer>;
      } catch {
        this.repository.recordFailure(
          input.seatId,
          row.generation,
          this.now(),
          LOCAL_SEAT_POLICY,
        );
        throw new LocalSeatCredentialError('invalid-credentials');
      }
      const checkCurrent = () => {
        const current = this.repository.get(input.seatId);
        if (
          !current ||
          current.generation !== row.generation ||
          current.revokedAt !== null
        ) {
          throw new LocalSeatCredentialError('invalid-credentials');
        }
      };
      checkCurrent();
      const ttl = input.ttlMs ?? LOCAL_SEAT_POLICY.defaultTtlMs;
      if (
        !Number.isSafeInteger(ttl) ||
        ttl <= 0 ||
        ttl > LOCAL_SEAT_POLICY.maxTtlMs
      ) {
        throw new LocalSeatCredentialError('invalid-credentials');
      }
      const playerId = derivePlayerId(fromBase64(row.publicKey));
      const issuedAt = new Date(this.now()).toISOString();
      const expiresAt = new Date(Date.parse(issuedAt) + ttl).toISOString();
      const payload = canonicalTokenPayload({ playerId, issuedAt, expiresAt });
      const signature = toBase64(
        await signData(new TextEncoder().encode(payload), key),
      );
      checkCurrent();
      this.repository.clearFailures(input.seatId, row.generation);
      return {
        token: encodeTokenForWire({
          playerId,
          issuedAt,
          expiresAt,
          publicKey: row.publicKey,
          signature,
        }),
        playerId,
        publicKey: row.publicKey,
        displayName: row.label,
        expiresAt,
        seatId: input.seatId,
      };
    } catch (error) {
      throw error instanceof LocalSeatCredentialError
        ? error
        : new LocalSeatCredentialError('internal-error');
    } finally {
      key?.fill(0);
      if (claimed) this.minting.delete(input.seatId);
    }
  }

  async provision(
    input: IOperatorWrite & {
      readonly password: string;
      readonly label: string;
    },
  ): Promise<ILocalSeatWriteOutcome> {
    return this.operatorWrite(input, async () => {
      const current = this.repository.get(input.seatId);
      // A strictly stale generation cannot become writable: generations only rise.
      // Let the authoritative transaction distinguish replay, mismatch and conflict.
      if (current && current.generation > input.expectedGeneration) {
        return this.repository.provision({
          ...this.writeBase(input, 'provision', input.label),
          label: input.label,
          publicKey: current.publicKey,
          encryptedPrivateKey: current.encryptedPrivateKey,
        });
      }
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
    if (result.kind === 'not-revocable') {
      throw new LocalSeatCredentialError('not-revocable');
    }
    if (result.kind === 'generation-conflict') {
      throw new LocalSeatCredentialError('generation-conflict', {
        currentGeneration: result.currentGeneration,
      });
    }
    return {
      replayed: result.kind === 'replayed',
      generation: result.generation,
      seats: this.listSeats(),
    };
  }
}

const serviceFactory = createSingleton(() => new LocalSeatCredentialService());

export function getLocalSeatCredentialService(): LocalSeatCredentialService {
  return serviceFactory.get();
}

export function resetLocalSeatCredentialService(): void {
  serviceFactory.reset();
}
