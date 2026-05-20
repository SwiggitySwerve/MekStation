/**
 * Shared snapshot creation, comparison, and serialization for detectors.
 * Used by StateCycleDetector and NoProgressDetector.
 */

import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';

import type { BattleState } from '../StateCycleDetector/types';

/**
 * Snapshot of battle state at a specific turn.
 * Captures armor, structure, heat, and position for all units.
 *
 * Per `polish-wave-6.2-gaps` (PT-001 fix): `position` is included in the
 * snapshot so two turns with identical heat/armor/structure but different
 * unit positions do NOT register as a cycle. Without this, the StateCycleDetector
 * fired at a ~96% rate on Phase-1 swarm sweeps because units shuffled freely
 * around the board while heat/damage stayed constant.
 */
export interface BattleStateSnapshot {
  readonly turn: number;
  readonly armor: Map<string, Record<string, number>>;
  readonly structure: Map<string, Record<string, number>>;
  readonly heat: Map<string, number>;
  readonly position: Map<string, IHexCoordinate>;
}

/**
 * Compares two armor records for equality.
 */
function armorEqual(
  armor1: Record<string, number>,
  armor2: Record<string, number>,
): boolean {
  const keys1 = Object.keys(armor1).sort();
  const keys2 = Object.keys(armor2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i] || armor1[keys1[i]] !== armor2[keys2[i]]) {
      return false;
    }
  }

  return true;
}

/**
 * Compares two structure records for equality.
 */
function structureEqual(
  structure1: Record<string, number>,
  structure2: Record<string, number>,
): boolean {
  const keys1 = Object.keys(structure1).sort();
  const keys2 = Object.keys(structure2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    if (
      keys1[i] !== keys2[i] ||
      structure1[keys1[i]] !== structure2[keys2[i]]
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Compares two hex coordinates for equality.
 * Two coords are equal iff q and r both match. An undefined coord (unit
 * never moved or position not yet recorded) is equal only to another undefined.
 */
function positionEqual(
  pos1: IHexCoordinate | undefined,
  pos2: IHexCoordinate | undefined,
): boolean {
  if (pos1 === undefined && pos2 === undefined) return true;
  if (pos1 === undefined || pos2 === undefined) return false;
  return pos1.q === pos2.q && pos1.r === pos2.r;
}

/**
 * Compares two snapshots to check if state is identical.
 * Returns true if armor, structure, heat, AND position are all the same.
 */
export function snapshotsEqual(
  snap1: BattleStateSnapshot,
  snap2: BattleStateSnapshot,
  battleState: BattleState,
): boolean {
  for (const unit of battleState.units) {
    const armor1 = snap1.armor.get(unit.id) || {};
    const armor2 = snap2.armor.get(unit.id) || {};

    if (!armorEqual(armor1, armor2)) {
      return false;
    }

    const structure1 = snap1.structure.get(unit.id) || {};
    const structure2 = snap2.structure.get(unit.id) || {};

    if (!structureEqual(structure1, structure2)) {
      return false;
    }

    const heat1 = snap1.heat.get(unit.id) || 0;
    const heat2 = snap2.heat.get(unit.id) || 0;

    if (heat1 !== heat2) {
      return false;
    }

    // PT-001: positional check — same heat/armor/structure but different
    // hex positions is meaningful progress (the units repositioned).
    const pos1 = snap1.position.get(unit.id);
    const pos2 = snap2.position.get(unit.id);
    if (!positionEqual(pos1, pos2)) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a snapshot object from the current state maps.
 *
 * `position` is required so callers can't silently lose the PT-001 fix; pass
 * an empty Map when no movement has been observed yet.
 */
export function createSnapshot(
  turn: number,
  armor: Map<string, Record<string, number>>,
  structure: Map<string, Record<string, number>>,
  heat: Map<string, number>,
  position: Map<string, IHexCoordinate>,
): BattleStateSnapshot {
  return {
    turn,
    armor: new Map(armor),
    structure: new Map(structure),
    heat: new Map(heat),
    position: new Map(position),
  };
}

/**
 * Serializes a snapshot for inclusion in anomaly metadata.
 */
export function serializeSnapshot(
  snapshot: BattleStateSnapshot,
): Record<string, unknown> {
  return {
    turn: snapshot.turn,
    armor: Object.fromEntries(
      Array.from(snapshot.armor.entries()).map(([unitId, armorMap]) => [
        unitId,
        armorMap,
      ]),
    ),
    structure: Object.fromEntries(
      Array.from(snapshot.structure.entries()).map(([unitId, structureMap]) => [
        unitId,
        structureMap,
      ]),
    ),
    heat: Object.fromEntries(snapshot.heat.entries()),
    position: Object.fromEntries(
      Array.from(snapshot.position.entries()).map(([unitId, coord]) => [
        unitId,
        { q: coord.q, r: coord.r },
      ]),
    ),
  };
}
