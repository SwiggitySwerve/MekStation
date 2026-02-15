/**
 * Space Station Unit Handler - Calculation Functions
 *
 * BV and cost calculation methods.
 */

import { ISpaceStation } from './SpaceStationUnitHandler';

/**
 * Calculate Space Station BV
 */
export function calculateSpaceStationBV(unit: ISpaceStation): number {
  let bv = 0;

  bv += unit.totalArmorPoints * 2;
  bv += unit.structuralIntegrity * 25;
  bv += unit.dockingCollars * 40;

  for (const bay of unit.transportBays) {
    bv += bay.capacity * 3;
  }

  return Math.round(bv);
}

/**
 * Calculate Space Station cost
 */
export function calculateSpaceStationCost(unit: ISpaceStation): number {
  let cost = 0;

  cost += unit.tonnage * 50000;
  cost += unit.pressurizedModules * 500000;
  cost += unit.gravDecks * 1000000;
  cost += unit.dockingCollars * 1000000;
  cost += unit.totalArmorPoints * 10000;

  if (unit.hasHPG) {
    cost += 500000000;
  }

  if (unit.hasKFDrive) {
    cost += unit.tonnage * 100000;
  }

  return Math.round(cost);
}

/**
 * Validate Space Station-specific rules
 */
export function validateSpaceStation(unit: ISpaceStation): {
  errors: string[];
  warnings: string[];
  infos: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];

  if (unit.structuralIntegrity < 1) {
    errors.push('Space station must have at least 1 SI');
  }

  if (unit.crewConfiguration.crew < 1) {
    warnings.push('Space station has no crew assigned');
  }

  const totalPersonnel =
    unit.crewConfiguration.crew +
    unit.crewConfiguration.passengers +
    unit.crewConfiguration.marines;
  const escapeCapacity = unit.escapePods * 7 + unit.lifeBoats * 6;
  if (escapeCapacity < totalPersonnel && totalPersonnel > 0) {
    warnings.push(
      `Insufficient escape capacity (${escapeCapacity}) for personnel (${totalPersonnel})`,
    );
  }

  infos.push(`Station type: ${unit.stationType}`);

  if (unit.hasHPG) {
    infos.push('Station has HPG capabilities');
  }

  if (unit.hasKFDrive) {
    infos.push('Station has K-F drive (mobile station)');
  }

  return { errors, warnings, infos };
}
