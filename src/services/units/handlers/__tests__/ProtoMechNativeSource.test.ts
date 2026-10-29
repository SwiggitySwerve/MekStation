/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import { createHash } from 'node:crypto';

import { createMockProtoMechState } from '@/services/conversion/__tests__/BlkExportService.test-helpers';
import { exportProtoMech } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { UnitTypeRegistry } from '@/services/units/UnitTypeRegistry';
import { RulesLevel, TechBase } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { isProtoMech } from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { ProtoMechUnitHandler } from '../ProtoMechUnitHandler';
import fixtures from './fixtures/native-protomek.json';

const parser = new BlkParserService();
const handler = new ProtoMechUnitHandler();
const registry = new UnitTypeRegistry();
registry.register(handler);

function raw(overrides: Record<string, string | undefined> = {}) {
  const tags = {
    UnitType: 'ProtoMek',
    Name: 'Source probe',
    Model: 'A',
    year: '3060',
    type: 'Clan Level 2',
    Tonnage: '5',
    motion_type: 'Biped',
    cruiseMP: '6',
    armor: '3\n7\n2\n4\n5\n0',
    ...overrides,
  };
  return Object.entries(tags)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `<${k}>\n${v}\n</${k}>`)
    .join('\n');
}

function document(content: string): IBlkDocument {
  const parsed = parser.parse(content);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  return parsed.data.document;
}

function load(content: string) {
  const doc = document(content);
  const registered = registry.getHandlerForDocument(doc);
  expect(registered).toBe(handler);
  const result = registered!.parse(doc);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  if (!isProtoMech(result.data.unit)) throw new Error('Wrong family');
  return result.data.unit;
}

describe('native ProtoMek BLK source loading', () => {
  it.each(fixtures)(
    'loads immutable $path with upstream observations',
    (fixture) => {
      expect(createHash('sha256').update(fixture.content).digest('hex')).toBe(
        fixture.sha256,
      );
      const dispatch = parser.parseByUnitType(fixture.content);
      expect(dispatch.success && dispatch.result.kind).toBe('protomech');
      const unit = load(fixture.content);
      expect(unit).toMatchObject(fixture.expected);
      const validation = handler.validate(unit);
      expect(unit.isValid).toBe(validation.isValid);
      expect(unit.validationErrors).toEqual(validation.errors);
    },
  );

  it.each([
    ['Biped', '5', ProtoChassis.BIPED, 45],
    ['bIpEd', '14', ProtoChassis.ULTRAHEAVY, 130],
    ['Quad', '6', ProtoChassis.QUAD, 45],
    ['QUAD', '14', ProtoChassis.QUAD, 100],
    ['WiGE', '14', ProtoChassis.GLIDER, 100],
  ])('preserves native %s at %s tons', (motion, tonnage, chassis, rating) => {
    const unit = load(
      raw({
        motion_type: motion,
        Tonnage: tonnage,
        glider: 'true',
        quad: 'true',
      }),
    );
    expect(unit.chassisType).toBe(chassis);
    expect(unit.engineRating).toBe(rating);
  });

  it.each([
    ['Clan Level 2', RulesLevel.STANDARD, TechBase.CLAN],
    ['Clan Level 3', RulesLevel.ADVANCED, TechBase.CLAN],
    ['Clan Level 4', RulesLevel.EXPERIMENTAL, TechBase.CLAN],
    ['IS Level 2', RulesLevel.STANDARD, TechBase.INNER_SPHERE],
  ])('keeps declared %s', (type, rulesLevel, techBase) => {
    expect(load(raw({ type }))).toMatchObject({
      rulesLevel,
      techBase,
      metadata: { rulesLevel, techBase },
    });
  });

  it('keeps asymmetric arms and counts an empty main-gun mount', () => {
    const unit = load(raw());
    expect(unit.armorByLocation).toEqual({
      Head: 3,
      Torso: 7,
      'Right Arm': 2,
      'Left Arm': 4,
      Legs: 5,
      'Main Gun': 0,
    });
    expect(unit.hasMainGun).toBe(true);
    expect(unit.equipment).toHaveLength(0);
    expect(load(raw({ armor: '3\n7\n2\n4\n5' })).hasMainGun).toBe(false);
  });

  it('retains zero cruise and existing construction errors', () => {
    const unit = load(
      raw({ cruiseMP: '0', Tonnage: '14', motion_type: 'WiGE' }),
    );
    expect(unit).toMatchObject({
      cruiseMP: 0,
      tonnage: 14,
      isValid: false,
      engineRating: -28,
    });
    expect(unit.validationErrors).toEqual(handler.validate(unit).errors);
    expect(unit.validationErrors).toContain('ProtoMech cannot exceed 9 tons');
    expect(unit.validationErrors).toContain(
      'ProtoMech must have at least 1 cruise MP',
    );
  });

  it.each([
    { motion_type: undefined },
    { motion_type: 'Hover' },
    { motion_type: 'unknown' },
    { cruiseMP: undefined },
    { cruiseMP: '-1' },
    { cruiseMP: '3junk' },
    { cruiseMP: '1\n2' },
    { cruiseMP: 'Infinity' },
    { Tonnage: '5junk' },
    { jumpingMP: 'junk' },
    { jumpingMP: '-1' },
    { armor: '' },
    { armor: '1\n2\n3\n4' },
    { armor: '1\n2\n3\n4\n5\n6\n7' },
    { armor: '1\n2\n3junk\n4\n5' },
    { armor: '1\n2\nNaN\n3\n4\n5' },
  ])('rejects unusable native fields: %j', (overrides) => {
    const parsed = parser.parse(raw(overrides));
    const result = parsed.success
      ? handler.parse(parsed.data.document)
      : parsed;
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.errors.join(' ')).toMatch(
        /motion_type|cruiseMP|jumpingMP|tonnage|armor/i,
      );
  });

  it('rejects unrepresentable technology rather than changing its identity', () => {
    const result = handler.parse(
      document(raw({ type: 'Mixed (Clan Chassis)' })),
    );
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.errors.join(' ')).toContain('type');
  });

  it.each(['0', '99', 'junk', '1\n2'])(
    'ignores native engine_type %s',
    (engine_type) => {
      expect(load(raw({ engine_type })).engineRating).toBe(
        load(raw()).engineRating,
      );
    },
  );

  it.each(['ProtoMech', 'Protomech'])(
    'retains %s legacy flags and omitted-speed default',
    (UnitType) => {
      const unit = load(
        raw({
          UnitType,
          motion_type: undefined,
          cruiseMP: undefined,
          glider: 'true',
          quad: 'true',
        }),
      );
      expect(unit).toMatchObject({
        chassisType: ProtoChassis.GLIDER,
        cruiseMP: 4,
        engineRating: 20,
      });
    },
  );

  it.each(Object.values(ProtoChassis))(
    'exports and reloads %s topology and locations',
    (chassisType) => {
      for (const hasMainGun of [false, true]) {
        const original = createMockProtoMechState({
          chassisType,
          hasMainGun,
          tonnage: chassisType === ProtoChassis.ULTRAHEAVY ? 14 : 5,
          armorByLocation: {
            Head: 3,
            Torso: 7,
            'Left Arm': 4,
            'Right Arm': 2,
            Legs: 5,
            'Main Gun': hasMainGun ? 3 : 0,
          },
        });
        const exported = exportProtoMech(original);
        expect(exported.success).toBe(true);
        const doc = document(exported.content!);
        expect(doc.unitType).toBe('ProtoMek');
        expect(doc.mappedUnitType).toBe(UnitType.PROTOMECH);
        expect(doc.armor).toHaveLength(hasMainGun ? 6 : 5);
        const loaded = load(exported.content!);
        expect(loaded).toMatchObject({
          chassisType,
          hasMainGun,
          armorByLocation: original.armorByLocation,
          cruiseMP: original.cruiseMP,
          jumpMP: original.jumpMP,
        });
      }
    },
  );
});
