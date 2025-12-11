/**
 * Tests for SVGRecordSheetRenderer
 * 
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { SVGRecordSheetRenderer } from '@/services/printing/SVGRecordSheetRenderer';
import {
  IRecordSheetData,
  IRecordSheetHeader,
  IRecordSheetMovement,
  IRecordSheetArmor,
  IRecordSheetStructure,
  IRecordSheetEquipment,
  IRecordSheetHeatSinks,
  ILocationCriticals,
} from '@/types/printing';
import { createDOMMock } from '../../helpers';

// Mock fetch for template loading
const mockSVGContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
  <g id="type"><text>MECH TYPE</text></g>
  <g id="tonnage"><text>TONNAGE</text></g>
  <g id="techBase"><text>TECH BASE</text></g>
  <g id="rulesLevel"><text>RULES LEVEL</text></g>
  <g id="mpWalk"><text>WALK</text></g>
  <g id="mpRun"><text>RUN</text></g>
  <g id="mpJump"><text>JUMP</text></g>
  <g id="bv"><text>BV</text></g>
  <g id="armorType"><text>ARMOR</text></g>
  <g id="structureType"><text>STRUCTURE</text></g>
  <g id="hsType"><text>HS TYPE</text></g>
  <g id="hsCount"><text>HS COUNT</text></g>
  <g id="inventory"></g>
  <g id="canonArmorPips"></g>
  <g id="armorPips"></g>
  <g id="canonStructurePips"></g>
  <g id="structurePips"></g>
  <g id="textArmor_HD"><text>0</text></g>
  <g id="textArmor_CT"><text>0</text></g>
  <g id="textArmor_LT"><text>0</text></g>
  <g id="textArmor_RT"><text>0</text></g>
  <g id="textArmor_LA"><text>0</text></g>
  <g id="textArmor_RA"><text>0</text></g>
  <g id="textArmor_LL"><text>0</text></g>
  <g id="textArmor_RL"><text>0</text></g>
  <g id="isPipsHD"><circle r="3"/></g>
  <g id="isPipsCT"><circle r="3"/></g>
  <g id="isPipsLT"><circle r="3"/></g>
  <g id="isPipsRT"><circle r="3"/></g>
  <g id="isPipsLA"><circle r="3"/></g>
  <g id="isPipsRA"><circle r="3"/></g>
  <g id="isPipsLL"><circle r="3"/></g>
  <g id="isPipsRL"><circle r="3"/></g>
</svg>
`;

global.fetch = jest.fn().mockImplementation((url: string) => {
  if (url.includes('.svg')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(mockSVGContent),
    });
  }
  return Promise.reject(new Error('Not found'));
});

// Mock canvas context
const mockContext = {
  drawImage: jest.fn(),
  fillText: jest.fn(),
  clearRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  fillRect: jest.fn(),
};

// Mock canvas using DOM mock helper
const mockCanvas = createDOMMock<HTMLCanvasElement>({
  width: 612,
  height: 792,
  getContext: jest.fn().mockReturnValue(mockContext),
  toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
});

// Create mock record sheet data
const createMockData = (overrides: Partial<IRecordSheetData> = {}): IRecordSheetData => ({
  header: {
    unitName: 'Atlas AS7-D',
    chassis: 'Atlas',
    model: 'AS7-D',
    tonnage: 100,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    era: 'Succession Wars',
    battleValue: 1897,
    cost: 9626000,
  } as IRecordSheetHeader,
  movement: {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    hasMASC: false,
    hasTSM: false,
    hasSupercharger: false,
  } as IRecordSheetMovement,
  armor: {
    type: 'Standard',
    totalPoints: 307,
    locations: [
      { location: 'Head', abbreviation: 'HD', current: 9, maximum: 9 },
      { location: 'Center Torso', abbreviation: 'CT', current: 32, maximum: 46, rear: 14, rearMaximum: 14 },
      { location: 'Left Torso', abbreviation: 'LT', current: 32, maximum: 32, rear: 10, rearMaximum: 10 },
      { location: 'Right Torso', abbreviation: 'RT', current: 32, maximum: 32, rear: 10, rearMaximum: 10 },
      { location: 'Left Arm', abbreviation: 'LA', current: 34, maximum: 34 },
      { location: 'Right Arm', abbreviation: 'RA', current: 34, maximum: 34 },
      { location: 'Left Leg', abbreviation: 'LL', current: 41, maximum: 42 },
      { location: 'Right Leg', abbreviation: 'RL', current: 41, maximum: 42 },
    ],
  } as IRecordSheetArmor,
  // @ts-expect-error - Partial mock of IRecordSheetStructure for testing
  structure: {
    type: 'Standard',
    locations: [
      { location: 'Head', abbreviation: 'HD', points: 3 },
      { location: 'Center Torso', abbreviation: 'CT', points: 31 },
      { location: 'Left Torso', abbreviation: 'LT', points: 21 },
      { location: 'Right Torso', abbreviation: 'RT', points: 21 },
      { location: 'Left Arm', abbreviation: 'LA', points: 17 },
      { location: 'Right Arm', abbreviation: 'RA', points: 17 },
      { location: 'Left Leg', abbreviation: 'LL', points: 21 },
      { location: 'Right Leg', abbreviation: 'RL', points: 21 },
    ],
  } as IRecordSheetStructure,
  equipment: [
    {
      id: 'ac-20',
      name: 'AC/20',
      location: 'Right Torso',
      locationAbbr: 'RT',
      heat: 7,
      damage: '20',
      minimum: 0,
      short: 3,
      medium: 6,
      long: 9,
      quantity: 1,
      isWeapon: true,
      isAmmo: false,
    },
    {
      id: 'medium-laser',
      name: 'Medium Laser',
      location: 'Left Torso',
      locationAbbr: 'LT',
      heat: 3,
      damage: '5',
      minimum: 0,
      short: 3,
      medium: 6,
      long: 9,
      quantity: 1,
      isWeapon: true,
      isAmmo: false,
    },
    {
      id: 'ac-20-ammo',
      name: 'AC/20 Ammo',
      location: 'Right Torso',
      locationAbbr: 'RT',
      heat: '-',
      damage: '-',
      minimum: '-',
      short: '-',
      medium: '-',
      long: '-',
      quantity: 1,
      isWeapon: false,
      isAmmo: true,
      ammoCount: 5,
    },
  ] as IRecordSheetEquipment[],
  heatSinks: {
    type: 'Single',
    count: 20,
    capacity: 20,
    integrated: 10,
    external: 10,
  } as IRecordSheetHeatSinks,
  criticals: [] as ILocationCriticals[],
  mechType: 'biped',
  ...overrides,
});

describe('SVGRecordSheetRenderer', () => {
  let renderer: SVGRecordSheetRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    renderer = new SVGRecordSheetRenderer();
  });

  describe('Template Loading', () => {
    it('should load SVG template from path', async () => {
      await renderer.loadTemplate('/record-sheets/templates/mek_biped_default.svg');
      
      expect(fetch).toHaveBeenCalledWith('/record-sheets/templates/mek_biped_default.svg');
    });

    it('should throw on fetch failure', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(renderer.loadTemplate('/invalid/path.svg')).rejects.toThrow();
    });

    it('should throw on SVG parse error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<invalid xml>'),
      });
      
      await expect(renderer.loadTemplate('/invalid.svg')).rejects.toThrow();
    });
  });

  describe('Template Filling', () => {
    beforeEach(async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
    });

    it('should fill template with data', () => {
      const data = createMockData();
      
      // Should not throw
      renderer.fillTemplate(data);
    });

    it('should handle missing optional fields', () => {
      const data = createMockData({
        pilot: undefined,
      });
      
      // Should not throw
      renderer.fillTemplate(data);
    });
  });

  describe('SVG Output', () => {
    beforeEach(async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
      renderer.fillTemplate(createMockData());
    });

    it('should return SVG string', () => {
      const svg = renderer.getSVGString();
      
      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('Canvas Rendering', () => {
    beforeEach(async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
      renderer.fillTemplate(createMockData());
    });

    it('should render to canvas', async () => {
      // Mock createObjectURL and revokeObjectURL
      const mockURL = 'blob:test';
      global.URL.createObjectURL = jest.fn().mockReturnValue(mockURL);
      global.URL.revokeObjectURL = jest.fn();
      
      // Mock Image
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
        width: 612,
        height: 792,
      };
      global.Image = jest.fn().mockImplementation(() => {
        setTimeout(() => mockImage.onload?.(), 0);
        return mockImage;
      });
      
      await renderer.renderToCanvas(mockCanvas);
      
      // Verify context methods were called
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should render to canvas with high DPI', async () => {
      const mockURL = 'blob:test';
      global.URL.createObjectURL = jest.fn().mockReturnValue(mockURL);
      global.URL.revokeObjectURL = jest.fn();
      
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
        width: 612,
        height: 792,
      };
      global.Image = jest.fn().mockImplementation(() => {
        setTimeout(() => mockImage.onload?.(), 0);
        return mockImage;
      });
      
      const highDPICanvas = createDOMMock<HTMLCanvasElement>({
        ...mockCanvas,
        width: 612 * 3,
        height: 792 * 3,
      });
      
      await renderer.renderToCanvasHighDPI(highDPICanvas, 3);
      
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });
  });

  describe('Armor Pips', () => {
    beforeEach(async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
      renderer.fillTemplate(createMockData());
    });

    it('should fill armor pips', async () => {
      const armor = createMockData().armor;
      
      // Should not throw
      await renderer.fillArmorPips(armor);
    });

    it('should handle missing armor locations', async () => {
      const armor = {
        type: 'Standard',
        totalPoints: 0,
        locations: [],
      } as IRecordSheetArmor;
      
      // Should not throw
      await renderer.fillArmorPips(armor);
    });
  });

  describe('Structure Pips', () => {
    beforeEach(async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
      renderer.fillTemplate(createMockData());
    });

    it('should fill structure pips', async () => {
      const structure = createMockData().structure;
      const tonnage = 100;
      
      // Should not throw
      await renderer.fillStructurePips(structure, tonnage);
    });

    it('should handle different tonnages', async () => {
      const structure = createMockData().structure;
      
      const tonnages = [20, 35, 50, 75, 100];
      for (const tonnage of tonnages) {
        await renderer.fillStructurePips(structure, tonnage);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should throw when getSVGString called before template load', () => {
      const newRenderer = new SVGRecordSheetRenderer();
      
      // getSVGString should throw before template load
      expect(() => newRenderer.getSVGString()).toThrow('Template not loaded');
    });

    it('should handle quad mech type', async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
      
      const quadData = createMockData({ mechType: 'quad' });
      renderer.fillTemplate(quadData);
      
      const svg = renderer.getSVGString();
      expect(svg).toBeDefined();
    });

    it('should handle LAM mech type', async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
      
      const lamData = createMockData({ mechType: 'lam' });
      renderer.fillTemplate(lamData);
      
      const svg = renderer.getSVGString();
      expect(svg).toBeDefined();
    });
  });

  describe('Movement Enhancement Flags', () => {
    beforeEach(async () => {
      await renderer.loadTemplate('/record-sheets/templates/test.svg');
    });

    it('should handle MASC flag', () => {
      const data = createMockData({
        movement: {
          ...createMockData().movement,
          hasMASC: true,
        },
      });
      
      renderer.fillTemplate(data);
      const svg = renderer.getSVGString();
      expect(svg).toBeDefined();
    });

    it('should handle TSM flag', () => {
      const data = createMockData({
        movement: {
          ...createMockData().movement,
          hasTSM: true,
        },
      });
      
      renderer.fillTemplate(data);
      const svg = renderer.getSVGString();
      expect(svg).toBeDefined();
    });

    it('should handle Supercharger flag', () => {
      const data = createMockData({
        movement: {
          ...createMockData().movement,
          hasSupercharger: true,
        },
      });
      
      renderer.fillTemplate(data);
      const svg = renderer.getSVGString();
      expect(svg).toBeDefined();
    });
  });
});
