/**
 * MmDataAssetService Tests
 *
 * Tests for the MegaMek data asset loading service.
 * Tests cover SVG loading, caching, path generation, and configuration management.
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

// We need to mock fetch before importing the service
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock DOMParser for parseSVGToPaths tests
const mockPaths: HTMLElement[] = [];
const mockQuerySelectorAll = jest.fn(() => mockPaths);
const mockParseFromString = jest.fn(() => ({
  querySelectorAll: mockQuerySelectorAll,
}));

// Create a mock DOMParser constructor
const MockDOMParser = jest.fn().mockImplementation(() => ({
  parseFromString: mockParseFromString,
}));
// Assign to global (type assertion needed for test environment)
Object.assign(global, { DOMParser: MockDOMParser });

// Import after mocks are set up
import {
  mmDataAssetService,
  MechConfiguration,
  PaperSize,
} from '../MmDataAssetService';

// Import AssetLoadError for type checking
import { AssetLoadError } from '../MmDataAssetService';

/**
 * Helper to create a mock fetch implementation that:
 * - Returns 404 for config file paths
 * - Returns success for specific asset paths
 */
function _createMockFetch(responses: Record<string, { ok: boolean; content?: string; status?: number }>) {
  return jest.fn().mockImplementation((url: string) => {
    // Check for exact matches first
    if (responses[url]) {
      const response = responses[url];
      if (response.ok) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(response.content),
          json: () => Promise.resolve(JSON.parse(response.content || '{}')),
        });
      }
      return Promise.resolve({
        ok: false,
        status: response.status || 404,
      });
    }
    
    // Check for partial matches (for CDN/GitHub URLs)
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern) || pattern.includes(url.split('/').pop() || '')) {
        if (response.ok) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(response.content),
            json: () => Promise.resolve(JSON.parse(response.content || '{}')),
          });
        }
        return Promise.resolve({
          ok: false,
          status: response.status || 404,
        });
      }
    }
    
    // Default: return 404
    return Promise.resolve({
      ok: false,
      status: 404,
    });
  });
}

describe('MmDataAssetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache before each test
    mmDataAssetService.clearCache();
    
    // Reset mock paths
    mockPaths.length = 0;
    
    // Reset mockFetch to default behavior (404 for everything)
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      // The module exports a singleton instance
      // Just verify it exists and has expected methods
      expect(mmDataAssetService).toBeDefined();
      expect(mmDataAssetService.loadSVG).toBeInstanceOf(Function);
      expect(mmDataAssetService.clearCache).toBeInstanceOf(Function);
    });
  });

  describe('getArmorPipPath', () => {
    it('should generate correct path for HEAD location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.HEAD, 9);
      expect(path).toBe('/record-sheets/biped_pips/Armor_Head_9_Humanoid.svg');
    });

    it('should generate correct path for CENTER_TORSO location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.CENTER_TORSO, 35);
      expect(path).toBe('/record-sheets/biped_pips/Armor_CT_35_Humanoid.svg');
    });

    it('should generate correct path for LEFT_TORSO location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.LEFT_TORSO, 24);
      expect(path).toBe('/record-sheets/biped_pips/Armor_LT_24_Humanoid.svg');
    });

    it('should generate correct path for RIGHT_TORSO location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.RIGHT_TORSO, 24);
      expect(path).toBe('/record-sheets/biped_pips/Armor_RT_24_Humanoid.svg');
    });

    it('should generate correct path for LEFT_ARM location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.LEFT_ARM, 16);
      expect(path).toBe('/record-sheets/biped_pips/Armor_LArm_16_Humanoid.svg');
    });

    it('should generate correct path for RIGHT_ARM location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.RIGHT_ARM, 16);
      expect(path).toBe('/record-sheets/biped_pips/Armor_RArm_16_Humanoid.svg');
    });

    it('should generate correct path for LEFT_LEG location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.LEFT_LEG, 20);
      expect(path).toBe('/record-sheets/biped_pips/Armor_LLeg_20_Humanoid.svg');
    });

    it('should generate correct path for RIGHT_LEG location', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.RIGHT_LEG, 20);
      expect(path).toBe('/record-sheets/biped_pips/Armor_RLeg_20_Humanoid.svg');
    });

    it('should generate correct path with rear suffix when isRear is true', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.CENTER_TORSO, 12, true);
      expect(path).toBe('/record-sheets/biped_pips/Armor_CT_R_12_Humanoid.svg');
    });

    it('should handle string abbreviation locations (HD)', () => {
      const path = mmDataAssetService.getArmorPipPath('HD', 9);
      expect(path).toBe('/record-sheets/biped_pips/Armor_Head_9_Humanoid.svg');
    });

    it('should handle string abbreviation locations (CT)', () => {
      const path = mmDataAssetService.getArmorPipPath('CT', 35);
      expect(path).toBe('/record-sheets/biped_pips/Armor_CT_35_Humanoid.svg');
    });

    it('should handle string abbreviation locations (LA)', () => {
      const path = mmDataAssetService.getArmorPipPath('LA', 16);
      expect(path).toBe('/record-sheets/biped_pips/Armor_LArm_16_Humanoid.svg');
    });

    it('should handle string abbreviation locations (RA)', () => {
      const path = mmDataAssetService.getArmorPipPath('RA', 16);
      expect(path).toBe('/record-sheets/biped_pips/Armor_RArm_16_Humanoid.svg');
    });

    it('should handle quad mech locations (FLL)', () => {
      const path = mmDataAssetService.getArmorPipPath('FLL', 10);
      expect(path).toBe('/record-sheets/biped_pips/Armor_FLL_10_Humanoid.svg');
    });

    it('should handle quad mech locations (FRONT_LEFT_LEG)', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.FRONT_LEFT_LEG, 10);
      expect(path).toBe('/record-sheets/biped_pips/Armor_FLL_10_Humanoid.svg');
    });

    it('should default to CT for unknown location strings', () => {
      const path = mmDataAssetService.getArmorPipPath('UNKNOWN', 20);
      expect(path).toBe('/record-sheets/biped_pips/Armor_CT_20_Humanoid.svg');
    });
  });

  describe('getStructurePipPath', () => {
    it('should generate correct path for 50-ton mech HEAD', () => {
      const path = mmDataAssetService.getStructurePipPath(50, MechLocation.HEAD);
      expect(path).toBe('/record-sheets/biped_pips/BipedIS50_HD.svg');
    });

    it('should generate correct path for 75-ton mech CENTER_TORSO', () => {
      const path = mmDataAssetService.getStructurePipPath(75, MechLocation.CENTER_TORSO);
      expect(path).toBe('/record-sheets/biped_pips/BipedIS75_CT.svg');
    });

    it('should generate correct path for 100-ton mech LEFT_ARM', () => {
      const path = mmDataAssetService.getStructurePipPath(100, MechLocation.LEFT_ARM);
      expect(path).toBe('/record-sheets/biped_pips/BipedIS100_LA.svg');
    });

    it('should handle string abbreviation for location', () => {
      const path = mmDataAssetService.getStructurePipPath(85, 'RT');
      expect(path).toBe('/record-sheets/biped_pips/BipedIS85_RT.svg');
    });

    it('should handle short string abbreviation directly', () => {
      const path = mmDataAssetService.getStructurePipPath(60, 'LL');
      expect(path).toBe('/record-sheets/biped_pips/BipedIS60_LL.svg');
    });

    it('should default to CT abbreviation for unknown locations', () => {
      const path = mmDataAssetService.getStructurePipPath(45, 'UNKNOWN_LOCATION');
      expect(path).toBe('/record-sheets/biped_pips/BipedIS45_CT.svg');
    });
  });

  describe('getRecordSheetTemplatePath', () => {
    it('should return biped letter template path by default', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.BIPED);
      expect(path).toBe('/record-sheets/templates_us/mek_biped_default.svg');
    });

    it('should return biped A4 template path when specified', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(
        MechConfiguration.BIPED,
        PaperSize.A4
      );
      expect(path).toBe('/record-sheets/templates_iso/mek_biped_default.svg');
    });

    it('should return quad letter template path', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.QUAD);
      expect(path).toBe('/record-sheets/templates_us/mek_quad_default.svg');
    });

    it('should return quad A4 template path', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(
        MechConfiguration.QUAD,
        PaperSize.A4
      );
      expect(path).toBe('/record-sheets/templates_iso/mek_quad_default.svg');
    });

    it('should return tripod letter template path', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.TRIPOD);
      expect(path).toBe('/record-sheets/templates_us/mek_tripod_default.svg');
    });

    it('should return LAM letter template path', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.LAM);
      expect(path).toBe('/record-sheets/templates_us/mek_lam_default.svg');
    });

    it('should return QuadVee letter template path', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.QUADVEE);
      expect(path).toBe('/record-sheets/templates_us/mek_quadvee_default.svg');
    });

    it('should fallback to biped template for unknown configuration', () => {
      const path = mmDataAssetService.getRecordSheetTemplatePath(
        'Unknown' as MechConfiguration
      );
      expect(path).toBe('/record-sheets/templates_us/mek_biped_default.svg');
    });
  });

  describe('loadSVG', () => {
    it('should fetch SVG content from local path (first in fallback chain)', async () => {
      const mockSVGContent = '<svg><path d="M0 0"/></svg>';
      // Mock: config fails, but local path succeeds
      mockFetch.mockImplementation((url: string) => {
        if (url === '/test/path.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await mmDataAssetService.loadSVG('/test/path.svg');

      // First call is for local path
      expect(mockFetch).toHaveBeenCalledWith('/test/path.svg');
      expect(result).toBe(mockSVGContent);
    });

    it('should fall back to CDN when local fails', async () => {
      const mockSVGContent = '<svg>from cdn</svg>';
      // Mock: config and local fail, CDN succeeds
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('cdn.jsdelivr.net')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await mmDataAssetService.loadSVG('/record-sheets/test.svg');
      expect(result).toBe(mockSVGContent);
    });

    it('should fall back to GitHub raw when local and CDN fail', async () => {
      const mockSVGContent = '<svg>from github</svg>';
      // Mock: config, local, and CDN fail, GitHub succeeds
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('raw.githubusercontent.com')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await mmDataAssetService.loadSVG('/record-sheets/test.svg');
      expect(result).toBe(mockSVGContent);
    });

    it('should throw AssetLoadError when all sources fail', async () => {
      // All fetches fail
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      await expect(
        mmDataAssetService.loadSVG('/nonexistent.svg')
      ).rejects.toThrow(AssetLoadError);
    });

    it('should throw AssetLoadError with user-friendly message suggesting npm run fetch:assets', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      await expect(
        mmDataAssetService.loadSVG('/nonexistent.svg')
      ).rejects.toThrow('npm run fetch:assets');
    });

    it('should cache loaded SVG content', async () => {
      const mockSVGContent = '<svg>cached content</svg>';
      mockFetch.mockImplementation((url: string) => {
        if (url === '/cached.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // First call
      await mmDataAssetService.loadSVG('/cached.svg');
      const fetchCallCount = mockFetch.mock.calls.length;
      
      // Second call should use cache (no additional fetch calls)
      const result = await mmDataAssetService.loadSVG('/cached.svg');

      expect(mockFetch.mock.calls.length).toBe(fetchCallCount); // No new calls
      expect(result).toBe(mockSVGContent);
    });

    it('should return cached content within TTL', async () => {
      const mockSVGContent = '<svg>ttl test</svg>';
      mockFetch.mockImplementation((url: string) => {
        if (url === '/ttl-test.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await mmDataAssetService.loadSVG('/ttl-test.svg');
      const fetchCallCount = mockFetch.mock.calls.length;
      
      // Immediately fetch again - should use cache
      const result = await mmDataAssetService.loadSVG('/ttl-test.svg');

      expect(mockFetch.mock.calls.length).toBe(fetchCallCount); // No new calls
      expect(result).toBe(mockSVGContent);
    });
  });

  describe('loadArmorPipSVG', () => {
    it('should load armor pip SVG for a location', async () => {
      const mockSVGContent = '<svg>armor pips</svg>';
      const expectedPath = '/record-sheets/biped_pips/Armor_Head_9_Humanoid.svg';
      mockFetch.mockImplementation((url: string) => {
        if (url === expectedPath) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await mmDataAssetService.loadArmorPipSVG(MechLocation.HEAD, 9);

      expect(mockFetch).toHaveBeenCalledWith(expectedPath);
      expect(result).toBe(mockSVGContent);
    });

    it('should load rear armor pip SVG when isRear is true', async () => {
      const mockSVGContent = '<svg>rear armor</svg>';
      const expectedPath = '/record-sheets/biped_pips/Armor_CT_R_12_Humanoid.svg';
      mockFetch.mockImplementation((url: string) => {
        if (url === expectedPath) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await mmDataAssetService.loadArmorPipSVG(MechLocation.CENTER_TORSO, 12, true);

      expect(mockFetch).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('loadStructurePipSVG', () => {
    it('should load structure pip SVG for a tonnage and location', async () => {
      const mockSVGContent = '<svg>structure pips</svg>';
      const expectedPath = '/record-sheets/biped_pips/BipedIS75_CT.svg';
      mockFetch.mockImplementation((url: string) => {
        if (url === expectedPath) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await mmDataAssetService.loadStructurePipSVG(75, MechLocation.CENTER_TORSO);

      expect(mockFetch).toHaveBeenCalledWith(expectedPath);
      expect(result).toBe(mockSVGContent);
    });
  });

  describe('loadRecordSheetTemplate', () => {
    it('should load record sheet template with default paper size', async () => {
      const mockSVGContent = '<svg>biped template</svg>';
      const expectedPath = '/record-sheets/templates_us/mek_biped_default.svg';
      mockFetch.mockImplementation((url: string) => {
        if (url === expectedPath) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await mmDataAssetService.loadRecordSheetTemplate(MechConfiguration.BIPED);

      expect(mockFetch).toHaveBeenCalledWith(expectedPath);
      expect(result).toBe(mockSVGContent);
    });

    it('should load record sheet template with A4 paper size', async () => {
      const mockSVGContent = '<svg>A4 template</svg>';
      const expectedPath = '/record-sheets/templates_iso/mek_quad_default.svg';
      mockFetch.mockImplementation((url: string) => {
        if (url === expectedPath) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await mmDataAssetService.loadRecordSheetTemplate(MechConfiguration.QUAD, PaperSize.A4);

      expect(mockFetch).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('preloadConfiguration', () => {
    it('should preload template and structure pips for biped configuration', async () => {
      // All local assets succeed
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/record-sheets/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg></svg>'),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await mmDataAssetService.preloadConfiguration(MechConfiguration.BIPED, 50);

      // Should have called for template + 8 biped locations
      expect(mockFetch).toHaveBeenCalled();
      
      // Check template was loaded
      expect(mockFetch).toHaveBeenCalledWith(
        '/record-sheets/templates_us/mek_biped_default.svg'
      );
    });

    it('should preload with A4 paper size', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/record-sheets/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg></svg>'),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await mmDataAssetService.preloadConfiguration(
        MechConfiguration.BIPED,
        50,
        PaperSize.A4
      );

      expect(mockFetch).toHaveBeenCalledWith(
        '/record-sheets/templates_iso/mek_biped_default.svg'
      );
    });

    it('should handle failed structure pip loads gracefully', async () => {
      // Template succeeds (local path), structure pips fail (all sources)
      mockFetch.mockImplementation((url: string) => {
        if (url === '/record-sheets/templates_us/mek_biped_default.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg>template</svg>'),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // Should not throw because structure pip failures are caught
      await expect(
        mmDataAssetService.preloadConfiguration(MechConfiguration.BIPED, 50)
      ).resolves.toBeUndefined();
    });
  });

  describe('getLocationsForConfiguration', () => {
    it('should return biped locations for BIPED configuration', () => {
      const locations = mmDataAssetService.getLocationsForConfiguration(MechConfiguration.BIPED);
      
      expect(locations).toContain(MechLocation.HEAD);
      expect(locations).toContain(MechLocation.CENTER_TORSO);
      expect(locations).toContain(MechLocation.LEFT_ARM);
      expect(locations).toContain(MechLocation.RIGHT_ARM);
      expect(locations).toContain(MechLocation.LEFT_LEG);
      expect(locations).toContain(MechLocation.RIGHT_LEG);
      expect(locations).toHaveLength(8);
    });

    it('should return quad locations for QUAD configuration', () => {
      const locations = mmDataAssetService.getLocationsForConfiguration(MechConfiguration.QUAD);
      
      expect(locations).toContain(MechLocation.HEAD);
      expect(locations).toContain(MechLocation.CENTER_TORSO);
      expect(locations).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(locations).toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(locations).toContain(MechLocation.REAR_LEFT_LEG);
      expect(locations).toContain(MechLocation.REAR_RIGHT_LEG);
      expect(locations).toHaveLength(8);
    });

    it('should return tripod locations for TRIPOD configuration', () => {
      const locations = mmDataAssetService.getLocationsForConfiguration(MechConfiguration.TRIPOD);
      
      expect(locations).toContain(MechLocation.CENTER_LEG);
      expect(locations).toHaveLength(9);
    });

    it('should return LAM locations for LAM configuration', () => {
      const locations = mmDataAssetService.getLocationsForConfiguration(MechConfiguration.LAM);
      
      expect(locations).toContain(MechLocation.HEAD);
      expect(locations).toContain(MechLocation.LEFT_ARM);
      expect(locations).toHaveLength(8);
    });

    it('should return QuadVee locations for QUADVEE configuration', () => {
      const locations = mmDataAssetService.getLocationsForConfiguration(MechConfiguration.QUADVEE);
      
      expect(locations).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(locations).toHaveLength(8);
    });
  });

  describe('parseSVGToPaths', () => {
    it('should parse SVG content and return path elements', () => {
      const mockPath1 = { outerHTML: '<path d="M0 0 L10 10"/>' } as Pick<HTMLElement, 'outerHTML'>;
      const mockPath2 = { outerHTML: '<path d="M5 5 L15 15"/>' } as Pick<HTMLElement, 'outerHTML'>;
      mockPaths.push(mockPath1 as HTMLElement);
      mockPaths.push(mockPath2 as HTMLElement);

      const paths = mmDataAssetService.parseSVGToPaths('<svg><path/><path/></svg>');

      expect(mockParseFromString).toHaveBeenCalledWith(
        '<svg><path/><path/></svg>',
        'image/svg+xml'
      );
      expect(paths).toHaveLength(2);
      expect(paths[0]).toBe('<path d="M0 0 L10 10"/>');
      expect(paths[1]).toBe('<path d="M5 5 L15 15"/>');
    });

    it('should return empty array when no paths found', () => {
      // mockPaths is already empty
      const paths = mmDataAssetService.parseSVGToPaths('<svg></svg>');

      expect(paths).toHaveLength(0);
    });
  });

  describe('clearCache', () => {
    it('should clear cached SVG content', async () => {
      const mockSVGContent = '<svg>cached</svg>';
      mockFetch.mockImplementation((url: string) => {
        if (url === '/to-clear.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockSVGContent),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // Load and cache
      await mmDataAssetService.loadSVG('/to-clear.svg');
      const firstCallCount = mockFetch.mock.calls.length;

      // Clear cache
      mmDataAssetService.clearCache();

      // Load again - should fetch (including config reload)
      await mmDataAssetService.loadSVG('/to-clear.svg');
      expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('should also clear config cache', async () => {
      // First load to populate config cache
      mockFetch.mockImplementation((url: string) => {
        if (url === '/config/mm-data-assets.json') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ version: 'v1.0.0', repository: 'test/repo' }),
            text: () => Promise.resolve('{}'),
          });
        }
        if (url === '/test.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg></svg>'),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await mmDataAssetService.loadSVG('/test.svg');
      
      // Clear cache
      mmDataAssetService.clearCache();
      
      // Version should reset to default until config is reloaded
      expect(mmDataAssetService.getVersion()).toBe('v0.3.1');
    });
  });

  describe('version configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset env for each test
      process.env = { ...originalEnv };
      delete process.env.MM_DATA_VERSION;
      mmDataAssetService.clearCache();
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return default version when no config or env var', () => {
      expect(mmDataAssetService.getVersion()).toBe('v0.3.1');
    });

    it('should use MM_DATA_VERSION env var when set', () => {
      process.env.MM_DATA_VERSION = 'v1.0.0';
      expect(mmDataAssetService.getVersion()).toBe('v1.0.0');
    });

    it('should load version from config file', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/config/mm-data-assets.json') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: 'v2.0.0',
              repository: 'MegaMek/mm-data',
              basePath: 'data/images/recordsheets',
              cdnBase: 'https://cdn.jsdelivr.net/gh',
              rawBase: 'https://raw.githubusercontent.com',
              directories: [],
              patterns: {},
            }),
          });
        }
        if (url === '/test.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg></svg>'),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // Loading an SVG triggers config load
      await mmDataAssetService.loadSVG('/test.svg');
      
      // After config is loaded, version should come from config
      expect(mmDataAssetService.getVersion()).toBe('v2.0.0');
    });

    it('should prefer env var over config file', async () => {
      process.env.MM_DATA_VERSION = 'env-version';
      
      mockFetch.mockImplementation((url: string) => {
        if (url === '/config/mm-data-assets.json') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: 'config-version',
              repository: 'MegaMek/mm-data',
            }),
          });
        }
        if (url === '/test.svg') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg></svg>'),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await mmDataAssetService.loadSVG('/test.svg');
      
      // Env var should take precedence
      expect(mmDataAssetService.getVersion()).toBe('env-version');
    });
  });

  describe('AssetLoadError', () => {
    it('should include asset path in error message', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      try {
        await mmDataAssetService.loadSVG('/missing-asset.svg');
        fail('Expected AssetLoadError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AssetLoadError);
        const assetError = error as InstanceType<typeof AssetLoadError>;
        expect(assetError.assetPath).toBe('/missing-asset.svg');
        expect(assetError.message).toContain('/missing-asset.svg');
      }
    });

    it('should include all attempted sources in error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      try {
        await mmDataAssetService.loadSVG('/test.svg');
        fail('Expected AssetLoadError to be thrown');
      } catch (error) {
        const assetError = error as InstanceType<typeof AssetLoadError>;
        expect(assetError.attemptedSources).toHaveLength(3);
        expect(assetError.attemptedSources.some(s => s.includes('local'))).toBe(true);
        expect(assetError.attemptedSources.some(s => s.includes('cdn'))).toBe(true);
        expect(assetError.attemptedSources.some(s => s.includes('github-raw'))).toBe(true);
      }
    });

    it('should include recovery instructions in message', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      try {
        await mmDataAssetService.loadSVG('/test.svg');
        fail('Expected AssetLoadError to be thrown');
      } catch (error) {
        const assetError = error as InstanceType<typeof AssetLoadError>;
        expect(assetError.message).toContain('npm run fetch:assets');
        expect(assetError.message).toContain('MegaMek mm-data repository');
      }
    });

    it('should include error details for each source', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      try {
        await mmDataAssetService.loadSVG('/test.svg');
        fail('Expected AssetLoadError to be thrown');
      } catch (error) {
        const assetError = error as InstanceType<typeof AssetLoadError>;
        expect(assetError.sourceErrors).toHaveProperty('local');
        expect(assetError.sourceErrors).toHaveProperty('cdn');
        expect(assetError.sourceErrors).toHaveProperty('github-raw');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle center leg location for tripod', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.CENTER_LEG, 15);
      expect(path).toBe('/record-sheets/biped_pips/Armor_CL_15_Humanoid.svg');
    });

    it('should handle all quad leg locations', () => {
      expect(mmDataAssetService.getArmorPipPath(MechLocation.FRONT_RIGHT_LEG, 10))
        .toBe('/record-sheets/biped_pips/Armor_FRL_10_Humanoid.svg');
      expect(mmDataAssetService.getArmorPipPath(MechLocation.REAR_LEFT_LEG, 10))
        .toBe('/record-sheets/biped_pips/Armor_RLL_10_Humanoid.svg');
      expect(mmDataAssetService.getArmorPipPath(MechLocation.REAR_RIGHT_LEG, 10))
        .toBe('/record-sheets/biped_pips/Armor_RRL_10_Humanoid.svg');
    });

    it('should handle zero armor count', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.HEAD, 0);
      expect(path).toBe('/record-sheets/biped_pips/Armor_Head_0_Humanoid.svg');
    });

    it('should handle high armor counts', () => {
      const path = mmDataAssetService.getArmorPipPath(MechLocation.CENTER_TORSO, 99);
      expect(path).toBe('/record-sheets/biped_pips/Armor_CT_99_Humanoid.svg');
    });
  });
});
