/**
 * Construction-maxima resolution for campaign roster units.
 *
 * `IUnitMaxState` is the "full health" reference a unit's current combat
 * state is diffed against — by the repair-queue builder, the maintenance
 * cap, and (per `R9.roster-damage`) the roster card's damage bar. The
 * values themselves are owned by the unit's construction source, so this
 * module resolves them through the SAME authority combat launch uses:
 * `adaptUnit`, which routes `custom-*` refs to the custom-unit source
 * (`customUnitApiService` in the browser, `readServerCustomCombatDefinition`
 * on the server) and every other ref to `CanonicalUnitService`.
 *
 * Nothing is ever substituted. A unit with no ref, a ref whose source
 * disagrees with the roster's recorded `unitSource`, a canonical miss, or
 * a deleted / invalid custom design all resolve to `null` — the campaign
 * keeps no entry for that unit and consumers render their own explicit
 * "unavailable" branch rather than a stock maximum.
 *
 * @spec openspec/specs/campaign-unit-combat-state/spec.md
 */

import type { CustomUnitDefinitionReader } from '@/engine/types';
import type { IUnitMaxState } from '@/types/campaign/UnitCombatState';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

const CUSTOM_COMBAT_REF_PREFIX = 'custom-';

/**
 * The roster fields maxima resolution needs. Structurally satisfied by
 * `IRosterUnitProjection`; declared narrowly so the resolver does not
 * depend on display fields it never reads.
 */
export interface IMaxStateRosterUnit {
  readonly unitId: string;
  readonly unitRef?: string;
  readonly unitSource?: unknown;
}

/**
 * True when the ref and the roster's recorded source agree about which
 * authority owns this unit. A canonical-source unit carrying a `custom-`
 * ref (or the reverse) is a recorded mismatch — `admitCanonicalExactReference`
 * already refuses to launch it, and resolving it by prefix alone would
 * quietly hand it the other authority's maxima.
 */
function refMatchesRecordedSource(
  unitRef: string,
  unitSource: unknown,
): boolean {
  const parsed = parseRosterUnitSource(unitSource);
  if (parsed.kind === 'invalid') return false;
  const isCustomRef = unitRef.startsWith(CUSTOM_COMBAT_REF_PREFIX);
  return parsed.source === 'custom' ? isCustomRef : !isCustomRef;
}

/**
 * Resolve one roster unit's construction maxima, or `null` when the
 * design cannot be resolved.
 *
 * `adaptUnit` returns `null` on a canonical miss and throws on a missing
 * or unsupported custom design; both mean the same thing here, so the
 * throw is caught and reported as "no maxima" rather than failing the
 * whole roster.
 */
export async function resolveUnitMaxState(
  unit: IMaxStateRosterUnit,
  readCustom?: CustomUnitDefinitionReader,
): Promise<IUnitMaxState | null> {
  const unitRef = unit.unitRef;
  if (!unitRef) return null;
  if (!refMatchesRecordedSource(unitRef, unit.unitSource)) return null;

  try {
    const adapted = await adaptUnit(unitRef, {}, readCustom);
    if (!adapted) return null;
    return {
      unitId: unit.unitId,
      // `adaptUnit` is called without `initialDamage`, so these are the
      // construction values, not a post-damage snapshot.
      maxArmorPerLocation: { ...adapted.armor },
      maxStructurePerLocation: { ...adapted.structure },
      maxAmmoPerBin: { ...adapted.ammo },
    };
  } catch {
    return null;
  }
}

/**
 * Resolve maxima for every roster unit that has no entry yet.
 *
 * Returns ONLY the newly resolved entries, so callers merge rather than
 * replace — an existing entry is a pinned construction snapshot and is
 * never re-derived. Units that cannot be resolved are simply absent from
 * the result.
 */
export async function resolveMissingUnitMaxStates(
  units: readonly IMaxStateRosterUnit[],
  existing: Readonly<Record<string, IUnitMaxState>> | undefined,
  readCustom?: CustomUnitDefinitionReader,
): Promise<Record<string, IUnitMaxState>> {
  const resolved: Record<string, IUnitMaxState> = {};

  for (const unit of units) {
    if (existing?.[unit.unitId]) continue;
    if (resolved[unit.unitId]) continue;
    const maxState = await resolveUnitMaxState(unit, readCustom);
    if (maxState) resolved[unit.unitId] = maxState;
  }

  return resolved;
}
