/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import { exportProtoMech } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';

import { ProtoMechUnitHandler } from '../ProtoMechUnitHandler';

const parser = new BlkParserService();
const handler = new ProtoMechUnitHandler();

function parse(overrides: Record<string, string> = {}) {
  const tags = {
    UnitType: 'ProtoMek',
    Name: 'Booster source',
    Model: 'A',
    year: '3070',
    type: 'Clan Level 2',
    Tonnage: '5',
    motion_type: 'Biped',
    cruiseMP: '4',
    armor: '0\n0\n0\n0\n0',
    ...overrides,
  };
  const result = parser.parse(
    Object.entries(tags)
      .map(([k, v]) => `<${k}>\n${v}\n</${k}>`)
      .join('\n'),
  );
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return handler.parse(result.data.document);
}

function load(overrides: Record<string, string> = {}) {
  const result = parse(overrides);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return result.data.unit;
}

describe.each(['ProtoMek', 'ProtoMech', 'Protomech'])(
  '%s source booster identity',
  (UnitType) => {
    it.each([
      'CLMyomerBooster',
      'clmyomerbooster',
      'Protomek Myomer Booster',
      'MASC',
      'ISMASC',
      'IS MASC',
      'CLMASC',
      'Clan MASC',
      'Supercharger',
      'IS Super Charger',
      'CLSuperCharger',
      'VTOL Jet Booster',
      'ISVTOLJetBooster',
      'CLVTOLJetBooster',
      'BA Myomer Booster',
      'CLBAMyomerBooster',
      'CLBAMB',
      'BAMyomerBooster',
      '(R) CLMyomerBooster',
      'CLMyomerBooster:SIZE:2',
      'CLMyomerBooster (5)',
    ])(
      'derives the upstream F_MASC effect from %s without changing raw equipment',
      (name) => {
        const unit = load({
          UnitType,
          'Torso Equipment': name,
          myomerbooster: 'false',
        });
        expect(unit.hasMyomerBooster).toBe(true);
        expect(unit.cruiseMP).toBe(4);
        expect(unit.engineRating).toBe(30);
        expect(unit.equipment).toEqual([
          expect.objectContaining({
            equipmentId: name,
            name,
            location: ProtoMechLocation.TORSO,
          }),
        ]);
      },
    );

    it.each([
      'ProtomekMyomerBooster',
      'IS Protomek Myomer Booster',
      'Protomek Myomer Booster [IS]',
      'protomek-myomer-booster',
      'CLMyomerBoosterExtra',
      '(r) CLMyomerBooster',
      'CLERMediumLaser',
      '',
    ])('does not invent an equipment identity for %s', (name) => {
      expect(load({ UnitType, 'Torso Equipment': name }).hasMyomerBooster).toBe(
        false,
      );
    });

    it.each(['true', 'false', '1', '0'])(
      'ignores the non-native myomerbooster tag %s',
      (value) => {
        expect(load({ UnitType, myomerbooster: value }).hasMyomerBooster).toBe(
          false,
        );
      },
    );

    it.each([
      'Body',
      'Head',
      'Torso',
      'Right Arm',
      'Left Arm',
      'Legs',
      'torso',
    ])('reads a real %s equipment block', (location) => {
      expect(
        load({ UnitType, [`${location} Equipment`]: 'CLMyomerBooster' })
          .hasMyomerBooster,
      ).toBe(true);
    });

    it('does not activate equipment on an absent Main Gun', () => {
      const result = parse({
        UnitType,
        'Main Gun Equipment': 'CLMyomerBooster',
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Source unexpectedly failed');
      expect(result.data.unit.hasMyomerBooster).toBe(false);
      expect(result.data.unit.equipment).toHaveLength(1);
      expect(result.data.warnings.join(' ')).toContain('Main Gun');
      expect(
        load({
          UnitType,
          armor: '0\n0\n0\n0\n0\n0',
          'Main Gun Equipment': 'CLMyomerBooster',
        }).hasMyomerBooster,
      ).toBe(true);
    });

    it.each([
      'CLMyomerBooster (-1)',
      'CLMyomerBooster (oops)',
      'Supercharger (Clan)',
      'CLMyomerBooster:SIZE:bad',
    ])(
      'returns a structured failure for unusable equipment syntax %s',
      (equipment) => {
        const result = parse({ UnitType, 'Torso Equipment': equipment });
        expect(result.success).toBe(false);
        if (!result.success)
          expect(result.error.errors.join(' ')).toContain('equipment');
      },
    );

    it('checks every entry even after finding a valid booster', () => {
      expect(
        parse({
          UnitType,
          'Torso Equipment': 'CLMyomerBooster\nCLMyomerBooster (oops)',
        }).success,
      ).toBe(false);
    });
  },
);

it('retains source-derived booster identity through an existing BLK export and reload', () => {
  const unit = load({ 'Torso Equipment': 'CLMyomerBooster' });
  const state = {
    ...createDefaultProtoMechState({ tonnage: 5 }),
    hasMainGun: false,
    hasMyomerBooster: unit.hasMyomerBooster,
    equipment: [...unit.equipment],
    armorByLocation: unit.armorByLocation,
  };
  const exported = exportProtoMech(state);
  expect(exported.success).toBe(true);
  if (!exported.success || !exported.content) throw new Error('Export failed');
  const parsed = parser.parse(exported.content);
  if (!parsed.success) throw new Error('Export did not parse');
  const reloaded = handler.parse(parsed.data.document);
  if (!reloaded.success) throw new Error('Export did not load');
  expect(reloaded.data.unit.hasMyomerBooster).toBe(true);
  expect(reloaded.data.unit.equipment).toEqual(unit.equipment);
});
