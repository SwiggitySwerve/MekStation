import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
  renderHook,
} from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import React from 'react';

import type { IRecordSheetData } from '@/types/printing';

import { buildAerospaceUnitObject } from '@/components/customizer/aerospace/buildAerospaceUnitObject';
import { BattleArmorPreviewTab } from '@/components/customizer/battlearmor/BattleArmorPreviewTab';
import { BattleArmorRecordSheetPreview } from '@/components/customizer/battlearmor/BattleArmorRecordSheetPreview';
import { buildBattleArmorUnitObject } from '@/components/customizer/battlearmor/buildBattleArmorUnitObject';
import { buildInfantryUnitObject } from '@/components/customizer/infantry/buildInfantryUnitObject';
import { InfantryPreviewTab } from '@/components/customizer/infantry/InfantryPreviewTab';
import { InfantryRecordSheetPreview } from '@/components/customizer/infantry/InfantryRecordSheetPreview';
import { buildBattleMechPreviewProjection } from '@/components/customizer/preview/recordSheetPreview.logic';
import { buildProtoMechUnitObject } from '@/components/customizer/protomech/buildProtoMechUnitObject';
import { ProtoMechPreviewTab } from '@/components/customizer/protomech/ProtoMechPreviewTab';
import { ProtoMechRecordSheetPreview } from '@/components/customizer/protomech/ProtoMechRecordSheetPreview';
import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import { useVehicleRecordSheetUnit } from '@/components/customizer/vehicle/useVehicleRecordSheetUnit';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { extractAerospaceData } from '@/services/printing/recordsheet/dataExtractors.aerospace';
import { mapSimpleRecordSheetEquipment } from '@/services/printing/recordsheet/simpleEquipmentMapper';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { selectAerospaceTemplate } from '@/services/printing/svgRecordSheetRenderer/aerospace/selectTemplate';
import { selectVehicleTemplate } from '@/services/printing/svgRecordSheetRenderer/vehicle/selectTemplate';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { unitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import {
  createDefaultInfantryState,
  computeInfantryStateBV,
} from '@/stores/infantryState';
import { calculateInfantryTransportWeight } from '@/stores/infantryState';
import {
  createDefaultProtoMechState,
  computeProtoMechBVFromState,
} from '@/stores/protoMechState';
import {
  BattleArmorStoreContext,
  createBattleArmorStore,
} from '@/stores/useBattleArmorStore';
import {
  InfantryStoreContext,
  createInfantryStore,
} from '@/stores/useInfantryStore';
import {
  ProtoMechStoreContext,
  createProtoMechStore,
} from '@/stores/useProtoMechStore';
import {
  createVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import {
  AerospaceLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { VehicleRecordSheetDataSchema } from '@/types/printing/RecordSheetSchemas';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { BAArmorType } from '@/types/unit/BattleArmorInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { calculateBattleArmorBVFromState } from '@/utils/construction/battlearmor/battleArmorBVAdapter';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';
import { calculateHeatDissipation } from '@/utils/construction/heatSinkCalculations';
import {
  buildFieldGun,
  findFieldGunById,
} from '@/utils/construction/infantry/fieldGuns';
import { mapInfantryDefinition } from '@/utils/construction/infantry/libraryMapping';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';

import { catalog } from './catalogRecordSheets.helpers';
import { initializeEquipment } from './catalogRecordSheets.helpers';
beforeAll(initializeEquipment);

const service = new RecordSheetService();

it('resolves mount stats by equipment identity while preserving instance identity', () => {
  const state = createDefaultVehicleState({
    name: 'Test Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const weapon = getEquipmentLookupService()
    .getAllWeapons()
    .find((w) => w.name === 'Medium Laser');
  expect(weapon).toBeDefined();
  state.equipment = [
    {
      id: 'instance-1',
      equipmentId: weapon?.id ?? 'missing',
      name: 'Source token alias',
      location: VehicleLocation.FRONT,
      isRearMounted: false,
      isTurretMounted: false,
      isSponsonMounted: false,
    },
  ];
  const data = service.extractData(buildVehicleUnitObject(state));
  if (data.unitType !== 'vehicle' || !weapon)
    throw new Error('Missing fixture');
  expect(data.equipment[0]).toMatchObject({
    id: 'instance-1',
    location: 'Front',
    isWeapon: true,
    heat: weapon.heat,
    short: weapon.ranges?.short,
  });
});

it('selects the conventional fighter asset and prints aerospace BV from the dispatcher', () => {
  const state = createDefaultAerospaceState({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    isConventional: true,
  });
  const data = service.extractData(buildAerospaceUnitObject(state));
  if (data.unitType !== 'aerospace') throw new Error('Wrong sheet');
  expect(selectAerospaceTemplate(data)).toBe('fighter_conventional');
});

it('prints aerospace BV from the dispatcher', () => {
  const state = createDefaultAerospaceState({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    isConventional: true,
  });
  const data = service.extractData(buildAerospaceUnitObject(state));
  const expected = calculateBattleValueForUnit({
    ...state,
    movement: { safeThrust: state.safeThrust, maxThrust: state.maxThrust },
    totalArmorPoints: 0,
    heatSinkType: 0,
  });
  expect(data.header.battleValue).toBe(expected?.breakdown.final);
  expect(data.header.battleValue).toBeGreaterThan(0);
});

it.each([
  GroundMotionType.SUBMARINE,
  GroundMotionType.RAIL,
  GroundMotionType.HYDROFOIL,
])('preserves %s motion instead of printing Tracked', (motionType) => {
  const data = service.extractData(
    buildVehicleUnitObject({
      ...createDefaultVehicleState({
        name: 'Test Vehicle',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
      motionType,
      unitType: UnitType.SUPPORT_VEHICLE,
    }),
  );
  expect(data.unitType === 'vehicle' && data.motionType).toBe(motionType);
});

it('prints vehicle BV from the construction owner', () => {
  const state = createDefaultVehicleState({
    name: 'Test Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const data = service.extractData(buildVehicleUnitObject(state));
  expect(data.header.battleValue).toBe(computeVehicleBVFromState(state).final);
  expect(data.header.battleValue).toBeGreaterThan(0);
});

it('preserves the vehicle owner weight flag through live preview/export and schema', () => {
  const store = createVehicleStore(
    createDefaultVehicleState({
      name: 'Weight flag',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
  );
  const { result, unmount } = renderHook(useVehicleRecordSheetUnit, {
    wrapper: ({ children }) =>
      React.createElement(
        VehicleStoreContext.Provider,
        { value: store },
        children,
      ),
  });
  try {
    for (const isSuperheavy of [false, true, false]) {
      act(() => store.setState({ isSuperheavy }));
      expect(result.current).toMatchObject({ isSuperheavy });
      const data = VehicleRecordSheetDataSchema.parse(
        service.extractData(result.current),
      );
      expect(data).toMatchObject({ isSuperheavy });
      expect(selectVehicleTemplate(data)).toBe(
        `vehicle_noturret_${isSuperheavy ? 'superheavy' : 'standard'}`,
      );
    }
  } finally {
    unmount();
  }
});

it.each([
  ['adelante-passenger-cargo-train', true, 'vehicle_noturret_superheavy'],
  ['koi-heavy-transport', true, 'vehicle_noturret_superheavy'],
  ['cormorant-medium-cargo-craft', false, 'wige_noturret_standard'],
  ['flatbed-railcar', false, 'vehicle_noturret_standard'],
  ['atlantia-luxury-yacht', false, 'naval_noturret_standard'],
] as const)(
  'selects the pinned support chassis tier for %s',
  (id, isSuperheavy, template) => {
    const entry = catalog('vehicles').find((e) => e.id === id);
    expect(entry).toBeDefined();
    const source: unknown = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          'public/data/units/vehicles',
          entry?.path ?? 'missing',
        ),
        'utf8',
      ),
    );
    const state = mapToVehicleState(source);
    expect(state.isSuperheavy).toBe(isSuperheavy);
    const data = service.extractData(buildVehicleUnitObject(state));
    if (data.unitType !== 'vehicle') throw new Error('Wrong sheet');
    expect(selectVehicleTemplate(data)).toBe(template);
  },
);

it('does not invent weapon stats for an unknown partial name', () => {
  const state = createDefaultVehicleState({
    name: 'Test Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  state.equipment = [
    {
      id: 'unknown-instance',
      equipmentId: 'unknown-equipment',
      name: 'Medium',
      location: VehicleLocation.FRONT,
      isRearMounted: false,
      isTurretMounted: false,
      isSponsonMounted: false,
    },
  ];
  const data = service.extractData(buildVehicleUnitObject(state));
  if (data.unitType !== 'vehicle') throw new Error('Wrong sheet');
  expect(data.equipment[0]).toMatchObject({
    heat: '-',
    damage: '-',
    isWeapon: false,
  });
});

it('resolves aerospace weapon stats by catalog identity', () => {
  const state = createDefaultAerospaceState({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const weapon = getEquipmentLookupService()
    .getAllWeapons()
    .find((w) => w.name === 'Medium Laser');
  if (!weapon) throw new Error('Missing weapon fixture');
  state.equipment = [
    {
      id: 'aero-instance',
      equipmentId: weapon.id,
      name: 'Source token alias',
      location: AerospaceLocation.NOSE,
    },
  ];
  const data = service.extractData(buildAerospaceUnitObject(state));
  if (data.unitType !== 'aerospace') throw new Error('Wrong sheet');
  expect(data.equipment[0]).toMatchObject({
    id: 'aero-instance',
    location: 'Nose',
    isWeapon: true,
    heat: weapon.heat,
    short: weapon.ranges?.short,
  });
});

it('uses the heat owner for laser heat sinks', () => {
  const unit = buildAerospaceUnitObject(
    createDefaultAerospaceState({
      name: 'Test Fighter',
      tonnage: 50,
      techBase: TechBase.CLAN,
    }),
  );
  const data = extractAerospaceData({
    ...unit,
    heatSinks: { type: 'Laser', count: 12 },
  });
  expect(data.heatSinks.capacity).toBe(
    calculateHeatDissipation(HeatSinkType.LASER, 12),
  );
});

it('resolves ammunition shots and preserves explicit zero overrides', () => {
  const ammo = getEquipmentLookupService().getAllAmmunition()[0];
  expect(ammo).toBeDefined();
  const mount = {
    id: 'ammo-instance',
    equipmentId: ammo.id,
    name: 'Source ammo token',
    location: 'Nose',
  };
  expect(mapSimpleRecordSheetEquipment([mount])[0]).toMatchObject({
    id: 'ammo-instance',
    isAmmo: true,
    ammoCount: ammo.shotsPerTon,
  });
  expect(
    mapSimpleRecordSheetEquipment([
      {
        ...mount,
        ammoCount: 0,
        heat: 0,
        damage: 0,
        ranges: { minimum: 0, short: 0, medium: 0, long: 0 },
      },
    ])[0],
  ).toMatchObject({
    ammoCount: 0,
    heat: 0,
    damage: 0,
    minimum: 0,
    short: 0,
    medium: 0,
    long: 0,
  });
});

it('resolves source weapon aliases through the shared equipment owner', () => {
  const weapon = getEquipmentEntry('ISMediumLaser');
  expect(weapon?.id).toBe('medium-laser');
  expect(
    mapSimpleRecordSheetEquipment([
      {
        id: 'alias-instance',
        equipmentId: 'ISMediumLaser',
        name: 'Source token alias',
        location: 'Nose',
      },
    ])[0],
  ).toMatchObject({
    id: 'alias-instance',
    heat: weapon?.heat,
    damage: String(weapon?.damage),
    isWeapon: true,
  });
});

it('keeps a resolved weapon identity when its display name matches ammunition', () => {
  const lookup = getEquipmentLookupService();
  const weapon = lookup.getAllWeapons().find((w) => w.name === 'Medium Laser');
  if (!weapon) throw new Error('Missing weapon fixture');
  const ammo = lookup.getAllAmmunition()[0];
  const row = mapSimpleRecordSheetEquipment([
    {
      id: 'weapon-instance',
      equipmentId: weapon.id,
      name: ammo.name,
      location: 'Nose',
    },
  ])[0];
  expect(row).toMatchObject({
    isWeapon: true,
    isAmmo: false,
    heat: weapon.heat,
    damage: String(weapon.damage),
  });
});

function infantrySourceState() {
  const entry = catalog('infantry')[0];
  const source = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/infantry', entry.path),
        'utf8',
      ),
    ),
  );
  const mapped = mapInfantryDefinition(source);
  return { ...createDefaultInfantryState(mapped), ...mapped };
}

it('prints BA dispatcher BV and canonical squad tonnage instead of zero', () => {
  const source = createDefaultBattleArmorState({ squadSize: 5 });
  const data = service.extractData(
    buildBattleArmorUnitObject({ ...source, source }),
  );
  expect(data.header.battleValue).toBe(
    calculateBattleArmorBVFromState(source).final,
  );
  expect(data.header.battleValue).toBeGreaterThan(0);
  expect(data.header.tonnage).toBe(5);
});

it('dispatches infantry store protection and field-gun facts without losing source context', () => {
  const source = infantrySourceState();
  source.damageDivisor *= 3;
  const expected = computeInfantryStateBV(source)?.final;
  expect(
    calculateBattleValueForUnit({
      unitType: source.unitType,
      editorState: source,
    })?.breakdown.final,
  ).toBe(expected);
  const data = service.extractData(
    buildInfantryUnitObject({ ...source, source }),
  );
  expect(data.header.battleValue).toBe(expected);
  expect(data.header.tonnage).toBe(calculateInfantryTransportWeight(source));
});

it.each([ProtoChassis.BIPED, ProtoChassis.QUAD, ProtoChassis.GLIDER])(
  'prints %s ProtoMech dispatcher BV and explicit topology',
  (chassisType) => {
    const source = createDefaultProtoMechState({ chassisType });
    source.flankMP += 4;
    source.hasMainGun = true;
    const data = service.extractData(
      buildProtoMechUnitObject({ ...source, source }),
    );
    if (data.unitType !== 'protomech') throw new Error('Wrong sheet');
    expect(data.header.battleValue).toBe(
      computeProtoMechBVFromState(source).final,
    );
    expect(data.isQuad).toBe(chassisType === ProtoChassis.QUAD);
    expect(data.isGlider).toBe(chassisType === ProtoChassis.GLIDER);
    expect(data.hasMainGun).toBe(true);
  },
);

it('retains all 456 armor points and the center-leg location on all six Ares sheets', () => {
  const entries = catalog('battlemechs').filter((e) =>
    /^ares-ars-v1/.test(e.id),
  );
  expect(entries).toHaveLength(6);
  for (const entry of entries) {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/battlemechs', entry.path),
        'utf8',
      ),
    );
    const state = unitLoaderService.mapToUnitState(parseUnit(raw), true);
    const data = service.extractData(
      buildBattleMechPreviewProjection(state).unitConfig,
    );
    expect(data.mechType).toBe('tripod');
    expect(data.armor.totalPoints).toBe(456);
    expect(
      data.armor.locations.find((l) => l.location === 'Center Leg')?.current,
    ).toBe(56);
  }
});

const smallPreviewCases = [
  {
    name: 'BA',
    components: [BattleArmorRecordSheetPreview, BattleArmorPreviewTab],
    create: () => {
      const store = createBattleArmorStore(createDefaultBattleArmorState());
      return {
        wrap: (component: React.ComponentType) =>
          React.createElement(
            BattleArmorStoreContext.Provider,
            { value: store },
            React.createElement(component),
          ),
        expected: () => calculateBattleArmorBVFromState(store.getState()).final,
        update: () =>
          store.setState({
            armorType: 32,
            baArmorType: BAArmorType.STEALTH_BASIC,
          }),
      };
    },
  },
  {
    name: 'infantry',
    components: [InfantryRecordSheetPreview, InfantryPreviewTab],
    create: () => {
      const store = createInfantryStore(infantrySourceState());
      return {
        wrap: (component: React.ComponentType) =>
          React.createElement(
            InfantryStoreContext.Provider,
            { value: store },
            React.createElement(component),
          ),
        expected: () => computeInfantryStateBV(store.getState())?.final,
        update: () =>
          store.setState({ damageDivisor: store.getState().damageDivisor * 3 }),
      };
    },
  },
  {
    name: 'ProtoMech',
    components: [ProtoMechRecordSheetPreview, ProtoMechPreviewTab],
    create: () => {
      const store = createProtoMechStore(createDefaultProtoMechState());
      return {
        wrap: (component: React.ComponentType) =>
          React.createElement(
            ProtoMechStoreContext.Provider,
            { value: store },
            React.createElement(component),
          ),
        expected: () => computeProtoMechBVFromState(store.getState()).final,
        update: () => store.setState({ flankMP: store.getState().flankMP + 4 }),
      };
    },
  },
];

for (const family of smallPreviewCases)
  for (const [index, component] of family.components.entries()) {
    it(`${family.name} ${index ? 'toolbar and canvas' : 'standalone canvas'} retains current BV-only inputs`, async () => {
      const active = family.create();
      const singleton = getRecordSheetService();
      const rendered: IRecordSheetData[] = [];
      const preview = jest
        .spyOn(singleton, 'renderPreview')
        .mockImplementation(async (_canvas, data) => {
          rendered.push(data);
        });
      const printed: IRecordSheetData[] = [];
      const print = jest
        .spyOn(singleton, 'printRecordSheet')
        .mockImplementation(async (data) => {
          printed.push(data);
        });
      const exported: IRecordSheetData[] = [];
      const pdf = jest
        .spyOn(singleton, 'exportPDF')
        .mockImplementation(async (data) => {
          exported.push(data);
        });
      try {
        render(active.wrap(component));
        await waitFor(() =>
          expect(rendered.at(-1)?.header.battleValue).toBe(active.expected()),
        );
        const initial = active.expected();
        act(() => active.update());
        expect(active.expected()).not.toBe(initial);
        await waitFor(() =>
          expect(rendered.at(-1)?.header.battleValue).toBe(active.expected()),
        );
        if (index) {
          fireEvent.click(screen.getByRole('button', { name: 'Print' }));
          await waitFor(() =>
            expect(printed.at(-1)?.header.battleValue).toBe(active.expected()),
          );
          await waitFor(() =>
            expect(screen.getByTitle('Download PDF')).toBeEnabled(),
          );
          fireEvent.click(screen.getByTitle('Download PDF'));
          await waitFor(() =>
            expect(exported.at(-1)?.header.battleValue).toBe(active.expected()),
          );
        }
      } finally {
        cleanup();
        preview.mockRestore();
        print.mockRestore();
        pdf.mockRestore();
      }
    });
  }

it('keeps explicit empty field-gun ammo pools on infantry state dispatch', () => {
  const source = createDefaultInfantryState();
  const entry = findFieldGunById('ac5');
  if (!entry) throw new Error('Missing field-gun fixture');
  const gun = buildFieldGun(entry);
  source.fieldGuns = [{ ...gun, ammoRounds: 0 }];
  const empty = computeInfantryStateBV(source)?.final;
  expect(
    calculateBattleValueForUnit({
      unitType: source.unitType,
      editorState: source,
    })?.breakdown.final,
  ).toBe(empty);
  source.fieldGuns = [{ ...source.fieldGuns[0], ammoRounds: 20 }];
  expect(
    calculateBattleValueForUnit({
      unitType: source.unitType,
      editorState: source,
    })?.breakdown.final,
  ).toBe(computeInfantryStateBV(source)?.final);
  const data = service.extractData(
    buildInfantryUnitObject({ ...source, source }),
  );
  if (data.unitType !== 'infantry') throw new Error('Wrong sheet');
  expect(data.fieldGun?.ammoRounds).toBe(20);
});

it('carries ProtoMech equipment locations into the printed model', () => {
  const source = createDefaultProtoMechState();
  const weapon = getEquipmentLookupService()
    .getAllWeapons()
    .find((w) => w.name === 'Medium Laser');
  if (!weapon) throw new Error('Missing weapon fixture');
  source.equipment = [
    {
      id: 'proto-mounted',
      equipmentId: weapon.id,
      name: weapon.name,
      location: ProtoMechLocation.TORSO,
    },
  ];
  const data = service.extractData(
    buildProtoMechUnitObject({ ...source, source }),
  );
  if (data.unitType !== 'protomech') throw new Error('Wrong sheet');
  expect(data.equipment).toHaveLength(1);
  expect(data.equipment[0]).toMatchObject({
    id: 'proto-mounted',
    location: 'Torso',
    isWeapon: true,
  });
  expect(data.header.battleValue).toBe(
    computeProtoMechBVFromState(source).final,
  );
});

it('rejects skill overrides on the baseline editor snapshot contract', () => {
  const source = createDefaultProtoMechState();
  const request = { unitType: source.unitType, editorState: source };
  expect(() => calculateBattleValueForUnit(request, { gunnery: 2 })).toThrow(
    'baseline skills',
  );
});

it('rejects an editor snapshot from a different unit family', () => {
  const request = {
    unitType: UnitType.INFANTRY,
    editorState: createDefaultProtoMechState(),
  };
  expect(() => calculateBattleValueForUnit(request)).toThrow('family mismatch');
});
