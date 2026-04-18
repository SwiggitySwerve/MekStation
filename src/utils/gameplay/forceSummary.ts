/**
 * Force Summary — Pre-Battle Aggregation
 *
 * Pure helpers that aggregate one side's force statistics for the
 * pre-battle force comparison panel. Produces an `IForceSummary`
 * containing total BV, tonnage, heat dissipation, average pilot skill,
 * weapon DPT potential, and the active SPA roster.
 *
 * Designed to be input-agnostic: the primary entry point
 * `deriveForceSummary` takes a normalized `IForceSummaryInput` shape so
 * callers can adapt from `ISkirmishLaunchConfig`, `IAdaptedUnit[]`,
 * `IForce`, or any other source. Adapter helpers exist for the most
 * common call sites.
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';

import { GameSide } from '@/types/gameplay';

// =============================================================================
// Public Types
// =============================================================================

/**
 * Default pilot skills used when a unit has no assigned pilot. Mirrors
 * BattleTech's "regular pilot" baseline.
 */
export const DEFAULT_GUNNERY = 4;
export const DEFAULT_PILOTING = 5;

/**
 * Heat sink type indicator used when computing dissipation. `single`
 * dissipates 1 heat per sink, `double` dissipates 2.
 */
export type HeatSinkKind = 'single' | 'double';

/**
 * Active SPA reference attached to a pilot. Matches the abstract shape
 * used by `SPECIAL_ABILITIES` and the pilot's `abilities` list.
 */
export interface IForcePilotSpa {
  readonly spaId: string;
  readonly name: string;
}

/**
 * Per-unit input shape for `deriveForceSummary`. All fields are required
 * for correct aggregation; missing data should be substituted with the
 * documented defaults at the adapter layer.
 */
export interface IForceSummaryUnitInput {
  /** Unique unit instance id (e.g. `player-0-WSP-1A`). */
  readonly unitId: string;
  /** Display designation (chassis + variant). Used for warnings only. */
  readonly designation: string;
  /** Battle Value (already computed for the variant). */
  readonly battleValue: number;
  /** Tonnage (chassis weight). */
  readonly tonnage: number;
  /** Total heat sinks installed on the unit. */
  readonly heatSinks: number;
  /** Heat sink type — drives the per-sink dissipation multiplier. */
  readonly heatSinkType: HeatSinkKind;
  /** Pilot gunnery skill (lower is better). `null` => default. */
  readonly gunnery: number | null;
  /** Pilot piloting skill (lower is better). `null` => default. */
  readonly piloting: number | null;
  /**
   * Per-weapon damage values used to compute DPT potential. Each entry
   * contributes `damage` to the total — no probability applied (this is
   * potential, not expected damage per the spec).
   */
  readonly weapons: readonly { readonly damage: number }[];
  /**
   * Pilot's active special abilities. May be empty.
   */
  readonly spas: readonly IForcePilotSpa[];
  /**
   * Marks this entry as a placeholder for a unit that could not be
   * loaded (unknown id, missing data). The aggregator will skip the
   * unit and emit a warning.
   */
  readonly invalid?: boolean;
}

/**
 * Normalized input for `deriveForceSummary`.
 */
export interface IForceSummaryInput {
  readonly side: GameSide;
  readonly units: readonly IForceSummaryUnitInput[];
}

/**
 * Per-SPA aggregation row. `unitIds` lists every unit instance whose
 * pilot holds the SPA (unit IDs, not pilot IDs, so the panel can map
 * back to the displayed unit chip).
 */
export interface IForceSummarySpaEntry {
  readonly spaId: string;
  readonly name: string;
  readonly unitIds: readonly string[];
}

/**
 * Aggregated per-side force statistics. All numeric fields default to
 * zero for an empty force; `spaSummary` defaults to an empty array.
 */
export interface IForceSummary {
  readonly side: GameSide;
  readonly totalBV: number;
  readonly totalTonnage: number;
  /** Total heat dissipation per turn (singles ×1 + doubles ×2). */
  readonly heatDissipation: number;
  /** Arithmetic mean of contributing pilots' gunnery (lower is better). */
  readonly avgGunnery: number;
  /** Arithmetic mean of contributing pilots' piloting (lower is better). */
  readonly avgPiloting: number;
  /**
   * Sum of every weapon's damage value at medium range. No probability
   * factor — pure "if every weapon hit" potential.
   */
  readonly weaponDamagePerTurnPotential: number;
  /** Active SPAs across the force, deduplicated by `spaId`. */
  readonly spaSummary: readonly IForceSummarySpaEntry[];
  /** Number of units actually contributing (skips invalid). */
  readonly unitCount: number;
  /**
   * Best-effort warnings the panel can surface. Examples:
   * - `"Force contains unknown units"` when invalid entries were skipped
   * - `"Unit has no assigned pilot"` when default skills were applied
   */
  readonly warnings: readonly string[];
}

// =============================================================================
// Derivation
// =============================================================================

/**
 * Derive a force summary from a normalized input. Skips entries flagged
 * `invalid` and emits a warning so the panel can surface a hint.
 *
 * Empty inputs return an all-zero summary — this is the supported
 * "Configure forces" placeholder state.
 */
export function deriveForceSummary(input: IForceSummaryInput): IForceSummary {
  const warnings: string[] = [];

  // Partition valid / invalid units up-front so every aggregation
  // walks the same trimmed list.
  const validUnits = input.units.filter((u) => !u.invalid);
  const skippedCount = input.units.length - validUnits.length;
  if (skippedCount > 0) {
    warnings.push('Force contains unknown units');
  }

  // Empty force shortcut — keep numeric fields zeroed, spas empty.
  if (validUnits.length === 0) {
    return {
      side: input.side,
      totalBV: 0,
      totalTonnage: 0,
      heatDissipation: 0,
      avgGunnery: 0,
      avgPiloting: 0,
      weaponDamagePerTurnPotential: 0,
      spaSummary: [],
      unitCount: 0,
      warnings,
    };
  }

  let totalBV = 0;
  let totalTonnage = 0;
  let heatDissipation = 0;
  let weaponDamagePerTurnPotential = 0;

  let gunneryAccumulator = 0;
  let pilotingAccumulator = 0;
  let pilotedUnits = 0;
  let pilotlessFlagged = false;

  // SPA aggregator keyed by spaId. Preserves insertion order so the
  // panel renders them in the order they first appeared (stable).
  const spaMap = new Map<string, { name: string; unitIds: string[] }>();

  for (const unit of validUnits) {
    totalBV += unit.battleValue;
    totalTonnage += unit.tonnage;

    // Heat sink contribution: doubles dissipate 2 per sink, singles 1.
    const perSinkDissipation = unit.heatSinkType === 'double' ? 2 : 1;
    heatDissipation += unit.heatSinks * perSinkDissipation;

    // Pilot skills: missing pilot falls back to default 4/5 and emits
    // a warning the first time it happens (don't spam per-unit).
    const gunnery = unit.gunnery ?? DEFAULT_GUNNERY;
    const piloting = unit.piloting ?? DEFAULT_PILOTING;
    if (unit.gunnery === null || unit.piloting === null) {
      if (!pilotlessFlagged) {
        warnings.push('Unit has no assigned pilot');
        pilotlessFlagged = true;
      }
    }
    gunneryAccumulator += gunnery;
    pilotingAccumulator += piloting;
    pilotedUnits += 1;

    // DPT potential: pure sum of every weapon's medium-range damage.
    for (const weapon of unit.weapons) {
      weaponDamagePerTurnPotential += weapon.damage;
    }

    // SPA aggregation — group by spaId, dedupe unit ids per group.
    for (const spa of unit.spas) {
      const existing = spaMap.get(spa.spaId);
      if (existing) {
        if (!existing.unitIds.includes(unit.unitId)) {
          existing.unitIds.push(unit.unitId);
        }
      } else {
        spaMap.set(spa.spaId, {
          name: spa.name,
          unitIds: [unit.unitId],
        });
      }
    }
  }

  const avgGunnery = pilotedUnits > 0 ? gunneryAccumulator / pilotedUnits : 0;
  const avgPiloting = pilotedUnits > 0 ? pilotingAccumulator / pilotedUnits : 0;

  const spaSummary: IForceSummarySpaEntry[] = [];
  spaMap.forEach((entry, spaId) => {
    spaSummary.push({
      spaId,
      name: entry.name,
      unitIds: [...entry.unitIds],
    });
  });

  return {
    side: input.side,
    totalBV,
    totalTonnage,
    heatDissipation,
    avgGunnery,
    avgPiloting,
    weaponDamagePerTurnPotential,
    spaSummary,
    unitCount: validUnits.length,
    warnings,
  };
}

// =============================================================================
// Adapter — Engine Adapted Units
// =============================================================================

/**
 * Per-unit context the adapter needs to enrich an `IAdaptedUnit` with
 * pre-battle data the engine doesn't carry (BV, tonnage, heat sink
 * count + type, pilot SPAs).
 *
 * The pre-battle page already loads `IAdaptedUnit[]` via
 * `buildPreparedBattleData`, but that path strips down to engine-only
 * data. The caller passes parallel context so the adapter stays pure.
 */
export interface IAdaptedUnitContext {
  readonly unitId: string;
  readonly battleValue: number;
  readonly tonnage: number;
  readonly heatSinks: number;
  readonly heatSinkType: HeatSinkKind;
  readonly gunnery: number | null;
  readonly piloting: number | null;
  readonly spas: readonly IForcePilotSpa[];
}

/**
 * Convert an `IAdaptedUnit` plus parallel context into the normalized
 * input shape. Returns null when the context is missing — caller can
 * skip / mark invalid.
 */
export function toForceSummaryUnit(
  adapted: IAdaptedUnit,
  context: IAdaptedUnitContext,
): IForceSummaryUnitInput {
  return {
    unitId: context.unitId,
    designation: adapted.id,
    battleValue: context.battleValue,
    tonnage: context.tonnage,
    heatSinks: context.heatSinks,
    heatSinkType: context.heatSinkType,
    gunnery: context.gunnery,
    piloting: context.piloting,
    weapons: adapted.weapons.map((w: IWeapon) => ({ damage: w.damage })),
    spas: context.spas,
  };
}

/**
 * High-level helper: build a force summary directly from a list of
 * `IAdaptedUnit` + a context lookup. Convenience for the pre-battle
 * page integration.
 */
export function deriveForceSummaryFromAdaptedUnits(
  side: GameSide,
  adaptedUnits: readonly IAdaptedUnit[],
  contextByUnitId: ReadonlyMap<string, IAdaptedUnitContext>,
): IForceSummary {
  const units: IForceSummaryUnitInput[] = [];
  let missingContext = false;

  for (const adapted of adaptedUnits) {
    const ctx = contextByUnitId.get(adapted.id);
    if (!ctx) {
      missingContext = true;
      units.push({
        unitId: adapted.id,
        designation: adapted.id,
        battleValue: 0,
        tonnage: 0,
        heatSinks: 0,
        heatSinkType: 'single',
        gunnery: null,
        piloting: null,
        weapons: [],
        spas: [],
        invalid: true,
      });
      continue;
    }
    units.push(toForceSummaryUnit(adapted, ctx));
  }

  const summary = deriveForceSummary({ side, units });

  // Surface a higher-level warning if any unit lacked context — the
  // unit-level "skipped" warning is already in the summary, but this
  // hint is friendlier when the panel renders it inline.
  if (
    missingContext &&
    !summary.warnings.includes('Force contains unknown units')
  ) {
    return {
      ...summary,
      warnings: [...summary.warnings, 'Force contains unknown units'],
    };
  }
  return summary;
}
