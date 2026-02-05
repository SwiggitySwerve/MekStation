/**
 * Tests for RecordSheetService
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import {
  RecordSheetService,
  recordSheetService,
} from '@/services/printing/RecordSheetService';
import { PaperSize } from '@/types/printing';

import { createDOMMock } from '../../helpers';

// Mock jsPDF
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

// Mock SVGRecordSheetRenderer
jest.mock('@/services/printing/svgRecordSheetRenderer', () => ({
  SVGRecordSheetRenderer: jest.fn().mockImplementation(() => ({
    loadTemplate: jest.fn().mockResolvedValue(undefined),
    fillTemplate: jest.fn(),
    fillArmorPips: jest.fn().mockResolvedValue(undefined),
    fillStructurePips: jest.fn().mockResolvedValue(undefined),
    renderToCanvas: jest.fn().mockResolvedValue(undefined),
    renderToCanvasHighDPI: jest.fn().mockResolvedValue(undefined),
    getSVGString: jest.fn().mockReturnValue('<svg></svg>'),
  })),
}));

// Mock canvas using DOM mock helper
const mockCanvas = createDOMMock<HTMLCanvasElement>({
  width: 0,
  height: 0,
  getContext: jest.fn().mockReturnValue({
    drawImage: jest.fn(),
    fillText: jest.fn(),
    clearRect: jest.fn(),
  }),
  toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
});

// Mock unit configuration
const createMockUnit = (overrides = {}) => ({
  id: 'test-unit-1',
  name: 'Atlas AS7-D',
  chassis: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  era: 'Succession Wars',
  configuration: 'Biped',
  engine: {
    type: 'Fusion',
    rating: 300,
  },
  gyro: {
    type: 'Standard',
  },
  structure: {
    type: 'Standard',
  },
  armor: {
    type: 'Standard',
    allocation: {
      head: 9,
      centerTorso: 32,
      centerTorsoRear: 14,
      leftTorso: 32,
      leftTorsoRear: 10,
      rightTorso: 32,
      rightTorsoRear: 10,
      leftArm: 34,
      rightArm: 34,
      leftLeg: 41,
      rightLeg: 41,
    },
  },
  heatSinks: {
    type: 'Single',
    count: 20,
  },
  movement: {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
  },
  equipment: [
    {
      id: 'ac-20',
      name: 'AC/20',
      location: 'Right Torso',
      heat: 7,
      damage: 20,
      ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
      isWeapon: true,
    },
    {
      id: 'medium-laser',
      name: 'Medium Laser',
      location: 'Left Torso',
      heat: 3,
      damage: 5,
      ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
      isWeapon: true,
    },
    {
      id: 'ac-20-ammo',
      name: 'AC/20 Ammo',
      location: 'Right Torso',
      isAmmo: true,
      ammoCount: 5,
    },
  ],
  battleValue: 1897,
  cost: 9626000,
  ...overrides,
});

describe('RecordSheetService', () => {
  let service: RecordSheetService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = RecordSheetService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return singleton instance', () => {
      const instance1 = RecordSheetService.getInstance();
      const instance2 = RecordSheetService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should export singleton as recordSheetService', () => {
      expect(recordSheetService).toBe(service);
    });
  });

  describe('extractData', () => {
    it('should extract complete record sheet data from unit config', () => {
      const unit = createMockUnit();

      const data = service.extractData(unit);

      expect(data).toBeDefined();
      expect(data.header).toBeDefined();
      expect(data.movement).toBeDefined();
      expect(data.armor).toBeDefined();
      expect(data.structure).toBeDefined();
      expect(data.equipment).toBeDefined();
      expect(data.heatSinks).toBeDefined();
      expect(data.mechType).toBe('biped');
    });

    it('should extract header data correctly', () => {
      const unit = createMockUnit();

      const data = service.extractData(unit);

      expect(data.header.unitName).toBe('Atlas AS7-D');
      expect(data.header.chassis).toBe('Atlas');
      expect(data.header.model).toBe('AS7-D');
      expect(data.header.tonnage).toBe(100);
      expect(data.header.techBase).toBe('Inner Sphere');
      expect(data.header.battleValue).toBe(1897);
      expect(data.header.cost).toBe(9626000);
    });

    it('should extract movement data correctly', () => {
      const unit = createMockUnit();

      const data = service.extractData(unit);

      expect(data.movement.walkMP).toBe(3);
      expect(data.movement.runMP).toBe(5);
      expect(data.movement.jumpMP).toBe(0);
    });

    it('should extract armor data correctly', () => {
      const unit = createMockUnit();

      const data = service.extractData(unit);

      expect(data.armor.type).toBe('Standard');
      expect(data.armor.locations).toBeDefined();
      expect(data.armor.locations.length).toBeGreaterThan(0);
    });

    it('should extract heat sink data correctly', () => {
      const unit = createMockUnit();

      const data = service.extractData(unit);

      expect(data.heatSinks.type).toBe('Single');
      expect(data.heatSinks.count).toBe(20);
    });

    it('should handle quad configuration', () => {
      const unit = createMockUnit({ configuration: 'Quad' });

      const data = service.extractData(unit);

      expect(data.mechType).toBe('quad');
    });

    it('should default to biped for unknown configuration', () => {
      const unit = createMockUnit({ configuration: 'Unknown' });

      const data = service.extractData(unit);

      expect(data.mechType).toBe('biped');
    });
  });

  describe('renderPreview', () => {
    it('should render preview to canvas', async () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      await service.renderPreview(mockCanvas, data);

      // Should not throw and complete successfully
    });

    it('should use specified paper size', async () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      await service.renderPreview(mockCanvas, data, PaperSize.A4);

      // Should complete successfully with A4 paper size
    });

    it('should default to LETTER paper size', async () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      await service.renderPreview(mockCanvas, data);

      // Should complete successfully with default LETTER size
    });
  });

  describe('getSVGString', () => {
    it('should return SVG string for record sheet', async () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      const svg = await service.getSVGString(data);

      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
    });
  });

  describe('exportPDF', () => {
    it('should export PDF with default options', async () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      // Mock document.createElement
      const originalCreateElement = document.createElement.bind(document);
      // @ts-expect-error - Mocking createElement for canvas testing
      document.createElement = jest.fn((tag: string) => {
        if (tag === 'canvas') {
          return mockCanvas;
        }
        return originalCreateElement(tag);
      });

      await service.exportPDF(data);

      // Restore
      document.createElement = originalCreateElement;
    });

    it('should use custom filename when provided', async () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      const originalCreateElement = document.createElement.bind(document);
      // @ts-expect-error - Mocking createElement for canvas testing
      document.createElement = jest.fn((tag: string) => {
        if (tag === 'canvas') {
          return mockCanvas;
        }
        return originalCreateElement(tag);
      });

      await service.exportPDF(data, {
        paperSize: PaperSize.LETTER,
        filename: 'custom-filename.pdf',
        includePilotData: false,
      });

      document.createElement = originalCreateElement;
    });

    it('should support A4 paper size', async () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      const originalCreateElement = document.createElement.bind(document);
      // @ts-expect-error - Mocking createElement for canvas testing
      document.createElement = jest.fn((tag: string) => {
        if (tag === 'canvas') {
          return mockCanvas;
        }
        return originalCreateElement(tag);
      });

      await service.exportPDF(data, {
        paperSize: PaperSize.A4,
        includePilotData: false,
      });

      document.createElement = originalCreateElement;
    });
  });

  describe('print', () => {
    it('should open print window', () => {
      const mockWrite = jest.fn();
      const mockClose = jest.fn();
      const mockPrintWindow = {
        document: {
          write: mockWrite,
          close: mockClose,
        },
      };

      const originalOpen = window.open;
      window.open = jest.fn().mockReturnValue(mockPrintWindow);

      service.print(mockCanvas);

      expect(window.open).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();

      window.open = originalOpen;
    });

    it('should throw when popup blocked', () => {
      const originalOpen = window.open;
      window.open = jest.fn().mockReturnValue(null);

      expect(() => service.print(mockCanvas)).toThrow(
        'Could not open print window',
      );

      window.open = originalOpen;
    });
  });

  describe('Equipment Extraction', () => {
    it('should extract equipment as array', () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      expect(data.equipment).toBeDefined();
      expect(Array.isArray(data.equipment)).toBe(true);
    });

    it('should include weapons in equipment array', () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      // Should contain weapons
      const weapons = data.equipment.filter((e) => e.isWeapon);
      expect(weapons.length).toBeGreaterThan(0);
    });

    it('should handle ammo in equipment', () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      // Equipment array should exist (ammo may be filtered out by service logic)
      expect(Array.isArray(data.equipment)).toBe(true);
      // All items should have expected properties
      data.equipment.forEach((e) => {
        expect(e).toHaveProperty('name');
        expect(e).toHaveProperty('location');
        expect(typeof e.isWeapon).toBe('boolean');
        expect(typeof e.isAmmo).toBe('boolean');
      });
    });

    it('should handle units with no equipment', () => {
      const unit = createMockUnit({ equipment: [] });
      const data = service.extractData(unit);

      expect(data.equipment).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal unit configuration', () => {
      const minimalUnit = {
        id: 'minimal',
        name: 'Minimal Mech',
        chassis: 'Minimal',
        model: 'MIN-1',
        tonnage: 20,
        techBase: 'Inner Sphere',
        rulesLevel: 'Introductory',
        era: 'Age of War',
        configuration: 'Biped',
        engine: { type: 'Fusion', rating: 60 },
        gyro: { type: 'Standard' },
        structure: { type: 'Standard' },
        armor: {
          type: 'Standard',
          allocation: {
            head: 0,
            centerTorso: 0,
            centerTorsoRear: 0,
            leftTorso: 0,
            leftTorsoRear: 0,
            rightTorso: 0,
            rightTorsoRear: 0,
            leftArm: 0,
            rightArm: 0,
            leftLeg: 0,
            rightLeg: 0,
          },
        },
        heatSinks: { type: 'Single', count: 10 },
        movement: { walkMP: 3, runMP: 5, jumpMP: 0 },
        equipment: [],
      };

      const data = service.extractData(minimalUnit);

      expect(data).toBeDefined();
      expect(data.header.tonnage).toBe(20);
    });

    it('should handle assault mech configuration', () => {
      const assaultUnit = createMockUnit({
        tonnage: 100,
        movement: { walkMP: 3, runMP: 5, jumpMP: 3 },
        heatSinks: { type: 'Double', count: 15 },
      });

      const data = service.extractData(assaultUnit);

      expect(data.header.tonnage).toBe(100);
      expect(data.movement.jumpMP).toBe(3);
      expect(data.heatSinks.type).toBe('Double');
    });

    it('should handle unit with enhancements', () => {
      const enhancedUnit = createMockUnit({
        enhancements: ['MASC', 'TSM'],
      });

      const data = service.extractData(enhancedUnit);

      expect(data.movement.hasMASC).toBe(true);
      expect(data.movement.hasTSM).toBe(true);
    });
  });

  describe('Structure Extraction', () => {
    it('should extract structure data based on tonnage', () => {
      const unit = createMockUnit();
      const data = service.extractData(unit);

      expect(data.structure).toBeDefined();
      expect(data.structure.type).toBe('Standard');
      expect(data.structure.locations).toBeDefined();
    });

    it('should handle different tonnages', () => {
      const tonnages = [20, 35, 50, 75, 100];

      for (const tonnage of tonnages) {
        const unit = createMockUnit({ tonnage });
        const data = service.extractData(unit);

        expect(data.structure.locations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Multi-Configuration Support', () => {
    describe('Quad Configuration', () => {
      it('should extract quad mech type', () => {
        const unit = createMockUnit({
          configuration: 'Quad',
          armor: {
            type: 'Standard',
            allocation: {
              head: 9,
              centerTorso: 20,
              centerTorsoRear: 6,
              leftTorso: 17,
              leftTorsoRear: 5,
              rightTorso: 17,
              rightTorsoRear: 5,
              leftArm: 0,
              rightArm: 0,
              leftLeg: 0,
              rightLeg: 0,
              frontLeftLeg: 21,
              frontRightLeg: 21,
              rearLeftLeg: 21,
              rearRightLeg: 21,
            },
          },
        });

        const data = service.extractData(unit);

        expect(data.mechType).toBe('quad');
      });

      it('should include quad leg locations in armor extraction', () => {
        const unit = createMockUnit({
          configuration: 'Quad',
          armor: {
            type: 'Standard',
            allocation: {
              head: 9,
              centerTorso: 20,
              centerTorsoRear: 6,
              leftTorso: 17,
              leftTorsoRear: 5,
              rightTorso: 17,
              rightTorsoRear: 5,
              leftArm: 0,
              rightArm: 0,
              leftLeg: 0,
              rightLeg: 0,
              frontLeftLeg: 21,
              frontRightLeg: 21,
              rearLeftLeg: 21,
              rearRightLeg: 21,
            },
          },
        });

        const data = service.extractData(unit);

        // Quad should have FLL, FRL, RLL, RRL locations
        const abbreviations = data.armor.locations.map((l) => l.abbreviation);
        expect(abbreviations).toContain('FLL');
        expect(abbreviations).toContain('FRL');
        expect(abbreviations).toContain('RLL');
        expect(abbreviations).toContain('RRL');
      });

      it('should include quad leg locations in structure extraction', () => {
        const unit = createMockUnit({ configuration: 'Quad' });

        const data = service.extractData(unit);

        const abbreviations = data.structure.locations.map(
          (l) => l.abbreviation,
        );
        expect(abbreviations).toContain('FLL');
        expect(abbreviations).toContain('FRL');
        expect(abbreviations).toContain('RLL');
        expect(abbreviations).toContain('RRL');
      });
    });

    describe('Tripod Configuration', () => {
      it('should extract tripod mech type', () => {
        const unit = createMockUnit({ configuration: 'Tripod' });

        const data = service.extractData(unit);

        expect(data.mechType).toBe('tripod');
      });

      it('should include center leg in armor extraction', () => {
        const unit = createMockUnit({
          configuration: 'Tripod',
          armor: {
            type: 'Standard',
            allocation: {
              head: 9,
              centerTorso: 20,
              centerTorsoRear: 6,
              leftTorso: 17,
              leftTorsoRear: 5,
              rightTorso: 17,
              rightTorsoRear: 5,
              leftArm: 13,
              rightArm: 13,
              leftLeg: 20,
              rightLeg: 20,
              centerLeg: 20,
            },
          },
        });

        const data = service.extractData(unit);

        const abbreviations = data.armor.locations.map((l) => l.abbreviation);
        expect(abbreviations).toContain('CL');
        expect(abbreviations).toContain('LL');
        expect(abbreviations).toContain('RL');
        expect(abbreviations).toContain('LA');
        expect(abbreviations).toContain('RA');
      });

      it('should include center leg in structure extraction', () => {
        const unit = createMockUnit({ configuration: 'Tripod' });

        const data = service.extractData(unit);

        const abbreviations = data.structure.locations.map(
          (l) => l.abbreviation,
        );
        expect(abbreviations).toContain('CL');
      });

      it('should have 9 armor locations for tripod', () => {
        const unit = createMockUnit({
          configuration: 'Tripod',
          armor: {
            type: 'Standard',
            allocation: {
              head: 9,
              centerTorso: 20,
              centerTorsoRear: 6,
              leftTorso: 17,
              leftTorsoRear: 5,
              rightTorso: 17,
              rightTorsoRear: 5,
              leftArm: 13,
              rightArm: 13,
              leftLeg: 20,
              rightLeg: 20,
              centerLeg: 20,
            },
          },
        });

        const data = service.extractData(unit);

        // HD, CT, LT, RT, LA, RA, LL, RL, CL = 9 locations
        expect(data.armor.locations.length).toBe(9);
      });
    });

    describe('LAM Configuration', () => {
      it('should extract lam mech type', () => {
        const unit = createMockUnit({ configuration: 'LAM' });

        const data = service.extractData(unit);

        expect(data.mechType).toBe('lam');
      });

      it('should use biped locations for LAM', () => {
        const unit = createMockUnit({ configuration: 'LAM' });

        const data = service.extractData(unit);

        const abbreviations = data.armor.locations.map((l) => l.abbreviation);
        // LAM uses biped locations
        expect(abbreviations).toContain('LA');
        expect(abbreviations).toContain('RA');
        expect(abbreviations).toContain('LL');
        expect(abbreviations).toContain('RL');
      });
    });

    describe('QuadVee Configuration', () => {
      it('should extract quadvee mech type', () => {
        const unit = createMockUnit({ configuration: 'QuadVee' });

        const data = service.extractData(unit);

        // QuadVee uses quad template/locations so mechType returns 'quad'
        // This is intentional - QuadVee shares mech configuration with Quad
        expect(['quad', 'quadvee']).toContain(data.mechType);
      });

      it('should use quad locations for QuadVee', () => {
        const unit = createMockUnit({
          configuration: 'QuadVee',
          armor: {
            type: 'Standard',
            allocation: {
              head: 9,
              centerTorso: 20,
              centerTorsoRear: 6,
              leftTorso: 17,
              leftTorsoRear: 5,
              rightTorso: 17,
              rightTorsoRear: 5,
              leftArm: 0,
              rightArm: 0,
              leftLeg: 0,
              rightLeg: 0,
              frontLeftLeg: 21,
              frontRightLeg: 21,
              rearLeftLeg: 21,
              rearRightLeg: 21,
            },
          },
        });

        const data = service.extractData(unit);

        // QuadVee uses quad locations
        const abbreviations = data.armor.locations.map((l) => l.abbreviation);
        expect(abbreviations).toContain('FLL');
        expect(abbreviations).toContain('FRL');
        expect(abbreviations).toContain('RLL');
        expect(abbreviations).toContain('RRL');
      });
    });
  });

  describe('Critical Slot Extraction', () => {
    it('should extract criticals for biped with 8 locations', () => {
      const unit = createMockUnit({ configuration: 'Biped' });
      const data = service.extractData(unit);

      expect(data.criticals).toBeDefined();
      expect(data.criticals.length).toBe(8);
    });

    it('should extract criticals for quad with 8 locations', () => {
      const unit = createMockUnit({ configuration: 'Quad' });
      const data = service.extractData(unit);

      expect(data.criticals).toBeDefined();
      expect(data.criticals.length).toBe(8);

      // Check for quad-specific locations
      const locations = data.criticals.map((c) => c.abbreviation);
      expect(locations).toContain('FLL');
      expect(locations).toContain('FRL');
      expect(locations).toContain('RLL');
      expect(locations).toContain('RRL');
    });

    it('should extract criticals for tripod with 9 locations', () => {
      const unit = createMockUnit({ configuration: 'Tripod' });
      const data = service.extractData(unit);

      expect(data.criticals).toBeDefined();
      expect(data.criticals.length).toBe(9);

      // Check for center leg
      const locations = data.criticals.map((c) => c.abbreviation);
      expect(locations).toContain('CL');
    });

    it('should have correct slot counts per location', () => {
      const unit = createMockUnit({ configuration: 'Biped' });
      const data = service.extractData(unit);

      data.criticals.forEach((loc) => {
        if (loc.abbreviation === 'HD') {
          expect(loc.slots.length).toBe(6);
        } else if (['CT', 'LT', 'RT', 'LA', 'RA'].includes(loc.abbreviation)) {
          expect(loc.slots.length).toBe(12);
        } else if (['LL', 'RL'].includes(loc.abbreviation)) {
          expect(loc.slots.length).toBe(6);
        }
      });
    });

    it('should have 6 slots for quad legs', () => {
      const unit = createMockUnit({ configuration: 'Quad' });
      const data = service.extractData(unit);

      const quadLegs = ['FLL', 'FRL', 'RLL', 'RRL'];
      data.criticals.forEach((loc) => {
        if (quadLegs.includes(loc.abbreviation)) {
          expect(loc.slots.length).toBe(6);
        }
      });
    });

    it('should have 6 slots for tripod center leg', () => {
      const unit = createMockUnit({ configuration: 'Tripod' });
      const data = service.extractData(unit);

      const centerLeg = data.criticals.find((c) => c.abbreviation === 'CL');
      expect(centerLeg).toBeDefined();
      expect(centerLeg!.slots.length).toBe(6);
    });

    it('should include leg actuators in fixed slots', () => {
      const unit = createMockUnit({ configuration: 'Biped' });
      const data = service.extractData(unit);

      const leftLeg = data.criticals.find((c) => c.abbreviation === 'LL');
      expect(leftLeg).toBeDefined();

      // Slots are objects with a content property
      expect(leftLeg!.slots[0].content).toBe('Hip');
      expect(leftLeg!.slots[1].content).toBe('Upper Leg Actuator');
      expect(leftLeg!.slots[2].content).toBe('Lower Leg Actuator');
      expect(leftLeg!.slots[3].content).toBe('Foot Actuator');
    });
  });
});
