import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export type CreationMode = 'new' | 'copy' | 'import';

export type SupportedUnitType =
  | UnitType.BATTLEMECH
  | UnitType.VEHICLE
  | UnitType.AEROSPACE
  | UnitType.BATTLE_ARMOR
  | UnitType.INFANTRY
  | UnitType.PROTOMECH;

export interface VehicleTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly cruiseMP: number;
}

export interface AerospaceTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly safeThrust: number;
}

export interface BattleArmorTemplate {
  readonly id: string;
  readonly name: string;
  readonly squadSize: number;
  readonly techBase: TechBase;
}

export interface InfantryTemplate {
  readonly id: string;
  readonly name: string;
  readonly squadSize: number;
  readonly numberOfSquads: number;
  readonly techBase: TechBase;
}

export interface ProtoMechTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
}

export const VEHICLE_TEMPLATES: readonly VehicleTemplate[] = [
  {
    id: 'light-veh',
    name: 'Light Vehicle',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 6,
  },
  {
    id: 'medium-veh',
    name: 'Medium Vehicle',
    tonnage: 40,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 5,
  },
  {
    id: 'heavy-veh',
    name: 'Heavy Vehicle',
    tonnage: 60,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 4,
  },
  {
    id: 'assault-veh',
    name: 'Assault Vehicle',
    tonnage: 80,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 3,
  },
];

export const AEROSPACE_TEMPLATES: readonly AerospaceTemplate[] = [
  {
    id: 'light-aero',
    name: 'Light Fighter',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 7,
  },
  {
    id: 'medium-aero',
    name: 'Medium Fighter',
    tonnage: 45,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 5,
  },
  {
    id: 'heavy-aero',
    name: 'Heavy Fighter',
    tonnage: 75,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 4,
  },
  {
    id: 'assault-aero',
    name: 'Assault Fighter',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 3,
  },
];

export const BATTLE_ARMOR_TEMPLATES: readonly BattleArmorTemplate[] = [
  {
    id: 'light-ba',
    name: 'Light BA (4-trooper)',
    squadSize: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'medium-ba',
    name: 'Medium BA (4-trooper)',
    squadSize: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'heavy-ba',
    name: 'Heavy BA (4-trooper)',
    squadSize: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'clan-ba',
    name: 'Clan Elemental (5-point)',
    squadSize: 5,
    techBase: TechBase.CLAN,
  },
];

export const INFANTRY_TEMPLATES: readonly InfantryTemplate[] = [
  {
    id: 'rifle-platoon',
    name: 'Rifle Platoon',
    squadSize: 7,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'laser-platoon',
    name: 'Laser Platoon',
    squadSize: 7,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'jump-platoon',
    name: 'Jump Platoon',
    squadSize: 7,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'mechanized-platoon',
    name: 'Mechanized Platoon',
    squadSize: 6,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
];

export const PROTOMECH_TEMPLATES: readonly ProtoMechTemplate[] = [
  { id: 'light-proto', name: 'Light ProtoMech', tonnage: 3 },
  { id: 'medium-proto', name: 'Medium ProtoMech', tonnage: 5 },
  { id: 'heavy-proto', name: 'Heavy ProtoMech', tonnage: 7 },
  { id: 'assault-proto', name: 'Assault ProtoMech', tonnage: 9 },
];

interface UnitTypeConfig {
  type: SupportedUnitType;
  label: string;
  color: string;
  activeColor: string;
}

export const UNIT_TYPE_CONFIGS: UnitTypeConfig[] = [
  {
    type: UnitType.BATTLEMECH,
    label: 'BattleMech',
    color: 'amber',
    activeColor: 'border-amber-500 bg-amber-900/30 text-amber-300',
  },
  {
    type: UnitType.VEHICLE,
    label: 'Vehicle',
    color: 'cyan',
    activeColor: 'border-cyan-500 bg-cyan-900/30 text-cyan-300',
  },
  {
    type: UnitType.AEROSPACE,
    label: 'Aerospace',
    color: 'sky',
    activeColor: 'border-sky-500 bg-sky-900/30 text-sky-300',
  },
  {
    type: UnitType.BATTLE_ARMOR,
    label: 'Battle Armor',
    color: 'purple',
    activeColor: 'border-purple-500 bg-purple-900/30 text-purple-300',
  },
  {
    type: UnitType.INFANTRY,
    label: 'Infantry',
    color: 'emerald',
    activeColor: 'border-emerald-500 bg-emerald-900/30 text-emerald-300',
  },
  {
    type: UnitType.PROTOMECH,
    label: 'ProtoMech',
    color: 'rose',
    activeColor: 'border-rose-500 bg-rose-900/30 text-rose-300',
  },
];
