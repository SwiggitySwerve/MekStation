/**
 * Force Summary Builder
 *
 * Page-side glue between the canonical unit/pilot stores and the pure
 * `deriveForceSummary` aggregator. Loads each assigned unit's full
 * data (heat sinks, weapons, tonnage), looks up the assigned pilot's
 * skills + SPAs, and produces a list of `IForceSummaryUnitInput` ready
 * for the aggregator.
 *
 * The pre-battle page calls `buildForceSummaryInput` for both sides and
 * passes the resulting `IForceSummary` values to the
 * `ForceComparisonPanel`. Re-running the builder when an assignment
 * changes is what satisfies the `onForcesChange` re-derivation
 * contract (spec § 7.3).
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/game-session-management/spec.md
 */

import type { IAssignment, IForce } from '@/types/force';
import type { GameSide } from '@/types/gameplay';
import type { IPilot } from '@/types/pilot';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import {
  type IFullUnit,
  getCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import { SPECIAL_ABILITIES } from '@/types/pilot/SpecialAbilities';

import {
  DEFAULT_GUNNERY,
  DEFAULT_PILOTING,
  type HeatSinkKind,
  type IForcePilotSpa,
  type IForceSummary,
  type IForceSummaryInput,
  type IForceSummaryUnitInput,
  deriveForceSummary,
} from './forceSummary';

// =============================================================================
// Types
// =============================================================================

/** Input bundle for `buildForceSummaryInput`. */
export interface IBuildForceSummaryArgs {
  readonly side: GameSide;
  readonly force: IForce | undefined;
  readonly pilots: readonly IPilot[];
  /**
   * Optional pre-loaded full units keyed by id. When provided, the
   * builder skips canonical service fetches — useful for tests and
   * server-side rendering. When omitted, the builder loads each unit
   * via `getCanonicalUnitService().getById`.
   */
  readonly preloadedUnits?: ReadonlyMap<string, IFullUnit>;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map the canonical unit's heatSinks.type string to our binary kind.
 * Canonical data uses `"DOUBLE"` / `"SINGLE"` / sometimes `"COMPACT"`
 * — we treat any non-DOUBLE as `single` (compact dissipates 1 per sink
 * just like single per tabletop rules).
 */
function toHeatSinkKind(type: unknown): HeatSinkKind {
  if (typeof type !== 'string') return 'single';
  return type.toUpperCase().includes('DOUBLE') ? 'double' : 'single';
}

/** Pull heat sink count + type from a canonical full-unit record. */
function extractHeatSinks(unit: IFullUnit): {
  count: number;
  kind: HeatSinkKind;
} {
  const raw = (unit as unknown as Record<string, unknown>).heatSinks as
    | { count?: number; type?: string }
    | undefined;
  return {
    count: raw?.count ?? 10,
    kind: toHeatSinkKind(raw?.type),
  };
}

/** Pull BV from a full-unit record (sometimes present, often null). */
function extractBattleValue(unit: IFullUnit): number {
  const bv = (unit as unknown as Record<string, unknown>).bv;
  if (typeof bv === 'number') return bv;
  return 0;
}

/** Assigned pilot SPAs → display-friendly entries. */
function pilotSpas(pilot: IPilot | undefined): IForcePilotSpa[] {
  if (!pilot) return [];
  const out: IForcePilotSpa[] = [];
  for (const ref of pilot.abilities) {
    const ability = SPECIAL_ABILITIES[ref.abilityId];
    if (!ability) continue;
    out.push({ spaId: ability.id, name: ability.name });
  }
  return out;
}

/**
 * Build one force-summary unit input from an assignment + pilot lookup +
 * full unit record. Returns an `invalid` placeholder when the unit
 * could not be loaded so the aggregator can flag and skip it.
 */
function toUnitInput(
  assignment: IAssignment,
  pilots: readonly IPilot[],
  unit: IFullUnit | null,
): IForceSummaryUnitInput {
  const unitId = assignment.unitId ?? assignment.id;
  if (!unit) {
    return {
      unitId,
      designation: unitId,
      battleValue: 0,
      tonnage: 0,
      heatSinks: 0,
      heatSinkType: 'single',
      gunnery: null,
      piloting: null,
      weapons: [],
      spas: [],
      invalid: true,
    };
  }

  const adapted = adaptUnitFromData(unit);
  const heat = extractHeatSinks(unit);
  const pilot = assignment.pilotId
    ? pilots.find((p) => p.id === assignment.pilotId)
    : undefined;

  const designation = `${unit.chassis} ${unit.variant}`.trim();

  return {
    unitId,
    designation: designation || unitId,
    battleValue: extractBattleValue(unit),
    tonnage: unit.tonnage,
    heatSinks: heat.count,
    heatSinkType: heat.kind,
    gunnery:
      pilot?.skills.gunnery ?? (assignment.pilotId ? DEFAULT_GUNNERY : null),
    piloting:
      pilot?.skills.piloting ?? (assignment.pilotId ? DEFAULT_PILOTING : null),
    weapons: adapted.weapons.map((w) => ({ damage: w.damage })),
    spas: pilotSpas(pilot),
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build the input bundle for `deriveForceSummary` from the page-level
 * data the encounter screen already has (`IForce`, `IPilot[]`).
 *
 * Loads canonical unit data per-assignment in parallel; missing units
 * become `invalid` placeholders so the aggregator surfaces a warning
 * but doesn't throw (spec § 9.3).
 */
export async function buildForceSummaryInput(
  args: IBuildForceSummaryArgs,
): Promise<IForceSummaryInput> {
  if (!args.force) {
    return { side: args.side, units: [] };
  }

  const assignments = args.force.assignments.filter((a) => Boolean(a.unitId));
  const service = args.preloadedUnits ? null : getCanonicalUnitService();

  const units = await Promise.all(
    assignments.map(async (assignment): Promise<IForceSummaryUnitInput> => {
      const unitId = assignment.unitId!;
      const preloaded = args.preloadedUnits?.get(unitId) ?? null;
      const unit =
        preloaded ?? (service ? await service.getById(unitId) : null);
      return toUnitInput(assignment, args.pilots, unit);
    }),
  );

  return { side: args.side, units };
}

/**
 * Convenience: build + derive in one call. Returns the final
 * `IForceSummary` ready to hand to the panel.
 */
export async function buildForceSummary(
  args: IBuildForceSummaryArgs,
): Promise<IForceSummary> {
  const input = await buildForceSummaryInput(args);
  return deriveForceSummary(input);
}
