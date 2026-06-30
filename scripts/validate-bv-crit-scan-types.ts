import type {
  ExplosiveEquipmentEntry,
  MechLocation,
} from '../src/utils/construction/battleValueCalculations';

export interface CritScan {
  hasTC: boolean;
  hasTSM: boolean;
  /** Industrial Triple-Strength Myomer: weight x1.15, no walk MP bonus, no physical TSM mod */
  hasIndustrialTSM: boolean;
  hasMASC: boolean;
  hasSupercharger: boolean;
  hasECM: boolean;
  hasAngelECM: boolean;
  hasActiveProbe: boolean;
  hasBloodhound: boolean;
  hasPartialWing: boolean;
  hasNullSig: boolean;
  hasVoidSig: boolean;
  hasChameleon: boolean;
  hasImprovedJJ: boolean;
  hasPrototypeIJJ: boolean;
  standardJJCrits: number;
  improvedJJCrits: number;
  prototypeIJJCrits: number;
  hasWatchdog: boolean;
  detectedSmallCockpit: boolean;
  detectedInterfaceCockpit: boolean;
  detectedDroneOS: boolean;
  coolantPods: number;
  heatSinkCount: number;
  hasRadicalHS: boolean;
  critDHSCount: number;
  critProtoDHSCount: number;
  hasLargeShield: boolean;
  hasMediumShield: boolean;
  shieldArms: string[];
  riscAPDS: number;
  aesLocs: string[];
  mgaLocs: Array<{ location: string; type: 'light' | 'standard' | 'heavy' }>;
  harjelIILocs: MechLocation[];
  harjelIIILocs: MechLocation[];
  caseLocs: MechLocation[];
  caseIILocs: MechLocation[];
  artemisIVLocs: string[];
  artemisVLocs: string[];
  apollo: number;
  ppcCapLocs: string[];
  armoredPPCCapLocs: string[];
  ammo: Array<{ id: string; bv: number; weaponType: string; location: string }>;
  explosive: ExplosiveEquipmentEntry[];
  defEquipIds: string[];
  detectedArmorType: string | null;
  physicalWeapons: Array<{ type: string; location: string }>;
  rearWeaponCountByLoc: Map<string, Map<string, number>>;
  turretWeaponCountByLoc: Map<string, Map<string, number>>;
  amsAmmoBV: number;
  armoredComponentBV: number;
  armoredGyroSlots: number;
  umuMP: number;
  detectedGyroType: string | null;
  modularArmorSlots: number;
  spikeCount: number;
  mineDispenserCount: number;
  /** RISC Viral Jammer (Decoy or Homing): BV=284 each, defensive equipment */
  riscViralJammerCount: number;
  /** Blue Shield Particle Field Damper: +0.2 to armor and structure multipliers */
  hasBlueShield: boolean;
  /** Accumulated BV from misc equipment with offensive BV, such as bridge layers. */
  miscEquipBV: number;
  hasRamPlate: boolean;
  critLaserHSCount: number;
  /** Super-Cooled Myomer: moveHeat = 0 per MegaMek MekBVCalculator heatEfficiency() */
  hasSCM: boolean;
  /** RISC Laser Pulse Module locations: linked lasers get BV x1.15 and heat + 2 */
  riscLPMLocs: string[];
}

export function createEmptyCritScan(): CritScan {
  return {
    hasTC: false,
    hasTSM: false,
    hasIndustrialTSM: false,
    hasMASC: false,
    hasSupercharger: false,
    hasECM: false,
    hasAngelECM: false,
    hasActiveProbe: false,
    hasBloodhound: false,
    hasPartialWing: false,
    hasNullSig: false,
    hasVoidSig: false,
    hasChameleon: false,
    hasImprovedJJ: false,
    hasPrototypeIJJ: false,
    standardJJCrits: 0,
    improvedJJCrits: 0,
    prototypeIJJCrits: 0,
    hasWatchdog: false,
    detectedSmallCockpit: false,
    detectedInterfaceCockpit: false,
    detectedDroneOS: false,
    coolantPods: 0,
    heatSinkCount: 0,
    hasRadicalHS: false,
    critDHSCount: 0,
    critProtoDHSCount: 0,
    aesLocs: [],
    mgaLocs: [],
    harjelIILocs: [],
    harjelIIILocs: [],
    caseLocs: [],
    caseIILocs: [],
    artemisIVLocs: [],
    artemisVLocs: [],
    apollo: 0,
    ppcCapLocs: [],
    armoredPPCCapLocs: [],
    ammo: [],
    explosive: [],
    defEquipIds: [],
    detectedArmorType: null,
    physicalWeapons: [],
    rearWeaponCountByLoc: new Map(),
    turretWeaponCountByLoc: new Map(),
    amsAmmoBV: 0,
    armoredComponentBV: 0,
    armoredGyroSlots: 0,
    umuMP: 0,
    detectedGyroType: null,
    modularArmorSlots: 0,
    hasLargeShield: false,
    hasMediumShield: false,
    shieldArms: [],
    riscAPDS: 0,
    spikeCount: 0,
    mineDispenserCount: 0,
    riscViralJammerCount: 0,
    hasBlueShield: false,
    miscEquipBV: 0,
    hasRamPlate: false,
    critLaserHSCount: 0,
    hasSCM: false,
    riscLPMLocs: [],
  };
}
