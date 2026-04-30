import type { IGameEvent } from '@/types/gameplay';

interface MovementAnimationEventHold {
  readonly mapId: string;
  readonly kind?: string;
  readonly eventSequence?: number;
}

export function filterEventsForMovementAnimations(
  events: readonly IGameEvent[],
  animations: readonly MovementAnimationEventHold[],
  mapId: string,
): readonly IGameEvent[] {
  const holdFromSequence = earliestHeldMovementSequence(animations, mapId);
  if (holdFromSequence === null) return events;

  return events.filter((event) => event.sequence < holdFromSequence);
}

function earliestHeldMovementSequence(
  animations: readonly MovementAnimationEventHold[],
  mapId: string,
): number | null {
  let earliest: number | null = null;

  for (const animation of animations) {
    if (animation.mapId !== mapId) continue;
    if (animation.kind !== undefined && animation.kind !== 'movement') continue;
    if (animation.eventSequence === undefined) continue;
    earliest =
      earliest === null
        ? animation.eventSequence
        : Math.min(earliest, animation.eventSequence);
  }

  return earliest;
}
