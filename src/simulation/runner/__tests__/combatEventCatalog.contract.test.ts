import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  it('requires TurnStarted integration to stay backed by runner production emission', () => {
    const turnStarted =
      BATTLEMECH_COMBAT_EVENT_SUPPORT[GameEventType.TurnStarted];
    const runnerText = readFileSync(
      join(process.cwd(), 'src/simulation/runner/SimulationRunner.ts'),
      'utf8',
    );
    const runnerFactoryText = readFileSync(
      join(process.cwd(), 'src/simulation/runner/phases/utils.ts'),
      'utf8',
    );

    expect(turnStarted).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('SimulationRunner.run emits'),
    });
    expect(runnerText).toContain('createRunnerTurnStartedEvent');
    expect(runnerFactoryText).toContain('GameEventType.TurnStarted');
  });

  it('source-pins BattleMech event stream rows to anchored MekStation evidence', () => {
    const entries = Object.values(BATTLEMECH_COMBAT_EVENT_SUPPORT);
    const urlsFor = (eventType: keyof typeof BATTLEMECH_COMBAT_EVENT_SUPPORT) =>
      [...(BATTLEMECH_COMBAT_EVENT_SUPPORT[eventType].sourceRefs ?? [])]
        .map((sourceRef) => sourceRef.url)
        .sort();

    expect(
      entries
        .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([]);
    expect(
      entries
        .flatMap((entry) => entry.sourceRefs ?? [])
        .filter((sourceRef) => !sourceRef.url.includes('#L'))
        .map((sourceRef) => sourceRef.url)
        .sort(),
    ).toEqual([]);
    expect(
      entries
        .filter(
          (entry) =>
            !(entry.sourceRefs ?? []).some(
              (sourceRef) => sourceRef.kind === 'mekstation-deviation',
            ),
        )
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([]);

    expect(urlsFor(GameEventType.GameCreated)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/lifecycle.ts#L72-L180',
        'src/simulation/runner/SimulationRunner.ts#L181-L405',
      ]),
    );
    expect(urlsFor(GameEventType.AttackResolved)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/combat.ts#L22-L353',
        'src/simulation/runner/phases/weaponAttackHitResolution.ts#L58-L306',
        'src/simulation/runner/phases/weaponAttackHitResolutionEarlyReturns.ts#L76-L353',
      ]),
    );
    expect(urlsFor(GameEventType.UnitEjected)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/statusPhysical.ts#L267-L364',
        'src/utils/gameplay/gameState/unitExitState.ts#L45-L59',
      ]),
    );
    expect(urlsFor(GameEventType.ObjectiveCaptured)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/objectives/objectiveEvents.ts#L25-L185',
        'src/simulation/runner/SimulationRunner.ts#L321-L338',
      ]),
    );
    expect(urlsFor(GameEventType.AttacksRevealed)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/attackReveal.ts#L1-L28',
        'src/utils/gameplay/gameSessionCore.ts#L398-L430',
        'src/utils/gameplay/gameSessionAttackReveal.ts#L22-L87',
        'src/utils/gameplay/gameState/actionLocking.ts#L157-L205',
        'src/utils/gameplay/gameState/eventDispatch.ts#L224-L225',
      ]),
    );
    expect(urlsFor(GameEventType.CommandResultPublished)).toEqual(
      expect.arrayContaining([
        'src/lib/command-screen/networkedCommandResultSync.ts#L26-L60',
        'src/lib/multiplayer/server/ServerMatchHostCommandResults.ts#L25-L52',
        'src/lib/multiplayer/server/__tests__/ServerMatchHostCommandResults.test.ts#L119-L199',
      ]),
    );
    expect(urlsFor(GameEventType.InitiativeOrderSet)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/initiative.ts#L47-L146',
        'src/utils/gameplay/gameSessionCore.ts#L258-L380',
      ]),
    );
    expect(urlsFor(GameEventType.UnitStuck)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/statusChecksUnitState.ts#L1-L210',
        'src/utils/gameplay/gameSessionPSRResolution.ts#L54-L410',
        'src/simulation/runner/phases/postCombatPsr.ts#L70-L230',
      ]),
    );
  });

  it('keeps non-BattleMech event families split out of the BattleMech validation lane', () => {
    expect(sortedKeys(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT)).toEqual(
      [...NON_BATTLEMECH_EVENT_TYPES].sort(),
    );
    expect(
      supportIdsByLevel(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT, 'out-of-scope'),
    ).toEqual([...NON_BATTLEMECH_EVENT_TYPES].sort());
  });

  it('source-pins non-BattleMech event scope rows to anchored MekStation evidence', () => {
    const entries = Object.values(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT);
    const urlsFor = (
      eventType: keyof typeof NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
    ) =>
      [...(NON_BATTLEMECH_EVENT_SCOPE_SUPPORT[eventType].sourceRefs ?? [])]
        .map((sourceRef) => sourceRef.url)
        .sort();

    expect(
      entries
        .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([]);
    expect(
      entries
        .flatMap((entry) => entry.sourceRefs ?? [])
        .filter((sourceRef) => !sourceRef.url.includes('#L'))
        .map((sourceRef) => sourceRef.url)
        .sort(),
    ).toEqual([]);
    expect(
      entries
        .filter(
          (entry) =>
            !(entry.sourceRefs ?? []).some(
              (sourceRef) => sourceRef.kind === 'mekstation-deviation',
            ),
        )
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([]);

    expect(urlsFor(GameEventType.MotiveDamaged)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/vehicle.ts#L1-L340',
        'src/utils/gameplay/__tests__/vehicleEvents.test.ts#L18-L110',
      ]),
    );
    expect(urlsFor(GameEventType.SwarmDamage)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/battleArmorSwarm.ts#L17-L177',
        'src/engine/__tests__/InteractiveSession.swarmFire.scenario.test.ts#L167-L224',
      ]),
    );
    expect(urlsFor(GameEventType.LegAttackResolved)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/battleArmorLeg.ts#L16-L168',
        'src/engine/InteractiveSession.actions.battleArmor.ts#L119-L145',
      ]),
    );
    expect(urlsFor(GameEventType.StealthBonus)).toEqual(
      expect.arrayContaining([
        'src/utils/gameplay/gameEvents/battleArmorStealth.ts#L16-L117',
        'src/utils/gameplay/battlearmor/stealth.ts#L1-L58',
      ]),
    );
  });

  it('documents remaining BattleMech event-stream gaps instead of treating enum visibility as coverage', () => {
    expect(
      supportIdsByLevel(BATTLEMECH_COMBAT_EVENT_SUPPORT, 'unsupported'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(BATTLEMECH_COMBAT_EVENT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(BATTLEMECH_COMBAT_EVENT_SUPPORT[GameEventType.TurnStarted]).toEqual(
      expect.objectContaining({
        level: 'integrated',
        evidence: expect.stringContaining('SimulationRunner.run emits'),
      }),
    );
  });

  it('keeps the combat audit trail discoverable for core must-cover mechanics', () => {
    expect(
      supportIdsByLevel(BATTLEMECH_COMBAT_EVENT_SUPPORT, 'integrated'),
    ).toEqual(
      expect.arrayContaining([
        GameEventType.MovementDeclared,
        GameEventType.TurnStarted,
        GameEventType.MovementEnhancementActivated,
        GameEventType.FacingChanged,
        GameEventType.AttackDeclared,
        GameEventType.AttacksRevealed,
        GameEventType.CommandResultPublished,
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
        GameEventType.UnitStuck,
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
