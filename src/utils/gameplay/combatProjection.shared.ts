import type { ICombatRangeHex, IUnitToken } from '@/types/gameplay';

import type { ICombatProjectionInput } from './combatProjection.types';

import { deriveCombatRangeHexes } from './combatProjection.rangeHex';

/**
 * Shared whole-map combat projection (perf P5).
 *
 * One weapon-attack selection used to project the whole map several times
 * with the same inputs: the token target-id pass, the store's click gate and
 * the tactical frame. This memo returns the earlier result when every input
 * the projection reads is the same.
 *
 * Key:
 * - `combatState` by identity. It is an immutable reducer snapshot; every
 *   `useMemo` over `currentState` already relies on that.
 * - Everything else by content: the grid (it is mutated in place in some
 *   paths, so identity is not enough), hexes, attacker, tokens and weapons.
 *   Token interaction flags are left out: the projection never reads them,
 *   and the token pass and the frame differ only in those flags.
 *
 * The selected target only changes hexes where it is a contact: there
 * `deriveProjectedTargetState` finds it; everywhere else the projection is
 * the no-target projection. So the no-target projection is the one cached,
 * and the target's hexes are recomputed and spliced in.
 */

/** `IUnitStateToTokenFlags`: set from the caller's selection, never read. */
const TOKEN_INTERACTION_FLAGS: ReadonlySet<string> = new Set([
  'isSelected',
  'isValidTarget',
  'isActiveTarget',
  'isSecondaryTarget',
  'attackInfeasibleReason',
]);

const MAX_ENTRIES_PER_STATE = 4;
const NO_COMBAT_STATE = {};

const cacheByCombatState = new WeakMap<
  object,
  Map<string, readonly ICombatRangeHex[]>
>();

/** JSON.stringify drops or merges these; keep every one distinct. */
function exactReplacer(_key: string, value: unknown): unknown {
  if (value === undefined) return '\u0000undefined';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return `\u0000${value}`;
    if (Object.is(value, -0)) return '\u0000-0';
  }
  if (value instanceof Map) return { '\u0000map': Array.from(value) };
  if (value instanceof Set) return { '\u0000set': Array.from(value) };
  return value;
}

function withoutInteractionFlags(token: IUnitToken): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(token).filter(([key]) => !TOKEN_INTERACTION_FLAGS.has(key)),
  );
}

function projectionKey(
  input: ICombatProjectionInput & { readonly attacker: IUnitToken },
): string {
  return JSON.stringify(
    [
      input.grid,
      input.hexes,
      withoutInteractionFlags(input.attacker),
      input.tokens.map(withoutInteractionFlags),
      input.weapons,
    ],
    exactReplacer,
  );
}

function noTargetProjection(
  input: ICombatProjectionInput & { readonly attacker: IUnitToken },
): readonly ICombatRangeHex[] {
  const stateKey = input.combatState ?? NO_COMBAT_STATE;
  let entries = cacheByCombatState.get(stateKey);
  if (!entries) {
    entries = new Map();
    cacheByCombatState.set(stateKey, entries);
  }

  const key = projectionKey(input);
  const cached = entries.get(key);
  if (cached) {
    entries.delete(key);
    entries.set(key, cached);
    return cached;
  }

  const projection = deriveCombatRangeHexes({
    ...input,
    targetUnitId: undefined,
  });
  if (entries.size >= MAX_ENTRIES_PER_STATE) {
    entries.delete(entries.keys().next().value as string);
  }
  entries.set(key, projection);
  return projection;
}

/**
 * `deriveCombatRangeHexes` with the result shared between callers that pass
 * the same inputs. The result is identical, hex for hex; treat it as
 * read-only, since other callers may hold the same array.
 */
export function deriveSharedCombatRangeHexes(
  input: ICombatProjectionInput,
): readonly ICombatRangeHex[] {
  const { attacker } = input;
  if (!attacker) return deriveCombatRangeHexes(input);

  const base = noTargetProjection({ ...input, attacker });
  const { targetUnitId } = input;
  if (!targetUnitId) return base;

  const targetIndexes: number[] = [];
  base.forEach((projection, index) => {
    if (projection.targetUnitIds.includes(targetUnitId)) {
      targetIndexes.push(index);
    }
  });
  if (targetIndexes.length === 0) return base;

  const withTarget = deriveCombatRangeHexes({
    ...input,
    hexes: targetIndexes.map((index) => input.hexes[index]),
  });
  const result = base.slice();
  targetIndexes.forEach((hexIndex, index) => {
    result[hexIndex] = withTarget[index];
  });
  return result;
}
