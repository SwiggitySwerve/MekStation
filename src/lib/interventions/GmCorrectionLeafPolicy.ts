import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';
import type { GmReplayCorrectionEffect } from '@/types/interventions/GmReplayCorrection';

/** Explicit rev-2 table coverage. Adding a schema leaf requires a reviewed row. */
type Carrier = GameEventType | 'unverified-ammo-slot-carrier';
const O = GameEventType.CriticalHitResolved;
const D = GameEventType.DamageApplied;
const A = GameEventType.AttackResolved;

export const GM_CORRECTION_LEAF_CARRIERS = {
  'reposition-facing': {
    'after.position.q': GameEventType.MovementLocked,
    'after.position.r': GameEventType.MovementLocked,
    'after.facing': GameEventType.FacingChanged,
    'after.secondaryFacing': GameEventType.FacingChanged,
    'clear.secondaryFacing': GameEventType.FacingChanged,
  },
  'damage-critical': {
    'after.armor.*': D,
    'after.structure.*': D,
    'after.destroyedLocations[]': D,
    'after.destroyedEquipment[]': GameEventType.ComponentDestroyed,
    'after.componentDamage.engineHits': O,
    'after.componentDamage.gyroHits': O,
    'after.componentDamage.sensorHits': O,
    'after.componentDamage.lifeSupport': O,
    'after.componentDamage.cockpitHit': O,
    'after.componentDamage.actuators.*': O,
    'after.componentDamage.actuatorsByLocation.*.*': O,
    'after.componentDamage.weaponsDestroyed[]': O,
    'after.componentDamage.vehicleCriticalsByLocation.*.weaponsDestroyed': O,
    'after.componentDamage.vehicleCriticalsByLocation.*.weaponsJammed': O,
    'after.componentDamage.vehicleCriticalsByLocation.*.stabilizerHit': O,
    'after.componentDamage.vehicleCriticalsByLocation.*.flightStabilizerHit': O,
    'after.componentDamage.heatSinksDestroyed': O,
    'after.componentDamage.jumpJetsDestroyed': O,
    'after.componentDamage.superCooledMyomerHits': O,
    'after.componentDamage.emergencyCoolantSystemDamaged': O,
    'after.componentDamage.playtestAutocannonFirstCrits[]': O,
    'after.componentDamage.breachedLocations[]': O,
    'clear.componentDamage': O,
  },
  'heat-ammo': {
    'after.heat': GameEventType.HeatGenerated,
    'after.ammo.*': GameEventType.AmmoConsumed,
    'after.ammoState.*.binId': GameEventType.AmmoConsumed,
    'after.ammoState.*.weaponType': GameEventType.AmmoConsumed,
    'after.ammoState.*.remainingRounds': GameEventType.AmmoConsumed,
    'after.ammoState.*.location': 'unverified-ammo-slot-carrier',
    'after.ammoState.*.maxRounds': 'unverified-ammo-slot-carrier',
    'after.ammoState.*.damagePerRound': 'unverified-ammo-slot-carrier',
    'after.ammoState.*.caseProtection': 'unverified-ammo-slot-carrier',
    'after.ammoState.*.isExplosive': 'unverified-ammo-slot-carrier',
    'clear.ammoState': GameEventType.AmmoConsumed,
  },
  'turn-order': {
    'after.phase': GameEventType.PhaseChanged,
    'after.initiativeWinner': GameEventType.InitiativeRolled,
    'after.firstMover': GameEventType.InitiativeOrderSet,
    'clear.initiativeWinner': GameEventType.InitiativeRolled,
    'clear.firstMover': GameEventType.InitiativeOrderSet,
  },
  lifecycle: {
    'after.destroyed': GameEventType.UnitDestroyed,
    'after.destructionCause': GameEventType.UnitDestroyed,
    'after.hasEjected': GameEventType.UnitEjected,
    'after.hasRetreated': GameEventType.UnitRetreated,
    'after.isWithdrawing': GameEventType.WithdrawalDeclared,
    'after.shutdown': GameEventType.ShutdownCheck,
    'after.retreatTargetEdge': GameEventType.WithdrawalDeclared,
    'clear.destructionCause': GameEventType.UnitDestroyed,
    'clear.hasEjected': GameEventType.UnitEjected,
    'clear.hasRetreated': GameEventType.UnitRetreated,
    'clear.isWithdrawing': GameEventType.WithdrawalDeclared,
    'clear.shutdown': GameEventType.ShutdownCheck,
    'clear.retreatTargetEdge': GameEventType.WithdrawalDeclared,
  },
  'attack-resolution': {
    'after.attackId': A,
    'after.attackerId': A,
    'after.targetId': A,
    'after.weaponId': A,
    'after.roll': A,
    'after.toHitNumber': A,
    'after.hit': A,
    'after.location': A,
    'after.damage': A,
    'after.heat': A,
    'after.attackerArc': A,
    'after.ammoBinId': A,
    'after.rolls[]': A,
    'after.relatedEventIds[]': A,
    'after.supersededEventIds[]': A,
  },
  'objective-state': {
    'after.id': GameEventType.GameCreated,
    'after.hexKey': GameEventType.GameCreated,
    'after.objectiveType': GameEventType.GameCreated,
    'after.owningSide': GameEventType.GameCreated,
    'after.controlSide': GameEventType.ObjectiveCaptured,
    'after.controlRule': GameEventType.GameCreated,
    'after.holdTurnsRequired': GameEventType.GameCreated,
    'after.holdProgress': GameEventType.ObjectiveProgress,
  },
} as const satisfies Record<string, Readonly<Record<string, Carrier>>>;

/** No default policy for an unrepresented member of an ammo-slot snapshot. */
export const GM_CORRECTION_AMMO_SLOT_GAPS = Object.entries(GM_CORRECTION_LEAF_CARRIERS['heat-ammo'])
  .filter(([, carrier]) => carrier === 'unverified-ammo-slot-carrier')
  .map(([path]) => path.replace(/^after\./, ''));

export function unsupportedGmCorrectionLeaf(effect: GmReplayCorrectionEffect): string | undefined {
  if (effect.family !== 'heat-ammo' || effect.after.ammoState === undefined) return undefined;
  return GM_CORRECTION_AMMO_SLOT_GAPS.find(path => {
    const member = path.split('.').at(-1);
    return member !== undefined && Object.values(effect.after.ammoState ?? {}).some(bin => Object.hasOwn(bin, member));
  });
}
