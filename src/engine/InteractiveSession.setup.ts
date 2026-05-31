/**
 * Interactive Session — construction-time setup collaborator.
 *
 * Extracted from `InteractiveSession` so the constructor stays a thin
 * wiring step. This module owns the two pieces of construction-time
 * derivation: building the per-unit lookup maps (weapons / movement /
 * gunnery / piloting / tonnage) and assembling the `IGameConfig` from
 * the raw constructor arguments + campaign linkage.
 *
 * Both functions are pure with respect to their inputs. Behaviour is
 * preserved exactly — the Phase 1 tonnage stand-in (65t) and the
 * `victoryConditions: ['elimination']` default are unchanged.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import type {
  IGameConfig,
  IGameUnit,
  IVehicleCriticalAvailabilityProfile,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IMovementCapability } from '@/types/gameplay/HexGridInterfaces';

import type { IInteractiveSessionLinkage } from './InteractiveSession.types';
import type { IAdaptedUnit } from './types';

import { toMovementCapability } from './GameEngine.helpers';

/**
 * The five per-unit lookup maps the engine caches at session start so
 * the resolvers and AI driver can read unit attributes without
 * re-adapting the catalog on every turn.
 */
export interface IInteractiveSessionUnitMaps {
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly movementByUnit: Map<string, IMovementCapability>;
  readonly gunneryByUnit: Map<string, number>;
  readonly pilotingByUnit: Map<string, number>;
  readonly tonnageByUnit: Map<string, number>;
}

/**
 * Build the per-unit lookup maps from the adapted units (weapons +
 * movement capability + tonnage) and the game units (gunnery +
 * piloting). Current adapted units carry catalog tonnage when available;
 * missing/legacy fixtures still fall back to the 65t stand-in.
 */
export function buildInteractiveSessionUnitMaps(
  playerUnits: readonly IAdaptedUnit[],
  opponentUnits: readonly IAdaptedUnit[],
  gameUnits: readonly IGameUnit[],
): IInteractiveSessionUnitMaps {
  const weaponsByUnit = new Map<string, readonly IWeapon[]>();
  const movementByUnit = new Map<string, IMovementCapability>();
  const gunneryByUnit = new Map<string, number>();
  const pilotingByUnit = new Map<string, number>();
  const tonnageByUnit = new Map<string, number>();

  for (const u of [...playerUnits, ...opponentUnits]) {
    weaponsByUnit.set(u.id, u.weapons);
    movementByUnit.set(u.id, toMovementCapability(u));
    tonnageByUnit.set(u.id, representedTonnage(u.tonnage));
  }
  for (const gu of gameUnits) {
    gunneryByUnit.set(gu.id, gu.gunnery);
    pilotingByUnit.set(gu.id, gu.piloting);
  }

  return {
    weaponsByUnit,
    movementByUnit,
    gunneryByUnit,
    pilotingByUnit,
    tonnageByUnit,
  };
}

function representedTonnage(tonnage: number | undefined): number {
  return tonnage !== undefined && Number.isFinite(tonnage) && tonnage > 0
    ? tonnage
    : 65;
}

export function gameUnitsWithAdaptedMovementModes(
  gameUnits: readonly IGameUnit[],
  playerUnits: readonly IAdaptedUnit[],
  opponentUnits: readonly IAdaptedUnit[],
): readonly IGameUnit[] {
  const adaptedByUnit = new Map(
    [...playerUnits, ...opponentUnits].map((unit) => [unit.id, unit]),
  );

  return gameUnits.map((unit) => {
    const adapted = adaptedByUnit.get(unit.id);
    if (!adapted) return unit;

    const movementMode = adapted.movementMode;
    const gyroType = adapted.gyroType;
    const vehicleCriticalAvailability = vehicleCriticalAvailabilityFromWeapons(
      adapted.weapons,
    );
    const hasMovementModeUpdate =
      movementMode !== undefined && unit.movementMode !== movementMode;
    const hasGyroTypeUpdate =
      gyroType !== undefined && unit.gyroType !== gyroType;
    const hasVehicleCriticalAvailabilityUpdate =
      unit.vehicleInit !== undefined &&
      vehicleCriticalAvailability !== undefined;

    return hasMovementModeUpdate ||
      hasGyroTypeUpdate ||
      hasVehicleCriticalAvailabilityUpdate
      ? {
          ...unit,
          ...(hasMovementModeUpdate ? { movementMode } : {}),
          ...(hasGyroTypeUpdate ? { gyroType } : {}),
          ...(hasVehicleCriticalAvailabilityUpdate
            ? {
                vehicleInit: {
                  ...unit.vehicleInit,
                  criticalAvailability: mergeVehicleCriticalAvailability(
                    unit.vehicleInit.criticalAvailability,
                    vehicleCriticalAvailability,
                  ),
                },
              }
            : {}),
        }
      : unit;
  });
}

function vehicleCriticalAvailabilityFromWeapons(
  weapons: readonly IWeapon[],
): IVehicleCriticalAvailabilityProfile | undefined {
  const mountedWeapons = weapons.filter(
    (weapon) => weapon.vehicleMountLocation !== undefined,
  );
  if (mountedWeapons.length === 0) {
    return undefined;
  }

  const weaponLocations = uniqueVehicleLocations(
    mountedWeapons.map((weapon) => weapon.vehicleMountLocation),
  );
  const weaponLocationCounts = countVehicleLocations(
    mountedWeapons.map((weapon) => weapon.vehicleMountLocation),
  );
  const liveWeaponLocations = uniqueVehicleLocations(
    mountedWeapons
      .filter((weapon) => !weapon.destroyed)
      .map((weapon) => weapon.vehicleMountLocation),
  );
  const liveWeaponLocationCounts = countVehicleLocations(
    mountedWeapons
      .filter((weapon) => !weapon.destroyed)
      .map((weapon) => weapon.vehicleMountLocation),
  );

  return {
    weaponLocations,
    weaponLocationCounts,
    jammableWeaponLocations: liveWeaponLocations,
    jammableWeaponLocationCounts: liveWeaponLocationCounts,
    destroyableWeaponLocations: liveWeaponLocations,
    destroyableWeaponLocationCounts: liveWeaponLocationCounts,
  };
}

function uniqueVehicleLocations(
  locations: readonly (VehicleLocation | VTOLLocation | undefined)[],
): readonly (VehicleLocation | VTOLLocation)[] {
  return Array.from(
    new Set(
      locations.filter(
        (location): location is VehicleLocation | VTOLLocation =>
          location !== undefined,
      ),
    ),
  );
}

function countVehicleLocations(
  locations: readonly (VehicleLocation | VTOLLocation | undefined)[],
): Partial<Record<string, number>> {
  return locations.reduce<Partial<Record<string, number>>>(
    (counts, location) => {
      return location === undefined
        ? counts
        : { ...counts, [location]: (counts[location] ?? 0) + 1 };
    },
    {},
  );
}

function mergeVehicleCriticalAvailability(
  existing: IVehicleCriticalAvailabilityProfile | undefined,
  derived: IVehicleCriticalAvailabilityProfile,
): IVehicleCriticalAvailabilityProfile {
  if (!existing) {
    return derived;
  }

  return {
    weaponLocations: existing.weaponLocations ?? derived.weaponLocations,
    weaponLocationCounts:
      existing.weaponLocationCounts ?? derived.weaponLocationCounts,
    jammableWeaponLocations:
      existing.jammableWeaponLocations ??
      existing.weaponLocations ??
      derived.jammableWeaponLocations,
    jammableWeaponLocationCounts:
      existing.jammableWeaponLocationCounts ??
      existing.weaponLocationCounts ??
      derived.jammableWeaponLocationCounts,
    destroyableWeaponLocations:
      existing.destroyableWeaponLocations ??
      existing.weaponLocations ??
      derived.destroyableWeaponLocations,
    destroyableWeaponLocationCounts:
      existing.destroyableWeaponLocationCounts ??
      existing.weaponLocationCounts ??
      derived.destroyableWeaponLocationCounts,
    ...(existing.cargoLoaded !== undefined
      ? { cargoLoaded: existing.cargoLoaded }
      : {}),
    ...(existing.stabilizerHitLocations
      ? { stabilizerHitLocations: existing.stabilizerHitLocations }
      : {}),
  };
}

/**
 * Assemble the `IGameConfig` from the raw constructor arguments and the
 * campaign linkage. The Wave 5 round-trip identifiers are stamped onto
 * the config so any later consumer of `IGameSession` (review UI,
 * persistence layer) can read them without keeping a parallel map.
 */
export function buildInteractiveSessionGameConfig(
  mapRadius: number,
  turnLimit: number,
  linkage: IInteractiveSessionLinkage,
  optionalRules: readonly string[] = [],
): IGameConfig {
  return {
    mapRadius,
    turnLimit,
    victoryConditions: ['elimination'],
    optionalRules: [...optionalRules],
    encounterId: linkage.encounterId ?? null,
    campaignId: linkage.campaignId ?? null,
    contractId: linkage.contractId ?? null,
    scenarioId: linkage.scenarioId ?? null,
  };
}
