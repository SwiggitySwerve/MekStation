/**
 * Record Sheet Constants
 * 
 * Template paths and configuration constants for record sheet generation.
 */

import { 
  mmDataAssetService, 
  MechConfiguration, 
  PaperSize as AssetPaperSize 
} from '@/services/assets/MmDataAssetService';

export const SVG_TEMPLATES = {
  biped: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.BIPED, AssetPaperSize.LETTER),
  quad: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.QUAD, AssetPaperSize.LETTER),
  tripod: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.TRIPOD, AssetPaperSize.LETTER),
  lam: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.LAM, AssetPaperSize.LETTER),
  quadvee: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.QUADVEE, AssetPaperSize.LETTER),
} as const;

export const SVG_TEMPLATES_A4 = {
  biped: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.BIPED, AssetPaperSize.A4),
  quad: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.QUAD, AssetPaperSize.A4),
  tripod: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.TRIPOD, AssetPaperSize.A4),
  lam: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.LAM, AssetPaperSize.A4),
  quadvee: mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.QUADVEE, AssetPaperSize.A4),
} as const;

/**
 * Combat-relevant equipment that should appear in inventory (with [E] damage code)
 */
export const COMBAT_EQUIPMENT = [
  'Targeting Computer',
  'C3 Master Computer', 'C3 Slave', 'C3i Computer',
  'TAG', 'Light TAG',
  'Guardian ECM', 'Angel ECM', 'ECM Suite',
  'BAP', 'Beagle Active Probe', 'Bloodhound Active Probe',
  'AMS', 'Anti-Missile System', 'Laser AMS',
];
