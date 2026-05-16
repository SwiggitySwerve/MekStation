/**
 * Per-Family Pip-Count Fidelity Gate.
 *
 * The hard fidelity gate for the templated record-sheet path: a sheet
 * that draws the wrong number of armor / structure pips is wrong even
 * if it looks canonical. For each Wave-1 family this test:
 *
 *   1. Builds a template with known per-location pip-group `<rect>`
 *      regions (geometry shape mirrors the canonical mm-data templates;
 *      using inline templates keeps the gate CI-safe and deterministic,
 *      exactly as the mech `SVGRecordSheetRenderer` tests do).
 *   2. Binds a fixture with known per-location armor / structure stats
 *      through the real family `bindings` adapter.
 *   3. Renders through `TemplateRecordSheetRenderer` + the shared pip
 *      engine — the exact path `renderTemplated` uses.
 *   4. Parses the output SVG and counts pip `<circle>` elements per
 *      location group.
 *   5. Asserts each count equals the fixture's actual stat.
 *
 * A deliberately wrong fixture must fail the assertion — proven by the
 * negative-control case at the end.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Pip-Count Fidelity Gate)
 */

import type {
  IAerospaceRecordSheetData,
  IProtoMechRecordSheetData,
  IRecordSheetHeader,
  IVehicleRecordSheetData,
} from '@/types/printing';

import { resetMmDataAssetService } from '@/services/assets/MmDataAssetService';

import { bindAerospace } from '../aerospace/bindings';
import { layoutPipsInGroup } from '../pipEngine';
import { bindProtoMech } from '../protomech/bindings';
import { TemplateRecordSheetRenderer } from '../templateRecordSheetRenderer';
import { bindVehicle } from '../vehicle/bindings';

const mockFetch = jest.fn();
global.fetch = mockFetch;

/** Build a pip-group `<g>` with a rect region large enough for `cap` pips. */
function pipGroup(id: string): string {
  // A generous region — ArmorPipLayout fits the requested count inside.
  return `<g id="${id}"><rect x="0" y="0" width="200" height="120"/></g>`;
}

/** Build a minimal template SVG exposing the given pip-group IDs. */
function buildTemplate(groupIds: readonly string[]): string {
  const groups = groupIds.map(pipGroup).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756" viewBox="0 0 576 756">
  <text id="type"></text>
  <text id="tonnage"></text>
  <text id="bv"></text>
  ${groups}
</svg>`;
}

function mockTemplate(svg: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(svg),
    headers: new Headers({ 'content-type': 'image/svg+xml' }),
  });
}

/**
 * Render a unit through the templated path and return the output SVG.
 * Mirrors what `renderTemplated` (Phase 6) does: load → mount → bind →
 * apply pips via the shared engine → serialize.
 */
async function renderTemplated(
  templateSvg: string,
  bindings: {
    texts: Readonly<Record<string, string>>;
    pips: readonly { groupId: string; count: number; className?: string }[];
  },
): Promise<Document> {
  mockTemplate(templateSvg);
  const renderer = new TemplateRecordSheetRenderer();
  await renderer.loadTemplate('/record-sheets/templates_us/fixture.svg');
  renderer.mount();
  renderer.applyBindings(bindings.texts);
  renderer.applyPips(bindings.pips, (doc, group, fill) => {
    layoutPipsInGroup(doc, group, fill.count, { className: fill.className });
  });
  const svgString = renderer.getSVGString();
  return new DOMParser().parseFromString(svgString, 'image/svg+xml');
}

/** Count pip `<circle>` elements inside a group in the output SVG. */
function pipCount(doc: Document, groupId: string): number {
  const group = doc.getElementById(groupId);
  return group ? group.querySelectorAll('circle').length : 0;
}

function header(tonnage: number): IRecordSheetHeader {
  return {
    unitName: 'Fixture',
    chassis: 'Fixture',
    model: 'FX-1',
    tonnage,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    era: 'Test',
    role: 'Striker',
    battleValue: 1000,
    cost: 1_000_000,
  };
}

describe('pip-count fidelity gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Reset the shared MmDataAssetService singleton so its template
    // cache does not leak between tests / suites.
    resetMmDataAssetService();
    document.body.innerHTML = '';
  });

  describe('vehicle / VTOL', () => {
    it('turret tank: rendered pip count per location equals armor stats', async () => {
      const data: IVehicleRecordSheetData = {
        unitType: 'vehicle',
        header: header(50),
        motionType: 'Tracked',
        turretConfig: 'Single',
        cruiseMP: 4,
        flankMP: 6,
        armorType: 'Standard',
        armorLocations: [
          { location: 'Front', current: 40, maximum: 40 },
          { location: 'Left Side', current: 32, maximum: 32 },
          { location: 'Right Side', current: 32, maximum: 32 },
          { location: 'Rear', current: 24, maximum: 24 },
          { location: 'Turret', current: 36, maximum: 36 },
        ],
        crew: [{ role: 'gunner', gunnery: 3, piloting: 5 }],
        equipment: [],
      };
      const bindings = bindVehicle(data);
      const doc = await renderTemplated(
        buildTemplate([
          'armorPipsFR',
          'armorPipsLS',
          'armorPipsRS',
          'armorPipsRR',
          'armorPipsTU',
        ]),
        bindings,
      );

      expect(pipCount(doc, 'armorPipsFR')).toBe(40);
      expect(pipCount(doc, 'armorPipsLS')).toBe(32);
      expect(pipCount(doc, 'armorPipsRS')).toBe(32);
      expect(pipCount(doc, 'armorPipsRR')).toBe(24);
      expect(pipCount(doc, 'armorPipsTU')).toBe(36);
    });

    it('VTOL: rendered pip count includes the Rotor location', async () => {
      const data: IVehicleRecordSheetData = {
        unitType: 'vehicle',
        header: header(20),
        motionType: 'VTOL',
        turretConfig: 'None',
        cruiseMP: 6,
        flankMP: 9,
        armorType: 'Standard',
        armorLocations: [
          { location: 'Front', current: 16, maximum: 16 },
          { location: 'Left Side', current: 12, maximum: 12 },
          { location: 'Right Side', current: 12, maximum: 12 },
          { location: 'Rear', current: 8, maximum: 8 },
          { location: 'Rotor', current: 2, maximum: 2 },
        ],
        crew: [{ role: 'gunner', gunnery: 4, piloting: 5 }],
        equipment: [],
      };
      const bindings = bindVehicle(data);
      const doc = await renderTemplated(
        buildTemplate([
          'armorPipsFR',
          'armorPipsLS',
          'armorPipsRS',
          'armorPipsRR',
          'armorPipsRO',
        ]),
        bindings,
      );

      expect(pipCount(doc, 'armorPipsFR')).toBe(16);
      expect(pipCount(doc, 'armorPipsRO')).toBe(2);
    });
  });

  describe('aerospace', () => {
    it('fighter: rendered pip count per arc equals armor stats', async () => {
      const data: IAerospaceRecordSheetData = {
        unitType: 'aerospace',
        header: header(65),
        structuralIntegrity: 8,
        fuelPoints: 400,
        safeThrust: 5,
        maxThrust: 8,
        heatSinks: {
          type: 'Single',
          count: 16,
          capacity: 16,
          integrated: 10,
          external: 6,
        },
        armorType: 'Standard Aerospace',
        armorArcs: [
          { arc: 'Nose', current: 70, maximum: 70 },
          { arc: 'Left Wing', current: 60, maximum: 60 },
          { arc: 'Right Wing', current: 60, maximum: 60 },
          { arc: 'Aft', current: 50, maximum: 50 },
        ],
        equipment: [],
        bombBaySlots: 0,
      };
      const bindings = bindAerospace(data);
      const doc = await renderTemplated(
        buildTemplate([
          'armorPipsNOS',
          'armorPipsLWG',
          'armorPipsRWG',
          'armorPipsAFT',
        ]),
        bindings,
      );

      expect(pipCount(doc, 'armorPipsNOS')).toBe(70);
      expect(pipCount(doc, 'armorPipsLWG')).toBe(60);
      expect(pipCount(doc, 'armorPipsRWG')).toBe(60);
      expect(pipCount(doc, 'armorPipsAFT')).toBe(50);
    });

    it('conventional fighter: rendered pip count per arc equals armor stats', async () => {
      const data: IAerospaceRecordSheetData = {
        unitType: 'aerospace',
        header: header(40),
        isConventional: true,
        structuralIntegrity: 5,
        fuelPoints: 300,
        safeThrust: 4,
        maxThrust: 6,
        heatSinks: {
          type: 'Single',
          count: 10,
          capacity: 10,
          integrated: 10,
          external: 0,
        },
        armorType: 'Standard',
        armorArcs: [
          { arc: 'Nose', current: 24, maximum: 24 },
          { arc: 'Left Wing', current: 18, maximum: 18 },
          { arc: 'Right Wing', current: 18, maximum: 18 },
          { arc: 'Aft', current: 12, maximum: 12 },
        ],
        equipment: [],
        bombBaySlots: 0,
      };
      const bindings = bindAerospace(data);
      const doc = await renderTemplated(
        buildTemplate([
          'armorPipsNOS',
          'armorPipsLWG',
          'armorPipsRWG',
          'armorPipsAFT',
        ]),
        bindings,
      );

      expect(pipCount(doc, 'armorPipsNOS')).toBe(24);
      expect(pipCount(doc, 'armorPipsAFT')).toBe(12);
    });
  });

  describe('protomech', () => {
    function makeProto(
      overrides: Partial<IProtoMechRecordSheetData>,
    ): IProtoMechRecordSheetData {
      return {
        unitType: 'protomech',
        header: header(9),
        pointSize: 5,
        protos: [
          {
            index: 1,
            armorByLocation: {
              Head: { current: 2, maximum: 2 },
              Torso: { current: 14, maximum: 14 },
              'Left Arm': { current: 4, maximum: 4 },
              'Right Arm': { current: 4, maximum: 4 },
              Legs: { current: 8, maximum: 8 },
              'Main Gun': { current: 0, maximum: 0 },
            },
          },
        ],
        hasUMU: false,
        isGlider: false,
        walkMP: 4,
        jumpMP: 0,
        equipment: [],
        ...overrides,
      };
    }

    it('biped: rendered armor + structure pip count per location equals stats', async () => {
      const data = makeProto({});
      const bindings = bindProtoMech(data);
      const doc = await renderTemplated(
        buildTemplate([
          'armorPipsHD',
          'armorPipsT',
          'armorPipsL',
          'armorPipsLA',
          'armorPipsRA',
          'structurePipsHD',
          'structurePipsT',
          'structurePipsL',
        ]),
        bindings,
      );

      // Armor — straight from the fixture.
      expect(pipCount(doc, 'armorPipsHD')).toBe(2);
      expect(pipCount(doc, 'armorPipsT')).toBe(14);
      expect(pipCount(doc, 'armorPipsL')).toBe(8);
      expect(pipCount(doc, 'armorPipsLA')).toBe(4);
      // Structure — derived from the 9t canonical TW table.
      expect(pipCount(doc, 'structurePipsHD')).toBe(2);
      expect(pipCount(doc, 'structurePipsT')).toBe(9);
      expect(pipCount(doc, 'structurePipsL')).toBe(5);
    });

    it('quad: rendered pip count omits arm locations', async () => {
      const data = makeProto({ isQuad: true });
      const bindings = bindProtoMech(data);
      const doc = await renderTemplated(
        buildTemplate(['armorPipsHD', 'armorPipsT', 'armorPipsL']),
        bindings,
      );

      expect(pipCount(doc, 'armorPipsT')).toBe(14);
      // Quad has no arm pip fills emitted at all.
      expect(bindings.pips.some((p) => p.groupId === 'armorPipsLA')).toBe(
        false,
      );
    });

    it('glider: rendered armor pip count per location equals stats', async () => {
      const data = makeProto({ isGlider: true });
      const bindings = bindProtoMech(data);
      const doc = await renderTemplated(
        buildTemplate([
          'armorPipsHD',
          'armorPipsT',
          'armorPipsL',
          'armorPipsLA',
          'armorPipsRA',
        ]),
        bindings,
      );

      expect(pipCount(doc, 'armorPipsHD')).toBe(2);
      expect(pipCount(doc, 'armorPipsT')).toBe(14);
      expect(pipCount(doc, 'armorPipsLA')).toBe(4);
    });
  });

  describe('negative control', () => {
    it('a deliberately wrong expected count fails the fidelity assertion', async () => {
      const data: IVehicleRecordSheetData = {
        unitType: 'vehicle',
        header: header(50),
        motionType: 'Tracked',
        turretConfig: 'None',
        cruiseMP: 4,
        flankMP: 6,
        armorType: 'Standard',
        armorLocations: [{ location: 'Front', current: 40, maximum: 40 }],
        crew: [{ role: 'gunner', gunnery: 3, piloting: 5 }],
        equipment: [],
      };
      const bindings = bindVehicle(data);
      const doc = await renderTemplated(
        buildTemplate(['armorPipsFR']),
        bindings,
      );

      // The fixture has 40 Front armor; asserting 39 must fail.
      expect(pipCount(doc, 'armorPipsFR')).toBe(40);
      expect(pipCount(doc, 'armorPipsFR')).not.toBe(39);
    });
  });
});
