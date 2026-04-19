/**
 * Battle Armor Combat State
 *
 * Per-unit combat state carried by BA squads during a battle. Construction-
 * time BA data (`IBattleArmorUnit`) stays immutable — this module owns the
 * per-trooper armor pool, anti-mech attach state, and per-turn flags.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/battle-armor-unit-system/spec.md
 */

import type {
  BattleArmorStealthKind,
  IBattleArmorCombatState,
  IBattleArmorTrooperState,
} from '@/types/gameplay';

// =============================================================================
// Constructors
// =============================================================================

/**
 * Parameters to initialize a fresh BA combat state at battle start.
 */
export interface ICreateBattleArmorCombatStateParams {
  readonly unitId: string;
  readonly squadSize: number;
  readonly armorPointsPerTrooper: number;
  readonly stealthKind?: BattleArmorStealthKind;
  readonly hasMagneticClamp?: boolean;
  readonly hasVibroClaws?: boolean;
  readonly vibroClawCount?: number;
}

/**
 * Build a fresh `IBattleArmorCombatState` with every trooper alive at full
 * armor. Dead troopers are retained with `alive=false` as combat progresses;
 * initial state has all slots active.
 */
export function createBattleArmorCombatState(
  params: ICreateBattleArmorCombatStateParams,
): IBattleArmorCombatState {
  const troopers: IBattleArmorTrooperState[] = [];
  for (let i = 0; i < params.squadSize; i++) {
    troopers.push({
      alive: true,
      armorRemaining: params.armorPointsPerTrooper,
      equipmentDestroyed: [],
    });
  }
  return {
    unitId: params.unitId,
    squadSize: params.squadSize,
    troopers,
    swarmingUnitId: undefined,
    legAttackCommitted: false,
    mimeticActiveThisTurn: false,
    stealthKind: params.stealthKind ?? 'none',
    hasMagneticClamp: params.hasMagneticClamp ?? false,
    hasVibroClaws: params.hasVibroClaws ?? false,
    vibroClawCount: params.vibroClawCount ?? 0,
    destroyed: false,
  };
}

// =============================================================================
// Accessors
// =============================================================================

/**
 * Count surviving troopers (alive && armorRemaining > 0).
 * Used by squad-fire scaling, leg-attack damage, swarm damage, vibro-claw.
 */
export function getSurvivingTroopers(state: IBattleArmorCombatState): number {
  let count = 0;
  for (const t of state.troopers) {
    if (t.alive && t.armorRemaining > 0) {
      count++;
    }
  }
  return count;
}

/**
 * Return the indices of surviving troopers (for seeded-random selection).
 */
export function getSurvivingTrooperIndices(
  state: IBattleArmorCombatState,
): readonly number[] {
  const out: number[] = [];
  for (let i = 0; i < state.troopers.length; i++) {
    const t = state.troopers[i];
    if (t.alive && t.armorRemaining > 0) {
      out.push(i);
    }
  }
  return out;
}

// =============================================================================
// Mutators (returning new state)
// =============================================================================

/**
 * Mark a trooper dead. Returns a new state.
 * Idempotent: calling on an already-dead trooper is a no-op.
 */
export function killTrooper(
  state: IBattleArmorCombatState,
  trooperIndex: number,
): IBattleArmorCombatState {
  if (trooperIndex < 0 || trooperIndex >= state.troopers.length) {
    return state;
  }
  const existing = state.troopers[trooperIndex];
  if (!existing.alive) {
    return state;
  }
  const newTroopers = state.troopers.slice();
  newTroopers[trooperIndex] = {
    ...existing,
    alive: false,
    armorRemaining: 0,
  };
  const anyAlive = newTroopers.some((t) => t.alive && t.armorRemaining > 0);
  return {
    ...state,
    troopers: newTroopers,
    destroyed: !anyAlive,
  };
}

/**
 * Apply a specific armor delta to a trooper. Used by the damage pipeline
 * when a hit lands on a particular trooper. Negative `delta` reduces armor.
 * Never goes below 0 (caller handles overflow into trooper-kill).
 */
export function adjustTrooperArmor(
  state: IBattleArmorCombatState,
  trooperIndex: number,
  delta: number,
): IBattleArmorCombatState {
  if (trooperIndex < 0 || trooperIndex >= state.troopers.length) {
    return state;
  }
  const existing = state.troopers[trooperIndex];
  const newArmor = Math.max(0, existing.armorRemaining + delta);
  const newTroopers = state.troopers.slice();
  newTroopers[trooperIndex] = {
    ...existing,
    armorRemaining: newArmor,
    alive: existing.alive && newArmor > 0,
  };
  const anyAlive = newTroopers.some((t) => t.alive && t.armorRemaining > 0);
  return {
    ...state,
    troopers: newTroopers,
    destroyed: !anyAlive,
  };
}

/**
 * Set the swarm-target id on the squad (null/undefined to clear).
 */
export function setSwarmTarget(
  state: IBattleArmorCombatState,
  targetUnitId: string | undefined,
): IBattleArmorCombatState {
  return { ...state, swarmingUnitId: targetUnitId };
}

/**
 * Set the mimetic-active flag (true when squad did NOT move this turn).
 */
export function setMimeticActive(
  state: IBattleArmorCombatState,
  active: boolean,
): IBattleArmorCombatState {
  return { ...state, mimeticActiveThisTurn: active };
}

/**
 * Set the leg-attack committed flag (toggled each turn).
 */
export function setLegAttackCommitted(
  state: IBattleArmorCombatState,
  committed: boolean,
): IBattleArmorCombatState {
  return { ...state, legAttackCommitted: committed };
}
