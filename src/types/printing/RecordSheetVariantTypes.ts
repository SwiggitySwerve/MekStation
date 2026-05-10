import type {
  IMechRecordSheetData,
  IRecordSheetEquipment,
  IRecordSheetHeader,
  IRecordSheetHeatSinks,
  IRecordSheetPilot,
  IRecordSheetSPAEntry,
} from './RecordSheetTypes';
import type {
  RecordSheetVehicleMotionType,
  RecordSheetVehicleTurretConfig,
} from './RecordSheetVehicleTypes';

/**
 * Crew member on a vehicle (driver, gunner, commander).
 */
export interface IVehicleCrewMember {
  readonly role: 'driver' | 'gunner' | 'commander';
  readonly name?: string;
  readonly gunnery: number;
  readonly piloting: number;
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
}

/**
 * Armor for a single vehicle location.
 */
export interface IVehicleLocationArmor {
  readonly location:
    | 'Front'
    | 'Left Side'
    | 'Right Side'
    | 'Rear'
    | 'Turret'
    | 'Rotor'
    | 'Chin'
    | 'Body';
  readonly current: number;
  readonly maximum: number;
  /** BAR (Barrier Armor Rating) for support vehicles — omitted for standard tanks. */
  readonly bar?: number;
}

/**
 * Vehicle record sheet data.
 *
 * Covers tracked, wheeled, hover, VTOL, and WiGE combat/support vehicles.
 */
export interface IVehicleRecordSheetData {
  readonly unitType: 'vehicle';
  readonly header: IRecordSheetHeader;
  /** Motion type governs movement rules and record-sheet layout variant. */
  readonly motionType: RecordSheetVehicleMotionType;
  /** Turret layout determines whether weapons render in turret or hull groups. */
  readonly turretConfig: RecordSheetVehicleTurretConfig;
  readonly cruiseMP: number;
  readonly flankMP: number;
  readonly armorType: string;
  readonly armorLocations: readonly IVehicleLocationArmor[];
  readonly crew: readonly IVehicleCrewMember[];
  /** Equipment keyed by location string for turret / hull split. */
  readonly equipment: readonly IRecordSheetEquipment[];
  /** BAR rating for the vehicle as a whole — present for support vehicles. */
  readonly barRating?: number;
  readonly pilot?: IRecordSheetPilot;
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
}

/**
 * Aerospace armor per standard 4-arc layout.
 */
export interface IAerospaceArcArmor {
  readonly arc: 'Nose' | 'Left Wing' | 'Right Wing' | 'Aft';
  readonly current: number;
  readonly maximum: number;
}

/**
 * Aerospace record sheet data (aerospace fighters and conventional fighters).
 */
export interface IAerospaceRecordSheetData {
  readonly unitType: 'aerospace';
  readonly header: IRecordSheetHeader;
  /** Structural Integrity — the aerospace equivalent of internal structure. */
  readonly structuralIntegrity: number;
  readonly fuelPoints: number;
  /** Safe Thrust (2/3 of max thrust, rounded up). */
  readonly safeThrust: number;
  /** Maximum Thrust (full engine output). */
  readonly maxThrust: number;
  readonly heatSinks: IRecordSheetHeatSinks;
  readonly armorType: string;
  readonly armorArcs: readonly IAerospaceArcArmor[];
  readonly equipment: readonly IRecordSheetEquipment[];
  /** Number of bomb bay slots (0 when no bomb bay). */
  readonly bombBaySlots: number;
  readonly pilot?: IRecordSheetPilot;
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
}

/**
 * Per-trooper data within a BattleArmor point.
 */
export interface IBattleArmorTrooper {
  /** 1-based trooper index within the point. */
  readonly index: number;
  readonly armorPips: number;
  readonly maximumArmorPips: number;
  /** Currently-selected modular weapon, if any. */
  readonly modularWeapon?: string;
  /** Anti-personnel weapon mounted on this suit. */
  readonly apWeapon?: string;
  readonly gunnery: number;
  /** Anti-mech skill (replaces piloting for BA). */
  readonly antiMech: number;
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
}

/**
 * BattleArmor record sheet data.
 */
export interface IBattleArmorRecordSheetData {
  readonly unitType: 'battlearmor';
  readonly header: IRecordSheetHeader;
  readonly squadSize: number;
  readonly troopers: readonly IBattleArmorTrooper[];
  /** Manipulator types (left, right). */
  readonly manipulators: { readonly left: string; readonly right: string };
  /** Movement mode and points. */
  readonly jumpMP: number;
  readonly walkMP: number;
  readonly umuMP: number;
  readonly vtolMP: number;
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
}

/**
 * Field gun entry for infantry platoons (1 gun per 7 troopers).
 *
 * Named `IInfantryFieldGunSheet` to avoid collision with the construction-
 * domain `IInfantryFieldGun` in `src/types/unit/PersonnelInterfaces.ts`.
 */
export interface IInfantryFieldGunSheet {
  readonly name: string;
  readonly count: number;
  readonly damage: number | string;
  readonly minimumRange: number;
  readonly shortRange: number;
  readonly mediumRange: number;
  readonly longRange: number;
  readonly ammoRounds?: number;
}

export type InfantryRecordSheetMotiveType =
  | 'Foot'
  | 'Motorized'
  | 'Jump'
  | 'Mechanized'
  | 'Beast';

export interface IInfantryPlatoonCompositionSheet {
  readonly squads: number;
  readonly troopersPerSquad: number;
}

export interface IInfantryWeaponSheet {
  readonly name: string;
  readonly damage: number | string;
  readonly minimumRange: number;
  readonly shortRange: number;
  readonly mediumRange: number;
  readonly longRange: number;
  readonly ammoType?: string;
  readonly heat?: number;
  readonly special?: readonly string[];
}

export interface IInfantrySecondaryWeaponSheet extends IInfantryWeaponSheet {
  readonly perTrooperRatio: number;
  readonly count?: number;
}

/**
 * Infantry record sheet data.
 */
export interface IInfantryRecordSheetData {
  readonly unitType: 'infantry';
  readonly header: IRecordSheetHeader;
  readonly platoonSize: number;
  readonly platoonComposition: IInfantryPlatoonCompositionSheet;
  readonly motiveType: InfantryRecordSheetMotiveType;
  readonly armorKit: string;
  readonly primaryWeapon: IInfantryWeaponSheet;
  /** Secondary weapons with anti-personnel ratio. */
  readonly secondaryWeapons: readonly IInfantrySecondaryWeaponSheet[];
  /** Field gun block — present when the platoon fields crew-served weapons. */
  readonly fieldGun?: IInfantryFieldGunSheet;
  /** Specialization badge (anti-mech, marine, scuba, mountain, XCT). */
  readonly specialization?: string;
  readonly antiMechTraining: boolean;
  readonly gunnery: number;
  readonly antiMech: number;
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
}

/**
 * Per-proto data within a ProtoMech point.
 */
export interface IProtoMechUnit {
  /** 1-based index within the point (1–5). */
  readonly index: number;
  readonly armorByLocation: Record<
    'Head' | 'Torso' | 'Left Arm' | 'Right Arm' | 'Legs' | 'Main Gun',
    { readonly current: number; readonly maximum: number }
  >;
}

/**
 * ProtoMech record sheet data.
 */
export interface IProtoMechRecordSheetData {
  readonly unitType: 'protomech';
  readonly header: IRecordSheetHeader;
  /** Point composition (1–5 ProtoMechs per point). */
  readonly pointSize: number;
  readonly protos: readonly IProtoMechUnit[];
  /** Main gun designation (name), if equipped. */
  readonly mainGun?: string;
  readonly mainGunAmmo?: number;
  readonly hasUMU: boolean;
  readonly isGlider: boolean;
  readonly walkMP: number;
  readonly jumpMP: number;
  readonly equipment: readonly IRecordSheetEquipment[];
  readonly pilot?: IRecordSheetPilot;
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
}

/**
 * Discriminated union of all supported record sheet data variants.
 *
 * Consumers narrow to the correct variant via `data.unitType`:
 *   if (data.unitType === 'vehicle') { ... IVehicleRecordSheetData ... }
 */
export type IRecordSheetData =
  | IMechRecordSheetData
  | IVehicleRecordSheetData
  | IAerospaceRecordSheetData
  | IBattleArmorRecordSheetData
  | IInfantryRecordSheetData
  | IProtoMechRecordSheetData;

export type INonMechRecordSheetData = Exclude<
  IRecordSheetData,
  IMechRecordSheetData
>;
