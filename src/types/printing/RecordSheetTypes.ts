/**
 * Record Sheet Types
 * 
 * Interfaces for PDF record sheet generation and preview rendering.
 * 
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { MechLocation } from '../construction/CriticalSlotAllocation';
import { LOCATION_ABBREVIATION_MAP, BIPED_LOCATION_VALUES } from '../construction/MechConfigurationSystem';

/**
 * Paper size options for PDF generation
 */
export enum PaperSize {
  LETTER = 'letter',
  A4 = 'a4',
}

/**
 * Paper dimensions in points (1/72 inch)
 */
export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  [PaperSize.LETTER]: { width: 612, height: 792 },  // 8.5" x 11"
  [PaperSize.A4]: { width: 595, height: 842 },       // 210mm x 297mm
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
 * Complete record sheet data extracted from unit
 */
export interface IRecordSheetData {
  readonly header: IRecordSheetHeader;
  readonly movement: IRecordSheetMovement;
  readonly armor: IRecordSheetArmor;
  readonly structure: IRecordSheetStructure;
  readonly equipment: readonly IRecordSheetEquipment[];
  readonly heatSinks: IRecordSheetHeatSinks;
  readonly criticals: readonly ILocationCriticals[];
  readonly pilot?: IRecordSheetPilot;
  readonly mechType: 'biped' | 'quad' | 'tripod' | 'lam' | 'quadvee';
}

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
 * Location abbreviation mapping (biped locations only for record sheets)
 *
 * @see LOCATION_ABBREVIATION_MAP in MechConfigurationSystem for full mapping
 */
export const LOCATION_ABBREVIATIONS: Record<string, string> = Object.fromEntries(
  BIPED_LOCATION_VALUES.map(loc => [loc, LOCATION_ABBREVIATION_MAP[loc]])
);

/**
 * Location display names (biped locations only for record sheets)
 *
 * Note: MechLocation enum values are already display names (e.g., 'Left Arm')
 */
export const LOCATION_NAMES: Record<string, string> = Object.fromEntries(
  BIPED_LOCATION_VALUES.map(loc => [loc, loc])
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

