/**
 * `assertSessionInflictedDamage` — proves all three failure modes (design
 * D6), the phantom-damage naming (finding-3 regression gate), and the
 * healthy-battle pass (task 4.1).
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */
import { describe, expect, it } from '@jest/globals';

import type { IUnitCombatDelta } from '@/types/combat/CombatOutcome';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type {
  IDamageAppliedPayload,
  IGameEvent,
  IGameSession,
  IGameUnit,
} from '@/types/gameplay';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import {
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
} from '@/types/gameplay';

import {
  assertSessionInflictedDamage,
  SessionDamageInvariantError,
} from '../assertSessionInflictedDamage';

// =============================================================================
// Fixtures (self-contained per repo convention — see
// `postBattleProcessor.pilotAttribution.test.ts` for the sibling pattern)
// =============================================================================

const HEALTHY_ARMOR = { CT: 20, LT: 10, RT: 10 };
const HEALTHY_STRUCTURE = { CT: 10, LT: 5, RT: 5 };

function makeUnit(id: string, overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id,
    name: id,
    side: GameSide.Player,
    unitRef: `${id}-ref`,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
    armorByLocation: { ...HEALTHY_ARMOR },
    structureByLocation: { ...HEALTHY_STRUCTURE },
    ...overrides,
  };
}

function makeDelta(
  unitId: string,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Intact,
    armorRemaining: { ...HEALTHY_ARMOR },
    internalsRemaining: { ...HEALTHY_STRUCTURE },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

function makeReport(
  overrides: Partial<IPostBattleReport> = {},
): IPostBattleReport {
  return {
    version: 1,
    matchId: 'match-damage-guard',
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 3,
    units: [],
    mvpUnitId: null,
    log: [],
    ...overrides,
  };
}

function makeOutcome(overrides: Partial<ICombatOutcome> = {}): ICombatOutcome {
  const matchId = overrides.matchId ?? 'match-damage-guard';
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: makeReport({ matchId }),
    unitDeltas: [],
    capturedAt: '3025-06-15T12:00:00.000Z',
    ...overrides,
  };
}

let eventSequence = 0;

function makeEvent(
  type: GameEventType,
  payload: IGameEvent['payload'],
  overrides: Partial<IGameEvent> = {},
): IGameEvent {
  eventSequence += 1;
  return {
    id: `evt-${eventSequence}`,
    gameId: 'session-damage-guard',
    sequence: eventSequence,
    timestamp: '3025-06-15T12:00:00.000Z',
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
    ...overrides,
  };
}

function makeDamageEvent(
  unitId: string,
  damage: number,
  overrides: Partial<IDamageAppliedPayload> = {},
): IGameEvent {
  const payload: IDamageAppliedPayload = {
    unitId,
    location: 'CT',
    damage,
    armorRemaining: 5,
    structureRemaining: 10,
    locationDestroyed: false,
    ...overrides,
  };
  return makeEvent(GameEventType.DamageApplied, payload);
}

function makeSession(
  units: readonly IGameUnit[],
  events: readonly IGameEvent[],
  overrides: Partial<IGameSession> = {},
): IGameSession {
  return {
    id: 'session-damage-guard',
    createdAt: '3025-06-15T11:00:00.000Z',
    updatedAt: '3025-06-15T12:00:00.000Z',
    config: {
      mapRadius: 5,
      turnLimit: 10,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units,
    events,
    currentState: {
      gameId: 'session-damage-guard',
      status: GameStatus.Completed,
      turn: 3,
      phase: GamePhase.End,
      activationIndex: 0,
      units: {},
      turnEvents: [],
      result: { winner: GameSide.Player, reason: 'destruction' },
    },
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('assertSessionInflictedDamage', () => {
  it('(a) throws naming the unit and its zero starting totals when a deployed unit started with zero armor+structure', () => {
    const unit = makeUnit('unit-zero-start', {
      armorByLocation: {},
      structureByLocation: {},
    });
    const delta = makeDelta('unit-zero-start', {
      armorRemaining: {},
      internalsRemaining: {},
    });
    const session = makeSession(
      [unit],
      [makeDamageEvent('unit-zero-start', 5)],
    );
    const outcome = makeOutcome({ unitDeltas: [delta] });

    let thrown: unknown;
    try {
      assertSessionInflictedDamage(session, outcome);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(SessionDamageInvariantError);
    const error = thrown as SessionDamageInvariantError;
    expect(error.reason).toBe('zero-armor-start');
    expect(error.message).toContain('unit-zero-start');
    expect(error.message).toContain('#998');
    expect(error.diagnostics).toHaveLength(1);
    expect(error.diagnostics[0]?.startingArmor).toBe(0);
    expect(error.diagnostics[0]?.startingStructure).toBe(0);
  });

  it('(b) throws identifying zero cumulative damage when every unit ends unchanged, regardless of the event log', () => {
    const unit = makeUnit('unit-no-damage');
    const delta = makeDelta('unit-no-damage'); // remaining === starting by construction
    const session = makeSession([unit], []); // no events at all
    const outcome = makeOutcome({ unitDeltas: [delta] });

    let thrown: unknown;
    try {
      assertSessionInflictedDamage(session, outcome);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(SessionDamageInvariantError);
    const error = thrown as SessionDamageInvariantError;
    expect(error.reason).toBe('zero-cumulative-damage');
    expect(error.message).not.toContain('PHANTOM');
    expect(error.phantomDamageUnitIds).toBeUndefined();
  });

  it('(b) phantom-damage case: damage events present but every delta unchanged — throws AND names the phantom signature', () => {
    const unit = makeUnit('unit-phantom');
    // Deltas unchanged (the dual-id class: the event claims damage
    // against `unit-phantom` but the tracked state never moved).
    const delta = makeDelta('unit-phantom');
    const session = makeSession(
      [unit],
      [makeDamageEvent('unit-phantom', 8), makeDamageEvent('unit-phantom', 4)],
    );
    const outcome = makeOutcome({ unitDeltas: [delta] });

    let thrown: unknown;
    try {
      assertSessionInflictedDamage(session, outcome);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(SessionDamageInvariantError);
    const error = thrown as SessionDamageInvariantError;
    expect(error.reason).toBe('zero-cumulative-damage');
    expect(error.message).toContain('PHANTOM-DAMAGE SIGNATURE');
    expect(error.message).toContain('#1019');
    expect(error.phantomDamageUnitIds).toEqual(['unit-phantom']);
  });

  it('(c) throws identifying an unjustified terminal outcome when nothing in the log justifies it', () => {
    const unit = makeUnit('unit-unjustified');
    // Damage clearly happened per the delta (so condition (b) does not
    // trip) but the event log carries zero combat/withdrawal events —
    // the #1019 shape (a terminal outcome asserted with no justifying
    // events behind it).
    const delta = makeDelta('unit-unjustified', {
      armorRemaining: { CT: 0, LT: 10, RT: 10 },
      internalsRemaining: HEALTHY_STRUCTURE,
      destroyed: true,
      finalStatus: UnitFinalStatus.Destroyed,
    });
    const session = makeSession([unit], []); // no justifying events
    const outcome = makeOutcome({
      unitDeltas: [delta],
      endReason: CombatEndReason.Destruction,
    });

    let thrown: unknown;
    try {
      assertSessionInflictedDamage(session, outcome);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(SessionDamageInvariantError);
    const error = thrown as SessionDamageInvariantError;
    expect(error.reason).toBe('unjustified-terminal-outcome');
    expect(error.message).toContain('#1019');
  });

  it('(c) a concession terminal outcome is self-justifying even with an empty event log', () => {
    const unit = makeUnit('unit-concede');
    const delta = makeDelta('unit-concede', {
      armorRemaining: { CT: 5, LT: 10, RT: 10 },
    });
    const session = makeSession([unit], []);
    const outcome = makeOutcome({
      unitDeltas: [delta],
      endReason: CombatEndReason.Concede,
    });

    expect(() => assertSessionInflictedDamage(session, outcome)).not.toThrow();
  });

  it('passes without error for a healthy battle where combat events reduced a unit and events justify the outcome', () => {
    const unit = makeUnit('unit-healthy');
    const delta = makeDelta('unit-healthy', {
      armorRemaining: { CT: 12, LT: 10, RT: 10 },
    });
    const session = makeSession([unit], [makeDamageEvent('unit-healthy', 8)]);
    const outcome = makeOutcome({ unitDeltas: [delta] });

    expect(() => assertSessionInflictedDamage(session, outcome)).not.toThrow();
  });
});
