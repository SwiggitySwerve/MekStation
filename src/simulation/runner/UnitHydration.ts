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
import type { IC3EquipmentMountState } from '@/utils/gameplay/c3Network';
import type {
  CriticalSlotComponentType,
  CriticalSlotManifest,
  ICriticalSlotEntry,
} from '@/utils/gameplay/criticalHitResolution';
import type { ECMType, IActiveProbe } from '@/utils/gameplay/electronicWarfare';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  FiringArc,
  GameSide,
  IAmmoSlotState,
  IMovementCapability,
  IUnitGameState,
  IHexCoordinate,
  LockState,
  MovementType,
} from '@/types/gameplay';
import {
  AMMUNITION_CATALOG_FILES,
  NAME_MAPPINGS_DATA,
} from '@/utils/construction/equipmentBVCatalogData';
import { buildCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage/constants';

import type { IWeapon, IWeaponFiringModes } from '../ai/types';

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
  readonly subType?: string;
  readonly damage: number | string;
  readonly heat: number;
  readonly ranges: {
    readonly minimum: number;
    readonly short: number;
    readonly medium: number;
    readonly long: number;
    readonly extreme?: number;
  };
  readonly ammoPerTon?: number;
  readonly special?: readonly string[];
}

/**
 * Lookup function the runner uses to resolve weapon stats by id.
 * Tests + CLI build this map synchronously from JSON imports — see
 * `buildWeaponLookupFromCatalogFiles` below.
 */
export type WeaponLookup = (id: string) => ICatalogWeaponStats | null;

export interface ICatalogAmmoStats {
  readonly id: string;
  readonly name: string;
  readonly shotsPerTon: number;
  readonly isExplosive: boolean;
  readonly compatibleWeaponIds: readonly string[];
}

export type AmmoLookup = (idOrName: string) => ICatalogAmmoStats | null;

const SOURCE_BACKED_WEAPON_LOOKUP_ALIASES = {
  'plasma-cannon': 'clan-plasma-cannon',
  plasmacannon: 'clan-plasma-cannon',
  clplasmacannon: 'clan-plasma-cannon',
  clanplasmacannon: 'clan-plasma-cannon',
  plasmarifle: 'plasma-rifle',
  isplasmarifle: 'plasma-rifle',
} satisfies Readonly<Record<string, string>>;

export interface IHydratedAIWeaponsReport {
  readonly weapons: readonly IWeapon[];
  readonly resolvedEquipmentIds: readonly string[];
  readonly unresolvedEquipmentIds: readonly string[];
}

export interface IHydratedECMSuiteData {
  readonly type: ECMType;
  readonly sourceEquipmentId: string;
  readonly sourceLocation?: string;
}

export interface IHydratedActiveProbeData {
  readonly type: IActiveProbe['type'];
  readonly sourceEquipmentId: string;
  readonly sourceLocation?: string;
}

export type IHydratedC3EquipmentData = IC3EquipmentMountState;

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
  readonly isRearMounted?: boolean;
}

interface IHydratableEquipmentSignal {
  readonly id: string;
  readonly sourceLocation?: string;
}

type CriticalSlotMap = Readonly<Record<string, readonly (string | null)[]>>;

type HeatSinkKind = 'single' | 'double';

const CRITICAL_SLOT_LOCATION_COUNTS: Readonly<Record<string, number>> = {
  head: 6,
  center_torso: 12,
  left_torso: 12,
  right_torso: 12,
  left_arm: 12,
  right_arm: 12,
  left_leg: 6,
  right_leg: 6,
};

const ACTUATOR_TYPE_BY_SLOT_TEXT: Readonly<Record<string, ActuatorType>> = {
  [normalizeCriticalSlotText(ActuatorType.SHOULDER)]: ActuatorType.SHOULDER,
  [normalizeCriticalSlotText(ActuatorType.UPPER_ARM)]: ActuatorType.UPPER_ARM,
  [normalizeCriticalSlotText(ActuatorType.LOWER_ARM)]: ActuatorType.LOWER_ARM,
  [normalizeCriticalSlotText(ActuatorType.HAND)]: ActuatorType.HAND,
  [normalizeCriticalSlotText(ActuatorType.HIP)]: ActuatorType.HIP,
  [normalizeCriticalSlotText(ActuatorType.UPPER_LEG)]: ActuatorType.UPPER_LEG,
  [normalizeCriticalSlotText(ActuatorType.LOWER_LEG)]: ActuatorType.LOWER_LEG,
  [normalizeCriticalSlotText(ActuatorType.FOOT)]: ActuatorType.FOOT,
};

interface IFullUnitHeatSinks {
  readonly count?: number;
  readonly type?: string;
}

function toHeatSinkKind(type: unknown): HeatSinkKind {
  if (typeof type !== 'string') return 'single';
  return type.toUpperCase().includes('DOUBLE') ? 'double' : 'single';
}

export function hydrateHeatSinksFromFullUnit(fullUnit: IFullUnit): {
  readonly count: number;
  readonly kind: HeatSinkKind;
} {
  const heatSinks = (fullUnit as { heatSinks?: IFullUnitHeatSinks }).heatSinks;
  const count =
    typeof heatSinks?.count === 'number' && Number.isFinite(heatSinks.count)
      ? heatSinks.count
      : 10;
  return {
    count,
    kind: toHeatSinkKind(heatSinks?.type),
  };
}

export function hydrateHasTSMFromFullUnit(fullUnit: IFullUnit): boolean {
  const movement = (
    fullUnit as {
      movement?: { enhancements?: readonly unknown[]; hasTSM?: boolean };
    }
  ).movement;
  if (movement?.hasTSM === true) return true;
  return (
    movement?.enhancements?.some(
      (enhancement) =>
        typeof enhancement === 'string' && enhancement.toLowerCase() === 'tsm',
    ) ?? false
  );
}

function movementEnhancementsContainSignal(
  fullUnit: IFullUnit,
  predicate: (id: string) => boolean,
): boolean {
  const movement = (
    fullUnit as {
      movement?: { enhancements?: readonly unknown[] };
    }
  ).movement;

  return (
    movement?.enhancements?.some(
      (enhancement) =>
        typeof enhancement === 'string' && predicate(enhancement),
    ) ?? false
  );
}

function isMASCSignal(id: string): boolean {
  const normalized = normalizeEquipmentId(id);
  return normalized.includes('masc');
}

function isSuperchargerSignal(id: string): boolean {
  const normalized = normalizeEquipmentId(id);
  return normalized.includes('supercharger');
}

export function hydrateHasMASCFromFullUnit(fullUnit: IFullUnit): boolean {
  const movement = (
    fullUnit as {
      movement?: { hasMASC?: boolean };
    }
  ).movement;
  if (movement?.hasMASC === true) return true;

  return (
    movementEnhancementsContainSignal(fullUnit, isMASCSignal) ||
    equipmentSignalsFromFullUnit(fullUnit).some((signal) =>
      isMASCSignal(signal.id),
    )
  );
}

export function hydrateHasSuperchargerFromFullUnit(
  fullUnit: IFullUnit,
): boolean {
  const movement = (
    fullUnit as {
      movement?: { hasSupercharger?: boolean };
    }
  ).movement;
  if (movement?.hasSupercharger === true) return true;

  return (
    movementEnhancementsContainSignal(fullUnit, isSuperchargerSignal) ||
    equipmentSignalsFromFullUnit(fullUnit).some((signal) =>
      isSuperchargerSignal(signal.id),
    )
  );
}

function normalizeMovementMP(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.floor(value));
}

/**
 * Hydrate the runner's movement capability from canonical BattleMech catalog
 * movement data. The bundled unit JSON uses `movement.walk` / `movement.jump`;
 * the extra aliases keep custom-unit payloads and older adapters on the same
 * source-backed path when they already expose normalized MP fields.
 */
export function hydrateMovementCapabilityFromFullUnit(
  fullUnit: IFullUnit,
): IMovementCapability | undefined {
  const movement = (
    fullUnit as {
      movement?: {
        walk?: unknown;
        walkMP?: unknown;
        cruiseMP?: unknown;
        run?: unknown;
        runMP?: unknown;
        flankMP?: unknown;
        jump?: unknown;
        jumpMP?: unknown;
      };
    }
  ).movement;
  if (!movement) return undefined;

  const walkMP = normalizeMovementMP(
    movement.walk ?? movement.walkMP ?? movement.cruiseMP,
  );
  if (walkMP === undefined) return undefined;

  const jumpMP = normalizeMovementMP(movement.jump ?? movement.jumpMP) ?? 0;
  const explicitRunMP = normalizeMovementMP(
    movement.run ?? movement.runMP ?? movement.flankMP,
  );

  return {
    walkMP,
    runMP: explicitRunMP ?? Math.ceil(walkMP * 1.5),
    jumpMP,
  };
}

function hydrateMotionTypeFromFullUnit(
  fullUnit: IFullUnit,
): string | undefined {
  const motionType = (fullUnit as { motionType?: unknown }).motionType;
  return typeof motionType === 'string' && motionType.trim().length > 0
    ? motionType
    : undefined;
}

function isBattleMechPartialWingHost(fullUnit: IFullUnit): boolean {
  const unitType = (fullUnit as { unitType?: unknown }).unitType;
  if (typeof unitType !== 'string') return false;

  const normalized = normalizeCriticalSlotText(unitType);
  return (
    normalized === 'battlemech' ||
    normalized === 'omnimech' ||
    normalized === 'industrialmech'
  );
}

function isPartialWingSignal(id: string): boolean {
  const normalized = normalizeEquipmentId(id);
  return (
    normalized === 'partialwing' ||
    normalized === 'ispartialwing' ||
    normalized === 'clpartialwing'
  );
}

function movementEnhancementsContainPartialWing(fullUnit: IFullUnit): boolean {
  return movementEnhancementsContainSignal(fullUnit, isPartialWingSignal);
}

export function hydratePartialWingJumpBonusFromFullUnit(
  fullUnit: IFullUnit,
): number | undefined {
  if (!isBattleMechPartialWingHost(fullUnit)) return undefined;

  const hasPartialWing =
    movementEnhancementsContainPartialWing(fullUnit) ||
    equipmentSignalsFromFullUnit(fullUnit).some((signal) =>
      isPartialWingSignal(signal.id),
    );
  if (!hasPartialWing) return undefined;

  const tonnage = fullUnit.tonnage;
  if (typeof tonnage !== 'number' || !Number.isFinite(tonnage)) {
    return undefined;
  }

  return tonnage <= 55 ? 2 : 1;
}

export function hydrateHasStealthArmorFromFullUnit(
  fullUnit: IFullUnit,
): boolean {
  const armorType = (fullUnit as { armor?: { type?: unknown } }).armor?.type;
  if (
    typeof armorType === 'string' &&
    normalizeCriticalSlotText(armorType) === 'stealth'
  ) {
    return true;
  }

  return equipmentSignalsFromFullUnit(fullUnit).some((signal) => {
    const normalized = normalizeCriticalSlotText(signal.id);
    return (
      normalized === 'stealtharmor' ||
      normalized === 'isstealth' ||
      normalized.endsWith('stealtharmor')
    );
  });
}

export interface IHydratedTalonState {
  readonly leftLegHasTalons: boolean;
  readonly rightLegHasTalons: boolean;
  readonly leftArmHasTalons: boolean;
  readonly rightArmHasTalons: boolean;
}

export interface IHydratedClawState {
  readonly leftArmHasClaw: boolean;
  readonly rightArmHasClaw: boolean;
}

function hasTalonCriticalSlot(slots: readonly string[]): boolean {
  return slots.some((slot) =>
    normalizeCriticalSlotText(slot).includes('talons'),
  );
}

function hasClawCriticalSlot(slots: readonly string[]): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotText(slot);
    return normalized === 'isclaw' || normalized === 'claw';
  });
}

export function hydrateTalonStateFromFullUnit(
  fullUnit: IFullUnit,
): IHydratedTalonState {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  return {
    leftLegHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'LEFT_LEG'),
    ),
    rightLegHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'RIGHT_LEG'),
    ),
    leftArmHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'LEFT_ARM'),
    ),
    rightArmHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'RIGHT_ARM'),
    ),
  };
}

export function hydrateClawStateFromFullUnit(
  fullUnit: IFullUnit,
): IHydratedClawState {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  return {
    leftArmHasClaw: hasClawCriticalSlot(
      locationSlotTexts(criticalSlots, 'LEFT_ARM'),
    ),
    rightArmHasClaw: hasClawCriticalSlot(
      locationSlotTexts(criticalSlots, 'RIGHT_ARM'),
    ),
  };
}

export function hydrateUnitQuirksFromFullUnit(
  fullUnit: IFullUnit,
): readonly string[] {
  const quirks = (fullUnit as { quirks?: readonly unknown[] }).quirks;
  return (
    quirks?.filter((quirk): quirk is string => typeof quirk === 'string') ?? []
  );
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
 * MML entries are variable damage (`"1-2/missile"`) because ammo choice
 * controls the per-missile damage; the runner stores max volley damage, so use
 * the upper bound.
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
  // String forms:
  //   "1/missile" -> multiply by missile count parsed from id.
  //   "1-2/missile" -> variable damage, use the upper bound.
  const match = damage.match(/^(?:\d+\s*-\s*)?(\d+)\s*\/\s*missile$/i);
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
  mountingArc?: FiringArc,
): IWeapon {
  const damage = resolveCatalogDamage(catalogWeapon.damage, catalogWeapon.id);
  const firingModes = buildCatalogFiringModes(catalogWeapon, damage);
  return {
    id: `${catalogWeapon.id}-${mountIndex}`,
    name: catalogWeapon.name,
    shortRange: catalogWeapon.ranges.short,
    mediumRange: catalogWeapon.ranges.medium,
    longRange: catalogWeapon.ranges.long,
    ...(catalogWeapon.ranges.extreme !== undefined
      ? { extremeRange: catalogWeapon.ranges.extreme }
      : {}),
    damage,
    heat: catalogWeapon.heat,
    minRange: catalogWeapon.ranges.minimum,
    ammoPerTon: catalogWeapon.ammoPerTon ?? -1,
    ...(location ? { location } : {}),
    ...(mountingArc ? { mountingArc } : {}),
    destroyed: false,
    ...(firingModes ? { firingModes } : {}),
  };
}

function mountingArcFromEquipment(entry: IUnitEquipmentEntry): FiringArc {
  return entry.isRearMounted === true ? FiringArc.Rear : FiringArc.Front;
}

function catalogText(catalogWeapon: ICatalogWeaponStats): string {
  return [
    catalogWeapon.id,
    catalogWeapon.name,
    catalogWeapon.subType ?? '',
    ...(catalogWeapon.special ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

function buildCatalogFiringModes(
  catalogWeapon: ICatalogWeaponStats,
  damage: number,
): IWeaponFiringModes | undefined {
  const text = catalogText(catalogWeapon);
  if (text.includes('ultra ac') || /^clan-uac-\d+/.test(catalogWeapon.id)) {
    return {
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modes: [
        {
          id: 'single',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
        },
        {
          id: 'double',
          damage: damage * 2,
          heat: catalogWeapon.heat * 2,
          shotsPerTurn: 2,
        },
      ],
    };
  }

  if (text.includes('rotary ac') || /^clan-rac-\d+/.test(catalogWeapon.id)) {
    return {
      kind: 'rate-of-fire',
      defaultModeId: 'rof-1',
      modes: [1, 2, 3, 4, 5, 6].map((shots) => ({
        id: `rof-${shots}`,
        damage: damage * shots,
        heat: catalogWeapon.heat * shots,
        shotsPerTurn: shots,
      })),
    };
  }

  if (text.includes('lb-x ac') || /^clan-lb-\d+-x-ac/.test(catalogWeapon.id)) {
    return {
      kind: 'cluster-slug',
      defaultModeId: 'slug',
      modes: [
        {
          id: 'slug',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
        },
        {
          id: 'cluster',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
        },
      ],
    };
  }

  if (catalogWeapon.subType === 'MML' || /\bmml\b/.test(text)) {
    const rackSize = missileCountFromWeaponId(catalogWeapon.id);
    return {
      kind: 'ammo-mode',
      defaultModeId: 'srm',
      modes: [
        {
          id: 'srm',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
          ammoWeaponType: `srm-${rackSize}`,
        },
        {
          id: 'lrm',
          damage: rackSize,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
          ammoWeaponType: `lrm-${rackSize}`,
        },
      ],
    };
  }

  return undefined;
}

function missileCountFromWeaponId(weaponId: string): number {
  const match = weaponId.match(/(\d+)(?!.*\d)/);
  return match ? parseInt(match[1], 10) : 1;
}

function normalizeCriticalSlotText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeEquipmentLocation(location: string): string {
  return location.split(',')[0]?.trim() ?? location.trim();
}

function normalizeEquipmentId(id: string): string {
  return id
    .replace(/^\d+-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeAmmoLookupKey(idOrName: string): string {
  return normalizeCriticalSlotText(idOrName);
}

function ammoLookupCandidates(slotText: string): readonly string[] {
  const cleaned = stripCriticalSlotRearMarker(slotText)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:artemis|narc)-capable\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const candidates = new Set<string>([cleaned]);

  const addAmmoNameCandidates = (
    techLabel: string | undefined,
    rest: string,
  ) => {
    const restWithSpaces = rest.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const restVariants = new Set<string>([rest.trim(), restWithSpaces]);
    for (const variant of Array.from(restVariants)) {
      if (!variant) continue;
      candidates.add(`${variant} Ammo`);
      if (techLabel) {
        candidates.add(`${techLabel} ${variant} Ammo`);
      }
    }
  };

  const techMatch = cleaned.match(/^(IS|CL|Clan)\s+Ammo\s+(.+)$/i);
  if (techMatch) {
    const tech = techMatch[1];
    const rest = techMatch[2];
    if (tech === undefined || rest === undefined) return Array.from(candidates);
    const techLabel = tech.toUpperCase() === 'CL' ? 'Clan' : tech;
    addAmmoNameCandidates(techLabel, rest);
  }

  const ammoFirstMatch = cleaned.match(/^Ammo\s+(.+)$/i);
  const ammoFirstRest = ammoFirstMatch?.[1];
  if (ammoFirstRest !== undefined) {
    addAmmoNameCandidates(undefined, ammoFirstRest);
  }

  return Array.from(candidates);
}

function weaponTypeFromAmmoId(ammoId: string): string {
  if (ammoId.startsWith('ammo-')) {
    return ammoId.slice('ammo-'.length);
  }
  if (ammoId.endsWith('-ammo')) {
    return ammoId.slice(0, -'-ammo'.length);
  }
  return ammoId;
}

function weaponTypeFromAmmoStats(ammo: ICatalogAmmoStats): string {
  if (ammo.compatibleWeaponIds.length === 1) {
    return ammo.compatibleWeaponIds[0];
  }
  return weaponTypeFromAmmoId(ammo.id);
}

function ammoBinIdForCriticalSlot(
  sourceLocation: string,
  slotIndex: number,
  ammoId: string,
): string | undefined {
  const runnerLocation =
    runnerCriticalLocationFromCatalogLocation(sourceLocation);
  return runnerLocation !== undefined
    ? `${runnerLocation}-${slotIndex}-${ammoId}`
    : undefined;
}

function ammoStatsForCriticalSlot(
  slotText: string,
  ammoLookup: AmmoLookup,
): ICatalogAmmoStats | null {
  for (const candidate of ammoLookupCandidates(slotText)) {
    const stats = ammoLookup(candidate);
    if (stats) return stats;
  }
  return null;
}

let cachedCatalogAmmoLookup: AmmoLookup | undefined;

function defaultCatalogAmmoLookup(): AmmoLookup {
  cachedCatalogAmmoLookup ??= buildAmmoLookupFromCatalogFiles(
    AMMUNITION_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
  );
  return cachedCatalogAmmoLookup;
}

function equipmentSignalsFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratableEquipmentSignal[] {
  const equipment =
    (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
  const signals: IHydratableEquipmentSignal[] = [];

  for (const raw of equipment) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<IUnitEquipmentEntry>;
    if (typeof entry.id !== 'string') continue;

    const sourceLocation =
      typeof entry.location === 'string'
        ? normalizeEquipmentLocation(entry.location)
        : undefined;
    signals.push({
      id: entry.id,
      ...(sourceLocation ? { sourceLocation } : {}),
    });
  }

  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  for (const [location, slots] of Object.entries(criticalSlots)) {
    const sourceLocation = normalizeEquipmentLocation(location);
    for (const slot of slots) {
      if (typeof slot !== 'string') continue;
      signals.push({
        id: slot,
        ...(sourceLocation ? { sourceLocation } : {}),
      });
    }
  }

  return signals;
}

const ECM_TYPE_BY_EQUIPMENT_ID: Readonly<Record<string, ECMType>> = {
  guardianecm: 'guardian',
  guardianecmsuite: 'guardian',
  guardianecmsuiteprototype: 'guardian',
  isguardianecm: 'guardian',
  isguardianecmsuite: 'guardian',
  isguardianecmsuiteprototype: 'guardian',
  angelecm: 'angel',
  angelecmsuite: 'angel',
  isangelecm: 'angel',
  isangelecmsuite: 'angel',
  isthbangelecmsuite: 'angel',
  thbangelecmsuite: 'angel',
  clanecm: 'clan',
  clanecmsuite: 'clan',
  clecmsuite: 'clan',
  ecmsuite: 'clan',
  clncews: 'clan',
  clnovacews: 'clan',
  clwatchdogcews: 'clan',
  clwatchdogecm: 'clan',
  novacews: 'clan',
  novacombinedelectronicwarfaresystemcews: 'clan',
  watchdogcews: 'clan',
  watchdogcompositeelectronicwarfaresystemcews: 'clan',
  watchdogecm: 'clan',
  watchdogecmsuite: 'clan',
};

const ACTIVE_PROBE_TYPE_BY_EQUIPMENT_ID: Readonly<
  Record<string, IActiveProbe['type']>
> = {
  activeprobebeagle: 'beagle',
  activeprobebeagleprototype: 'beagle',
  beagleactiveprobe: 'beagle',
  beagleactiveprobeprototype: 'beagle',
  isactiveprobebeagle: 'beagle',
  isactiveprobebeagleprototype: 'beagle',
  isbeagleactiveprobe: 'beagle',
  isbeagleactiveprobeprototype: 'beagle',
  bloodhoundactiveprobe: 'bloodhound',
  isbloodhoundactiveprobe: 'bloodhound',
  isthbbloodhoundactiveprobe: 'bloodhound',
  thbbloodhoundactiveprobe: 'bloodhound',
  clanactiveprobe: 'clan-active-probe',
  clactiveprobe: 'clan-active-probe',
  activeprobelight: 'light-active-probe',
  clanlightactiveprobe: 'light-active-probe',
  cllightactiveprobe: 'light-active-probe',
  isactiveprobelight: 'light-active-probe',
  lightactiveprobe: 'light-active-probe',
  clwatchdogcews: 'watchdog-cews',
  clwatchdogecm: 'watchdog-cews',
  watchdogcews: 'watchdog-cews',
  watchdogcompositeelectronicwarfaresystemcews: 'watchdog-cews',
  watchdogecm: 'watchdog-cews',
  watchdogecmsuite: 'watchdog-cews',
  clncews: 'nova-cews',
  clnovacews: 'nova-cews',
  novacews: 'nova-cews',
  novacombinedelectronicwarfaresystemcews: 'nova-cews',
};

interface IC3EquipmentClassification {
  readonly role: IC3EquipmentMountState['role'];
  readonly boosted?: boolean;
}

const C3_EQUIPMENT_BY_ID: Readonly<Record<string, IC3EquipmentClassification>> =
  {
    c3master: { role: 'master' },
    c3mastercomputer: { role: 'master' },
    c3computermaster: { role: 'master' },
    isc3computer: { role: 'master' },
    isc3mastercomputer: { role: 'master' },
    isc3masterunit: { role: 'master' },
    c3boostedmaster: { role: 'master', boosted: true },
    c3boostedsystemmaster: { role: 'master', boosted: true },
    c3boostedsystemc3bsmaster: { role: 'master', boosted: true },
    c3bsmaster: { role: 'master', boosted: true },
    isc3masterboostedsystemunit: { role: 'master', boosted: true },
    isc3mastercomputerboosted: { role: 'master', boosted: true },
    c3slave: { role: 'slave' },
    c3slaveunit: { role: 'slave' },
    c3computerslave: { role: 'slave' },
    isc3slave: { role: 'slave' },
    isc3slaveunit: { role: 'slave' },
    c3boostedslave: { role: 'slave', boosted: true },
    c3boostedsystemslave: { role: 'slave', boosted: true },
    c3boostedsystemc3bsslave: { role: 'slave', boosted: true },
    c3bsslave: { role: 'slave', boosted: true },
    isc3boostedsystemslaveunit: { role: 'slave', boosted: true },
    c3i: { role: 'c3i' },
    c3iunit: { role: 'c3i' },
    c3icomputer: { role: 'c3i' },
    isc3iunit: { role: 'c3i' },
    isc3icomputer: { role: 'c3i' },
    isimprovedc3cpu: { role: 'c3i' },
    improvedc3: { role: 'c3i' },
    improvedc3computer: { role: 'c3i' },
    improvedc3computerc3i: { role: 'c3i' },
  };

function isBattleArmorC3Equipment(id: string): boolean {
  const normalized = normalizeEquipmentId(id);
  return (
    normalized === 'bc3' ||
    normalized === 'bc3i' ||
    normalized === 'isbc3i' ||
    normalized.includes('battlearmorc3') ||
    normalized.includes('battlearmorimprovedc3')
  );
}

function isBattleMechC3EquipmentHost(fullUnit: IFullUnit): boolean {
  const unitType = (fullUnit as { unitType?: unknown }).unitType;
  if (typeof unitType !== 'string') return true;

  const normalized = normalizeCriticalSlotText(unitType);
  return (
    normalized === 'battlemech' ||
    normalized === 'omnimech' ||
    normalized === 'industrialmech'
  );
}

function classifyC3Equipment(id: string): IC3EquipmentClassification | null {
  if (isBattleArmorC3Equipment(id)) return null;

  const normalized = normalizeEquipmentId(id);
  const mapped = C3_EQUIPMENT_BY_ID[normalized];
  if (mapped) return mapped;

  if (normalized.includes('c3i') || normalized.includes('improvedc3')) {
    return { role: 'c3i' };
  }
  if (normalized.includes('boosted') && normalized.includes('master')) {
    return { role: 'master', boosted: true };
  }
  if (normalized.includes('boosted') && normalized.includes('slave')) {
    return { role: 'slave', boosted: true };
  }
  if (
    normalized.includes('c3master') ||
    (normalized.includes('c3computer') && normalized.includes('master'))
  ) {
    return { role: 'master' };
  }
  if (
    normalized.includes('c3slave') ||
    (normalized.includes('c3computer') && normalized.includes('slave'))
  ) {
    return { role: 'slave' };
  }

  return null;
}

function classifyECMSuiteEquipment(id: string): ECMType | null {
  const normalized = normalizeEquipmentId(id);
  return (
    ECM_TYPE_BY_EQUIPMENT_ID[normalized] ??
    (normalized.includes('guardianecm')
      ? 'guardian'
      : normalized.includes('angelecm')
        ? 'angel'
        : normalized.includes('ecmsuite') || normalized.includes('cews')
          ? 'clan'
          : null)
  );
}

function classifyActiveProbeEquipment(id: string): IActiveProbe['type'] | null {
  const normalized = normalizeEquipmentId(id);
  return (
    ACTIVE_PROBE_TYPE_BY_EQUIPMENT_ID[normalized] ??
    (normalized.includes('bloodhoundactiveprobe')
      ? 'bloodhound'
      : normalized.includes('beagleactiveprobe')
        ? 'beagle'
        : normalized.includes('lightactiveprobe')
          ? 'light-active-probe'
          : normalized.includes('watchdog')
            ? 'watchdog-cews'
            : normalized.includes('nova') || normalized.includes('ncews')
              ? 'nova-cews'
              : normalized.includes('activeprobe')
                ? 'clan-active-probe'
                : null)
  );
}

export function hydrateECMSuitesFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratedECMSuiteData[] {
  const suites: IHydratedECMSuiteData[] = [];
  const seen = new Set<string>();

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    const type = classifyECMSuiteEquipment(signal.id);
    if (!type) continue;

    const key = `${type}:${normalizeEquipmentId(signal.id)}:${signal.sourceLocation ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    suites.push({
      type,
      sourceEquipmentId: signal.id,
      ...(signal.sourceLocation
        ? { sourceLocation: signal.sourceLocation }
        : {}),
    });
  }

  return suites;
}

export function hydrateActiveProbesFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratedActiveProbeData[] {
  const probes: IHydratedActiveProbeData[] = [];
  const seen = new Set<string>();

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    const type = classifyActiveProbeEquipment(signal.id);
    if (!type) continue;

    const key = `${type}:${normalizeEquipmentId(signal.id)}:${signal.sourceLocation ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    probes.push({
      type,
      sourceEquipmentId: signal.id,
      ...(signal.sourceLocation
        ? { sourceLocation: signal.sourceLocation }
        : {}),
    });
  }

  return probes;
}

export function hydrateC3EquipmentFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratedC3EquipmentData[] {
  if (!isBattleMechC3EquipmentHost(fullUnit)) return [];

  const equipment: IHydratedC3EquipmentData[] = [];
  const seen = new Set<string>();

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    const classification = classifyC3Equipment(signal.id);
    if (!classification) continue;

    const key = `${classification.role}:${classification.boosted === true}:${normalizeEquipmentId(signal.id)}:${signal.sourceLocation ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    equipment.push({
      role: classification.role,
      sourceEquipmentId: signal.id,
      ...(signal.sourceLocation
        ? { sourceLocation: signal.sourceLocation }
        : {}),
      ...(classification.boosted ? { boosted: true } : {}),
    });
  }

  return equipment;
}

function criticalSlotsFromFullUnit(fullUnit: IFullUnit): CriticalSlotMap {
  const raw = (fullUnit as { criticalSlots?: unknown }).criticalSlots;
  if (!raw || typeof raw !== 'object') return {};

  const out: Record<string, readonly (string | null)[]> = {};
  for (const [location, slots] of Object.entries(raw)) {
    if (!Array.isArray(slots)) continue;
    out[location] = slots.map((slot) =>
      typeof slot === 'string' || slot === null ? slot : null,
    );
  }
  return out;
}

function stripCriticalSlotRearMarker(text: string): string {
  return text.replace(/\s*\([a-z]\)\s*$/i, '').trim();
}

function normalizedWithoutTechPrefix(normalized: string): string {
  return normalized.replace(/^(is|clan|cl)/, '');
}

function runtimeWeaponCatalogId(weaponId: string): string {
  return weaponId.replace(/-\d+$/, '');
}

function addAutocannonAlias(aliases: Set<string>, normalized: string): void {
  const match = normalized.match(/^ac(\d+)$/);
  if (match) {
    aliases.add(`autocannon${match[1]}`);
  }
}

function weaponAliases(weapon: IWeapon): readonly string[] {
  const aliases = new Set<string>();
  const baseId = normalizeCriticalSlotText(runtimeWeaponCatalogId(weapon.id));
  const name = normalizeCriticalSlotText(weapon.name);

  for (const alias of [baseId, name]) {
    aliases.add(alias);
    aliases.add(normalizedWithoutTechPrefix(alias));
    addAutocannonAlias(aliases, alias);
  }

  return Array.from(aliases);
}

function criticalSlotMatchesWeapon(
  slotText: string,
  weapon: IWeapon,
  sourceLocation: string,
): boolean {
  const weaponLocation =
    typeof weapon.location === 'string'
      ? normalizeEquipmentLocation(weapon.location)
      : '';
  if (
    weaponLocation.length > 0 &&
    normalizeEquipmentLocation(sourceLocation) !== weaponLocation
  ) {
    return false;
  }

  const normalized = normalizeCriticalSlotText(
    stripCriticalSlotRearMarker(slotText),
  );
  const normalizedWithoutPrefix = normalizedWithoutTechPrefix(normalized);
  return weaponAliases(weapon).some(
    (alias) => alias === normalized || alias === normalizedWithoutPrefix,
  );
}

function weaponIdForCriticalSlot(
  slotText: string,
  sourceLocation: string,
  aiWeapons: readonly IWeapon[],
): string | undefined {
  return aiWeapons.find((weapon) =>
    criticalSlotMatchesWeapon(slotText, weapon, sourceLocation),
  )?.id;
}

function runnerCriticalLocationFromCatalogLocation(
  location: string,
): string | undefined {
  const normalized = normalizeEquipmentLocation(location)
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return CATALOG_TO_RUNNER_LOC[normalized];
}

type UnitCaseProtection = NonNullable<IUnitGameState['caseProtection']>;
type UnitCaseProtectionLevel = UnitCaseProtection[string];

function isCaseIIEquipmentSignal(normalized: string): boolean {
  return ['caseii', 'case2'].includes(normalized);
}

function isStandardCASEEquipmentSignal(normalized: string): boolean {
  return ['case', 'casep', 'caseprototype', 'prototypecase'].includes(
    normalized,
  );
}

function classifyCASEProtection(id: string): UnitCaseProtectionLevel | null {
  const normalized = normalizeEquipmentId(id);
  const withoutTechPrefix = normalizedWithoutTechPrefix(normalized);
  if (isCaseIIEquipmentSignal(withoutTechPrefix)) {
    return 'case_ii';
  }
  if (isStandardCASEEquipmentSignal(withoutTechPrefix)) {
    return 'case';
  }
  return null;
}

export function hydrateCASEProtectionFromFullUnit(
  fullUnit: IFullUnit,
): IUnitGameState['caseProtection'] | undefined {
  const protectionByLocation: Record<string, UnitCaseProtectionLevel> = {};

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    if (signal.sourceLocation === undefined) continue;
    const runnerLocation = runnerCriticalLocationFromCatalogLocation(
      signal.sourceLocation,
    );
    if (runnerLocation === undefined) continue;

    const protection = classifyCASEProtection(signal.id);
    if (protection === null) continue;

    const current = protectionByLocation[runnerLocation];
    if (current === 'case_ii') continue;
    protectionByLocation[runnerLocation] = protection;
  }

  return Object.keys(protectionByLocation).length > 0
    ? protectionByLocation
    : undefined;
}

function classifyCriticalSlotComponent(
  slotText: string,
  sourceLocation: string,
  aiWeapons: readonly IWeapon[],
): {
  readonly componentType: CriticalSlotComponentType;
  readonly actuatorType?: ActuatorType;
  readonly weaponId?: string;
} {
  const normalized = normalizeCriticalSlotText(
    stripCriticalSlotRearMarker(slotText),
  );
  const actuatorType = ACTUATOR_TYPE_BY_SLOT_TEXT[normalized];
  if (actuatorType !== undefined) {
    return { componentType: 'actuator', actuatorType };
  }
  if (normalized.includes('lifesupport')) {
    return { componentType: 'life_support' };
  }
  if (normalized.includes('sensor')) {
    return { componentType: 'sensor' };
  }
  if (normalized.includes('cockpit')) {
    return { componentType: 'cockpit' };
  }
  if (normalized.includes('gyro')) {
    return { componentType: 'gyro' };
  }
  if (normalized.includes('engine')) {
    return { componentType: 'engine' };
  }
  if (normalized.includes('heatsink')) {
    return { componentType: 'heat_sink' };
  }
  if (normalized.includes('jumpjet')) {
    return { componentType: 'jump_jet' };
  }
  if (normalized.includes('ammo')) {
    return { componentType: 'ammo' };
  }

  const weaponId = weaponIdForCriticalSlot(slotText, sourceLocation, aiWeapons);
  if (weaponId !== undefined) {
    return { componentType: 'weapon', weaponId };
  }

  return { componentType: 'equipment' };
}

function criticalSlotEntryFromText(
  slotText: string,
  slotIndex: number,
  sourceLocation: string,
  aiWeapons: readonly IWeapon[],
  ammoLookup: AmmoLookup,
): ICriticalSlotEntry {
  const classification = classifyCriticalSlotComponent(
    slotText,
    sourceLocation,
    aiWeapons,
  );
  const ammo =
    classification.componentType === 'ammo'
      ? ammoStatsForCriticalSlot(slotText, ammoLookup)
      : null;
  const ammoBinId =
    ammo !== null
      ? ammoBinIdForCriticalSlot(sourceLocation, slotIndex, ammo.id)
      : undefined;

  return {
    slotIndex,
    componentType: classification.componentType,
    componentName: stripCriticalSlotRearMarker(slotText),
    destroyed: false,
    ...(classification.actuatorType !== undefined
      ? { actuatorType: classification.actuatorType }
      : {}),
    ...(classification.weaponId !== undefined
      ? { weaponId: classification.weaponId }
      : {}),
    ...(ammoBinId !== undefined ? { ammoBinId } : {}),
  };
}

function mergeCriticalSlotEntries(
  baseEntries: readonly ICriticalSlotEntry[],
  sourceEntries: readonly ICriticalSlotEntry[],
): readonly ICriticalSlotEntry[] {
  const bySlotIndex = new Map<number, ICriticalSlotEntry>();
  for (const entry of baseEntries) {
    bySlotIndex.set(entry.slotIndex, entry);
  }
  for (const entry of sourceEntries) {
    bySlotIndex.set(entry.slotIndex, entry);
  }
  return Array.from(bySlotIndex.values()).sort(
    (a, b) => a.slotIndex - b.slotIndex,
  );
}

export function hydrateCriticalSlotManifestFromFullUnit(
  fullUnit: IFullUnit,
  aiWeapons: readonly IWeapon[] = [],
  ammoLookup: AmmoLookup = defaultCatalogAmmoLookup(),
): CriticalSlotManifest | undefined {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  const baseManifest = buildCriticalSlotManifest();
  const customSlots: Record<string, readonly ICriticalSlotEntry[]> = {};

  for (const [sourceLocation, sourceSlots] of Object.entries(criticalSlots)) {
    const runnerLocation =
      runnerCriticalLocationFromCatalogLocation(sourceLocation);
    if (runnerLocation === undefined) continue;

    const sourceEntries = sourceSlots
      .map((slotText, slotIndex) =>
        typeof slotText === 'string'
          ? criticalSlotEntryFromText(
              slotText,
              slotIndex,
              sourceLocation,
              aiWeapons,
              ammoLookup,
            )
          : null,
      )
      .filter((entry): entry is ICriticalSlotEntry => entry !== null);
    if (sourceEntries.length === 0) continue;

    const sourceLooksComplete =
      sourceSlots.length >=
      (CRITICAL_SLOT_LOCATION_COUNTS[runnerLocation] ?? 0);
    customSlots[runnerLocation] = sourceLooksComplete
      ? sourceEntries
      : mergeCriticalSlotEntries(
          baseManifest[runnerLocation] ?? [],
          sourceEntries,
        );
  }

  return Object.keys(customSlots).length > 0
    ? buildCriticalSlotManifest(customSlots)
    : undefined;
}

function locationSlotTexts(
  criticalSlots: CriticalSlotMap,
  location: string,
): readonly string[] {
  return (criticalSlots[location] ?? []).filter(
    (slot): slot is string => typeof slot === 'string',
  );
}

function hasArtemisIVFCS(slots: readonly string[]): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotText(slot);
    return (
      normalized.includes('artemisiv') &&
      !normalized.includes('ammo') &&
      !normalized.includes('capable') &&
      !normalized.includes('artemisv') &&
      !normalized.includes('prototypeartemisiv') &&
      !normalized.includes('artemisivproto')
    );
  });
}

function hasPrototypeArtemisIVFCS(slots: readonly string[]): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotText(slot);
    return (
      (normalized.includes('prototypeartemisiv') ||
        normalized.includes('artemisivproto')) &&
      !normalized.includes('ammo') &&
      !normalized.includes('capable')
    );
  });
}

function hasArtemisVFCS(slots: readonly string[]): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotText(slot);
    return (
      normalized.includes('artemisv') &&
      !normalized.includes('ammo') &&
      !normalized.includes('capable')
    );
  });
}

function hasArtemisIVCapableAmmo(slots: readonly string[]): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotText(slot);
    return (
      normalized.includes('artemiscapable') &&
      !normalized.includes('artemisvcapable')
    );
  });
}

function hasArtemisVCapableAmmo(slots: readonly string[]): boolean {
  return slots.some((slot) =>
    normalizeCriticalSlotText(slot).includes('artemisvcapable'),
  );
}

function isArtemisCompatibleCatalogWeapon(
  catalogWeapon: ICatalogWeaponStats,
): boolean {
  const text = catalogText(catalogWeapon);
  if (/\bstreak\b|narc|tag|anti[-\s]?missile|ams/.test(text)) return false;
  return (
    /\blrm\b|lrm[-\s]?\d+/.test(text) ||
    /\bsrm\b|srm[-\s]?\d+/.test(text) ||
    /\bmml\b|mml[-\s]?\d+/.test(text)
  );
}

function applyArtemisGuidanceFlags(
  weapon: IWeapon,
  catalogWeapon: ICatalogWeaponStats,
  locationSlots: readonly string[],
): IWeapon {
  if (!isArtemisCompatibleCatalogWeapon(catalogWeapon)) return weapon;

  if (hasArtemisVFCS(locationSlots) && hasArtemisVCapableAmmo(locationSlots)) {
    return { ...weapon, hasArtemisV: true };
  }

  if (
    hasArtemisIVFCS(locationSlots) &&
    hasArtemisIVCapableAmmo(locationSlots)
  ) {
    return { ...weapon, hasArtemisIV: true };
  }

  if (
    hasPrototypeArtemisIVFCS(locationSlots) &&
    hasArtemisIVCapableAmmo(locationSlots)
  ) {
    return { ...weapon, hasPrototypeArtemisIV: true };
  }

  return weapon;
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
export function hydrateAIWeaponsFromFullUnitWithReport(
  fullUnit: IFullUnit,
  weaponLookup: WeaponLookup,
): IHydratedAIWeaponsReport {
  const equipment =
    (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  const out: IWeapon[] = [];
  const resolvedEquipmentIds: string[] = [];
  const unresolvedEquipmentIds: string[] = [];
  let mountIndex = 0;
  for (const raw of equipment) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as IUnitEquipmentEntry;
    if (typeof entry.id !== 'string') continue;
    const normalizedEntryId = normalizeEquipmentId(entry.id);
    const stats =
      weaponLookup(entry.id) ??
      weaponLookup(normalizedEntryId) ??
      weaponLookup(normalizedWithoutTechPrefix(normalizedEntryId));
    if (!stats) {
      unresolvedEquipmentIds.push(entry.id);
      continue;
    }
    const location =
      typeof entry.location === 'string'
        ? normalizeEquipmentLocation(entry.location)
        : '';
    const aiWeapon = toAIWeapon(
      stats,
      mountIndex,
      location,
      mountingArcFromEquipment(entry),
    );
    out.push(
      applyArtemisGuidanceFlags(
        aiWeapon,
        stats,
        locationSlotTexts(criticalSlots, location),
      ),
    );
    resolvedEquipmentIds.push(entry.id);
    mountIndex++;
  }
  return { weapons: out, resolvedEquipmentIds, unresolvedEquipmentIds };
}

export function hydrateAIWeaponsFromFullUnitStrict(
  fullUnit: IFullUnit,
  weaponLookup: WeaponLookup,
): readonly IWeapon[] {
  const report = hydrateAIWeaponsFromFullUnitWithReport(fullUnit, weaponLookup);
  const unitLabel =
    [fullUnit.chassis, fullUnit.model ?? fullUnit.variant]
      .filter((part): part is string => typeof part === 'string')
      .join(' ')
      .trim() || fullUnit.id;

  if (report.unresolvedEquipmentIds.length > 0) {
    throw new Error(
      `Unable to hydrate combat weapons for ${unitLabel}: unresolved equipment ids ${report.unresolvedEquipmentIds.join(
        ', ',
      )}`,
    );
  }
  if (report.weapons.length === 0) {
    throw new Error(
      `Unable to hydrate combat weapons for ${unitLabel}: no combat weapons resolved`,
    );
  }

  return report.weapons;
}

export function hydrateAIWeaponsFromFullUnit(
  fullUnit: IFullUnit,
  weaponLookup: WeaponLookup,
): readonly IWeapon[] {
  return hydrateAIWeaponsFromFullUnitWithReport(fullUnit, weaponLookup).weapons;
}

export function hydrateAmmoStateFromFullUnit(
  fullUnit: IFullUnit,
  ammoLookup: AmmoLookup = defaultCatalogAmmoLookup(),
): Record<string, IAmmoSlotState> | undefined {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  const ammoState: Record<string, IAmmoSlotState> = {};

  for (const [sourceLocation, sourceSlots] of Object.entries(criticalSlots)) {
    const runnerLocation =
      runnerCriticalLocationFromCatalogLocation(sourceLocation);
    if (runnerLocation === undefined) continue;

    for (let slotIndex = 0; slotIndex < sourceSlots.length; slotIndex++) {
      const slotText = sourceSlots[slotIndex];
      if (typeof slotText !== 'string') continue;
      const ammo = ammoStatsForCriticalSlot(slotText, ammoLookup);
      if (!ammo) continue;
      const binId = ammoBinIdForCriticalSlot(
        sourceLocation,
        slotIndex,
        ammo.id,
      );
      if (binId === undefined) continue;

      ammoState[binId] = {
        binId,
        weaponType: weaponTypeFromAmmoStats(ammo),
        location: runnerLocation,
        remainingRounds: ammo.shotsPerTon,
        maxRounds: ammo.shotsPerTon,
        isExplosive: ammo.isExplosive,
      };
    }
  }

  return Object.keys(ammoState).length > 0 ? ammoState : undefined;
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

function hydrateArmorTypeByLocationFromFullUnit(
  fullUnit: IFullUnit,
  armor: Readonly<Record<string, number>>,
): IUnitGameState['armorTypeByLocation'] | undefined {
  const armorType = (fullUnit.armor as { type?: unknown } | undefined)?.type;
  if (typeof armorType !== 'string' || armorType.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    Object.keys(armor).map((location) => [location, armorType]),
  );
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
  const armorTypeByLocation = hydrateArmorTypeByLocationFromFullUnit(
    fullUnit,
    armor,
  );
  const { structure } = hydrateStructureFromFullUnit(fullUnit);
  const heatSinks = hydrateHeatSinksFromFullUnit(fullUnit);
  const talons = hydrateTalonStateFromFullUnit(fullUnit);
  const claws = hydrateClawStateFromFullUnit(fullUnit);
  const c3Equipment = hydrateC3EquipmentFromFullUnit(fullUnit);
  const ammoState = hydrateAmmoStateFromFullUnit(fullUnit);
  const caseProtection = hydrateCASEProtectionFromFullUnit(fullUnit);

  return {
    id: runnerUnitId,
    unitType: fullUnit.unitType,
    motionType: hydrateMotionTypeFromFullUnit(fullUnit),
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery,
    piloting,
    heatSinks: heatSinks.count,
    heatSinkType: heatSinks.kind,
    hasTSM: hydrateHasTSMFromFullUnit(fullUnit),
    hasMASC: hydrateHasMASCFromFullUnit(fullUnit),
    hasSupercharger: hydrateHasSuperchargerFromFullUnit(fullUnit),
    ...(c3Equipment.length > 0 ? { c3Equipment } : {}),
    partialWingJumpBonus: hydratePartialWingJumpBonusFromFullUnit(fullUnit),
    leftLegHasTalons: talons.leftLegHasTalons,
    rightLegHasTalons: talons.rightLegHasTalons,
    leftArmHasTalons: talons.leftArmHasTalons,
    rightArmHasTalons: talons.rightArmHasTalons,
    leftArmHasClaw: claws.leftArmHasClaw,
    rightArmHasClaw: claws.rightArmHasClaw,
    hasStealthArmor: hydrateHasStealthArmorFromFullUnit(fullUnit),
    unitQuirks: hydrateUnitQuirksFromFullUnit(fullUnit),
    weaponLocationById: weaponLocationByIdFromWeapons(hydrated.aiWeapons),
    armor,
    ...(armorTypeByLocation !== undefined ? { armorTypeByLocation } : {}),
    // Mirror starting structure into `startingInternalStructure` so the
    // retreat-trigger ratio (per `add-bot-retreat-behavior`) sees the
    // canonical pre-damage value, matching the engine path's contract.
    startingInternalStructure: { ...structure },
    structure,
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    ...(ammoState !== undefined ? { ammoState } : {}),
    ...(caseProtection !== undefined ? { caseProtection } : {}),
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    hasRetreated: false,
    hasEjected: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    isStuck: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
  };
}

export function weaponLocationByIdFromWeapons(
  weapons: readonly IWeapon[],
): Readonly<Record<string, string>> | undefined {
  const out: Record<string, string> = {};
  for (const weapon of weapons) {
    if (weapon.location !== undefined && weapon.location.length > 0) {
      out[weapon.id] = weapon.location;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
      const subType = item.subType;
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
      const special = Array.isArray(item.special)
        ? item.special.filter(
            (entry): entry is string => typeof entry === 'string',
          )
        : [];
      map.set(id, {
        id,
        name,
        ...(typeof subType === 'string' ? { subType } : {}),
        damage,
        heat,
        ranges: { minimum, short, medium, long },
        ammoPerTon,
        special,
      });
    }
  }

  for (const [alias, canonicalId] of Object.entries(
    SOURCE_BACKED_WEAPON_LOOKUP_ALIASES,
  )) {
    const stats = map.get(canonicalId);
    if (!stats) continue;
    map.set(alias, stats);
    map.set(normalizeCriticalSlotText(alias), stats);
  }

  return (id: string) => map.get(id) ?? null;
}

export function buildAmmoLookupFromCatalogFiles(
  files: readonly { items?: readonly unknown[] }[],
): AmmoLookup {
  const byId = new Map<string, ICatalogAmmoStats>();
  const byAlias = new Map<string, ICatalogAmmoStats>();

  const addAlias = (alias: string, ammo: ICatalogAmmoStats): void => {
    if (alias.length === 0) return;
    byAlias.set(alias, ammo);
    byAlias.set(normalizeAmmoLookupKey(alias), ammo);
  };

  for (const file of files) {
    const items = file.items ?? [];
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const id = item.id;
      const name = item.name;
      const shotsPerTon = item.shotsPerTon;
      const isExplosive = item.isExplosive;
      if (
        typeof id !== 'string' ||
        typeof name !== 'string' ||
        typeof shotsPerTon !== 'number' ||
        typeof isExplosive !== 'boolean'
      ) {
        continue;
      }

      const compatibleWeaponIds = Array.isArray(item.compatibleWeaponIds)
        ? item.compatibleWeaponIds.filter(
            (weaponId): weaponId is string => typeof weaponId === 'string',
          )
        : [];
      const ammo: ICatalogAmmoStats = {
        id,
        name,
        shotsPerTon,
        isExplosive,
        compatibleWeaponIds,
      };
      byId.set(id, ammo);
      addAlias(id, ammo);
      addAlias(name, ammo);
    }
  }

  for (const [alias, mappedId] of Object.entries(NAME_MAPPINGS_DATA)) {
    if (typeof mappedId !== 'string') continue;
    const ammo = byId.get(mappedId);
    if (ammo) {
      addAlias(alias, ammo);
      addAlias(mappedId, ammo);
    }
  }

  return (idOrName: string) =>
    byAlias.get(idOrName) ??
    byAlias.get(normalizeAmmoLookupKey(idOrName)) ??
    null;
}
