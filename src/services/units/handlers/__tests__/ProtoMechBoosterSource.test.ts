/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import { exportProtoMech } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { computeRunMP } from '@/utils/construction/protomech';

import { ProtoMechUnitHandler } from '../ProtoMechUnitHandler';

const parser = new BlkParserService();
const handler = new ProtoMechUnitHandler();

const technologies = ['IS', 'Clan'].flatMap((base) =>
  [1, 2, 3, 4].map((level) => `${base} Level ${level}`),
);

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
    describe.each(technologies)('%s native lookup context', (type) => {
      it.each([
        'Super Charger',
        'super charger',
        'SUPER CHARGER',
        '(R) Super Charger',
        'Super Charger (+5):SIZE:2',
        '(R) Super Charger (\u0665):SIZE:2',
      ])('resolves %s using the source technology', (name) => {
        const expected = type !== 'Clan Level 2';
        const unit = load({ UnitType, type, 'Torso Equipment': name });
        expect(unit.hasMyomerBooster).toBe(expected);
        expect(computeRunMP(unit.cruiseMP, unit.hasMyomerBooster)).toBe(
          expected ? 8 : 6,
        );
        expect(unit.equipment[0].name).toBe(name);

        const state = {
          ...createDefaultProtoMechState({ tonnage: 5 }),
          techBase: unit.techBase,
          rulesLevel: unit.rulesLevel,
          hasMainGun: false,
          armorByLocation: unit.armorByLocation,
          equipment: [...unit.equipment],
          hasMyomerBooster: expected,
        };
        const exported = exportProtoMech(state);
        expect(exported.success).toBe(true);
        expect(exported.content).toContain(name);
        const inconsistent = exportProtoMech({
          ...state,
          hasMyomerBooster: !expected,
        });
        expect(inconsistent.success).toBe(false);
        expect(inconsistent.content).toBeUndefined();
      });
    });

    it.each([
      '\u0665',
      '\uff15',
      '+\u096b',
      '-\u0660',
      '2\u0661\uff14\u096d483647',
    ])('accepts Java decimal shot digits %s', (shots) => {
      expect(
        load({ UnitType, 'Torso Equipment': `CLMyomerBooster (${shots})` })
          .hasMyomerBooster,
      ).toBe(true);
    });
    it.each([
      '\u0662\u0661\u0664\u0667\u0664\u0668\u0663\u0666\u0664\u0668',
      '-\u0661',
      '\ud835\udfd3',
      '\u00b2',
      '\u0665.0',
      '+',
      ' \u0665',
    ])('rejects invalid or out-of-range Java shot digits %s', (shots) => {
      const result = parse({
        UnitType,
        'Torso Equipment': `CLMyomerBooster (${shots})`,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.errors.join(' ')).toContain('shot count');
    });

    it.each(['Torso Equipment', 'torso equipment', 'TORSO EQUIPMENT'])(
      'uses the first case-variant equipment block %s',
      (first) => {
        const second =
          first === 'TORSO EQUIPMENT' ? 'Torso Equipment' : 'TORSO EQUIPMENT';
        expect(
          load({
            UnitType,
            [first]: 'CLERMediumLaser',
            [second]: 'CLMyomerBooster',
          }).hasMyomerBooster,
        ).toBe(false);
        expect(
          load({
            UnitType,
            [first]: 'CLMyomerBooster',
            [second]: 'Unknown (oops)',
          }).hasMyomerBooster,
        ).toBe(true);
        expect(
          load({ UnitType, [first]: '', [second]: 'CLMyomerBooster' })
            .hasMyomerBooster,
        ).toBe(false);
      },
    );

    it.each(['Front', 'Turret'])(
      'refuses export that would activate ignored %s equipment',
      (location) => {
        const unit = load({
          UnitType,
          [`${location} Equipment`]: 'CLMyomerBooster',
        });
        expect(unit.hasMyomerBooster).toBe(false);
        const state = {
          ...createDefaultProtoMechState({ tonnage: 5 }),
          hasMainGun: unit.hasMainGun,
          hasMyomerBooster: unit.hasMyomerBooster,
          armorByLocation: unit.armorByLocation,
          equipment: [...unit.equipment],
        };
        const before = JSON.stringify(state);
        const result = exportProtoMech(state);
        expect(result.success).toBe(false);
        expect(result.content).toBeUndefined();
        expect(result.errors.join(' ')).toMatch(/booster.*equipment/i);
        expect(JSON.stringify(state)).toBe(before);
      },
    );

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
