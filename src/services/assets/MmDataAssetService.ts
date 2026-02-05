import { ServiceError } from '@/services/common/errors';
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

/**
 * Error thrown when an asset fails to load from all sources.
 * Includes user-friendly message and recovery instructions.
 */
export class AssetLoadError extends ServiceError {
  constructor(
    public readonly assetPath: string,
    public readonly attemptedSources: string[],
    public readonly sourceErrors: Record<string, string>,
  ) {
    const message =
      `Failed to load asset: ${assetPath}\n\n` +
      `Attempted sources:\n${attemptedSources.map((s) => `  - ${s}`).join('\n')}\n\n` +
      `To fix this, try running: npm run fetch:assets\n` +
      `This will download the required assets from the MegaMek mm-data repository.`;

    super(message, 'ASSET_LOAD_ERROR', {
      assetPath,
      attemptedSources,
      sourceErrors,
    });
    this.name = 'AssetLoadError';
  }
}

/**
 * Configuration for mm-data assets loaded from config/mm-data-assets.json
 */
export interface MmDataAssetConfig {
  version: string;
  repository: string;
  basePath: string;
  cdnBase: string;
  rawBase: string;
  directories: string[];
  patterns: Record<string, string[]>;
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
  HD: 'Head',
  CT: 'CT',
  LT: 'LT',
  RT: 'RT',
  LA: 'LArm',
  RA: 'RArm',
  LL: 'LLeg',
  RL: 'RLeg',
  FLL: 'FLL',
  FRL: 'FRL',
  RLL: 'RLL',
  RRL: 'RRL',
  CL: 'CL',
};

const PIPS_BASE_PATH = '/record-sheets/biped_pips';

// Default configuration values
const DEFAULT_VERSION = 'v0.3.1';
const DEFAULT_REPOSITORY = 'MegaMek/mm-data';
const DEFAULT_BASE_PATH = 'data/images/recordsheets';
const DEFAULT_CDN_BASE = 'https://cdn.jsdelivr.net/gh';
const DEFAULT_RAW_BASE = 'https://raw.githubusercontent.com';

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

/**
 * Asset source used in the fallback chain
 */
type AssetSource = 'local' | 'cdn' | 'github-raw';

class MmDataAssetService {
  private static instance: MmDataAssetService;
  private svgCache: Map<string, CachedSVG> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private config: MmDataAssetConfig | null = null;
  private configLoadPromise: Promise<MmDataAssetConfig> | null = null;

  private constructor() {}

  static getInstance(): MmDataAssetService {
    if (!MmDataAssetService.instance) {
      MmDataAssetService.instance = new MmDataAssetService();
    }
    return MmDataAssetService.instance;
  }

  /**
   * Get the mm-data version to use for CDN/GitHub URLs.
   * Priority: MM_DATA_VERSION env var > config file > default
   */
  getVersion(): string {
    // Environment variable takes precedence
    if (typeof process !== 'undefined' && process.env?.MM_DATA_VERSION) {
      return process.env.MM_DATA_VERSION;
    }
    // Fall back to config or default
    return this.config?.version ?? DEFAULT_VERSION;
  }

  /**
   * Load configuration from config/mm-data-assets.json.
   * Returns cached config if already loaded.
   */
  async loadConfig(): Promise<MmDataAssetConfig> {
    if (this.config) {
      return this.config;
    }

    // Prevent concurrent loads
    if (this.configLoadPromise) {
      return this.configLoadPromise;
    }

    this.configLoadPromise = this.doLoadConfig();
    try {
      this.config = await this.configLoadPromise;
      return this.config;
    } finally {
      this.configLoadPromise = null;
    }
  }

  private async doLoadConfig(): Promise<MmDataAssetConfig> {
    // Try multiple config paths in order of preference
    const configPaths = [
      '/config/mm-data-assets.json', // Public config path
      '/mm-data-assets.json', // Root public path fallback
    ];

    for (const configPath of configPaths) {
      try {
        const response = await fetch(configPath);
        if (response.ok) {
          return (await response.json()) as MmDataAssetConfig;
        }
      } catch {
        // Try next path
      }
    }

    // Return default config when no config file is available
    // This allows the app to work even without fetched assets
    // (will fall back to CDN/GitHub at runtime)
    return {
      version: DEFAULT_VERSION,
      repository: DEFAULT_REPOSITORY,
      basePath: DEFAULT_BASE_PATH,
      cdnBase: DEFAULT_CDN_BASE,
      rawBase: DEFAULT_RAW_BASE,
      directories: ['biped_pips', 'templates_us', 'templates_iso'],
      patterns: {},
    };
  }

  /**
   * Build URLs for all fallback sources for a given asset path.
   */
  private buildSourceUrls(
    assetPath: string,
  ): { source: AssetSource; url: string }[] {
    const version = this.getVersion();
    const repository = this.config?.repository ?? DEFAULT_REPOSITORY;
    const basePath = this.config?.basePath ?? DEFAULT_BASE_PATH;
    const cdnBase = this.config?.cdnBase ?? DEFAULT_CDN_BASE;
    const rawBase = this.config?.rawBase ?? DEFAULT_RAW_BASE;

    // Remove leading slash for CDN/GitHub paths
    const cleanPath = assetPath.startsWith('/record-sheets/')
      ? assetPath.slice('/record-sheets/'.length)
      : assetPath.startsWith('/')
        ? assetPath.slice(1)
        : assetPath;

    return [
      // 1. Local bundled path (for desktop/bundled apps)
      {
        source: 'local' as AssetSource,
        url: assetPath.startsWith('/') ? assetPath : `/${assetPath}`,
      },
      // 2. jsDelivr CDN
      {
        source: 'cdn' as AssetSource,
        url: `${cdnBase}/${repository}@${version}/${basePath}/${cleanPath}`,
      },
      // 3. GitHub raw (fallback)
      {
        source: 'github-raw' as AssetSource,
        url: `${rawBase}/${repository}/${version}/${basePath}/${cleanPath}`,
      },
    ];
  }

  getArmorPipPath(
    location: MechLocation | string,
    count: number,
    isRear: boolean = false,
  ): string {
    const mmCode = this.getLocationCode(location);
    const rearSuffix = isRear ? '_R' : '';
    return `${PIPS_BASE_PATH}/Armor_${mmCode}${rearSuffix}_${count}_Humanoid.svg`;
  }

  getStructurePipPath(
    tonnage: number,
    location: MechLocation | string,
  ): string {
    const abbrev = this.getLocationAbbreviation(location);
    return `${PIPS_BASE_PATH}/BipedIS${tonnage}_${abbrev}.svg`;
  }

  getRecordSheetTemplatePath(
    config: MechConfiguration,
    paperSize: PaperSize = PaperSize.LETTER,
  ): string {
    return (
      TEMPLATE_PATHS[config]?.[paperSize] ??
      TEMPLATE_PATHS[MechConfiguration.BIPED][paperSize]
    );
  }

  /**
   * Load SVG content with fallback chain.
   * Tries: local bundled -> jsDelivr CDN -> GitHub raw
   *
   * @throws AssetLoadError if all sources fail
   */
  async loadSVG(path: string): Promise<string> {
    const cached = this.svgCache.get(path);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.content;
    }

    // Ensure config is loaded for fallback URLs
    await this.loadConfig();

    const sources = this.buildSourceUrls(path);
    const sourceErrors: Record<string, string> = {};
    const attemptedSources: string[] = [];

    for (const { source, url } of sources) {
      attemptedSources.push(`${source}: ${url}`);

      try {
        const response = await fetch(url);
        if (response.ok) {
          const content = await response.text();
          this.svgCache.set(path, { content, timestamp: Date.now() });
          return content;
        }
        sourceErrors[source] = `HTTP ${response.status}`;
      } catch (error) {
        sourceErrors[source] =
          error instanceof Error ? error.message : String(error);
      }
    }

    // All sources failed - throw user-friendly error
    throw new AssetLoadError(path, attemptedSources, sourceErrors);
  }

  async loadArmorPipSVG(
    location: MechLocation | string,
    count: number,
    isRear: boolean = false,
  ): Promise<string> {
    const path = this.getArmorPipPath(location, count, isRear);
    return this.loadSVG(path);
  }

  async loadStructurePipSVG(
    tonnage: number,
    location: MechLocation | string,
  ): Promise<string> {
    const path = this.getStructurePipPath(tonnage, location);
    return this.loadSVG(path);
  }

  async loadRecordSheetTemplate(
    config: MechConfiguration,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<string> {
    const path = this.getRecordSheetTemplatePath(config, paperSize);
    return this.loadSVG(path);
  }

  async preloadConfiguration(
    config: MechConfiguration,
    tonnage: number,
    paperSize: PaperSize = PaperSize.LETTER,
  ): Promise<void> {
    const locations = this.getLocationsForConfiguration(config);

    const templatePromise = this.loadRecordSheetTemplate(config, paperSize);

    const structurePromises = locations.map((loc) =>
      this.loadStructurePipSVG(tonnage, loc).catch(() => null),
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
    return Array.from(paths).map((p) => p.outerHTML);
  }

  clearCache(): void {
    this.svgCache.clear();
    this.config = null;
    this.configLoadPromise = null;
  }

  private getLocationCode(location: MechLocation | string): string {
    if (
      typeof location === 'string' &&
      LOCATION_ABBREV_TO_MM_DATA_CODE[location]
    ) {
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
