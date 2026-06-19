import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IHexCoordinate,
} from '@/types/gameplay';

import { createGameEvent } from './utils';

export function appendWeaponAttackIndirectFireEvents(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly attackerId: string;
  readonly weaponId: string;
  readonly targetHex: IHexCoordinate;
  readonly toHitPenalty: number;
  readonly indirectFireResolution: IIndirectFireResolution | null;
}): void {
  const {
    attackerId,
    events,
    gameId,
    indirectFireResolution,
    targetHex,
    toHitPenalty,
    turn,
    weaponId,
  } = options;

  if (
    !indirectFireResolution ||
    !indirectFireResolution.permitted ||
    !indirectFireResolution.isIndirect
  ) {
    return;
  }

  const basis = indirectFireResolution.basis;
  if (basis === 'narc' || basis === 'inarc') {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.IndirectFireNarcOverride,
        turn,
        GamePhase.WeaponAttack,
        {
          attackerId,
          spotterId: null,
          weaponId,
          targetHex,
          toHitPenalty,
          basis,
        },
        attackerId,
      ),
    );
    return;
  }

  if (!indirectFireResolution.spotterId) {
    return;
  }

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.IndirectFireSpotterSelected,
      turn,
      GamePhase.WeaponAttack,
      {
        attackerId,
        spotterId: indirectFireResolution.spotterId,
        weaponId,
        targetHex,
        toHitPenalty,
        basis: 'los' as const,
      },
      attackerId,
    ),
  );

  if (!indirectFireResolution.forwardObserverApplied) {
    return;
  }

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.IndirectFireForwardObserver,
      turn,
      GamePhase.WeaponAttack,
      {
        attackerId,
        spotterId: indirectFireResolution.spotterId,
        weaponId,
        targetHex,
        toHitPenalty,
        basis: 'los' as const,
        penaltyCancelled: 1,
      },
      attackerId,
    ),
  );
}
