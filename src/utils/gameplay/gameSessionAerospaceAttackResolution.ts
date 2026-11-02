import type { IGameSession } from '@/types/gameplay';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

/** Family-specific session seam: native aerospace resolvers in, replay events out.
 * No hit-location, damage, critical, control-roll or SI arithmetic lives here.
 */
import type { IResolveWeaponHitInput } from './gameSessionAttackResolution.hit';

import {
  dispatchHitLocation,
  dispatchResolveDamage,
} from './aerospace/dispatch';
import { AerospaceAttackDirection, getArcArmor } from './aerospace/state';
import {
  createAttackResolvedEvent,
  createDamageAppliedEvent,
} from './gameEvents';
import { appendUnitDestroyedEvent } from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';

export function tryResolveAerospaceAttackHit(
  input: IResolveWeaponHitInput,
): IGameSession | null {
  const combat = input.targetState.combatState;
  if (combat?.kind !== 'aero') return null;
  const target = {
    unitType:
      input.targetState.unitType === UnitType.SMALL_CRAFT
        ? UnitType.SMALL_CRAFT
        : UnitType.AEROSPACE,
  };
  const diceRoller =
    input.criticalD6Roller ?? (() => input.diceRoller().dice[0]);
  const direction = {
    front: AerospaceAttackDirection.FRONT,
    rear: AerospaceAttackDirection.REAR,
    left: AerospaceAttackDirection.SIDE_LEFT,
    right: AerospaceAttackDirection.SIDE_RIGHT,
  }[input.arcString];
  const hit = dispatchHitLocation({
    target,
    direction,
    options: { diceRoller },
  });
  if (!hit) throw new TypeError('Aerospace dispatch returned no hit location');
  const resolved = dispatchResolveDamage(
    target,
    {
      unitId: input.targetId,
      state: combat.state,
      arc: hit.arc,
      damage: input.weaponData.damage,
      isTAC: hit.isTAC,
      pilotSkill: input.targetState.piloting,
      diceRoller,
    },
    () => {
      throw new TypeError('Aerospace damage fell through to ground');
    },
  );
  let session = appendEvent(
    input.session,
    createAttackResolvedEvent({
      gameId: input.session.id,
      sequence: input.session.events.length,
      turn: input.turn,
      attackerId: input.attackerId,
      targetId: input.targetId,
      weaponId: input.weaponId,
      roll: input.attackRollTotal,
      toHitNumber: input.weaponToHitNumber,
      hit: true,
      location: hit.arc,
      damage: input.weaponData.damage,
      heat: input.weaponData.heat,
      attackerArc: input.arcString,
      ammoBinId: input.ammoBinIdForResolved,
    }),
  );
  session = appendEvent(
    session,
    createDamageAppliedEvent({
      gameId: session.id,
      sequence: session.events.length,
      turn: input.turn,
      unitId: input.targetId,
      location: hit.arc,
      damage: input.weaponData.damage,
      armorRemaining: getArcArmor(resolved.state, hit.arc),
      structureRemaining: resolved.state.currentSI,
      locationDestroyed: resolved.destroyedThisHit,
      aerospaceState: resolved.state,
      aerospaceEvents: resolved.events,
    }),
  );
  return resolved.destroyedThisHit
    ? appendUnitDestroyedEvent(session, {
        turn: input.turn,
        phase: session.currentState.phase,
        unitId: input.targetId,
        cause: 'damage',
      })
    : session;
}
