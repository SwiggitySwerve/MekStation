/**
 * C2: unit exits and pilot death in the combat outcome.
 *
 * Rules follow pinned MegaMek 48fcb2f64 / MekHQ e7adc2c:
 * - ejection leaves a salvageable wreck (TWGameManager.java:30273-30286,
 *   Game.java:1334-1344); retreat is never enemy salvage
 *   (ResolveScenarioTracker.java:568-608);
 * - a pilot is dead at 6 hits (ResolveScenarioTracker.java:2615-2645,
 *   Crew.java:1201-1215, 1252-1258); unconsciousness is not a status.
 */

import { describe, expect, it } from '@jest/globals';

import { deriveCoopBattleConsequences } from '@/lib/campaign/coop/reconcileCoopBattle';
import { aggregateSalvageCandidates } from '@/lib/campaign/salvage/salvageEngine';
import {
  PilotFinalStatus,
  UnitFinalStatus,
  type ICombatOutcome,
  type IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import {
  GameSide,
  type IGameConfig,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  createPilotHitEvent,
  createUnitDestroyedEvent,
  createUnitEjectedEvent,
  createUnitRetreatedEvent,
} from '@/utils/gameplay/gameEvents';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { appendEvent, endGame } from '@/utils/gameplay/gameSessionCore';

import { deriveCombatOutcome } from '../combatOutcome';
import { readDeltaExitReason } from '../deltaExitReason';

const config: IGameConfig = {
  mapRadius: 10,
  turnLimit: 10,
  victoryConditions: ['destruction'],
  optionalRules: [],
};

const PLAYER = 'player-1';
const ENEMY = 'enemy-1';
const STAYER = 'enemy-2';

const units: IGameUnit[] = [
  {
    id: PLAYER,
    name: 'Hunchback',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'p1',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: ENEMY,
    name: 'Marauder',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'p2',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: STAYER,
    name: 'Wasp',
    side: GameSide.Opponent,
    unitRef: 'wsp-1a',
    pilotRef: 'p3',
    gunnery: 4,
    piloting: 5,
  },
];

type Step = (session: IGameSession) => IGameEvent;
const at = (s: IGameSession) =>
  [s.id, s.events.length, s.currentState.turn, s.currentState.phase] as const;

const eject =
  (unitId: string): Step =>
  (s) =>
    createUnitEjectedEvent(...at(s), unitId, 'player_declared');
const retreat =
  (unitId: string): Step =>
  (s) =>
    createUnitRetreatedEvent(...at(s), unitId, 'north');
const destroy =
  (
    unitId: string,
    cause: IUnitDestroyedPayload['cause'] = 'ct_destroyed',
  ): Step =>
  (s) =>
    createUnitDestroyedEvent(...at(s), unitId, cause);
const pilotHit =
  (
    unitId: string,
    totalWounds: number,
    consciousnessCheckPassed: boolean,
  ): Step =>
  (s) =>
    createPilotHitEvent(
      ...at(s),
      unitId,
      1,
      totalWounds,
      'head_hit',
      true,
      consciousnessCheckPassed,
    );

function outcomeAfter(...steps: Step[]): ICombatOutcome {
  let session = startGame(createGameSession(config, units), GameSide.Player);
  for (const step of steps) session = appendEvent(session, step(session));
  session = endGame(session, GameSide.Player, 'destruction');
  return deriveCombatOutcome(session, { capturedAt: '3025-01-01T00:00:00Z' });
}

function deltaOf(outcome: ICombatOutcome, unitId: string): IUnitCombatDelta {
  const delta = outcome.unitDeltas.find((d) => d.unitId === unitId);
  if (!delta) throw new Error(`no delta for ${unitId}`);
  return delta;
}

describe('deriveCombatOutcome: exitReason', () => {
  it('records an ejection; the unit is not scored destroyed and the pilot lives', () => {
    const delta = deltaOf(outcomeAfter(eject(PLAYER)), PLAYER);
    expect(delta.exitReason).toBe('ejected');
    expect(delta.destroyed).toBe(false);
    expect(delta.pilotState.killed).toBe(false);
    expect(delta.pilotState.finalStatus).toBe(PilotFinalStatus.Active);
  });

  it('records a retreat', () => {
    expect(deltaOf(outcomeAfter(retreat(ENEMY)), ENEMY).exitReason).toBe(
      'retreated',
    );
  });

  it('omits the field for a unit that stayed, keeping old outcome bytes', () => {
    const outcome = outcomeAfter(retreat(ENEMY));
    expect(deltaOf(outcome, STAYER)).not.toHaveProperty('exitReason');
    expect(deltaOf(outcome, PLAYER)).not.toHaveProperty('exitReason');
  });
});

describe('deriveCombatOutcome: pilot death needs 6 hits', () => {
  it('a destroyed unit with a knocked-out pilot is Unconscious, not KIA', () => {
    const delta = deltaOf(
      outcomeAfter(pilotHit(PLAYER, 3, false), destroy(PLAYER)),
      PLAYER,
    );
    expect(delta.destroyed).toBe(true);
    expect(delta.pilotState.killed).toBe(false);
    expect(delta.pilotState.finalStatus).toBe(PilotFinalStatus.Unconscious);
  });

  it('six wounds is KIA', () => {
    const delta = deltaOf(outcomeAfter(pilotHit(PLAYER, 6, false)), PLAYER);
    expect(delta.pilotState.killed).toBe(true);
    expect(delta.pilotState.finalStatus).toBe(PilotFinalStatus.KIA);
  });

  it.each(['head_destroyed', 'pilot_death'] as const)(
    'a %s destruction is KIA',
    (cause) => {
      const delta = deltaOf(outcomeAfter(destroy(PLAYER, cause)), PLAYER);
      expect(delta.pilotState.killed).toBe(true);
      expect(delta.pilotState.finalStatus).toBe(PilotFinalStatus.KIA);
    },
  );

  it('a destroyed unit with a conscious pilot keeps the pilot', () => {
    const delta = deltaOf(outcomeAfter(destroy(PLAYER)), PLAYER);
    expect(delta.pilotState.killed).toBe(false);
    expect(delta.pilotState.finalStatus).toBe(PilotFinalStatus.Active);
  });
});

describe('readDeltaExitReason: field, then report.log, then null', () => {
  const withoutField = (outcome: ICombatOutcome): ICombatOutcome => ({
    ...outcome,
    unitDeltas: outcome.unitDeltas.map(
      ({ exitReason: _drop, ...rest }) => rest,
    ),
  });

  it('reads the field when present', () => {
    const outcome = outcomeAfter(retreat(ENEMY));
    const forged = {
      ...outcome,
      report: { ...outcome.report, log: [] },
    };
    expect(readDeltaExitReason(forged, deltaOf(forged, ENEMY))).toBe(
      'retreated',
    );
  });

  it('falls back to the first exit event in report.log for an older outcome', () => {
    const legacy = withoutField(outcomeAfter(eject(PLAYER), retreat(ENEMY)));
    expect(readDeltaExitReason(legacy, deltaOf(legacy, PLAYER))).toBe(
      'ejected',
    );
    expect(readDeltaExitReason(legacy, deltaOf(legacy, ENEMY))).toBe(
      'retreated',
    );
  });

  it('a destruction logged before the exit event wins', () => {
    const outcome = withoutField(outcomeAfter(destroy(ENEMY)));
    const log = [
      ...outcome.report.log,
      createUnitRetreatedEvent(
        outcome.matchId,
        outcome.report.log.length,
        1,
        outcome.report.log[0].phase,
        ENEMY,
        'north',
      ),
    ];
    const legacy = { ...outcome, report: { ...outcome.report, log } };
    expect(readDeltaExitReason(legacy, deltaOf(legacy, ENEMY))).toBeNull();
  });

  it('is null when neither the field nor the log records an exit', () => {
    const legacy = withoutField(outcomeAfter());
    expect(readDeltaExitReason(legacy, deltaOf(legacy, STAYER))).toBeNull();
    const noLog = { ...legacy, report: { ...legacy.report, log: [] } };
    expect(readDeltaExitReason(noLog, deltaOf(noLog, STAYER))).toBeNull();
  });
});

describe('salvage eligibility follows the exit', () => {
  /** Mark a delta damaged so the stayed-unit rule would salvage it. */
  const damaged = (
    outcome: ICombatOutcome,
    unitId: string,
  ): ICombatOutcome => ({
    ...outcome,
    unitDeltas: outcome.unitDeltas.map((d) =>
      d.unitId === unitId ? { ...d, finalStatus: UnitFinalStatus.Damaged } : d,
    ),
  });
  const candidateIds = (outcome: ICombatOutcome) =>
    aggregateSalvageCandidates(outcome)
      .candidates.filter((c) => c.source === 'unit')
      .map((c) => [c.unitId, c.finalStatus]);

  it('a damaged enemy that retreated is not salvage; a damaged stayer is', () => {
    const outcome = damaged(
      damaged(outcomeAfter(retreat(ENEMY)), ENEMY),
      STAYER,
    );
    expect(candidateIds(outcome)).toEqual([[STAYER, 'damaged']]);
  });

  it('an undamaged enemy whose pilot ejected is salvage', () => {
    expect(candidateIds(outcomeAfter(eject(ENEMY)))).toEqual([
      [ENEMY, 'ejected'],
    ]);
  });

  it('an older outcome without the field is read through report.log', () => {
    const outcome = damaged(outcomeAfter(retreat(ENEMY)), ENEMY);
    const legacy = {
      ...outcome,
      unitDeltas: outcome.unitDeltas.map(
        ({ exitReason: _drop, ...rest }) => rest,
      ),
    };
    expect(candidateIds(legacy)).toEqual([]);
  });

  it('co-op salvage credits an ejected enemy wreck and not a retreated one', () => {
    const consequences = (outcome: ICombatOutcome) =>
      deriveCoopBattleConsequences({
        outcome,
        campaignId: 'c',
        playerSide: GameSide.Player,
        missionPayout: 0,
        designations: {},
      }).salvageValue;
    expect(consequences(outcomeAfter(eject(ENEMY)))).toBeGreaterThan(0);
    expect(consequences(outcomeAfter(retreat(ENEMY)))).toBe(0);
  });
});
