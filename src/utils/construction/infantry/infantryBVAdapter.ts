/**
 * Infantry BV Adapter
 *
 * Translates an infantry platoon store state into the well-typed
 * `InfantryBVInput` consumed by `calculateInfantryBV`. Keeps BV calculation
 * decoupled from Zustand store shape (store evolves independently of math).
 *
 * The adapter is deliberately tolerant:
 *   - Missing / unknown primary weapon IDs fall back to an inferred table entry
 *     using the human-readable name; if still unresolved, `damageDivisor`
 *     defaults to 10 (the most common personal weapon divisor).
 *   - Secondary weapon is optional — omitted when the state has no secondary.
 *   - Field-gun ammo bins are synthesized from `ammoRounds` via a conventional
 *     id pattern; concrete projects wire real ammo ids via the field-gun
 *     catalog as they expand coverage.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 */

import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { IInfantryFieldGun } from '@/types/unit/InfantryInterfaces';
import {
  InfantryMotive,
  IPlatoonComposition,
} from '@/types/unit/InfantryInterfaces';
import { IInfantry, InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import {
  calculateInfantryBV,
  IInfantryBVBreakdown,
  InfantryBVInput,
  InfantryFieldGunMount,
  InfantryWeaponRef,
} from './infantryBV';
import { totalTroopers } from './platoonComposition';
import { findWeaponById, INFANTRY_WEAPON_TABLE } from './weaponTable';

// =============================================================================
// Store-shape contract
// =============================================================================

/**
 * Minimal subset of the infantry store state required to compute BV.
 *
 * We deliberately avoid importing `InfantryStore` here to keep the calculator
 * free of Zustand typing and to prevent a circular store <-> calculator
 * dependency. Any state that conforms to this shape can feed the calculator.
 */
export interface InfantryStateLike {
  /** Granular construction motive (drives MP and composition defaults). */
  infantryMotive: InfantryMotive;
  /** Platoon composition — converted to a trooper count via `totalTroopers`. */
  platoonComposition: IPlatoonComposition;
  /** Armor kit drives per-trooper BV modifier. */
  armorKit: InfantryArmorKit;
  /** Anti-mech training flag → platoon × 1.1. */
  hasAntiMechTraining: boolean;
  /** Primary weapon display name (e.g. "Rifle"). */
  primaryWeapon: string;
  /** Primary weapon canonical equipment id (e.g. `inf-rifle`). */
  primaryWeaponId?: string;
  /** Secondary weapon display name (optional). */
  secondaryWeapon?: string;
  /** Secondary weapon canonical equipment id (optional). */
  secondaryWeaponId?: string;
  /** Number of secondary weapons in the platoon (0 when no secondary). */
  secondaryWeaponCount: number;
  /** Field guns crewed by the platoon. */
  fieldGuns: readonly IInfantryFieldGun[];
}

// =============================================================================
// Primary weapon resolution
// =============================================================================

/**
 * Resolve a trooper weapon spec by id or name.
 *
 * Priority:
 *   1. `findWeaponById(id)` — canonical table lookup.
 *   2. name-based fallback — matches the display name against the table.
 *   3. defaults — divisor 10, no secondary ratio, catalog-resolved BV.
 *
 * The returned `damageDivisor` and `secondaryRatio` come from the canonical
 * weapon table when possible — they never come from runtime store data.
 */
function resolveTrooperWeapon(
  id: string | undefined,
  displayName: string | undefined,
): { damageDivisor: number; secondaryRatio: number; resolvedId: string } {
  const entryById = id ? findWeaponById(id) : undefined;
  if (entryById) {
    return {
      damageDivisor: entryById.damageDivisor,
      secondaryRatio: entryById.secondaryRatio,
      resolvedId: entryById.id,
    };
  }

  if (displayName) {
    const normalized = displayName.trim().toLowerCase();
    const byName = findWeaponTableEntryByName(normalized);
    if (byName) {
      return {
        damageDivisor: byName.damageDivisor,
        secondaryRatio: byName.secondaryRatio,
        resolvedId: byName.id,
      };
    }
  }

  return {
    damageDivisor: 10,
    secondaryRatio: 4,
    resolvedId: id ?? displayName ?? 'inf-rifle',
  };
}

/**
 * Name-based lookup helper — local to the adapter.
 * The canonical `findWeaponById` is the public API; name-fallback is a
 * robustness measure for stores that only carry a display string.
 */
function findWeaponTableEntryByName(
  normalized: string,
): ReturnType<typeof findWeaponById> | undefined {
  return INFANTRY_WEAPON_TABLE.find(
    (w) =>
      w.name.toLowerCase() === normalized ||
      w.id.toLowerCase() === normalized ||
      w.name.toLowerCase().replace(/\s+/g, '-') === normalized,
  );
}

// =============================================================================
// Field gun ammo synthesis
// =============================================================================

/**
 * Infer the ammo id for a field gun.
 *
 * The field-gun catalog uses canonical weapon ids (`ac5`, `lrm15`, `mg`).
 * Mech-scale ammo uses the `is-ammo-<weapon>` family — we map the gun id to
 * the conventional IS ammo id so the equipment catalog resolver can supply
 * a BV. When the resolver fails, the adapter gracefully emits a 0-BV entry.
 */
function ammoIdForFieldGun(gunId: string): string {
  switch (gunId) {
    case 'mg':
      return 'isammomg';
    case 'ac2':
      return 'isammoac2';
    case 'ac5':
      return 'isammoac5';
    case 'ac10':
      return 'isammoac10';
    case 'ac20':
      return 'isammoac20';
    case 'srm2':
      return 'isammosrm2';
    case 'srm4':
      return 'isammosrm4';
    case 'srm6':
      return 'isammosrm6';
    case 'lrm5':
      return 'isammolrm5';
    case 'lrm10':
      return 'isammolrm10';
    case 'lrm15':
      return 'isammolrm15';
    case 'lrm20':
      return 'isammolrm20';
    case 'flamer':
      return 'isammoflamer';
    default:
      return `isammo${gunId.replace(/[^a-z0-9]/gi, '')}`;
  }
}

/**
 * Build `InfantryFieldGunMount[]` from store-shape field guns.
 *
 * Each field gun gets a single ammo bin (the standard 1-ton bin). The ammo
 * excessive-cap in `calculateAmmoBVWithExcessiveCap` already handles scaling
 * when multiple guns of the same family share ammo.
 */
function adaptFieldGuns(
  guns: readonly IInfantryFieldGun[],
): InfantryFieldGunMount[] {
  return guns.map((gun) => {
    const ammoBins: InfantryFieldGunMount['ammo'] =
      gun.ammoRounds && gun.ammoRounds > 0
        ? [
            {
              id: ammoIdForFieldGun(gun.equipmentId),
              weaponTypeOverride: gun.equipmentId,
            },
          ]
        : [];
    return {
      id: gun.equipmentId,
      ammo: ammoBins,
    };
  });
}

// =============================================================================
// Main adapter
// =============================================================================

/**
 * Compute the infantry BV breakdown from a store-shaped state.
 *
 * Extra options allow callers (tests, fixtures, parity harness) to pass a
 * gunnery / piloting skill pair. Defaults: 4 / 5 (baseline pilot).
 */
export function computeInfantryBVFromState(
  state: InfantryStateLike,
  options: { gunnery?: number; piloting?: number } = {},
): IInfantryBVBreakdown {
  const troopers = totalTroopers(state.platoonComposition);

  const primaryResolved = resolveTrooperWeapon(
    state.primaryWeaponId,
    state.primaryWeapon,
  );
  const primary: InfantryWeaponRef = {
    id: primaryResolved.resolvedId,
    damageDivisor: primaryResolved.damageDivisor,
  };

  const hasSecondary =
    !!state.secondaryWeapon && state.secondaryWeaponCount > 0;
  let secondary: InfantryWeaponRef | undefined;
  if (hasSecondary) {
    const resolved = resolveTrooperWeapon(
      state.secondaryWeaponId,
      state.secondaryWeapon,
    );
    secondary = {
      id: resolved.resolvedId,
      damageDivisor: resolved.damageDivisor,
      secondaryRatio: resolved.secondaryRatio,
    };
  }

  const input: InfantryBVInput = {
    motive: state.infantryMotive,
    totalTroopers: troopers,
    primaryWeapon: primary,
    secondaryWeapon: secondary,
    armorKit: state.armorKit,
    hasAntiMechTraining: state.hasAntiMechTraining,
    fieldGuns: adaptFieldGuns(state.fieldGuns),
    gunnery: options.gunnery,
    piloting: options.piloting,
  };

  return calculateInfantryBV(input);
}

// =============================================================================
// IInfantry (handler-shape) adapter
// =============================================================================

/**
 * Map a handler-layer `SquadMotionType` to the BV-layer `InfantryMotive`.
 *
 * The handler uses the coarser `SquadMotionType` enum (Foot / Jump / Motorized /
 * Mechanized / Wheeled / Tracked / Hover / VTOL / Beast), while the BV
 * calculator needs the more granular `InfantryMotive` (which distinguishes the
 * four Mechanized sub-types used by the multiplier table).
 *
 * When the handler carries the plain `MECHANIZED` value (BLK files that did not
 * specify a hull sub-type), we fall back to `MECHANIZED_TRACKED` — all four
 * mechanized multipliers are 1.15, so the exact sub-type does not change the
 * numeric result. `WHEELED`/`TRACKED`/`HOVER`/`VTOL` map to their granular
 * mechanized counterparts. `UMU` and `BEAST` have no BV-layer equivalent and
 * map to `FOOT` (1.0×) — the safest baseline.
 */
function mapSquadMotionToInfantryMotive(
  motion: SquadMotionType,
): InfantryMotive {
  switch (motion) {
    case SquadMotionType.FOOT:
      return InfantryMotive.FOOT;
    case SquadMotionType.JUMP:
      return InfantryMotive.JUMP;
    case SquadMotionType.MOTORIZED:
      return InfantryMotive.MOTORIZED;
    case SquadMotionType.MECHANIZED:
    case SquadMotionType.TRACKED:
      return InfantryMotive.MECHANIZED_TRACKED;
    case SquadMotionType.WHEELED:
      return InfantryMotive.MECHANIZED_WHEELED;
    case SquadMotionType.HOVER:
      return InfantryMotive.MECHANIZED_HOVER;
    case SquadMotionType.VTOL:
      return InfantryMotive.MECHANIZED_VTOL;
    case SquadMotionType.UMU:
    case SquadMotionType.BEAST:
    default:
      return InfantryMotive.FOOT;
  }
}

/**
 * Compute the infantry BV breakdown from the handler-shape `IInfantry` unit.
 *
 * The handler populates `IInfantry` from parsed BLK documents; this adapter
 * bridges that shape into the store-shape consumed by `computeInfantryBVFromState`.
 *
 * Field guns on `IInfantry` do not carry `ammoRounds` (the handler-level
 * `IInfantryFieldGun` is a simpler shape) — we synthesize one ammo bin per gun
 * so the excessive-ammo cap in the BV calculator still behaves correctly.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 */
export function calculateInfantryBVFromUnit(
  unit: IInfantry,
  options: { gunnery?: number; piloting?: number } = {},
): IInfantryBVBreakdown {
  const motive = mapSquadMotionToInfantryMotive(unit.motionType);
  const platoonComposition: IPlatoonComposition = {
    squads: unit.numberOfSquads,
    troopersPerSquad: unit.squadSize,
  };

  // Synthesize handler-level field guns into store-shape guns with one ammo
  // bin each — the BV layer only needs equipmentId + a non-zero ammoRounds
  // flag to emit an ammo entry.
  const fieldGuns: readonly IInfantryFieldGun[] = unit.fieldGuns.map((gun) => ({
    equipmentId: gun.equipmentId,
    name: gun.name,
    crew: gun.crew,
    ammoRounds: 1,
  }));

  const state: InfantryStateLike = {
    infantryMotive: motive,
    platoonComposition,
    armorKit: unit.armorKit,
    hasAntiMechTraining: unit.hasAntiMechTraining,
    primaryWeapon: unit.primaryWeapon,
    primaryWeaponId: unit.primaryWeaponId,
    secondaryWeapon: unit.secondaryWeapon,
    secondaryWeaponId: unit.secondaryWeaponId,
    secondaryWeaponCount: unit.secondaryWeaponCount,
    fieldGuns,
  };

  return computeInfantryBVFromState(state, options);
}
