import { IJumpShip } from './JumpShipUnitHandler';

export function validateJumpShip(unit: IJumpShip): {
  errors: string[];
  warnings: string[];
  infos: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];

  if (unit.tonnage < 50000) {
    errors.push('JumpShip tonnage must be at least 50,000 tons');
  }
  if (unit.tonnage > 500000) {
    errors.push('JumpShip tonnage cannot exceed 500,000 tons');
  }

  if (!unit.kfDrive.hasDriveCore) {
    errors.push('JumpShip must have a K-F drive core');
  }

  if (unit.dockingCollars < 1) {
    warnings.push('JumpShip has no docking collars');
  }

  if (unit.crewConfiguration.crew < 1) {
    warnings.push('JumpShip has no crew assigned');
  }

  if (unit.kfDrive.hasLithiumFusion) {
    infos.push('JumpShip has Lithium-Fusion batteries for rapid recharge');
  }

  return { errors, warnings, infos };
}

export function calculateJumpShipBV(unit: IJumpShip): number {
  let bv = 0;

  bv += unit.totalArmorPoints * 2;
  bv += unit.structuralIntegrity * 30;
  bv += unit.kfDrive.rating * 100;
  bv += unit.dockingCollars * 50;

  return Math.round(bv);
}

export function calculateJumpShipCost(unit: IJumpShip): number {
  let cost = 0;

  cost += unit.tonnage * 100000;
  cost += unit.kfDrive.rating * 100000000;

  if (unit.kfDrive.hasLithiumFusion) {
    cost += unit.tonnage * 50000;
  }

  cost += unit.dockingCollars * 1000000;
  cost += unit.totalArmorPoints * 10000;

  return Math.round(cost);
}
