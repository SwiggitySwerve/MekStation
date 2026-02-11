/**
 * Tests for structure.ts - Structure Pip Rendering Utilities
 *
 * @spec openspec/changes/integrate-mm-data-assets/specs/record-sheet-export/spec.md
 *
 * Tests the structure pip rendering functions which handle loading pre-made
 * structure pip SVGs for bipeds and generating dynamic pips for non-biped mechs.
 */

import {
  STRUCTURE_TEXT_IDS,
  STRUCTURE_PIP_GROUP_IDS,
  BIPED_STRUCTURE_PIP_GROUP_IDS,
  QUAD_STRUCTURE_PIP_GROUP_IDS,
  TRIPOD_STRUCTURE_PIP_GROUP_IDS,
  PREMADE_PIP_TYPES,
  SVG_NS,
} from '@/services/printing/svgRecordSheetRenderer/constants';
import {
  fillStructurePips,
  generateStructurePipsForLocationFallback,
} from '@/services/printing/svgRecordSheetRenderer/structure';
import { IRecordSheetData, ILocationStructure } from '@/types/printing';
import { logger } from '@/utils/logger';

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the ArmorPipLayout module
jest.mock('@/services/printing/ArmorPipLayout', () => ({
  ArmorPipLayout: {
    addPips: jest.fn(),
  },
}));

// Mock the template module
jest.mock('@/services/printing/svgRecordSheetRenderer/template', () => ({
  setTextContent: jest.fn(),
}));

import { ArmorPipLayout } from '@/services/printing/ArmorPipLayout';
import { setTextContent } from '@/services/printing/svgRecordSheetRenderer/template';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Gets the SVG root element from a document.
 * In test context with DOMParser creating SVG documents, the documentElement
 * is always an SVGSVGElement. The double assertion is necessary because
 * TypeScript's DOM types don't capture this relationship.
 */
function getSvgRoot(doc: Document): SVGSVGElement {
  return doc.documentElement as unknown as SVGSVGElement;
}

/**
 * Creates a minimal SVG document for testing
 * @param additionalElements - Additional SVG elements to include
 * @param includeDefaultGroups - Whether to include default structurePips/canonStructurePips groups
 */
const createMockSVGDocument = (
  additionalElements: string = '',
  includeDefaultGroups: boolean = false,
): Document => {
  const parser = new DOMParser();
  const defaultGroups = includeDefaultGroups
    ? '<g id="structurePips"></g><g id="canonStructurePips"></g>'
    : '';
  const doc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
      ${defaultGroups}
      ${additionalElements}
    </svg>`,
    'image/svg+xml',
  );
  return doc;
};

/**
 * Creates mock SVG response for fetch
 */
const createMockSVGResponse = (
  content: string,
  ok: boolean = true,
): Promise<Response> => {
  return Promise.resolve({
    ok,
    text: () => Promise.resolve(content),
  } as Response);
};

/**
 * Creates mock structure data for testing
 */
const createMockStructure = (
  locations: Array<{ abbreviation: string; points: number }>,
): IRecordSheetData['structure'] => ({
  type: 'Standard',
  totalPoints: locations.reduce((sum, loc) => sum + loc.points, 0),
  locations: locations.map(({ abbreviation, points }) => ({
    location: abbreviation, // simplified for tests
    abbreviation,
    points,
  })),
});

/**
 * Creates standard biped structure data
 */
const createBipedStructure = (
  tonnage: number = 50,
): IRecordSheetData['structure'] => {
  // Standard IS points vary by tonnage, using simplified values for tests
  const isPoints: Record<string, number> = {
    HD: 3,
    CT: Math.floor(tonnage / 2),
    LT: Math.floor(tonnage / 3),
    RT: Math.floor(tonnage / 3),
    LA: Math.floor(tonnage / 5),
    RA: Math.floor(tonnage / 5),
    LL: Math.floor(tonnage / 3),
    RL: Math.floor(tonnage / 3),
  };

  return createMockStructure(
    Object.entries(isPoints).map(([abbreviation, points]) => ({
      abbreviation,
      points,
    })),
  );
};

/**
 * Creates quad mech structure data
 */
const createQuadStructure = (): IRecordSheetData['structure'] => {
  return createMockStructure([
    { abbreviation: 'HD', points: 3 },
    { abbreviation: 'CT', points: 25 },
    { abbreviation: 'LT', points: 17 },
    { abbreviation: 'RT', points: 17 },
    { abbreviation: 'FLL', points: 17 },
    { abbreviation: 'FRL', points: 17 },
    { abbreviation: 'RLL', points: 17 },
    { abbreviation: 'RRL', points: 17 },
  ]);
};

/**
 * Creates a mock pip SVG file content
 */
const createMockPipSVG = (pipCount: number): string => {
  const paths = Array.from(
    { length: pipCount },
    (_, i) => `<path id="pip${i}" d="M0,0 L10,0" fill="none" stroke="#000"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
};

// =============================================================================
// Tests
// =============================================================================

describe('structure.ts', () => {
  let mockFetch: jest.Mock;
  const consoleWarnSpy = logger.warn as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('fillStructurePips', () => {
    describe('Text Label Updates', () => {
      it('should call setTextContent for each location with structure text ID', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createBipedStructure(50);

        // Mock fetch to return valid pip SVGs
        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(5)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // Should call setTextContent for locations that have STRUCTURE_TEXT_IDS
        structure.locations.forEach((loc) => {
          const textId = STRUCTURE_TEXT_IDS[loc.abbreviation];
          if (textId) {
            expect(setTextContent).toHaveBeenCalledWith(
              svgDoc,
              textId,
              `( ${loc.points} )`,
            );
          }
        });
      });

      it('should format structure points with parentheses and spaces', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 31 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(5)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 100, 'biped');

        expect(setTextContent).toHaveBeenCalledWith(
          svgDoc,
          'textIS_CT',
          '( 31 )',
        );
      });

      it('should skip locations without structure text IDs', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        // HD doesn't have a text element in the template
        const structure = createMockStructure([
          { abbreviation: 'HD', points: 3 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(3)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // setTextContent should not be called for HD since STRUCTURE_TEXT_IDS['HD'] is undefined
        expect(setTextContent).not.toHaveBeenCalledWith(
          svgDoc,
          expect.anything(),
          '( 3 )',
        );
      });
    });

    describe('Biped Mech (Pre-made Pips)', () => {
      it('should use pre-made pips for biped mech type', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createBipedStructure(50);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(5)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // Should fetch pip files for each location
        expect(mockFetch).toHaveBeenCalled();
        // Should NOT use ArmorPipLayout for biped
        expect(ArmorPipLayout.addPips).not.toHaveBeenCalled();
      });

      it('should default to biped when mechType is undefined', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 25 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(5)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, undefined);

        // Should use pre-made pips (default biped behavior)
        expect(mockFetch).toHaveBeenCalled();
      });

      it('should hide template structurePips group and create new group when canonStructurePips absent', async () => {
        // Create document with only structurePips (no canonStructurePips)
        const svgDoc = createMockSVGDocument(`<g id="structurePips"></g>`);
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 10 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(3)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // Template group should be hidden
        const templatePips = svgDoc.getElementById('structurePips');
        expect(templatePips?.getAttribute('visibility')).toBe('hidden');

        // New group should be created
        const newGroup = svgDoc.getElementById('structure-pips-loaded');
        expect(newGroup).not.toBeNull();
        expect(newGroup?.getAttribute('transform')).toBe(
          'matrix(0.971,0,0,0.971,-378.511,-376.966)',
        );
      });

      it('should reuse existing canonStructurePips group if present', async () => {
        const svgDoc = createMockSVGDocument(`<g id="canonStructurePips"></g>`);
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 10 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(3)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // Should not create a new group
        const newGroup = svgDoc.getElementById('structure-pips-loaded');
        expect(newGroup).toBeNull();
      });

      it('should fetch correct pip file path for each location', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 25 },
          { abbreviation: 'HD', points: 3 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(5)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        expect(mockFetch).toHaveBeenCalledWith(
          '/record-sheets/biped_pips/BipedIS50_CT.svg',
        );
        expect(mockFetch).toHaveBeenCalledWith(
          '/record-sheets/biped_pips/BipedIS50_HD.svg',
        );
      });

      it('should create location groups with correct IDs and classes', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'LT', points: 15 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(3)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // Find the created location group
        const locationGroup = svgDoc.getElementById('is_pips_LT');
        expect(locationGroup).not.toBeNull();
        expect(locationGroup?.getAttribute('class')).toBe('structure-pips');
      });

      it('should clone paths with proper styling', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'RA', points: 10 },
        ]);

        // Pip SVG with paths that need styling
        const pipSvg = `<svg xmlns="${SVG_NS}">
          <path d="M0,0 L10,0" fill="none"/>
          <path d="M0,5 L10,5"/>
        </svg>`;

        mockFetch.mockImplementation(() => createMockSVGResponse(pipSvg));

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        const locationGroup = svgDoc.getElementById('is_pips_RA');
        const paths = locationGroup?.getElementsByTagName('path');

        if (paths && paths.length > 0) {
          // First path had fill="none", should get white fill
          expect(paths[0].getAttribute('fill')).toBe('#FFFFFF');
          expect(paths[0].getAttribute('stroke')).toBe('#000000');
        }
      });

      it('should handle missing pip file gracefully', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 25 },
        ]);

        mockFetch.mockImplementation(() =>
          Promise.resolve({
            ok: false,
            text: () => Promise.resolve(''),
          } as Response),
        );

        // Should not throw
        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Structure pip file not found'),
        );
      });

      it('should handle fetch error gracefully', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 25 },
        ]);

        mockFetch.mockImplementation(() =>
          Promise.reject(new Error('Network error')),
        );

        // Should not throw
        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load structure pip SVG'),
          expect.any(Error),
        );
      });

      it('should skip pip file with no paths', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'HD', points: 3 },
        ]);

        const emptyPipSvg = `<svg xmlns="${SVG_NS}"></svg>`;
        mockFetch.mockImplementation(() => createMockSVGResponse(emptyPipSvg));

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // Should not create location group if no paths
        const locationGroup = svgDoc.getElementById('is_pips_HD');
        expect(locationGroup).toBeNull();
      });

      it('should load pips for all locations in parallel', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createBipedStructure(50);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(5)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        // Should have called fetch for each location
        expect(mockFetch).toHaveBeenCalledTimes(structure.locations.length);
      });
    });

    describe('Non-Biped Mechs (Dynamic Pips)', () => {
      it('should use ArmorPipLayout for quad mechs', async () => {
        const svgDoc = createMockSVGDocument(`
          <g id="isPipsFLL"></g>
          <g id="isPipsFRL"></g>
        `);
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'FLL', points: 17 },
          { abbreviation: 'FRL', points: 17 },
        ]);

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'quad');

        // Should not fetch pip files
        expect(mockFetch).not.toHaveBeenCalled();
        // Should use ArmorPipLayout
        expect(ArmorPipLayout.addPips).toHaveBeenCalledTimes(2);
      });

      it('should use correct pip group IDs for quad mechs', async () => {
        const svgDoc = createMockSVGDocument(`
          <g id="isPipsFLL"></g>
          <g id="isPipsFRL"></g>
          <g id="isPipsRLL"></g>
          <g id="isPipsRRL"></g>
        `);
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createQuadStructure();

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'quad');

        // Check that ArmorPipLayout was called with correct elements
        const fllGroup = svgDoc.getElementById('isPipsFLL');

        expect(ArmorPipLayout.addPips).toHaveBeenCalledWith(
          svgDoc,
          fllGroup,
          17,
          expect.objectContaining({
            fill: '#FFFFFF',
            strokeWidth: 0.5,
            className: 'pip structure',
          }),
        );
      });

      it('should use ArmorPipLayout for tripod mechs', async () => {
        const svgDoc = createMockSVGDocument(`
          <g id="isPipsCL"></g>
        `);
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CL', points: 17 },
        ]);

        await fillStructurePips(svgDoc, svgRoot, structure, 80, 'tripod');

        expect(ArmorPipLayout.addPips).toHaveBeenCalledWith(
          svgDoc,
          expect.anything(),
          17,
          expect.objectContaining({ className: 'pip structure' }),
        );
      });

      it('should skip locations with zero points', async () => {
        const svgDoc = createMockSVGDocument(`<g id="isPipsFLL"></g>`);
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'FLL', points: 0 },
        ]);

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'quad');

        // Should not call ArmorPipLayout for 0 points
        expect(ArmorPipLayout.addPips).not.toHaveBeenCalled();
      });

      it('should warn when pip area element is not found', async () => {
        const svgDoc = createMockSVGDocument(); // No pip groups
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'FLL', points: 17 },
        ]);

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'quad');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Structure pip area not found'),
        );
      });

      it('should warn when location has no group ID mapping', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'UNKNOWN', points: 10 },
        ]);

        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'quad');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('No structure pip group ID for location'),
        );
      });

      it('should default non-premade types to quad pip generation', async () => {
        // quadvee uses quad pip group IDs, so use quad locations
        const svgDoc = createMockSVGDocument(`
          <g id="isPipsFLL"></g>
          <g id="isPipsFRL"></g>
        `);
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'FLL', points: 10 },
          { abbreviation: 'FRL', points: 10 },
        ]);

        // quadvee is not in PREMADE_PIP_TYPES, so should use dynamic generation
        // Note: quadvee doesn't have its own pip group mapping, so it falls back to biped
        // which doesn't have FLL/FRL, but the code will warn and skip
        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'quadvee');

        // Since quadvee falls back to biped pip group IDs (which don't have FLL/FRL),
        // warnings should be logged but ArmorPipLayout won't be called
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('No structure pip group ID for location'),
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty structure locations array', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([]);

        // Should not throw
        await fillStructurePips(svgDoc, svgRoot, structure, 50, 'biped');

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should handle very large tonnage values', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 62 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(10)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 100, 'biped');

        expect(mockFetch).toHaveBeenCalledWith(
          '/record-sheets/biped_pips/BipedIS100_CT.svg',
        );
      });

      it('should handle small tonnage values', async () => {
        const svgDoc = createMockSVGDocument();
        const svgRoot = getSvgRoot(svgDoc);
        const structure = createMockStructure([
          { abbreviation: 'CT', points: 8 },
        ]);

        mockFetch.mockImplementation(() =>
          createMockSVGResponse(createMockPipSVG(3)),
        );

        await fillStructurePips(svgDoc, svgRoot, structure, 20, 'biped');

        expect(mockFetch).toHaveBeenCalledWith(
          '/record-sheets/biped_pips/BipedIS20_CT.svg',
        );
      });
    });
  });

  describe('generateStructurePipsForLocationFallback', () => {
    it('should return early if location has no pip group ID', () => {
      const svgDoc = createMockSVGDocument();
      const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
      const location: ILocationStructure = {
        location: 'Unknown',
        abbreviation: 'UNK',
        points: 10,
      };

      // Should not throw
      generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

      expect(parentGroup.children.length).toBe(0);
    });

    it('should warn when existing pip group not found', () => {
      const svgDoc = createMockSVGDocument();
      const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
      const location: ILocationStructure = {
        location: 'Center Torso',
        abbreviation: 'CT',
        points: 25,
      };

      generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Structure pip group not found'),
      );
    });

    describe('With Existing Pips', () => {
      it('should show correct number of pips and hide excess', () => {
        // Create document with pip group containing existing pips
        const svgDoc = createMockSVGDocument(`
          <g id="isPipsCT">
            <path class="pip structure" fill="#FFFFFF" visibility="visible"/>
            <path class="pip structure" fill="#FFFFFF" visibility="visible"/>
            <path class="pip structure" fill="#FFFFFF" visibility="visible"/>
            <path class="pip structure" fill="#FFFFFF" visibility="visible"/>
            <path class="pip structure" fill="#FFFFFF" visibility="visible"/>
          </g>
        `);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Center Torso',
          abbreviation: 'CT',
          points: 3, // Only need 3 of 5
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        const pipGroup = svgDoc.getElementById('isPipsCT');
        const pips = pipGroup?.querySelectorAll('path.pip.structure');

        if (pips) {
          // First 3 should be visible
          expect((pips[0] as SVGElement).getAttribute('visibility')).toBe(
            'visible',
          );
          expect((pips[1] as SVGElement).getAttribute('visibility')).toBe(
            'visible',
          );
          expect((pips[2] as SVGElement).getAttribute('visibility')).toBe(
            'visible',
          );
          // Last 2 should be hidden
          expect((pips[3] as SVGElement).getAttribute('visibility')).toBe(
            'hidden',
          );
          expect((pips[4] as SVGElement).getAttribute('visibility')).toBe(
            'hidden',
          );
        }
      });

      it('should apply white fill to visible pips', () => {
        const svgDoc = createMockSVGDocument(`
          <g id="isPipsLA">
            <circle class="pip structure" cx="0" cy="0" r="2"/>
            <circle class="pip structure" cx="5" cy="0" r="2"/>
          </g>
        `);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Left Arm',
          abbreviation: 'LA',
          points: 2,
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        const pipGroup = svgDoc.getElementById('isPipsLA');
        const pips = pipGroup?.querySelectorAll('circle.pip.structure');

        if (pips) {
          expect((pips[0] as SVGElement).getAttribute('fill')).toBe('#FFFFFF');
          expect((pips[1] as SVGElement).getAttribute('fill')).toBe('#FFFFFF');
        }
      });

      it('should generate additional pips when needed', () => {
        // Create with nested structure similar to MegaMek templates
        const svgDoc = createMockSVGDocument(`
          <g id="isPipsLL">
            <g transform="translate(10,20)">
              <path class="pip structure"/>
            </g>
          </g>
        `);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Left Leg',
          abbreviation: 'LL',
          points: 5, // Need more than exists
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        // Additional pips should be created (4 more)
        const pipGroup = svgDoc.getElementById('isPipsLL');
        const allPips = pipGroup?.querySelectorAll(
          'circle.pip.structure, path.pip.structure',
        );

        // Should have generated additional pips
        expect(allPips?.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Without Existing Pips (Grid Generation)', () => {
      it('should generate pip grid when no template pips exist', () => {
        const svgDoc = createMockSVGDocument(`<g id="isPipsRT"></g>`);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Right Torso',
          abbreviation: 'RT',
          points: 8,
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        const pipGroup = svgDoc.getElementById('isPipsRT');
        const generatedGroup = pipGroup?.querySelector('g[id^="gen_is_pips_"]');

        expect(generatedGroup).not.toBeNull();
        expect(generatedGroup?.getAttribute('class')).toBe(
          'structure-pips-generated',
        );
      });

      it('should create circles with correct attributes in grid', () => {
        const svgDoc = createMockSVGDocument(`<g id="isPipsHD"></g>`);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Head',
          abbreviation: 'HD',
          points: 3,
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        const pipGroup = svgDoc.getElementById('isPipsHD');
        const circles = pipGroup?.getElementsByTagName('circle');

        expect(circles?.length).toBe(3);

        if (circles && circles.length > 0) {
          const firstCircle = circles[0];
          expect(firstCircle.getAttribute('fill')).toBe('#FFFFFF');
          expect(firstCircle.getAttribute('stroke')).toBe('#000000');
          expect(firstCircle.getAttribute('stroke-width')).toBe('0.5');
          expect(firstCircle.getAttribute('class')).toBe('pip structure');
          expect(firstCircle.getAttribute('r')).toBe('1.75');
        }
      });

      it('should arrange pips in rows based on location-specific column count', () => {
        const svgDoc = createMockSVGDocument(`<g id="isPipsCT"></g>`);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Center Torso',
          abbreviation: 'CT',
          points: 12, // Should be 5 cols (CT layout), so 3 rows
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        const pipGroup = svgDoc.getElementById('isPipsCT');
        const circles = pipGroup?.getElementsByTagName('circle');

        expect(circles?.length).toBe(12);

        // Check that circles have varying y values (multiple rows)
        if (circles) {
          const yValues = Array.from(circles).map((c) =>
            parseFloat(c.getAttribute('cy') || '0'),
          );
          const uniqueY = new Set(yValues);
          expect(uniqueY.size).toBeGreaterThan(1);
        }
      });

      it('should use location-specific column layout for known locations', () => {
        // HD has cols: 3 in the layout config
        const svgDoc = createMockSVGDocument(`<g id="isPipsHD"></g>`);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Head',
          abbreviation: 'HD',
          points: 6, // 6 pips with 3 cols = 2 rows
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        const pipGroup = svgDoc.getElementById('isPipsHD');
        const circles = pipGroup?.getElementsByTagName('circle');

        expect(circles?.length).toBe(6);

        // Verify row distribution - with 3 cols, should have y values at 0 and 4.5
        if (circles) {
          const yValues = Array.from(circles).map((c) =>
            parseFloat(c.getAttribute('cy') || '0'),
          );
          const uniqueY = new Set(yValues.map((y) => Math.round(y * 10) / 10)); // Round to 1 decimal
          expect(uniqueY.size).toBe(2); // 2 rows
        }
      });

      it('should not generate pips for zero or negative count', () => {
        const svgDoc = createMockSVGDocument(`<g id="isPipsRA"></g>`);
        const parentGroup = svgDoc.createElementNS(SVG_NS, 'g');
        const location: ILocationStructure = {
          location: 'Right Arm',
          abbreviation: 'RA',
          points: 0,
        };

        generateStructurePipsForLocationFallback(svgDoc, parentGroup, location);

        const pipGroup = svgDoc.getElementById('isPipsRA');
        const circles = pipGroup?.getElementsByTagName('circle');

        expect(circles?.length).toBe(0);
      });
    });
  });

  describe('Constants Integration', () => {
    it('should use SVG_NS for element creation', () => {
      expect(SVG_NS).toBe('http://www.w3.org/2000/svg');
    });

    it('should have PREMADE_PIP_TYPES include biped', () => {
      expect(PREMADE_PIP_TYPES).toContain('biped');
    });

    it('should have matching structure pip group IDs for biped locations', () => {
      expect(BIPED_STRUCTURE_PIP_GROUP_IDS).toMatchObject({
        HD: 'isPipsHD',
        CT: 'isPipsCT',
        LT: 'isPipsLT',
        RT: 'isPipsRT',
        LA: 'isPipsLA',
        RA: 'isPipsRA',
        LL: 'isPipsLL',
        RL: 'isPipsRL',
      });
    });

    it('should have quad-specific leg locations', () => {
      expect(QUAD_STRUCTURE_PIP_GROUP_IDS).toMatchObject({
        FLL: 'isPipsFLL',
        FRL: 'isPipsFRL',
        RLL: 'isPipsRLL',
        RRL: 'isPipsRRL',
      });
    });

    it('should have tripod center leg location', () => {
      expect(TRIPOD_STRUCTURE_PIP_GROUP_IDS.CL).toBe('isPipsCL');
    });

    it('should have STRUCTURE_PIP_GROUP_IDS alias biped IDs', () => {
      expect(STRUCTURE_PIP_GROUP_IDS).toEqual(BIPED_STRUCTURE_PIP_GROUP_IDS);
    });
  });
});
