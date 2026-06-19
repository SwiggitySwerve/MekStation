import type { AerospaceArc } from './AerospaceArcTypes';

export interface IAerospaceArcContribution {
  readonly arc: AerospaceArc;
  readonly rawBV: number;
  readonly weight: number;
  readonly weightedBV: number;
  readonly isPrimary: boolean;
}

export interface IAerospaceBVBreakdown {
  readonly armorBV: number;
  readonly siBV: number;
  readonly defensiveEquipmentBV: number;
  readonly explosivePenalties: number;
  readonly defensiveFactor: number;
  readonly defensive: number;

  readonly arcContributions: readonly IAerospaceArcContribution[];
  readonly primaryArc: AerospaceArc | null;
  readonly weaponFirePoolBV: number;
  readonly fuselageWeaponBV: number;
  readonly ammoBV: number;
  readonly offensiveEquipmentBV: number;
  readonly avgThrust: number;
  readonly speedFactor: number;
  readonly offensive: number;

  readonly subTypeMultiplier: number;
  readonly pilotMultiplier: number;
  readonly final: number;
}

export interface IProtoMechBVBreakdown {
  readonly defensiveBV: number;
  readonly offensiveBV: number;
  readonly baseBV: number;
  readonly chassisMultiplier: number;
  readonly pilotMultiplier: number;
  readonly final: number;

  readonly armorBV: number;
  readonly structureBV: number;
  readonly defensiveEquipmentBV: number;
  readonly explosivePenalty: number;
  readonly defensiveFactor: number;

  readonly weaponBV: number;
  readonly ammoBV: number;
  readonly physicalWeaponBV: number;
  readonly offensiveEquipmentBV: number;
  readonly speedFactor: number;
}

export interface IInfantryBVBreakdown {
  readonly perTrooper: number;
  readonly motiveMultiplier: number;
  readonly antiMechMultiplier: number;
  readonly fieldGunBV: number;
  readonly platoonBV: number;
  readonly pilotMultiplier: number;
  readonly final: number;

  readonly primaryBV: number;
  readonly secondaryBV: number;
  readonly armorKitBV: number;
  readonly fieldGunWeaponBV: number;
  readonly fieldGunAmmoBV: number;
  readonly troopers: number;
}

export interface BADefensiveBVBreakdown {
  readonly armorBV: number;
  readonly moveBV: number;
  readonly jumpBV: number;
  readonly antiMechBonus: number;
  readonly total: number;
}

export interface BAOffensiveBVBreakdown {
  readonly weaponBV: number;
  readonly ammoBV: number;
  readonly manipulatorBV: number;
  readonly total: number;
}

export interface BAPerTrooperBV {
  readonly defensive: BADefensiveBVBreakdown;
  readonly offensive: BAOffensiveBVBreakdown;
  readonly total: number;
}

export interface IBABreakdown {
  readonly perTrooper: BAPerTrooperBV;
  readonly squadSize: number;
  readonly squadTotal: number;
  readonly pilotMultiplier: number;
  readonly final: number;
}
