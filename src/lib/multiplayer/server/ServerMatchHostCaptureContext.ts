import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

export interface IServerMatchHostCaptureContext {
  /** Production returns an idempotent rollback for entropy drawn by this tick.
   * Existing lightweight context fakes may return void when they draw no dice. */
  readonly installFreshCapture: () => void | (() => void);
  readonly drainNewEvents: () => readonly IGameEvent[];
  readonly stampRollsOnNewEvents: (
    events: readonly IGameEvent[],
  ) => readonly IGameEvent[];
}
