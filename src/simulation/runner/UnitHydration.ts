/**
 * Unit Hydration — catalog-to-runner mapper for Phase 1 of
 * `add-combat-fidelity-suite`.
 *
 * Resolves an `IFullUnit` from the canonical catalog into:
 *   - per-location armor + structure (front + rear) for IUnitGameState
 *   - per-unit weapon list shaped as the AI's IWeapon contract
 *
 * Pure / synchronous on purpose. Callers (CLI, tests) are responsible for
 * loading the catalog (NodeCanonicalUnitService.getById) and the weapon
 * stats (sync JSON imports from the equipment catalog) BEFORE constructing
 * the SimulationRunner. The runner stays sync; hydration data flows in via
 * the constructor.
 *
 * Per spec `simulation-system/spec.md` (Catalog-Hydrated Unit State):
 *   - Atlas AS7-D MUST hydrate to 4× ML + AC/20 + LRM-20 + SRM-6
 *   - Per-location armor sums to 304 across 11 locations
 *   - Locust LCT-1V MUST hydrate to 1× ML + 2× MG, total armor 64
 *
 * The synthetic single-medium-laser fallback at `createMinimalUnitState`
 * remains for non-swarm callers (preset mode); this module is the
 * swarm-side hydration path.
 *
 * @see openspec/changes/add-combat-fidelity-suite/proposal.md (P1)
 * @see openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 */

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import {
  Facing,
  GameSide,
  IUnitGameState,
  IHexCoordinate,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage/constants';
import { normalizeWeaponMountLocation } from '@/utils/gameplay/hullDownRestrictions';

import type { IWeapon } from '../ai/types';

import { DEFAULT_COMPONENT_DAMAGE } from './SimulationRunnerConstants';

// =============================================================================
// Catalog weapon shape (subset of public/data/equipment/official/weapons/*.json)
// =============================================================================

/**
 * The catalog stores every weapon with this shape. We only need the fields
 * the AI consumes (damage / heat / ranges / minimum / ammoPerTon). Damage
 * may arrive as a number ("AC/20" → 20) or a string ("1/missile" for LRM,
 * "2/missile" for SRM) — `resolveCatalogDamage` normalizes both into the
 * AI's expected numeric max-damage-per-volley.
 */
export interface ICatalogWeaponStats {
  readonly id: string;
  readonly name: string;
  readonly damage: number | string;
  readonly heat: number;
  readonly ranges: {
    readonly minimum: number;
    readonly short: number;
    readonly medium: number;
    readonly long: number;
  };
  readonly ammoPerTon?: number;
}

/**
 * Lookup function the runner uses to resolve weapon stats by id.
 * Tests + CLI build this map synchronously from JSON imports — see
 * `buildWeaponLookupFromCatalogFiles` below.
 */
export type WeaponLookup = (id: string) => ICatalogWeaponStats | null;

// =============================================================================
// Equipment shape (subset of public/data/units/battlemechs/*.json `equipment`)
// =============================================================================

/**
 * One mounted equipment line item from the unit JSON. Catalogs store more
 * fields (criticalSlots, ammoBin, etc.) but the runner only needs
 * `id` + `location` to identify the weapon and place it. `unknown[]` is
 * used because IFullUnit.equipment is typed as `unknown[]` (loose contract
 * shared with browser-side tooling — see CanonicalUnitService.ts:119).
 */
interface IUnitEquipmentEntry {
  readonly id: string;
  readonly location: string;
}

// =============================================================================
// Damage resolution for missile-style strings
// =============================================================================

/**
 * Convert catalog damage to a numeric max-damage-per-volley.
 *
 * AC, lasers, MGs come through as plain numbers (`damage: 5`).
 * LRM/SRM/MRM come through as `"N/missile"` — multiply by the missile count
 * implied by the weapon id (`lrm-20` → 20, `srm-6` → 6, `mrm-30` → 30).
 *
 * If the parse fails (unknown format), return 0 — this should NEVER happen
 * for canonical Atlas/Locust loadouts but the fallback keeps tests green if
 * a follow-on chassis ships an exotic damage descriptor.
 */
export function resolveCatalogDamage(
  damage: number | string,
  weaponId: string,
): number {
  if (typeof damage === 'number') {
    return damage;
  }
  // String form: "1/missile" → multiply by missile count parsed from id.
  const match = damage.match(/^(\d+)\s*\/\s*missile$/i);
  if (!match) {
    return 0;
  }
  const perMissile = parseInt(match[1], 10);
  // Weapon ids look like `lrm-20`, `srm-6`, `mrm-30`, `clan-srm-4`. Pull the
  // last numeric chunk as the missile count.
  const idMatch = weaponId.match(/(\d+)(?!.*\d)/);
  if (!idMatch) {
    return perMissile;
  }
  const missileCount = parseInt(idMatch[1], 10);
  return perMissile * missileCount;
}

// =============================================================================
// AI weapon mapping
// =============================================================================

/**
 * Convert a catalog weapon entry + the unit's mount-list index into the
 * AI's IWeapon contract. The id is suffixed with `-{index}` so multiple
 * mounts of the same weapon (e.g. Atlas mounts 4× medium-laser) get
 * distinct ids in the AI's weapon list — important so the AI's selection
 * + heat-budget code can reason about each mount independently.
 */
export function toAIWeapon(
  catalogWeapon: ICatalogWeaponStats,
  mountIndex: number,
  location?: string,
): IWeapon {
  return {
    id: `${catalogWeapon.id}-${mountIndex}`,
    name: catalogWeapon.name,
    shortRange: catalogWeapon.ranges.short,
    mediumRange: catalogWeapon.ranges.medium,
    longRange: catalogWeapon.ranges.long,
    damage: resolveCatalogDamage(catalogWeapon.damage, catalogWeapon.id),
    heat: catalogWeapon.heat,
    minRange: catalogWeapon.ranges.minimum,
    location,
    ammoPerTon: catalogWeapon.ammoPerTon ?? -1,
    destroyed: false,
  };
}

/**
 * Walk the unit's equipment list, filter to weapon ids known to the lookup,
 * and produce a stable, ordered IWeapon[] for the AI snapshot. Unknown ids
 * (electronics, ammo bins, misc equipment) are silently skipped so the
 * caller doesn't need to pre-filter.
 *
 * Order is preserved from the catalog file so tests can assert
 * deterministic indices.
 */
export function hydrateAIWeaponsFromFullUnit(
  fullUnit: IFullUnit,
  weaponLookup: WeaponLookup,
): readonly IWeapon[] {
  const equipment =
    (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
  const out: IWeapon[] = [];
  let mountIndex = 0;
  for (const raw of equipment) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as IUnitEquipmentEntry;
    if (typeof entry.id !== 'string') continue;
    const stats = weaponLookup(entry.id);
    if (!stats) continue;
    out.push(
      toAIWeapon(
        stats,
        mountIndex,
        normalizeWeaponMountLocation(entry.location),
      ),
    );
    mountIndex++;
  }
  return out;
}

// =============================================================================
// Per-location armor / structure mapping
// =============================================================================

/**
 * Catalog armor allocation — one per location, scalar for HD/LA/RA/LL/RL,
 * `{ front, rear }` for the three torsos.
 */
type ArmorAllocationEntry = number | { front?: number; rear?: number };

/**
 * Catalog locations use SCREAMING_SNAKE; the runner uses lower_snake.
 * Map between the two on read-in. Rear armor lands in
 * `{location}_rear` keys per the existing `IUnitGameState.armor` shape
 * (see SimulationRunnerState.buildDamageState).
 */
const CATALOG_TO_RUNNER_LOC: Readonly<Record<string, string>> = {
  HEAD: 'head',
  CENTER_TORSO: 'center_torso',
  LEFT_TORSO: 'left_torso',
  RIGHT_TORSO: 'right_torso',
  LEFT_ARM: 'left_arm',
  RIGHT_ARM: 'right_arm',
  LEFT_LEG: 'left_leg',
  RIGHT_LEG: 'right_leg',
  // Quad-mech only, not exercised by Atlas/Locust but recognised so the
  // mapper doesn't break on follow-on hydration sweeps.
  FRONT_LEFT_LEG: 'left_arm',
  FRONT_RIGHT_LEG: 'right_arm',
  REAR_LEFT_LEG: 'left_leg',
  REAR_RIGHT_LEG: 'right_leg',
};

/**
 * Pull the armor allocation off `IFullUnit.armor.allocation` and convert
 * to the runner's per-location armor map. Front + rear keep their
 * separate keys so hit-location-rear damage routes to the right slot.
 *
 * Returns the map AND the per-location TOTAL (front+rear summed) so
 * tests can assert "Atlas armor sums to 304 across 11 locations".
 */
export function hydrateArmorFromFullUnit(fullUnit: IFullUnit): {
  readonly armor: Record<string, number>;
  readonly totalArmor: number;
  readonly locationCount: number;
} {
  const armorBlock = (
    fullUnit.armor as
      | { allocation?: Record<string, ArmorAllocationEntry> }
      | undefined
  )?.allocation;
  const armor: Record<string, number> = {};
  let total = 0;
  let locationCount = 0;

  if (!armorBlock) {
    return { armor, totalArmor: 0, locationCount: 0 };
  }

  for (const [catalogLoc, value] of Object.entries(armorBlock)) {
    const runnerLoc = CATALOG_TO_RUNNER_LOC[catalogLoc];
    if (!runnerLoc) continue;
    if (typeof value === 'number') {
      armor[runnerLoc] = value;
      total += value;
      locationCount++;
    } else if (value && typeof value === 'object') {
      const front = value.front ?? 0;
      const rear = value.rear ?? 0;
      armor[runnerLoc] = front;
      total += front;
      locationCount++;
      if (rear > 0) {
        armor[`${runnerLoc}_rear`] = rear;
        total += rear;
        locationCount++;
      }
    }
  }
  return { armor, totalArmor: total, locationCount };
}

/**
 * Build the runner's per-location internal-structure map from the unit's
 * tonnage. Looks up `STANDARD_STRUCTURE_TABLE[tonnage]`; rounds to the
 * nearest 5-ton bracket if the tonnage isn't a multiple of 5 (covers
 * exotic catalog entries; Atlas/Locust are integer multiples of 5).
 *
 * Endo Steel, Composite, Reinforced, etc. all use the SAME per-location
 * point counts — only the weight multiplier differs (handled at the
 * construction layer, not here).
 */
export function hydrateStructureFromFullUnit(fullUnit: IFullUnit): {
  readonly structure: Record<string, number>;
  readonly totalStructure: number;
} {
  // Round tonnage to nearest 5-ton bracket the table contains. Catalog
  // BattleMechs are all integer multiples of 5; this guard handles
  // out-of-band tonnages defensively.
  const tonnage = typeof fullUnit.tonnage === 'number' ? fullUnit.tonnage : 50;
  const bracketed = Math.max(20, Math.min(100, Math.round(tonnage / 5) * 5));
  const row =
    STANDARD_STRUCTURE_TABLE[bracketed] ?? STANDARD_STRUCTURE_TABLE[50];

  const structure: Record<string, number> = {
    head: row.head,
    center_torso: row.centerTorso,
    left_torso: row.sideTorso,
    right_torso: row.sideTorso,
    left_arm: row.arm,
    right_arm: row.arm,
    left_leg: row.leg,
    right_leg: row.leg,
  };

  const totalStructure =
    row.head + row.centerTorso + row.sideTorso * 2 + row.arm * 2 + row.leg * 2;

  return { structure, totalStructure };
}

// =============================================================================
// IUnitGameState builder
// =============================================================================

/**
 * Hydration package for one runner-side unit slot. Built once per match
 * (CLI / test setup) and handed into SimulationRunner via constructor.
 *
 * `runnerUnitId` is the synthetic runner id (`player-1`, `opponent-2`).
 * `fullUnit` is the catalog payload. `aiWeapons` is the pre-mapped AI
 * weapon list (see hydrateAIWeaponsFromFullUnit). `gunnery` / `piloting`
 * mirror the IParticipant skill values so the runner doesn't need a
 * separate participants table.
 */
export interface IHydratedUnitData {
  readonly runnerUnitId: string;
  readonly side: GameSide;
  readonly position: IHexCoordinate;
  readonly fullUnit: IFullUnit;
  readonly aiWeapons: readonly IWeapon[];
  readonly gunnery?: number;
  readonly piloting?: number;
}

/**
 * Build a fully-hydrated `IUnitGameState` from catalog data. Used by
 * `createInitialState` when the runner was constructed with a hydration
 * map. Falls through `createMinimalUnitState` is preserved for the
 * preset / synthetic path.
 */
export function createHydratedUnitState(
  hydrated: IHydratedUnitData,
): IUnitGameState {
  const { runnerUnitId, side, position, fullUnit, gunnery, piloting } =
    hydrated;
  const { armor } = hydrateArmorFromFullUnit(fullUnit);
  const { structure } = hydrateStructureFromFullUnit(fullUnit);

  return {
    id: runnerUnitId,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery,
    piloting,
    armor,
    // Mirror starting structure into `startingInternalStructure` so the
    // retreat-trigger ratio (per `add-bot-retreat-behavior`) sees the
    // canonical pre-damage value, matching the engine path's contract.
    startingInternalStructure: { ...structure },
    structure,
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
  };
}

// =============================================================================
// Synchronous weapon lookup builder (test + CLI helper)
// =============================================================================

/**
 * Build a synchronous `WeaponLookup` from the catalog's static JSON
 * imports. Tests + CLI use this so the runner stays sync. The catalog
 * file shape is `{ items: [{...weapon}] }`; we flatten across files into
 * a single map keyed by id.
 *
 * Files are accepted as `unknown[]` because the catalog imports are typed
 * loosely upstream (`Record<string, unknown>` items). Validation is
 * defensive — entries missing `id`, `damage`, `heat`, or `ranges` are
 * silently skipped so a broken file never crashes the runner.
 */
export function buildWeaponLookupFromCatalogFiles(
  files: readonly { items?: readonly unknown[] }[],
): WeaponLookup {
  const map = new Map<string, ICatalogWeaponStats>();
  for (const file of files) {
    const items = file.items ?? [];
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const id = item.id;
      const damage = item.damage;
      const heat = item.heat;
      const name = item.name;
      const ranges = item.ranges;
      if (
        typeof id !== 'string' ||
        (typeof damage !== 'number' && typeof damage !== 'string') ||
        typeof heat !== 'number' ||
        typeof name !== 'string' ||
        !ranges ||
        typeof ranges !== 'object'
      ) {
        continue;
      }
      const r = ranges as Record<string, unknown>;
      const minimum = typeof r.minimum === 'number' ? r.minimum : 0;
      const short = typeof r.short === 'number' ? r.short : 0;
      const medium = typeof r.medium === 'number' ? r.medium : 0;
      const long = typeof r.long === 'number' ? r.long : 0;
      const ammoPerTon =
        typeof item.ammoPerTon === 'number' ? item.ammoPerTon : -1;
      map.set(id, {
        id,
        name,
        damage,
        heat,
        ranges: { minimum, short, medium, long },
        ammoPerTon,
      });
    }
  }
  return (id: string) => map.get(id) ?? null;
}
