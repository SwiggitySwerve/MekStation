import type { ISerializedUnit } from '@/types/unit/UnitSerialization';
import type { AmmoBVPools } from '@/utils/construction/battleValueOffensiveTypes';

import type { CritScan } from './critScanTypes';

interface ArmorAllocation {
  [location: string]: number | { front: number; rear: number };
}
interface Equipment {
  id: string;
  location: string;
}
export interface UnitData {
  id: string;
  chassis: string;
  model: string;
  unitType: string;
  configuration: string;
  lamType?: string;
  techBase: string;
  componentTechBases?: ISerializedUnit['componentTechBases'];
  tonnage: number;
  engine: { type: string; rating: number };
  gyro: { type: string };
  cockpit: string;
  structure: { type: string; locationTonnage?: Record<string, number> };
  armor: {
    type: string;
    allocation: ArmorAllocation;
    typeByLocation?: Record<string, number>;
  };
  heatSinks: { type: string; count: number };
  movement: { walk: number; jump: number };
  equipment: Equipment[];
  criticalSlots?: Record<string, (string | null)[]>;
}

export interface ValidationResult {
  unitId: string;
  chassis: string;
  model: string;
  tonnage: number;
  indexBV: number;
  calculatedBV: number | null;
  difference: number | null;
  percentDiff: number | null;
  status: 'exact' | 'within1' | 'within2' | 'within3' | 'over3' | 'error';
  error?: string;
  breakdown?: {
    // Defensive sub-components
    armorBV: number;
    structureBV: number;
    gyroBV: number;
    defEquipBV: number;
    amsAmmoBV: number;
    armoredComponentBV: number;
    harjelBonus: number;
    explosivePenalty: number;
    defensiveFactor: number;
    maxTMM: number;
    defensiveBV: number;
    // Offensive sub-components
    weaponBV: number;
    rawWeaponBV: number;
    halvedWeaponBV: number;
    ammoBV: number;
    weightBonus: number;
    physicalWeaponBV: number;
    offEquipBV: number;
    heatEfficiency: number;
    heatDissipation: number;
    moveHeat: number;
    speedFactor: number;
    offensiveBV: number;
    // Modifiers
    cockpitModifier: number;
    offensiveTypeModifier?: number;
    summaryModifier?: number;
    totalExplosivePenalty?: number;
    cockpitType: string;
    // Context
    techBase: string;
    walkMP: number;
    runMP: number;
    jumpMP: number;
    weaponCount: number;
    halvedWeaponCount: number;
    weaponMountBV?: { name: string; location?: string; bv: number }[];
    ammoPools?: AmmoBVPools;
    /** Optional source-identity facts for torpedo diagnostics, never cap arithmetic. */
    ammoCapProjectionWeapons?: { id: string; bv: number }[];
    /** Optional physical-bin trace facts; never supplied to ammo arithmetic. */
    ammoAvailableProjectionBins?: CritScan['ammoAvailableProjectionBins'];
    /** Complete trace pools including supplemental facts; never arithmetic inputs. */
    ammoDiagnosticPools?: AmmoBVPools;
    // Legacy aliases
    defensiveEquipBV: number;
  };
  rootCause?: string;
  issues: string[];
}
