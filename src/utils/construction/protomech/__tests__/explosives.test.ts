/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import {
  computeProtoMechBVFromState,
  createDefaultProtoMechState,
} from '@/stores/protoMechState';
import {
  clearAllProtoMechStores,
  hydrateOrCreateProtoMech,
} from '@/stores/protoMechStoreRegistry';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { calculateProtoMechBV } from '../protoMechBV';
import fixtures from './fixtures/explosive-sources.json';
import { armor, buildProto, mount } from './protoMechBV.test.helpers';

jest.mock('../protoMechBV', () => {
  const actual =
    jest.requireActual<typeof import('../protoMechBV')>('../protoMechBV');
  return {
    ...actual,
    calculateProtoMechBV: jest.fn(actual.calculateProtoMechBV),
  };
});

afterEach(() => {
  clearAllProtoMechStores(true);
  jest.clearAllMocks();
});

describe.each(Object.values(ProtoChassis))(
  '%s native explosive stage',
  (chassisType) => {
    it.each([0, 6, 10, 25])(
      'does not subtract weapon penalties at Run %s',
      (runMP) => {
        const unit = buildProto({
          tonnage: 5,
          chassisType,
          runMP,
          armorByLocation: armor({ [ProtoLocation.TORSO]: 7 }),
        });
        const unarmed = calculateProtoMechBV(unit);
        for (const count of [1, 3]) {
          const equipped = {
            ...unit,
            equipment: Array.from({ length: count }, (_, i) => ({
              ...mount('CLAPGaussRifle', ProtoLocation.MAIN_GUN, true),
              id: `gauss-${i}`,
            })),
          };
          const before = JSON.stringify(equipped);
          const bv = calculateProtoMechBV(equipped);
          expect(bv.weaponBV).toBeGreaterThan(0);
          expect(bv.explosivePenalty).toBe(0);
          expect(bv.defensiveBV).toBe(unarmed.defensiveBV);
          expect(JSON.stringify(equipped)).toBe(before);
        }
      },
    );

    it('keeps a zero defensive pool exactly zero even with a Gauss weapon', () => {
      const bv = calculateProtoMechBV(
        buildProto({
          tonnage: 5,
          chassisType,
          equipment: [mount('CLAPGaussRifle', ProtoLocation.MAIN_GUN, true)],
        }),
      );
      expect(bv.weaponBV).toBeGreaterThan(0);
      expect(bv.explosivePenalty).toBe(0);
      expect(bv.defensiveBV).toBe(0);
    });

    it('preserves a saved penalty until an existing recomputation action', () => {
      const id = '11111111-2222-4333-8444-888888888888';
      const state = {
        ...createDefaultProtoMechState({ id, tonnage: 5, chassisType }),
        hasMainGun: true,
        equipment: [
          {
            id: 'gauss',
            equipmentId: 'CLAPGaussRifle',
            name: 'CLAPGaussRifle',
            location: ProtoMechLocation.MAIN_GUN,
          },
        ],
      };
      const cached = {
        ...computeProtoMechBVFromState(state),
        explosivePenalty: 15,
        final: 123,
      };
      const key = `megamek-protomech-${id}`;
      const saved = JSON.stringify({
        state: { ...state, bvBreakdown: cached },
        version: 0,
      });
      localStorage.setItem(key, saved);
      const store = hydrateOrCreateProtoMech(id, { tonnage: 5 });
      expect(localStorage.getItem(key)).toBe(saved);
      expect(store.getState().bvBreakdown).toEqual(cached);
      store.getState().setName('Preserved');
      expect(store.getState().bvBreakdown).toEqual(cached);
      store.getState().recomputeBV();
      expect(store.getState().bvBreakdown?.explosivePenalty).toBe(0);
      expect(store.getState().bvBreakdown).toEqual(
        computeProtoMechBVFromState(store.getState()),
      );
      expect(store.getState().equipment).toEqual(state.equipment);
      expect(JSON.parse(localStorage.getItem(key)!).state.bvBreakdown).toEqual(
        store.getState().bvBreakdown,
      );
    });
  },
);

it.each(fixtures)('matches actual Java defensive BV for $path', (fixture) => {
  const bytes = Buffer.from(fixture.content);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixture.sha256);
  expect(
    createHash('sha1')
      .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
      .digest('hex'),
  ).toBe(fixture.blob);
  const parsed = new BlkParserService().parse(fixture.content);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const handler = new ProtoMechUnitHandler();
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  const final = handler.calculateBV(result.data.unit);
  expect(calculateProtoMechBV).toHaveBeenCalledTimes(1);
  expect(calculateProtoMechBV).toHaveReturnedWith(
    expect.objectContaining({
      explosivePenalty: 0,
      defensiveBV: fixture.defensiveBV,
      final,
    }),
  );
});
