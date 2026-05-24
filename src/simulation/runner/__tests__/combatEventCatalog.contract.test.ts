import { GameEventType } from '@/types/gameplay';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
} from '../CombatEventSupport';

const NON_BATTLEMECH_EVENT_TYPES = [
  GameEventType.MotiveDamaged,
  GameEventType.MotivePenaltyApplied,
  GameEventType.VehicleImmobilized,
  GameEventType.TurretLocked,
  GameEventType.VehicleCrewStunned,
  GameEventType.VTOLCrashCheck,
  GameEventType.TrooperKilled,
  GameEventType.SquadEliminated,
  GameEventType.SwarmAttached,
  GameEventType.SwarmDamage,
  GameEventType.SwarmDismounted,
  GameEventType.LegAttack,
  GameEventType.LegAttackResolved,
  GameEventType.MimeticBonus,
  GameEventType.StealthBonus,
] as const;

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

describe('BattleMech combat event support catalog', () => {
  it('partitions every GameEventType into BattleMech combat support or explicit non-BattleMech scope', () => {
    const battleMechEvents = sortedKeys(BATTLEMECH_COMBAT_EVENT_SUPPORT);
    const nonBattleMechEvents = sortedKeys(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT);
    const overlap = battleMechEvents.filter((eventType) =>
      nonBattleMechEvents.includes(eventType),
    );

    expect(overlap).toEqual([]);
    expect([...battleMechEvents, ...nonBattleMechEvents].sort()).toEqual(
      Object.values(GameEventType).sort(),
    );
  });

  it('requires every event support entry to carry evidence and explicit gaps when not integrated', () => {
    expect(supportGaps(BATTLEMECH_COMBAT_EVENT_SUPPORT)).toEqual([]);
    expect(supportGaps(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT)).toEqual([]);
  });

  it('keeps non-BattleMech event families split out of the BattleMech validation lane', () => {
    expect(sortedKeys(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT)).toEqual(
      [...NON_BATTLEMECH_EVENT_TYPES].sort(),
    );
    expect(
      supportIdsByLevel(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT, 'helper-only'),
    ).toEqual([...NON_BATTLEMECH_EVENT_TYPES].sort());
  });

  it('documents BattleMech event-stream gaps instead of treating enum visibility as coverage', () => {
    expect(
      supportIdsByLevel(BATTLEMECH_COMBAT_EVENT_SUPPORT, 'unsupported'),
    ).toEqual(
      [
        GameEventType.AttacksRevealed,
        GameEventType.FacingChanged,
        GameEventType.InitiativeOrderSet,
      ].sort(),
    );
    expect(
      supportIdsByLevel(BATTLEMECH_COMBAT_EVENT_SUPPORT, 'helper-only'),
    ).toEqual([]);
  });

  it('keeps the combat audit trail discoverable for core must-cover mechanics', () => {
    expect(
      supportIdsByLevel(BATTLEMECH_COMBAT_EVENT_SUPPORT, 'integrated'),
    ).toEqual(
      expect.arrayContaining([
        GameEventType.MovementDeclared,
        GameEventType.MovementEnhancementActivated,
        GameEventType.AttackDeclared,
        GameEventType.AttackInvalid,
        GameEventType.AttackResolved,
        GameEventType.DamageApplied,
        GameEventType.IndirectFireForwardObserver,
        GameEventType.HeatGenerated,
        GameEventType.HeatDissipated,
        GameEventType.ShutdownCheck,
        GameEventType.AmmoConsumed,
        GameEventType.AMSInterception,
        GameEventType.DesignatorMarkerApplied,
        GameEventType.AmmoExplosion,
        GameEventType.PSRTriggered,
        GameEventType.PSRResolved,
        GameEventType.UnitFell,
        GameEventType.PhysicalAttackDeclared,
        GameEventType.PhysicalAttackResolved,
        GameEventType.UnitDestroyed,
        GameEventType.UnitEjected,
        GameEventType.ObjectiveCaptured,
        GameEventType.ForcedWithdrawalTriggered,
        GameEventType.GameEnded,
      ]),
    );
  });
});
