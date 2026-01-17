import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getLocationsForConfigurationString } from '@/utils/mech/mechLocationRegistry';

export enum MechConfiguration {
  BIPED = 'Biped',
  QUAD = 'Quad',
  TRIPOD = 'Tripod',
  LAM = 'LAM',
  QUADVEE = 'QuadVee',
}

export enum PaperSize {
  LETTER = 'letter',
  A4 = 'a4',
}

const LOCATION_TO_MM_DATA_CODE: Record<string, string> = {
  [MechLocation.HEAD]: 'Head',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.LEFT_ARM]: 'LArm',
  [MechLocation.RIGHT_ARM]: 'RArm',
  [MechLocation.LEFT_LEG]: 'LLeg',
  [MechLocation.RIGHT_LEG]: 'RLeg',
  [MechLocation.FRONT_LEFT_LEG]: 'FLL',
  [MechLocation.FRONT_RIGHT_LEG]: 'FRL',
  [MechLocation.REAR_LEFT_LEG]: 'RLL',
  [MechLocation.REAR_RIGHT_LEG]: 'RRL',
  [MechLocation.CENTER_LEG]: 'CL',
};

const LOCATION_ABBREV_TO_MM_DATA_CODE: Record<string, string> = {
  'HD': 'Head',
  'CT': 'CT',
  'LT': 'LT',
  'RT': 'RT',
  'LA': 'LArm',
  'RA': 'RArm',
  'LL': 'LLeg',
  'RL': 'RLeg',
  'FLL': 'FLL',
  'FRL': 'FRL',
  'RLL': 'RLL',
  'RRL': 'RRL',
  'CL': 'CL',
};

const PIPS_BASE_PATH = '/record-sheets/biped_pips';

const TEMPLATE_PATHS: Record<MechConfiguration, Record<PaperSize, string>> = {
  [MechConfiguration.BIPED]: {
    [PaperSize.LETTER]: '/record-sheets/templates_us/mek_biped_default.svg',
    [PaperSize.A4]: '/record-sheets/templates_iso/mek_biped_default.svg',
  },
  [MechConfiguration.QUAD]: {
    [PaperSize.LETTER]: '/record-sheets/templates_us/mek_quad_default.svg',
    [PaperSize.A4]: '/record-sheets/templates_iso/mek_quad_default.svg',
  },
  [MechConfiguration.TRIPOD]: {
    [PaperSize.LETTER]: '/record-sheets/templates_us/mek_tripod_default.svg',
    [PaperSize.A4]: '/record-sheets/templates_iso/mek_tripod_default.svg',
  },
  [MechConfiguration.LAM]: {
    [PaperSize.LETTER]: '/record-sheets/templates_us/mek_lam_default.svg',
    [PaperSize.A4]: '/record-sheets/templates_iso/mek_lam_default.svg',
  },
  [MechConfiguration.QUADVEE]: {
    [PaperSize.LETTER]: '/record-sheets/templates_us/mek_quadvee_default.svg',
    [PaperSize.A4]: '/record-sheets/templates_iso/mek_quadvee_default.svg',
  },
};

interface CachedSVG {
  content: string;
  timestamp: number;
}

class MmDataAssetService {
  private static instance: MmDataAssetService;
  private svgCache: Map<string, CachedSVG> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  private constructor() {}

  static getInstance(): MmDataAssetService {
    if (!MmDataAssetService.instance) {
      MmDataAssetService.instance = new MmDataAssetService();
    }
    return MmDataAssetService.instance;
  }

  getArmorPipPath(
    location: MechLocation | string,
    count: number,
    isRear: boolean = false
  ): string {
    const mmCode = this.getLocationCode(location);
    const rearSuffix = isRear ? '_R' : '';
    return `${PIPS_BASE_PATH}/Armor_${mmCode}${rearSuffix}_${count}_Humanoid.svg`;
  }

  getStructurePipPath(tonnage: number, location: MechLocation | string): string {
    const abbrev = this.getLocationAbbreviation(location);
    return `${PIPS_BASE_PATH}/BipedIS${tonnage}_${abbrev}.svg`;
  }

  getRecordSheetTemplatePath(
    config: MechConfiguration,
    paperSize: PaperSize = PaperSize.LETTER
  ): string {
    return TEMPLATE_PATHS[config]?.[paperSize] ?? TEMPLATE_PATHS[MechConfiguration.BIPED][paperSize];
  }

  async loadSVG(path: string): Promise<string> {
    const cached = this.svgCache.get(path);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.content;
    }

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load SVG: ${path} (${response.status})`);
    }

    const content = await response.text();
    this.svgCache.set(path, { content, timestamp: Date.now() });
    return content;
  }

  async loadArmorPipSVG(
    location: MechLocation | string,
    count: number,
    isRear: boolean = false
  ): Promise<string> {
    const path = this.getArmorPipPath(location, count, isRear);
    return this.loadSVG(path);
  }

  async loadStructurePipSVG(
    tonnage: number,
    location: MechLocation | string
  ): Promise<string> {
    const path = this.getStructurePipPath(tonnage, location);
    return this.loadSVG(path);
  }

  async loadRecordSheetTemplate(
    config: MechConfiguration,
    paperSize: PaperSize = PaperSize.LETTER
  ): Promise<string> {
    const path = this.getRecordSheetTemplatePath(config, paperSize);
    return this.loadSVG(path);
  }

  async preloadConfiguration(
    config: MechConfiguration,
    tonnage: number,
    paperSize: PaperSize = PaperSize.LETTER
  ): Promise<void> {
    const locations = this.getLocationsForConfiguration(config);
    
    const templatePromise = this.loadRecordSheetTemplate(config, paperSize);
    
    const structurePromises = locations.map(loc => 
      this.loadStructurePipSVG(tonnage, loc).catch(() => null)
    );

    await Promise.all([templatePromise, ...structurePromises]);
  }

  getLocationsForConfiguration(config: MechConfiguration): MechLocation[] {
    // Use centralized registry with string-based lookup
    return getLocationsForConfigurationString(config);
  }

  parseSVGToPaths(svgContent: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const paths = doc.querySelectorAll('path');
    return Array.from(paths).map(p => p.outerHTML);
  }

  clearCache(): void {
    this.svgCache.clear();
  }

  private getLocationCode(location: MechLocation | string): string {
    if (typeof location === 'string' && LOCATION_ABBREV_TO_MM_DATA_CODE[location]) {
      return LOCATION_ABBREV_TO_MM_DATA_CODE[location];
    }
    return LOCATION_TO_MM_DATA_CODE[location] ?? 'CT';
  }

  private getLocationAbbreviation(location: MechLocation | string): string {
    if (typeof location === 'string' && location.length <= 3) {
      return location;
    }
    
    const abbrevMap: Record<string, string> = {
      [MechLocation.HEAD]: 'HD',
      [MechLocation.CENTER_TORSO]: 'CT',
      [MechLocation.LEFT_TORSO]: 'LT',
      [MechLocation.RIGHT_TORSO]: 'RT',
      [MechLocation.LEFT_ARM]: 'LA',
      [MechLocation.RIGHT_ARM]: 'RA',
      [MechLocation.LEFT_LEG]: 'LL',
      [MechLocation.RIGHT_LEG]: 'RL',
      [MechLocation.FRONT_LEFT_LEG]: 'FLL',
      [MechLocation.FRONT_RIGHT_LEG]: 'FRL',
      [MechLocation.REAR_LEFT_LEG]: 'RLL',
      [MechLocation.REAR_RIGHT_LEG]: 'RRL',
      [MechLocation.CENTER_LEG]: 'CL',
    };
    return abbrevMap[location] ?? 'CT';
  }
}

export const mmDataAssetService = MmDataAssetService.getInstance();
