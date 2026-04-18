/**
 * Record Sheet Types
 *
 * Interfaces for PDF record sheet generation and preview rendering.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { MechLocation } from "../construction/CriticalSlotAllocation";
import { LOCATION_ABBREVIATION_MAP } from "../construction/MechConfigurationSystem";

/**
 * Paper size options for PDF generation
 */
export enum PaperSize {
  LETTER = "letter",
  A4 = "a4",
}

/**
 * Paper dimensions in points (1/72 inch)
 */
export const PAPER_DIMENSIONS: Record<
  PaperSize,
  { width: number; height: number }
> = {
  [PaperSize.LETTER]: { width: 612, height: 792 }, // 8.5" x 11"
  [PaperSize.A4]: { width: 595, height: 842 }, // 210mm x 297mm
};

/**
 * DPI multiplier for PDF export (3x = 216 DPI, 4x = 288 DPI)
 * Higher values produce sharper text and lines but larger file sizes.
 * 3x provides a good balance between quality and file size.
 */
export const PDF_DPI_MULTIPLIER = 20;

/**
 * DPI multiplier for in-app preview rendering.
 * Must be high enough to support zooming without blur.
 * 4x ensures crisp text up to 200% zoom on standard displays.
 */
export const PREVIEW_DPI_MULTIPLIER = 20;

/**
 * Record sheet header data
 */
export interface IRecordSheetHeader {
  readonly unitName: string;
  readonly chassis: string;
  readonly model: string;
  readonly tonnage: number;
  readonly techBase: string;
  readonly rulesLevel: string;
  readonly era: string;
  readonly role?: string;
  readonly battleValue: number;
  readonly cost: number;
}

/**
 * Movement data for record sheet
 */
export interface IRecordSheetMovement {
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
  readonly jumpJetType?: string;
  readonly hasMASC: boolean;
  readonly hasTSM: boolean;
  readonly hasSupercharger: boolean;
}

/**
 * Armor data for a single location
 */
export interface ILocationArmor {
  readonly location: string;
  readonly abbreviation: string;
  readonly current: number;
  readonly maximum: number;
  readonly rear?: number;
  readonly rearMaximum?: number;
}

/**
 * Complete armor data for record sheet
 */
export interface IRecordSheetArmor {
  readonly type: string;
  readonly totalPoints: number;
  readonly locations: readonly ILocationArmor[];
}

/**
 * Internal structure data for a single location
 */
export interface ILocationStructure {
  readonly location: string;
  readonly abbreviation: string;
  readonly points: number;
}

/**
 * Complete structure data for record sheet
 */
export interface IRecordSheetStructure {
  readonly type: string;
  readonly totalPoints: number;
  readonly locations: readonly ILocationStructure[];
}

/**
 * Equipment entry for the weapons/equipment table
 */
export interface IRecordSheetEquipment {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly locationAbbr: string;
  readonly heat: number | string;
  readonly damage: number | string;
  /** Damage type code: [DE]=Direct Energy, [DB]=Direct Ballistic, [M]=Missile, [E]=Equipment */
  readonly damageCode?: string;
  readonly minimum: number | string;
  readonly short: number | string;
  readonly medium: number | string;
  readonly long: number | string;
  readonly quantity: number;
  readonly isWeapon: boolean;
  readonly isAmmo: boolean;
  readonly isEquipment?: boolean;
  readonly ammoCount?: number;
}

/**
 * Heat sink data for record sheet
 */
export interface IRecordSheetHeatSinks {
  readonly type: string;
  readonly count: number;
  readonly capacity: number;
  readonly integrated: number;
  readonly external: number;
}

/**
 * Critical slot entry
 */
export interface IRecordSheetCriticalSlot {
  readonly slotNumber: number;
  readonly content: string;
  readonly isSystem: boolean;
  readonly isHittable: boolean;
  readonly isRollAgain: boolean;
  readonly equipmentId?: string;
}

/**
 * Critical slots for a location
 */
export interface ILocationCriticals {
  readonly location: string;
  readonly abbreviation: string;
  readonly slots: readonly IRecordSheetCriticalSlot[];
}

/**
 * Pilot/warrior data
 */
export interface IRecordSheetPilot {
  readonly name: string;
  readonly gunnery: number;
  readonly piloting: number;
  readonly wounds: number;
}

/**
 * Printable Special Abilities entry — Phase 5 Wave 3.
 * Mirrors `ISPASectionEntry` from the recordsheet helper but is duplicated
 * here so the print-types layer doesn't depend on `@/lib/spa`.
 */
export interface IRecordSheetSPAEntry {
  readonly abilityId: string;
  readonly displayName: string;
  readonly category: string;
  readonly headline: string;
  readonly truncatedDescription: string;
  readonly xpSpent?: number;
}

// =============================================================================
// Discriminated union — per-type record sheet data
// =============================================================================

/**
 * Mech sub-type string used for template selection.
 */
export type MechSubType = "biped" | "quad" | "tripod" | "lam" | "quadvee";

/**
 * Mech record sheet data (existing shape, preserved for regression safety).
 *
 * `unitType: 'mech'` is the discriminant used by the renderer dispatcher.
 */
export interface IMechRecordSheetData {
  readonly unitType: "mech";
  readonly header: IRecordSheetHeader;
  readonly movement: IRecordSheetMovement;
  readonly armor: IRecordSheetArmor;
  readonly structure: IRecordSheetStructure;
  readonly equipment: readonly IRecordSheetEquipment[];
  readonly heatSinks: IRecordSheetHeatSinks;
  readonly criticals: readonly ILocationCriticals[];
  readonly pilot?: IRecordSheetPilot;
  /** Phase 5 Wave 3 — printable Special Abilities block. */
  readonly specialAbilities?: readonly IRecordSheetSPAEntry[];
  readonly mechType: MechSubType;
}

/**
 * Crew member on a vehicle (driver, gunner, commander).
 */
export interface IVehicleCrewMember {
  readonly role: "driver" | "gunner" | "commander";
  readonly gunnery: number;
  readonly piloting: number;
}

/**
 * Armor for a single vehicle location.
 */
export interface IVehicleLocationArmor {
  readonly location:
    | "Front"
    | "Left Side"
    | "Right Side"
    | "Rear"
    | "Turret"
    | "Rotor"
    | "Chin"
    | "Body";
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
  readonly unitType: "vehicle";
  readonly header: IRecordSheetHeader;
  /** Motion type governs movement rules and record-sheet layout variant. */
  readonly motionType:
    | "Tracked"
    | "Wheeled"
    | "Hover"
    | "VTOL"
    | "WiGE"
    | "Naval"
    | "Submarine"
    | "Rail";
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
  readonly arc: "Nose" | "Left Wing" | "Right Wing" | "Aft";
  readonly current: number;
  readonly maximum: number;
}

/**
 * Aerospace record sheet data (aerospace fighters and conventional fighters).
 */
export interface IAerospaceRecordSheetData {
  readonly unitType: "aerospace";
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
  readonly unitType: "battlearmor";
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
}

/**
 * Infantry record sheet data.
 */
export interface IInfantryRecordSheetData {
  readonly unitType: "infantry";
  readonly header: IRecordSheetHeader;
  readonly platoonSize: number;
  readonly motiveType: "Foot" | "Motorized" | "Jump" | "Mechanized" | "Beast";
  readonly primaryWeapon: string;
  /** Secondary weapons with anti-personnel ratio. */
  readonly secondaryWeapons: readonly {
    readonly name: string;
    readonly perTrooperRatio: number;
  }[];
  /** Field gun block — present when the platoon fields crew-served weapons. */
  readonly fieldGun?: IInfantryFieldGunSheet;
  /** Specialization badge (anti-mech, marine, scuba, mountain, XCT). */
  readonly specialization?: string;
  readonly gunnery: number;
  readonly antiMech: number;
}

/**
 * Per-proto data within a ProtoMech point.
 */
export interface IProtoMechUnit {
  /** 1-based index within the point (1–5). */
  readonly index: number;
  readonly armorByLocation: Record<
    "Head" | "Torso" | "Left Arm" | "Right Arm" | "Legs" | "Main Gun",
    { readonly current: number; readonly maximum: number }
  >;
}

/**
 * ProtoMech record sheet data.
 */
export interface IProtoMechRecordSheetData {
  readonly unitType: "protomech";
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

/**
 * Error thrown when `RecordSheetService.extractData` receives an unsupported unit type.
 */
export class UnsupportedUnitTypeError extends Error {
  constructor(readonly unitType: string) {
    super(`Unsupported unit type for record sheet extraction: '${unitType}'`);
    this.name = "UnsupportedUnitTypeError";
  }
}

/**
 * @deprecated Use `IMechRecordSheetData` directly. This alias exists for
 * call-sites that used the old flat `IRecordSheetData` interface which was
 * mech-only. Will be removed once all callers are narrowed.
 */
export type ILegacyMechRecordSheetData = IMechRecordSheetData;

/**
 * Render context for drawing record sheet elements
 */
export interface IRenderContext {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly paperSize: PaperSize;
}

/**
 * Positioning rectangle
 */
export interface IRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * All mech locations for abbreviation mapping
 * Includes biped, quad, tripod, and aerospace locations
 */
const ALL_MECH_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
  MechLocation.CENTER_LEG, // Tripod
  MechLocation.FRONT_LEFT_LEG, // Quad
  MechLocation.FRONT_RIGHT_LEG, // Quad
  MechLocation.REAR_LEFT_LEG, // Quad
  MechLocation.REAR_RIGHT_LEG, // Quad
  MechLocation.NOSE, // LAM/Aerospace
  MechLocation.LEFT_WING, // LAM/Aerospace
  MechLocation.RIGHT_WING, // LAM/Aerospace
  MechLocation.AFT, // LAM/Aerospace
  MechLocation.FUSELAGE, // LAM/Aerospace
];

/**
 * Location abbreviation mapping (all mech types for record sheets)
 *
 * @see LOCATION_ABBREVIATION_MAP in MechConfigurationSystem for full mapping
 */
export const LOCATION_ABBREVIATIONS: Record<string, string> =
  Object.fromEntries(
    ALL_MECH_LOCATIONS.map((loc) => [loc, LOCATION_ABBREVIATION_MAP[loc]]),
  );

/**
 * Location display names (all mech types for record sheets)
 *
 * Note: MechLocation enum values are already display names (e.g., 'Left Arm')
 */
export const LOCATION_NAMES: Record<string, string> = Object.fromEntries(
  ALL_MECH_LOCATIONS.map((loc) => [loc, loc]),
);

/**
 * Options for PDF export
 */
export interface IPDFExportOptions {
  readonly paperSize: PaperSize;
  readonly includePilotData: boolean;
  readonly filename?: string;
}

/**
 * Options for preview rendering
 */
export interface IPreviewOptions {
  readonly showGrid: boolean;
  readonly highlightEmpty: boolean;
  readonly scale: number;
}
