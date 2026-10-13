import type { IGameEvent } from '@/types/gameplay';

export function isReplayBvTotal(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function replayTurnCount(events: readonly IGameEvent[]): number {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    const turns = record(event.payload)?.turns;
    if (
      event.type === 'game_ended' &&
      typeof turns === 'number' &&
      Number.isInteger(turns) &&
      turns >= 0
    )
      return turns;
  }
  let maxTurn = 0;
  let starts = 0;
  for (const event of events) {
    if (event.type === 'turn_started') starts++;
    if (Number.isInteger(event.turn) && event.turn >= 0)
      maxTurn = Math.max(maxTurn, event.turn);
  }
  return Math.max(maxTurn, starts);
}

export function replayBvTotal(
  gameCreated: IGameEvent | null | undefined,
): number | undefined {
  const payload = record(gameCreated?.payload);
  const storedTotal = record(payload?.quickMeta)?.bvTotal;
  if (isReplayBvTotal(storedTotal)) return storedTotal;
  if (!Array.isArray(payload?.units)) return undefined;
  let total = 0;
  let found = false;
  for (const unit of payload.units) {
    const bv = record(unit)?.bv;
    if (isReplayBvTotal(bv)) {
      total += bv;
      found = true;
    }
  }
  return found ? total : undefined;
}
