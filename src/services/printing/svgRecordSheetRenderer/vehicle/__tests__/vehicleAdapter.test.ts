/**
 * Vehicle / VTOL family adapter — unit tests.
 *
 * Covers `selectVehicleTemplate` (all 5 Wave-1 keys) and `bindVehicle`
 * (`PipCounts` for a tracked tank and a VTOL).
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters)
 */

import fs from 'fs';
import path from 'path';

import type {
  IRecordSheetHeader,
  IVehicleRecordSheetData,
} from '@/types/printing';

import { getMmDataAssetService } from '@/services/assets/MmDataAssetService';
import { PaperSize } from '@/types/printing';
import { VehicleRecordSheetDataSchema } from '@/types/printing/RecordSheetSchemas';

import assetConfig from '../../../../../../config/mm-data-assets.json';
import { layoutPipsInGroup } from '../../pipEngine';
import { renderVehicleTemplated } from '../../renderTemplated';
import { TemplateRecordSheetRenderer } from '../../templateRecordSheetRenderer';
import { bindVehicle, computeVehiclePipCounts } from '../bindings';
import { selectVehicleTemplate } from '../selectTemplate';

function header(
  overrides: Partial<IRecordSheetHeader> = {},
): IRecordSheetHeader {
  return {
    unitName: 'Manticore',
    chassis: 'Manticore',
    model: 'Heavy Tank',
    tonnage: 50,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    era: 'Succession Wars',
    role: 'Juggernaut',
    battleValue: 1247,
    cost: 1_000_000,
    ...overrides,
  };
}

function vehicle(
  overrides: Partial<IVehicleRecordSheetData> = {},
): IVehicleRecordSheetData {
  return {
    unitType: 'vehicle',
    header: header(),
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
      { location: 'Turret', current: 40, maximum: 40 },
    ],
    crew: [
      { role: 'driver', gunnery: 4, piloting: 5 },
      { role: 'gunner', gunnery: 3, piloting: 5 },
    ],
    equipment: [],
    ...overrides,
  };
}

describe('selectVehicleTemplate', () => {
  it('maps a turret-equipped tracked tank to vehicle_turret_standard', () => {
    expect(selectVehicleTemplate(vehicle({ turretConfig: 'Single' }))).toBe(
      'vehicle_turret_standard',
    );
  });

  it('maps a turretless tank to vehicle_noturret_standard', () => {
    expect(selectVehicleTemplate(vehicle({ turretConfig: 'None' }))).toBe(
      'vehicle_noturret_standard',
    );
  });

  it('maps a dual-turret tank to vehicle_dualturret_standard', () => {
    expect(selectVehicleTemplate(vehicle({ turretConfig: 'Dual' }))).toBe(
      'vehicle_dualturret_standard',
    );
  });

  it('maps a turretless VTOL to vtol_noturret_standard', () => {
    expect(
      selectVehicleTemplate(
        vehicle({ motionType: 'VTOL', turretConfig: 'None' }),
      ),
    ).toBe('vtol_noturret_standard');
  });

  it('maps a turret VTOL to vtol_turret_standard', () => {
    expect(
      selectVehicleTemplate(
        vehicle({ motionType: 'VTOL', turretConfig: 'Single' }),
      ),
    ).toBe('vtol_turret_standard');
  });

  it('rejects a dual-turret VTOL instead of selecting a single-turret template', () => {
    expect(() =>
      selectVehicleTemplate(
        vehicle({ motionType: 'VTOL', turretConfig: 'Dual' }),
      ),
    ).toThrow(/dual-turret VTOL/i);
    expect(() =>
      selectVehicleTemplate(
        vehicle({ motionType: 'VTOL', turretConfig: 'Dual' }),
      ),
    ).toThrow(/pinned MegaMekLab assets have no matching template/);
  });

  it('treats Wheeled / Hover as the ground-vehicle subtype', () => {
    expect(selectVehicleTemplate(vehicle({ motionType: 'Wheeled' }))).toBe(
      'vehicle_turret_standard',
    );
    expect(selectVehicleTemplate(vehicle({ motionType: 'Hover' }))).toBe(
      'vehicle_turret_standard',
    );
  });

  // PrintTank.getSVGFileName at MML 62bf19360382049e2e6a1e8f24e859e27bdc5878.
  const layouts = [
    ['Tracked', false, 'vehicle', 'standard'],
    ['Tracked', true, 'vehicle', 'superheavy'],
    ['Wheeled', true, 'vehicle', 'superheavy'],
    ['Hover', true, 'vehicle', 'superheavy'],
    ['Hydrofoil', false, 'naval', 'standard'],
    ['Hydrofoil', true, 'naval', 'superheavy'],
    ['Naval', false, 'naval', 'standard'],
    ['Naval', true, 'naval', 'superheavy'],
    ['Submarine', false, 'submarine', 'standard'],
    ['Submarine', true, 'submarine', 'superheavy'],
    ['WiGE', false, 'wige', 'standard'],
    ['WiGE', true, 'vehicle', 'superheavy'],
    ['Rail', false, 'vehicle', 'standard'],
    ['Rail', true, 'vehicle', 'superheavy'],
    ['VTOL', true, 'vtol', 'standard'],
  ] as const;
  for (const [motionType, isSuperheavy, subtype, weight] of layouts)
    for (const [turretConfig, turret] of [
      ['None', 'noturret'],
      ['Single', 'turret'],
      ['Dual', 'dualturret'],
    ] as const) {
      if (motionType === 'VTOL' && turretConfig === 'Dual') continue;
      it(`selects pinned ${motionType}/${isSuperheavy}/${turretConfig} and registers both papers`, () => {
        const data = vehicle({
          ...{ motionType, isSuperheavy },
          turretConfig,
          // The explicit owner flag, rather than tonnage, decides the tier.
          header: header({ tonnage: isSuperheavy ? 50 : 150 }),
        });
        const key = `${subtype}_${turret}_${weight}`;
        expect(selectVehicleTemplate(data)).toBe(key);
        expect(() => VehicleRecordSheetDataSchema.parse(data)).not.toThrow();
        const parsed = VehicleRecordSheetDataSchema.parse(data);
        expect(parsed).toMatchObject({ motionType, isSuperheavy });
        expect(selectVehicleTemplate(parsed)).toBe(key);
        for (const dir of ['templates_us', 'templates_iso'] as const)
          expect(assetConfig.patterns[dir]).toContain(`${key}.svg`);
      });
    }

  it('retains the standard tier for legacy payloads without a flag', () => {
    expect(
      selectVehicleTemplate(vehicle({ header: header({ tonnage: 150 }) })),
    ).toBe('vehicle_turret_standard');
  });

  // Opt-in proof against the full read-only pinned SVGs, never downloaded by tests.
  if (process.env.RECORD_SHEET_PINNED_ASSETS)
    for (const [motionType, , subtype] of layouts.filter((row) => !row[1]))
      for (const paper of [PaperSize.LETTER, PaperSize.A4])
        it(`renders pinned ${motionType} ${paper} through the asset path`, async () => {
          const dir = paper === PaperSize.A4 ? 'templates_iso' : 'templates_us';
          const key = `${subtype}_turret_standard`;
          const load = jest
            .spyOn(getMmDataAssetService(), 'loadSVG')
            .mockImplementation(async (assetPath) => {
              expect(assetPath).toBe(`/record-sheets/${dir}/${key}.svg`);
              return fs.readFileSync(
                path.join(
                  process.env.RECORD_SHEET_PINNED_ASSETS ?? '',
                  dir,
                  `${key}.svg`,
                ),
                'utf8',
              );
            });
          try {
            const svg = await renderVehicleTemplated(
              vehicle({ motionType }),
              paper,
            );
            expect(load).toHaveBeenCalledTimes(1);
            const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
            expect(doc.getElementById('movementType')?.textContent).toBe(
              motionType,
            );
            expect(
              doc.getElementById('armorPipsFR')?.querySelectorAll('circle'),
            ).toHaveLength(40);
            expect(doc.getElementById('textArmor_TU')?.textContent).toBe('40');
          } finally {
            load.mockRestore();
          }
        });
});

describe('bindVehicle — PipCounts', () => {
  it('computes per-location pip counts equal to the 50t tank armor stats', () => {
    const counts = computeVehiclePipCounts(vehicle());
    expect(counts).toEqual({ FR: 40, LS: 32, RS: 32, RR: 24, TU: 40 });
  });

  it('includes the Rotor location for a VTOL fixture', () => {
    const vtol = vehicle({
      motionType: 'VTOL',
      turretConfig: 'None',
      armorLocations: [
        { location: 'Front', current: 18, maximum: 18 },
        { location: 'Left Side', current: 14, maximum: 14 },
        { location: 'Right Side', current: 14, maximum: 14 },
        { location: 'Rear', current: 10, maximum: 10 },
        { location: 'Rotor', current: 2, maximum: 2 },
      ],
    });
    const counts = computeVehiclePipCounts(vtol);
    expect(counts).toEqual({ FR: 18, LS: 14, RS: 14, RR: 10, RO: 2 });
  });

  it('maps unequal dual-turret armor to rear TU and front FT by identity', () => {
    const dual = vehicle({
      turretConfig: 'Dual',
      armorLocations: [
        { location: 'Front', current: 40, maximum: 40 },
        { location: 'Turret 2', current: 20, maximum: 20 },
        { location: 'Turret', current: 30, maximum: 30 },
      ],
    });
    const counts = computeVehiclePipCounts(dual);
    expect(counts.TU).toBe(30);
    expect(counts.FT).toBe(20);
  });

  it('binds text only to catalogued template IDs', () => {
    const { texts } = bindVehicle(vehicle());
    expect(texts.type).toBe('Manticore Heavy Tank');
    expect(texts.tonnage).toBe('50');
    expect(texts.movementType).toBe('Tracked');
    expect(texts.textArmor_FR).toBe('40');
    expect(texts.textArmor_TU).toBe('40');
  });

  it('emits one pip fill per armed location with the correct count', () => {
    const { pips } = bindVehicle(vehicle());
    const byGroup = Object.fromEntries(pips.map((p) => [p.groupId, p.count]));
    expect(byGroup.armorPipsFR).toBe(40);
    expect(byGroup.armorPipsLS).toBe(32);
    expect(byGroup.armorPipsRS).toBe(32);
    expect(byGroup.armorPipsRR).toBe(24);
    expect(byGroup.armorPipsTU).toBe(40);
  });

  it('omits Body (no armor diagram region) from pip fills', () => {
    const withBody = vehicle({
      armorLocations: [
        { location: 'Front', current: 40, maximum: 40 },
        { location: 'Body', current: 0, maximum: 0 },
      ],
    });
    const counts = computeVehiclePipCounts(withBody);
    expect(counts).toEqual({ FR: 40 });
  });
});

// Anchor IDs, labels, transforms and first-row geometry from mm-data
// b67baa5ecc765435425fd8cb703a6da909478b7a templates_us/
// vehicle_dualturret_standard.svg and vtol_turret_standard.svg.
const TURRET_ANCHOR_FRAGMENT = `<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756" viewBox="0 0 576 756">
  <text id="text3916"><tspan>Rear Turret</tspan><tspan id="textArmor_TU">( )</tspan></text>
  <text id="text3940"><tspan>Front Turret</tspan><tspan id="textArmor_FT">( )</tspan></text>
  <text><tspan id="textArmor_RO">( )</tspan></text>
  <g id="armorPipsTU" transform="translate(86.335001,201.48)"><rect x="-27.37" width="54.74" y="0" height="6.44" id="armorTURow00"/></g>
  <g id="armorPipsFT" transform="translate(86.335,77.98)"><rect x="-20.05" width="42.28" y="0" height="6.44" id="armorFTRow00"/></g>
  <g id="armorPipsRO" transform="translate(487.3295,184.18)"><rect x="-87.3" width="174.6" y="0" height="6.8" id="armorRORow00"/></g>
</svg>`;

async function renderTurretAnchors(data: IVehicleRecordSheetData) {
  const load = jest
    .spyOn(getMmDataAssetService(), 'loadSVG')
    .mockResolvedValue(TURRET_ANCHOR_FRAGMENT);
  try {
    const renderer = new TemplateRecordSheetRenderer();
    await renderer.loadTemplate(
      '/record-sheets/templates_us/turret-fixture.svg',
    );
    const bindings = bindVehicle(data);
    renderer.applyBindings(bindings.texts);
    renderer.applyPips(bindings.pips, (doc, group, fill) => {
      layoutPipsInGroup(doc, group, fill.count);
    });
    return new DOMParser().parseFromString(
      renderer.getSVGString(),
      'image/svg+xml',
    );
  } finally {
    load.mockRestore();
  }
}

describe('vehicle turret SVG identity', () => {
  it.each([false, true])(
    'renders unequal dual turrets with reversed order=%s',
    async (reverse) => {
      const armorLocations: IVehicleRecordSheetData['armorLocations'] = [
        { location: 'Turret', current: 7, maximum: 10 },
        { location: 'Turret 2', current: 3, maximum: 12 },
      ];
      const doc = await renderTurretAnchors(
        vehicle({
          turretConfig: 'Dual',
          armorLocations: reverse
            ? [...armorLocations].reverse()
            : armorLocations,
        }),
      );
      expect(doc.getElementById('textArmor_TU')?.textContent).toBe('7');
      expect(doc.getElementById('textArmor_FT')?.textContent).toBe('3');
      expect(
        doc.getElementById('armorPipsTU')?.querySelectorAll('circle'),
      ).toHaveLength(7);
      expect(
        doc.getElementById('armorPipsFT')?.querySelectorAll('circle'),
      ).toHaveLength(3);
    },
  );

  it.each(['Turret', 'Chin'] as const)(
    'renders VTOL %s and rotor independently',
    async (location) => {
      const doc = await renderTurretAnchors(
        vehicle({
          motionType: 'VTOL',
          armorLocations: [
            { location, current: 5, maximum: 8 },
            { location: 'Rotor', current: 2, maximum: 2 },
          ],
        }),
      );
      expect(doc.getElementById('textArmor_TU')?.textContent).toBe('5');
      expect(doc.getElementById('textArmor_RO')?.textContent).toBe('2');
      expect(
        doc.getElementById('armorPipsTU')?.querySelectorAll('circle'),
      ).toHaveLength(5);
      expect(
        doc.getElementById('armorPipsRO')?.querySelectorAll('circle'),
      ).toHaveLength(2);
    },
  );

  it('keeps installed zero armor on both dual turret text anchors without pips', async () => {
    const data = vehicle({
      turretConfig: 'Dual',
      armorLocations: [
        { location: 'Turret 2', current: 0, maximum: 0 },
        { location: 'Turret', current: 0, maximum: 0 },
      ],
    });
    expect(selectVehicleTemplate(data)).toBe('vehicle_dualturret_standard');
    const doc = await renderTurretAnchors(data);
    for (const code of ['TU', 'FT']) {
      expect(doc.getElementById(`textArmor_${code}`)?.textContent).toBe('0');
      expect(
        doc.getElementById(`armorPips${code}`)?.querySelectorAll('circle'),
      ).toHaveLength(0);
    }
  });
});
