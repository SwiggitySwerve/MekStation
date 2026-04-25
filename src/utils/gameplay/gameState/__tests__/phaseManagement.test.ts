/**
 * Regression tests for `applyTurnStarted` and `applyPhaseChanged` PSR-queue
 * lifecycle behavior.
 *
 * Locks in the canonical clear-on-turn-start semantics: pendingPSRs are
 * cleared at the TurnStarted boundary (per archived `wire-piloting-skill-rolls`
 * task 1.3 and TW p.52), but NOT at intra-turn phase transitions (PSRs
 * accumulate within a turn and resolve in the End phase).
 *
 * Implementation site: src/utils/gameplay/gameState/phaseManagement.ts
 *   - applyTurnStarted: line 60 sets pendingPSRs = [] for every unit
 *   - applyPhaseChanged: deliberately does NOT touch pendingPSRs
 *
 * @spec openspec/changes/tier5-audit-cleanup/specs/piloting-skill-rolls/spec.md
 *   Requirement: Pending PSR Queue Cleared At Turn Boundary (Regression Protection)
 */

import { describe, expect, it } from "@jest/globals";

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameState,
  type IPendingPSR,
  type IUnitGameState,
} from "@/types/gameplay";

import { applyPhaseChanged, applyTurnStarted } from "../phaseManagement";

// =============================================================================
// Test fixtures
// =============================================================================

function makePSR(overrides: Partial<IPendingPSR> = {}): IPendingPSR {
  return {
    entityId: "unit-1",
    reason: "twenty-plus-damage",
    additionalModifier: 0,
    triggerSource: "attack",
    ...overrides,
  };
}

function makeUnit(
  id: string,
  pendingPSRs: readonly IPendingPSR[] = [],
  weaponsFiredThisTurn: readonly string[] = [],
): IUnitGameState {
  return {
    id,
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    pendingPSRs,
    weaponsFiredThisTurn,
  };
}

function makeState(units: Record<string, IUnitGameState>): IGameState {
  return {
    gameId: "test-game",
    status: GameStatus.InProgress,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units,
    turnEvents: [],
  };
}

function makeTurnStartedEvent(turn: number): IGameEvent {
  return {
    id: "evt-turn-started",
    gameId: "test-game",
    sequence: 100,
    timestamp: new Date().toISOString(),
    type: GameEventType.TurnStarted,
    turn,
    phase: GamePhase.Initiative,
    payload: { turn } as never, // payload shape not relevant to applyTurnStarted's PSR-clear logic
  };
}

function makePhaseChangedEvent(
  fromPhase: GamePhase,
  toPhase: GamePhase,
): IGameEvent {
  return {
    id: "evt-phase-changed",
    gameId: "test-game",
    sequence: 50,
    timestamp: new Date().toISOString(),
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: toPhase,
    payload: { fromPhase, toPhase, turn: 1 } as never,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("applyTurnStarted — pendingPSRs clear (regression protection)", () => {
  it("clears pendingPSRs for every unit at TurnStarted boundary", () => {
    // Two units carrying queued PSRs into turn 2 — could happen if the End
    // phase advanced without resolving them (defensive reset per TW p.52).
    const stalePSR = makePSR({ entityId: "unit-1", reason: "fall-from-prev" });
    const stalePSR2 = makePSR({
      entityId: "unit-2",
      reason: "damage-from-prev",
    });

    const initial = makeState({
      "unit-1": makeUnit("unit-1", [stalePSR]),
      "unit-2": makeUnit("unit-2", [stalePSR2]),
    });

    const result = applyTurnStarted(initial, makeTurnStartedEvent(2));

    expect(result.units["unit-1"].pendingPSRs).toEqual([]);
    expect(result.units["unit-2"].pendingPSRs).toEqual([]);
  });

  it("also resets per-turn flags (weaponsFiredThisTurn) on the same boundary", () => {
    // The PSR clear is paired with other turn-scoped resets in the same loop.
    // Lock that pairing in to prevent a future refactor from splitting them.
    const initial = makeState({
      "unit-1": makeUnit("unit-1", [makePSR()], ["weapon-a", "weapon-b"]),
    });

    const result = applyTurnStarted(initial, makeTurnStartedEvent(2));

    expect(result.units["unit-1"].weaponsFiredThisTurn).toEqual([]);
    expect(result.units["unit-1"].pendingPSRs).toEqual([]);
  });

  it("leaves units with empty pendingPSRs untouched (idempotent on empty queue)", () => {
    const initial = makeState({
      "unit-1": makeUnit("unit-1", []),
    });

    const result = applyTurnStarted(initial, makeTurnStartedEvent(2));

    expect(result.units["unit-1"].pendingPSRs).toEqual([]);
  });

  it("advances turn counter and resets phase to Initiative", () => {
    // Sanity guard: confirm the rest of applyTurnStarted's contract works
    // alongside the PSR clear.
    const initial = makeState({
      "unit-1": makeUnit("unit-1", [makePSR()]),
    });

    const result = applyTurnStarted(initial, makeTurnStartedEvent(2));

    expect(result.turn).toBe(2);
    expect(result.phase).toBe(GamePhase.Initiative);
    expect(result.activationIndex).toBe(0);
  });
});

describe("applyPhaseChanged — pendingPSRs preserved within turn", () => {
  it("does NOT clear pendingPSRs when transitioning from WeaponAttack to PhysicalAttack", () => {
    // Per archived `wire-piloting-skill-rolls` task 1.3: PSRs accumulate
    // through phase transitions and resolve in the End phase. Clearing them
    // at phase change would break the queue lifecycle.
    const queuedPSR = makePSR({ reason: "twenty-plus-damage" });
    const initial = makeState({
      "unit-1": makeUnit("unit-1", [queuedPSR]),
    });

    const result = applyPhaseChanged(
      initial,
      makePhaseChangedEvent(GamePhase.WeaponAttack, GamePhase.PhysicalAttack),
      {
        fromPhase: GamePhase.WeaponAttack,
        toPhase: GamePhase.PhysicalAttack,
        turn: 1,
      },
    );

    expect(result.units["unit-1"].pendingPSRs).toEqual([queuedPSR]);
  });

  it("preserves PSRs across multiple intra-turn phase transitions", () => {
    // Simulate phase progression: queued in WeaponAttack, must survive
    // PhysicalAttack, Heat, and arrive intact at End for resolution.
    const queuedPSR = makePSR({ reason: "fall-attack" });
    let state = makeState({
      "unit-1": makeUnit("unit-1", [queuedPSR]),
    });

    state = applyPhaseChanged(
      state,
      makePhaseChangedEvent(GamePhase.WeaponAttack, GamePhase.PhysicalAttack),
      {
        fromPhase: GamePhase.WeaponAttack,
        toPhase: GamePhase.PhysicalAttack,
        turn: 1,
      },
    );
    expect(state.units["unit-1"].pendingPSRs).toEqual([queuedPSR]);

    state = applyPhaseChanged(
      state,
      makePhaseChangedEvent(GamePhase.PhysicalAttack, GamePhase.Heat),
      {
        fromPhase: GamePhase.PhysicalAttack,
        toPhase: GamePhase.Heat,
        turn: 1,
      },
    );
    expect(state.units["unit-1"].pendingPSRs).toEqual([queuedPSR]);

    state = applyPhaseChanged(
      state,
      makePhaseChangedEvent(GamePhase.Heat, GamePhase.End),
      { fromPhase: GamePhase.Heat, toPhase: GamePhase.End, turn: 1 },
    );
    expect(state.units["unit-1"].pendingPSRs).toEqual([queuedPSR]);
  });

  it("still resets the per-phase damage and lock-state fields", () => {
    // Sanity: confirm applyPhaseChanged still does its primary job (lock
    // state reset) while leaving pendingPSRs alone.
    const queuedPSR = makePSR();
    const initial = makeState({
      "unit-1": {
        ...makeUnit("unit-1", [queuedPSR]),
        lockState: LockState.Locked,
        damageThisPhase: 7,
      },
    });

    const result = applyPhaseChanged(
      initial,
      makePhaseChangedEvent(GamePhase.WeaponAttack, GamePhase.PhysicalAttack),
      {
        fromPhase: GamePhase.WeaponAttack,
        toPhase: GamePhase.PhysicalAttack,
        turn: 1,
      },
    );

    expect(result.units["unit-1"].lockState).toBe(LockState.Pending);
    expect(result.units["unit-1"].damageThisPhase).toBe(0);
    // Critical: PSR queue survives the phase change.
    expect(result.units["unit-1"].pendingPSRs).toEqual([queuedPSR]);
  });
});
