import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

export interface IServerMatchHostCaptureContext {
  readonly installFreshCapture: () => void;
  readonly drainNewEvents: () => readonly IGameEvent[];
  readonly stampRollsOnNewEvents: (
    events: readonly IGameEvent[],
  ) => readonly IGameEvent[];
}
