/**
 * Template-Primary Dispatch — unit + integration tests.
 *
 * Covers `renderTemplated` routing the three Wave-1 families through
 * the canonical template path, the `try/catch` skeleton fallback on
 * asset-load failure, and the `isTemplatedUnit` dispatch predicate.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Template-Primary Rendering With Skeleton Fallback)
 */

import type {
  IAerospaceRecordSheetData,
  IProtoMechRecordSheetData,
  IRecordSheetHeader,
  IVehicleRecordSheetData,
} from '@/types/printing';

import { resetMmDataAssetService } from '@/services/assets/MmDataAssetService';
import { PaperSize } from '@/types/printing';

import { isTemplatedUnit, renderTemplated } from '../renderTemplated';

const mockFetch = jest.fn();
global.fetch = mockFetch;

/** A minimal canonical-shaped template exposing the given pip groups. */
function buildTemplate(groupIds: readonly string[]): string {
  const groups = groupIds
    .map(
      (id) => `<g id="${id}"><rect x="0" y="0" width="200" height="120"/></g>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756" viewBox="0 0 576 756">
  <text id="type"></text>
  <text id="tonnage"></text>
  <text id="bv"></text>
  ${groups}
</svg>`;
}

/** Mock a successful template fetch returning `svg`. */
function mockTemplateOk(svg: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(svg),
    headers: new Headers({ 'content-type': 'image/svg+xml' }),
  });
}

/** Mock a hard asset failure — every source returns 404. */
function mockTemplateFail() {
  mockFetch.mockResolvedValue({ ok: false, status: 404 });
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

const VEHICLE_FIXTURE: IVehicleRecordSheetData = {
  unitType: 'vehicle',
  header: header(50),
  motionType: 'Tracked',
  turretConfig: 'Single',
  cruiseMP: 4,
  flankMP: 6,
  armorType: 'Standard',
  armorLocations: [
    { location: 'Front', current: 40, maximum: 40 },
    { location: 'Turret', current: 36, maximum: 36 },
  ],
  crew: [{ role: 'gunner', gunnery: 3, piloting: 5 }],
  equipment: [],
};

const AEROSPACE_FIXTURE: IAerospaceRecordSheetData = {
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
    { arc: 'Aft', current: 50, maximum: 50 },
  ],
  equipment: [],
  bombBaySlots: 0,
};

const PROTOMECH_FIXTURE: IProtoMechRecordSheetData = {
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
};

describe('isTemplatedUnit', () => {
  it('identifies the three Wave-1 families', () => {
    expect(isTemplatedUnit({ unitType: 'vehicle' })).toBe(true);
    expect(isTemplatedUnit({ unitType: 'aerospace' })).toBe(true);
    expect(isTemplatedUnit({ unitType: 'protomech' })).toBe(true);
  });

  it('rejects the non-Wave-1 families', () => {
    expect(isTemplatedUnit({ unitType: 'battlearmor' })).toBe(false);
    expect(isTemplatedUnit({ unitType: 'infantry' })).toBe(false);
    expect(isTemplatedUnit({ unitType: 'mech' })).toBe(false);
  });
});

describe('renderTemplated — template path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Reset the shared MmDataAssetService singleton so its template
    // cache does not leak between tests / suites.
    resetMmDataAssetService();
    document.body.innerHTML = '';
  });

  it('renders a vehicle through the canonical template path', async () => {
    mockTemplateOk(buildTemplate(['armorPipsFR', 'armorPipsTU']));
    const svg = await renderTemplated(VEHICLE_FIXTURE, PaperSize.LETTER);

    expect(svg).toContain('<svg');
    // The output is derived from the canonical template — the template's
    // pip groups are present and populated with pips.
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(
      doc.getElementById('armorPipsFR')?.querySelectorAll('circle').length,
    ).toBe(40);
    expect(doc.getElementById('type')?.textContent).toBe('Fixture FX-1');
  });

  it('renders an aerospace fighter through the canonical template path', async () => {
    mockTemplateOk(buildTemplate(['armorPipsNOS', 'armorPipsAFT']));
    const svg = await renderTemplated(AEROSPACE_FIXTURE, PaperSize.LETTER);

    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(
      doc.getElementById('armorPipsNOS')?.querySelectorAll('circle').length,
    ).toBe(70);
  });

  it('renders a ProtoMech through the canonical template path', async () => {
    mockTemplateOk(
      buildTemplate(['armorPipsHD', 'armorPipsT', 'structurePipsT']),
    );
    const svg = await renderTemplated(PROTOMECH_FIXTURE, PaperSize.LETTER);

    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(
      doc.getElementById('armorPipsT')?.querySelectorAll('circle').length,
    ).toBe(14);
  });

  it('resolves the A4 template directory for ISO paper size', async () => {
    mockTemplateOk(buildTemplate(['armorPipsFR']));
    await renderTemplated(VEHICLE_FIXTURE, PaperSize.A4);

    expect(mockFetch).toHaveBeenCalledWith(
      '/record-sheets/templates_iso/vehicle_turret_standard.svg',
    );
  });

  it('appends the _default suffix for aerospace template filenames', async () => {
    mockTemplateOk(buildTemplate(['armorPipsNOS']));
    await renderTemplated(AEROSPACE_FIXTURE, PaperSize.LETTER);

    expect(mockFetch).toHaveBeenCalledWith(
      '/record-sheets/templates_us/fighter_aerospace_default.svg',
    );
  });
});

describe('renderTemplated — skeleton fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Reset the shared MmDataAssetService singleton so its template
    // cache does not leak between tests / suites.
    resetMmDataAssetService();
    document.body.innerHTML = '';
  });

  it('falls back to the vehicle skeleton renderer on asset-load failure', async () => {
    mockTemplateFail();
    const svg = await renderTemplated(VEHICLE_FIXTURE, PaperSize.LETTER);

    // The skeleton renderer emits its own marker text — not blank.
    expect(svg).toContain('<svg');
    expect(svg).toContain('Vehicle Record Sheet');
    expect(svg).not.toBe('');
  });

  it('falls back to the aerospace skeleton renderer on asset-load failure', async () => {
    mockTemplateFail();
    const svg = await renderTemplated(AEROSPACE_FIXTURE, PaperSize.LETTER);

    expect(svg).toContain('<svg');
    expect(svg).not.toBe('');
  });

  it('falls back to the protomech skeleton renderer on asset-load failure', async () => {
    mockTemplateFail();
    const svg = await renderTemplated(PROTOMECH_FIXTURE, PaperSize.LETTER);

    expect(svg).toContain('<svg');
    expect(svg).not.toBe('');
  });

  it('falls back when the template parses but is malformed (not an SVG root)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve('<!doctype html><html><body>404</body></html>'),
      headers: new Headers({ 'content-type': 'text/html' }),
    });
    const svg = await renderTemplated(VEHICLE_FIXTURE, PaperSize.LETTER);

    // HTML-instead-of-SVG triggers the load guard → skeleton fallback.
    expect(svg).toContain('Vehicle Record Sheet');
  });
});
