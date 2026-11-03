import fs from 'fs';
import path from 'path';

import type {
  IRecordSheetEquipment,
  IVehicleRecordSheetData,
} from '@/types/printing';

import { buildAerospaceUnitObject } from '@/components/customizer/aerospace/buildAerospaceUnitObject';
import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import { getMmDataAssetService } from '@/services/assets/MmDataAssetService';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import {
  renderVehicleTemplated,
  renderAerospaceTemplated,
} from '@/services/printing/svgRecordSheetRenderer/renderTemplated';
import { bindVehicle } from '@/services/printing/svgRecordSheetRenderer/vehicle/bindings';
import { selectVehicleTemplate } from '@/services/printing/svgRecordSheetRenderer/vehicle/selectTemplate';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import {
  AerospaceLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { PaperSize } from '@/types/printing';
import { VehicleRecordSheetDataSchema } from '@/types/printing/RecordSheetSchemas';

import { catalog, initializeEquipment } from './catalogRecordSheets.helpers';

beforeAll(initializeEquipment);
const service = new RecordSheetService();

it('retains six side armor locations and the heavy rear-turret anchor for every catalog chassis', () => {
  let checked = 0;
  for (const entry of catalog('vehicles')) {
    const raw = UnitContract.parse(
      JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), 'public/data/units/vehicles', entry.path),
          'utf8',
        ),
      ),
    );
    if (raw.armor?.byLocation?.FRONT_LEFT === undefined) continue;
    checked++;
    const state = mapToVehicleState(raw);
    const extracted = service.extractData(buildVehicleUnitObject(state));
    expect(() => VehicleRecordSheetDataSchema.parse(extracted)).not.toThrow();
    const data = VehicleRecordSheetDataSchema.parse(extracted);
    const bindings = bindVehicle(data);
    const expected = [
      ['FRONT_LEFT', 'Front Left', 'FRLS'],
      ['FRONT_RIGHT', 'Front Right', 'FRRS'],
      ['REAR_LEFT', 'Rear Left', 'RRLS'],
      ['REAR_RIGHT', 'Rear Right', 'RRRS'],
    ] as const;
    for (const [source, location, code] of expected) {
      expect(
        data.armorLocations.find((a) => a.location === location)?.current,
      ).toBe(raw.armor.byLocation[source]);
      expect(bindings.texts[`textArmor_${code}`]).toBe(
        String(raw.armor.byLocation[source]),
      );
      if (raw.armor.byLocation[source] > 0)
        expect(
          bindings.pips.find((p) => p.groupId === `armorPips${code}`)?.count,
        ).toBe(raw.armor.byLocation[source]);
    }
    if (data.turretConfig === 'Dual') {
      expect(bindings.texts.textArmor_RT).toBe(
        String(raw.armor.byLocation.TURRET),
      );
      expect(bindings.texts.textArmor_FT).toBe(
        String(raw.armor.byLocation.TURRET_2),
      );
    }
  }
  expect(checked).toBe(37);
});

const equipment: IRecordSheetEquipment[] = Array.from(
  { length: 35 },
  (_, i) => ({
    id: `mount-${i}`,
    name: `Very long equipment name <&> preserved ${i}`,
    location: 'Front',
    locationAbbr: 'FR',
    quantity: 1,
    heat: 3,
    damage: 5,
    damageCode: 'DE',
    minimum: 0,
    short: 3,
    medium: 6,
    long: 9,
    isWeapon: true,
    isAmmo: false,
  }),
);
equipment.push({
  ...equipment[0],
  id: 'empty-ammo',
  name: 'Empty ammunition',
  isWeapon: false,
  isAmmo: true,
  ammoCount: 0,
});
equipment.push({
  ...equipment[0],
  id: 'unresolved',
  name: 'Unresolved source token',
  isWeapon: false,
  heat: '-',
  damage: '-',
  short: '-',
  medium: '-',
  long: '-',
});

function vehicle(): IVehicleRecordSheetData {
  const data = service.extractData(
    buildVehicleUnitObject(
      createDefaultVehicleState({
        name: 'Inventory fixture',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
    ),
  );
  if (data.unitType !== 'vehicle') throw new Error('Wrong family');
  return { ...data, turretConfig: 'Single', equipment };
}
const fragment = `<svg xmlns="http://www.w3.org/2000/svg"><rect id="inventory" x="3" y="79" width="216.4" height="168.6"/><g id="armorPipsFR"><rect x="0" y="0" width="100" height="30"/></g><text id="textArmor_FR"/></svg>`;

for (const family of ['vehicle', 'aerospace'] as const)
  for (const paper of [PaperSize.LETTER, PaperSize.A4])
    it(`${family} ${paper}: prints all canonical inventory rows without changing owner figures`, async () => {
      const key =
        family === 'vehicle'
          ? 'vehicle_turret_standard'
          : 'fighter_aerospace_default';
      const dir = paper === PaperSize.LETTER ? 'templates_us' : 'templates_iso';
      const load = jest
        .spyOn(getMmDataAssetService(), 'loadSVG')
        .mockImplementation(async (asset) => {
          expect(asset).toBe(`/record-sheets/${dir}/${key}.svg`);
          return process.env.RECORD_SHEET_PINNED_ASSETS
            ? fs.readFileSync(
                path.join(
                  process.env.RECORD_SHEET_PINNED_ASSETS,
                  dir,
                  key + '.svg',
                ),
                'utf8',
              )
            : fragment;
        });
      try {
        const output =
          family === 'vehicle'
            ? await renderVehicleTemplated(vehicle(), paper)
            : await renderAerospaceTemplated(
                {
                  unitType: 'aerospace',
                  header: vehicle().header,
                  structuralIntegrity: 5,
                  fuelPoints: 100,
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
                  armorArcs: [],
                  equipment,
                  bombBaySlots: 0,
                },
                paper,
              );
        const doc = new DOMParser().parseFromString(output, 'image/svg+xml');
        const rows = doc.querySelectorAll('#equipment-rows > g');
        expect(rows).toHaveLength(equipment.length);
        equipment.forEach((item, i) => {
          expect(rows[i].getAttribute('data-equipment-id')).toBe(item.id);
          expect(rows[i].textContent).toContain(item.name);
          if (item.isWeapon) expect(rows[i].textContent).toContain('5 DE');
        });
        expect(rows[equipment.length - 2].textContent).toContain('(0)');
        expect(doc.querySelectorAll('script')).toHaveLength(0);
        const region = doc.getElementById('inventory');
        const bottom =
          Number(region?.getAttribute('y')) +
          Number(region?.getAttribute('height'));
        expect(
          Math.max(
            ...Array.from(rows).flatMap((r) =>
              Array.from(r.querySelectorAll('text')).map((t) =>
                Number(t.getAttribute('y')),
              ),
            ),
          ),
        ).toBeLessThanOrEqual(bottom);
      } finally {
        load.mockRestore();
      }
    });

if (process.env.RECORD_SHEET_PINNED_ASSETS)
  for (const paper of [PaperSize.LETTER, PaperSize.A4])
    it(`renders heavy unequal turret and six-side pips on pinned ${paper} SVG`, async () => {
      const dir = paper === PaperSize.LETTER ? 'templates_us' : 'templates_iso';
      const data: IVehicleRecordSheetData = {
        ...vehicle(),
        isSuperheavy: true,
        turretConfig: 'Dual',
        armorLocations: [
          ...([
            { location: 'Front Left', current: 7, maximum: 7 },
            { location: 'Front Right', current: 11, maximum: 11 },
            { location: 'Rear Left', current: 13, maximum: 13 },
            { location: 'Rear Right', current: 17, maximum: 17 },
          ] as IVehicleRecordSheetData['armorLocations']),
          { location: 'Turret', current: 19, maximum: 19 },
          { location: 'Turret 2', current: 23, maximum: 23 },
        ],
      };
      expect(selectVehicleTemplate(data)).toBe('vehicle_dualturret_superheavy');
      const load = jest
        .spyOn(getMmDataAssetService(), 'loadSVG')
        .mockResolvedValue(
          fs.readFileSync(
            path.join(
              process.env.RECORD_SHEET_PINNED_ASSETS ?? '',
              dir,
              'vehicle_dualturret_superheavy.svg',
            ),
            'utf8',
          ),
        );
      try {
        const doc = new DOMParser().parseFromString(
          await renderVehicleTemplated(data, paper),
          'image/svg+xml',
        );
        for (const [code, count] of [
          ['FRLS', 7],
          ['FRRS', 11],
          ['RRLS', 13],
          ['RRRS', 17],
          ['RT', 19],
          ['FT', 23],
        ] as const) {
          expect(doc.getElementById(`textArmor_${code}`)?.textContent).toBe(
            String(count),
          );
          expect(
            doc.getElementById(`armorPips${code}`)?.querySelectorAll('circle'),
          ).toHaveLength(count);
        }
      } finally {
        load.mockRestore();
      }
    });

it('keeps standard dual turrets on TU and FT', () => {
  const data: IVehicleRecordSheetData = {
    ...vehicle(),
    turretConfig: 'Dual',
    isSuperheavy: false,
    armorLocations: [
      { location: 'Turret', current: 7, maximum: 7 },
      { location: 'Turret 2', current: 11, maximum: 11 },
    ],
  };
  const bindings = bindVehicle(data);
  expect(bindings.texts.textArmor_TU).toBe('7');
  expect(bindings.texts.textArmor_FT).toBe('11');
  expect(bindings.texts.textArmor_RT).toBeUndefined();
});

it('prints the native front equipment location instead of a three-letter truncation', () => {
  const state = createDefaultVehicleState({
    name: 'Location fixture',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  state.equipment = [
    {
      id: 'weapon',
      equipmentId: 'medium-laser',
      name: 'Medium Laser',
      location: VehicleLocation.FRONT,
      isRearMounted: false,
      isTurretMounted: false,
      isSponsonMounted: false,
    },
  ];
  const data = service.extractData(buildVehicleUnitObject(state));
  if (data.unitType !== 'vehicle') throw new Error('Wrong family');
  expect(data.equipment[0].locationAbbr).toBe('FR');
});
it.each([false, true])(
  'prints native aerospace equipment locations for smallCraft=%s',
  (isSmallCraft) => {
    const state = createDefaultAerospaceState({
      name: 'Location fixture',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      isSmallCraft,
    });
    state.equipment = [
      {
        id: 'weapon',
        equipmentId: 'medium-laser',
        name: 'Medium Laser',
        location: AerospaceLocation.LEFT_WING,
      },
    ];
    const data = service.extractData(buildAerospaceUnitObject(state));
    if (data.unitType !== 'aerospace') throw new Error('Wrong family');
    expect(data.equipment[0].locationAbbr).toBe(isSmallCraft ? 'LS' : 'LWG');
  },
);
