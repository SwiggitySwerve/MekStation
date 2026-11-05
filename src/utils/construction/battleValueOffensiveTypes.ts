import { EngineType } from '../../types/construction/EngineType';

export interface OffensiveBVConfig {
  weapons: Array<{
    id: string;
    name: string;
    heat: number;
    bv: number;
    rear?: boolean;
    hasAES?: boolean;
    artemisType?: 'iv' | 'v';
    isDirectFire?: boolean;
    location?: string;
  }>;
  ammo?: Array<{ id: string; bv: number; weaponType: string }>;
  tonnage: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  heatDissipation: number;
  hasTargetingComputer?: boolean;
  hasTSM?: boolean;
  hasIndustrialTSM?: boolean;
  aesArms?: number;
  aesLegs?: number;
  isIndustrialMech?: boolean;
  umuMP?: number;
  engineType?: EngineType;
  isXXLEngine?: boolean;
  hasStealthArmor?: boolean;
  hasNullSig?: boolean;
  hasVoidSig?: boolean;
  hasChameleonShield?: boolean;
  coolantPods?: number;
  heatSinkCount?: number;
  hasImprovedJJ?: boolean;
  hasPrototypeIJJ?: boolean;
  jumpHeatMP?: number;
  physicalWeaponBV?: number;
  offensiveEquipmentBV?: number;
  hasMASC?: boolean;
  hasSupercharger?: boolean;
  hasSCM?: boolean;
}

export interface OffensiveBVResult {
  weaponBV: number;
  ammoBV: number;
  weightBonus: number;
  speedFactor: number;
  totalOffensiveBV: number;
  offensiveTypeModifier?: number;
  heatEfficiency?: number;
  moveHeat?: number;
  rawWeaponBV?: number;
  halvedWeaponBV?: number;
  weaponCount?: number;
  halvedWeaponCount?: number;
  physicalWeaponBV?: number;
  offensiveEquipmentBV?: number;
  /** Heat-tracked value of each mount, in native processing order. */
  weaponMountBV?: { name: string; location?: string; bv: number }[];
}
