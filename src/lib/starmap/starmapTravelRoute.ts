import type { IStarSystem } from '@/types/starmap/StarSystem';

import { Money } from '@/types/campaign/Money';

import type { IStarmapTravelRules } from './starmapTravelRules';

export type StarmapRouteLegStatus = 'legal' | 'illegal';

export interface IStarmapRouteLeg {
  readonly index: number;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly distanceLy: number;
  readonly maxJumpDistanceLy: number;
  readonly status: StarmapRouteLegStatus;
  readonly reasons: readonly string[];
}

export function distanceBetweenSystems(
  from: IStarSystem,
  to: IStarSystem,
): number {
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function buildStarmapRouteLegs(input: {
  readonly fromSystem: IStarSystem;
  readonly destinationSystem: IStarSystem;
  readonly jumpCount: number;
  readonly distanceLy: number;
  readonly rules: IStarmapTravelRules;
}): readonly IStarmapRouteLeg[] {
  const legDistance = input.distanceLy / input.jumpCount;
  return Array.from({ length: input.jumpCount }, (_, index) => {
    const isFirst = index === 0;
    const isLast = index === input.jumpCount - 1;
    const fromLabel = isFirst
      ? input.fromSystem.name
      : `Recharge point ${index}`;
    const toLabel = isLast
      ? input.destinationSystem.name
      : `Recharge point ${index + 1}`;
    const legal = legDistance <= input.rules.maxJumpDistanceLy + 0.0001;
    return {
      index: index + 1,
      fromLabel,
      toLabel,
      distanceLy: legDistance,
      maxJumpDistanceLy: input.rules.maxJumpDistanceLy,
      status: legal ? 'legal' : 'illegal',
      reasons: legal
        ? []
        : [
            `Leg exceeds ${input.rules.maxJumpDistanceLy} light-years and cannot be jumped.`,
          ],
    };
  });
}

export function calculateTravelFee(
  distanceLy: number,
  jumpCount: number,
  rules: IStarmapTravelRules,
): Money {
  return new Money(
    rules.baseTravelFeeCbills +
      rules.feePerJumpCbills * jumpCount +
      rules.feePerLightYearCbills * distanceLy,
  );
}
