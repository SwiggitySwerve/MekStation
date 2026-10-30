/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import { exportProtoMech } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  createDefaultProtoMechState,
  computeProtoMechBVFromState,
} from '@/stores/protoMechState';
import {
  clearAllProtoMechStores,
  hydrateOrCreateProtoMech,
} from '@/stores/protoMechStoreRegistry';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import * as protoBV from '@/utils/construction/protomech/protoMechBV';

import { ProtoMechUnitHandler } from '../ProtoMechUnitHandler';

jest.mock('@/utils/construction/protomech/protoMechBV', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/construction/protomech/protoMechBV')
  >('@/utils/construction/protomech/protoMechBV');
  return {
    ...actual,
    calculateProtoMechBV: jest.fn(actual.calculateProtoMechBV),
  };
});

const parser = new BlkParserService();
const handler = new ProtoMechUnitHandler();
const id = '8f145cc5-d4b3-493b-bfbb-ea8d8d10b3b6';
function document(equipment: Record<string, string>, spelling = 'ProtoMek') {
  const text = Object.entries({
    UnitType: spelling,
    Name: 'Syntax probe',
    Model: 'A',
    year: '3060',
    type: 'Clan Level 3',
    tonnage: '5',
    motion_type: 'Biped',
    cruiseMP: '6',
    armor: '3\n7\n2\n4\n5\n0',
    ...equipment,
  })
    .map(([key, value]) => `<${key}>\n${value}\n</${key}>`)
    .join('\n');
  const parsed = parser.parse(text);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  return parsed.data.document;
}
function load(equipment: Record<string, string>, spelling = 'ProtoMek') {
  const result = handler.parse(document(equipment, spelling));
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return result.data.unit;
}

beforeEach(() => {
  jest.clearAllMocks();
  clearAllProtoMechStores();
  localStorage.clear();
});
afterEach(() => {
  clearAllProtoMechStores();
  jest.restoreAllMocks();
});

describe('ProtoMek equipment source data flow', () => {
  it.each(['ProtoMek', 'ProtoMech', 'Protomech'])(
    'retains source entry order, multiplicity and syntax for %s',
    (spelling) => {
      const entry = '(R) CLSRM2 Ammo (7):SIZE:2';
      const unit = load(
        { 'Torso Equipment': `${entry}\n${entry}\nCLERSmallLaser` },
        spelling,
      );
      expect(unit.equipment.map((mount) => mount.name)).toEqual([
        entry,
        entry,
        'CLERSmallLaser',
      ]);
      expect(new Set(unit.equipment.map((mount) => mount.id)).size).toBe(3);
      for (const mount of unit.equipment.slice(0, 2)) {
        expect(mount.equipmentId).toBe(entry);
        expect(mount.blkSource).toEqual({
          blockKey: 'Torso',
          rawEntry: entry,
          lookupName: 'CLSRM2 Ammo',
          shots: 7,
          size: 2,
          rearPrefix: true,
          errors: [],
        });
      }
      expect(unit.equipment[2].blkSource?.rearPrefix).toBe(false);
      const spy = jest.mocked(protoBV.calculateProtoMechBV);
      handler.calculateBV(unit);
      expect(
        spy.mock.calls.at(-1)?.[0].equipment.map((mount) => mount.blkSource),
      ).toEqual(unit.equipment.map((mount) => mount.blkSource));
    },
  );

  it('retains parsed block keys separately from current normalized locations', () => {
    const unit = load({
      'Body Equipment': 'CLSRM2 Ammo (0)',
      'TORSO EQUIPMENT': 'CLERSmallLaser',
    });
    expect(unit.equipment[0].location).toBe(ProtoMechLocation.TORSO);
    expect(unit.equipment[0].blkSource?.blockKey).toBe('Body');
    expect(unit.equipment[1].blkSource?.blockKey).toBe('TORSO EQUIPMENT');
    expect(unit.equipment[0].blkSource?.shots).toBe(0);
  });

  it('preserves diagnostics in an unvisited retained block without changing admission', () => {
    const rawEntry = 'Unknown Custom (-1)';
    const unit = load({ 'Front Equipment': rawEntry });
    expect(unit.equipment[0].blkSource).toMatchObject({
      blockKey: 'Front',
      rawEntry,
      errors: [`Invalid ProtoMek equipment shot count: ${rawEntry}`],
    });
    expect(unit.hasMyomerBooster).toBe(false);
    const result = handler.parse(document({ 'Torso Equipment': rawEntry }));
    expect(result.success).toBe(false);
    if (!result.success)
      expect(
        result.error.errors.filter((error) => error.includes('shot count')),
      ).toHaveLength(1);
  });

  it('carries metadata through the actual store projection and saved-state loader', () => {
    const unit = load({
      'Torso Equipment': 'CLSRM2 Ammo (7)\nCommsGear:SIZE:1.25',
    });
    const state = {
      ...createDefaultProtoMechState({ id, tonnage: 5 }),
      equipment: [...unit.equipment],
    };
    const spy = jest.mocked(protoBV.calculateProtoMechBV);
    computeProtoMechBVFromState(state);
    expect(
      spy.mock.calls.at(-1)?.[0].equipment.map((mount) => mount.blkSource),
    ).toEqual(unit.equipment.map((mount) => mount.blkSource));
    const store = createProtoMechStore(state);
    store.getState().setName('Saved source syntax');
    const saved = localStorage.getItem(`megamek-protomech-${id}`);
    expect(saved).toContain('blkSource');
    const hydrated = hydrateOrCreateProtoMech(id, { tonnage: 5 });
    expect(hydrated.getState().equipment).toEqual(unit.equipment);
    expect(localStorage.getItem(`megamek-protomech-${id}`)).toBe(saved);
    hydrated.getState().setJumpMP(2);
    expect(hydrated.getState().equipment).toEqual(unit.equipment);
  });

  it('retains raw equipment on BLK reload while edited names remain authoritative', () => {
    const unit = load({
      'Torso Equipment': 'CLSRM2 Ammo (7)\nCommsGear:SIZE:1.25',
    });
    const state = {
      ...createDefaultProtoMechState({ id, tonnage: 5 }),
      equipment: [...unit.equipment],
    };
    const before = JSON.stringify(state);
    const exported = exportProtoMech(state);
    expect(exported.success).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    if (!exported.success || exported.content === undefined)
      throw new Error('Export failed');
    const parsed = parser.parse(exported.content);
    if (!parsed.success) throw new Error('Parse failed');
    const reloaded = handler.parse(parsed.data.document);
    if (!reloaded.success) throw new Error('Reload failed');
    expect(
      reloaded.data.unit.equipment.map((mount) => mount.blkSource),
    ).toEqual(unit.equipment.map((mount) => mount.blkSource));
    const edited = {
      ...state,
      equipment: [{ ...state.equipment[0], name: 'CLSRM2 Ammo (3)' }],
    };
    const changed = exportProtoMech(edited);
    expect(changed.success).toBe(true);
    expect(changed.content).toContain('CLSRM2 Ammo (3)');
    expect(changed.content).not.toContain('CLSRM2 Ammo (7)');
    expect(edited.equipment[0].blkSource?.shots).toBe(7);
  });
});
