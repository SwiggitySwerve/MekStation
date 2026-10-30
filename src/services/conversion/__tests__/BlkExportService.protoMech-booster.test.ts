/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import type { ProtoMechState } from '@/stores/protoMechState';

import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import {
  computeProtoMechBVFromState,
  createDefaultProtoMechState,
} from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { computeRunMP } from '@/utils/construction/protomech';

import { BlkExportService } from '../BlkExportService';
import { BlkParserService } from '../BlkParserService';

const exporter = new BlkExportService();
const parser = new BlkParserService();
const handler = new ProtoMechUnitHandler();

function mount(
  name: string,
  location = 'Torso',
  id = name,
): ProtoMechState['equipment'][number] {
  // Exercise malformed or legacy persisted locations at the public boundary.
  return {
    id,
    equipmentId: name,
    name,
    location: location as ProtoMechLocation,
  };
}

function state(overrides: Partial<ProtoMechState> = {}): ProtoMechState {
  return {
    ...createDefaultProtoMechState({ id: 'booster-export-test', tonnage: 5 }),
    ...overrides,
  };
}

function assertRejected(unit: ProtoMechState, message: RegExp) {
  const before = JSON.stringify(unit);
  const bv = computeProtoMechBVFromState(unit);
  const result = exporter.export(unit);
  expect(result.success).toBe(false);
  expect(result.content).toBeUndefined();
  expect(result.errors.join(' ')).toMatch(message);
  expect(JSON.stringify(unit)).toBe(before);
  expect(computeProtoMechBVFromState(unit)).toEqual(bv);
}

function assertReloads(unit: ProtoMechState) {
  const before = JSON.stringify(unit);
  const exported = exporter.export(unit);
  expect(exported.success).toBe(true);
  if (!exported.content) throw new Error(exported.errors.join('; '));
  const parsed = parser.parse(exported.content);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(loaded.error.errors.join('; '));
  expect(loaded.data.unit.hasMyomerBooster).toBe(unit.hasMyomerBooster);
  expect(loaded.data.unit.cruiseMP).toBe(unit.cruiseMP);
  expect(
    computeRunMP(loaded.data.unit.cruiseMP, loaded.data.unit.hasMyomerBooster),
  ).toBe(computeRunMP(unit.cruiseMP, unit.hasMyomerBooster));
  expect(JSON.stringify(unit)).toBe(before);
  return exported.content;
}

describe('ProtoMek booster export integrity', () => {
  beforeEach(() => localStorage.clear());

  it('rejects enabling the real store flag without a corresponding mount', () => {
    const store = createProtoMechStore(state());
    store.getState().setWalkMP(5);
    store.getState().setMyomerBooster(true);
    expect(store.getState().flankMP).toBe(10);
    assertRejected(store.getState(), /booster.*equipment/i);
    store.getState().setMyomerBooster(false);
    assertReloads(store.getState());
  });

  it('rejects disabling the flag while retaining booster equipment', () => {
    const store = createProtoMechStore(
      state({ hasMyomerBooster: true, equipment: [mount('CLMyomerBooster')] }),
    );
    store.getState().setWalkMP(5);
    assertReloads(store.getState());
    store.getState().setMyomerBooster(false);
    expect(store.getState().flankMP).toBe(8);
    assertRejected(store.getState(), /booster.*equipment/i);
    store.getState().removeEquipment('CLMyomerBooster');
    assertReloads(store.getState());
  });

  it.each([
    'CLMyomerBooster',
    'clmyomerbooster',
    'Protomek Myomer Booster',
    'ISMASC',
    'Clan MASC',
    'Supercharger',
    'CLVTOLJetBooster',
    'BA Myomer Booster',
    '(R) CLMyomerBooster',
    'CLMyomerBooster (5)',
    'CLMyomerBooster:SIZE:2',
    '(R) CLMyomerBooster (5):SIZE:2',
  ])('keeps the effect and raw emitted name %s', (name) => {
    const content = assertReloads(
      state({ hasMyomerBooster: true, equipment: [mount(name)] }),
    );
    expect(content).toContain(`\n${name}\n`);
  });

  it.each(['', ...Object.values(ProtoMechLocation)])(
    'recognizes equipment actually emitted at %s',
    (location) => {
      assertReloads(
        state({
          hasMainGun: location === ProtoMechLocation.MAIN_GUN,
          hasMyomerBooster: true,
          equipment: [mount('CLMyomerBooster', location)],
        }),
      );
    },
  );

  it.each(['Body', 'Unknown', 'torso'])(
    'does not count equipment omitted by the writer at %s',
    (location) => {
      const unit = state({
        hasMyomerBooster: true,
        equipment: [mount('CLMyomerBooster', location)],
      });
      assertRejected(unit, /booster.*equipment/i);
      expect(assertReloads({ ...unit, hasMyomerBooster: false })).not.toContain(
        'CLMyomerBooster',
      );
    },
  );

  it.each([false, true])(
    'keeps absent Main Gun rejection with booster flag %s',
    (hasMyomerBooster) => {
      assertRejected(
        state({
          hasMyomerBooster,
          equipment: [mount('CLMyomerBooster', ProtoMechLocation.MAIN_GUN)],
        }),
        /Main Gun.*mount/i,
      );
    },
  );

  it.each([
    'CLMyomerBooster (-1)',
    'CLMyomerBooster (oops)',
    'Supercharger (Clan)',
    'CLMyomerBooster:SIZE:bad',
  ])('rejects malformed emitted equipment even after a booster: %s', (name) => {
    assertRejected(
      state({
        hasMyomerBooster: true,
        equipment: [mount('CLMyomerBooster'), mount(name)],
      }),
      /equipment.*(size|shot)/i,
    );
    assertReloads(state({ equipment: [mount(name, 'Unknown')] }));
  });

  it.each(['\n', '\r', '\r\n'])(
    'rejects an equipment name that emits multiple lines: %j',
    (separator) => {
      assertRejected(
        state({
          equipment: [mount(`CLERMediumLaser${separator}CLMyomerBooster`)],
        }),
        /equipment.*line/i,
      );
    },
  );

  it.each(['</Torso Equipment>', '<Body Equipment>'])(
    'rejects an equipment name that changes block boundaries: %s',
    (name) => {
      assertRejected(
        state({
          hasMyomerBooster: true,
          equipment: [mount(name), mount('CLMyomerBooster')],
        }),
        /equipment.*(line|tag)/i,
      );
    },
  );

  it('does not invent a booster from a fuzzy name', () => {
    const unit = state({ equipment: [mount('protomek-myomer-booster')] });
    assertReloads(unit);
    assertRejected({ ...unit, hasMyomerBooster: true }, /booster.*equipment/i);
  });
});
