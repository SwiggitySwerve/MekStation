/**
 * WarShip Unit Handler - Calculations
 */

import { IWarShip, BayType } from '@/types/unit/CapitalShipInterfaces';

export function validateWarShip(unit: IWarShip): {
  errors: string[];
  warnings: string[];
  infos: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];

  if (unit.tonnage < 50000) {
    warnings.push(
      'WarShip tonnage is unusually low (typical minimum 100,000 tons)',
    );
  }
  if (unit.tonnage > 2500000) {
    errors.push('WarShip tonnage cannot exceed 2,500,000 tons');
  }

  if (!unit.kfDriveType) {
    errors.push('WarShip must have K-F Drive');
  }

  if (unit.movement.safeThrust < 1) {
    errors.push('WarShip must have at least 1 safe thrust');
  }

  if (unit.structuralIntegrity < 1) {
    errors.push('WarShip must have at least 1 SI');
  }

  if (unit.crewConfiguration.crew < 100) {
    warnings.push('WarShip has unusually small crew');
  }

  if (unit.gravityDecks.length === 0) {
    warnings.push('WarShip has no gravity decks (crew comfort issue)');
  }

  return { errors, warnings, infos };
}

export function calculateWarShipBV(unit: IWarShip): number {
  let bv = 0;

  bv += unit.totalArmorPoints * 5;
  bv += unit.structuralIntegrity * 50;
  bv += 500;
  if (unit.hasLFBattery) bv += 200;

  for (const bay of unit.transportBays) {
    bv += bay.capacity * 10;
  }

  bv *= 1 + unit.movement.safeThrust * 0.05;

  return Math.round(bv);
}

export function calculateWarShipCost(unit: IWarShip): number {
  const baseCostPerTon = 75000;

  let cost = unit.tonnage * baseCostPerTon;

  cost += 100000000;
  if (unit.hasLFBattery) cost += 50000000;

  for (const bay of unit.transportBays) {
    switch (bay.type) {
      case BayType.DROPSHIP:
        cost += bay.capacity * 5000000;
        break;
      case BayType.MECH:
        cost += bay.capacity * 1000000;
        break;
      case BayType.FIGHTER:
        cost += bay.capacity * 500000;
        break;
      default:
        cost += bay.capacity * 100000;
    }
  }

  for (const deck of unit.gravityDecks) {
    cost += deck.size === 'Large' ? 5000000 : 2000000;
  }

  return Math.round(cost);
}
