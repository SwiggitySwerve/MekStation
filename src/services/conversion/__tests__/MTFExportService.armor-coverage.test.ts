import { UnitContract } from '@/types/contracts';

import schema from '../../../../public/data/equipment/_schema/unit-schema.json';
import jenner from '../../../../public/data/units/battlemechs/3-succession-wars/standard/Jenner JR7-K (Grace).json';
import zeus from '../../../../public/data/units/battlemechs/4-clan-invasion/standard/Zeus-X ZEU-X.json';
import atlas from '../../../../public/data/units/battlemechs/6-dark-age/experimental/Atlas AS8-K.json';
import catapult from '../../../../public/data/units/battlemechs/6-dark-age/experimental/Catapult II CPLT-L7L.json';
import cerberus from '../../../../public/data/units/battlemechs/6-dark-age/experimental/Cerberus MR-7K.json';
import { ARMOR_EXPORT_FAMILIES } from '../MTFArmorClassification';
import { MTFExportService } from '../MTFExportService';
import { MTFParserService } from '../MTFParserService';
import { formatArmorType, getMTFArmorIdentities } from '../MTFVocabulary';

// MegaMek 48fcb2f64 ArmorType.java:521,1051,1108,1139,2069;
// Mek.java:5385-5403; MtfFile.java:414-466. Expectations are independent
// of the production vocabulary. Native code 9 is verified by the Java probe.
const addedArmorNames = [
  ['FERRO_FIBROUS_PROTO', 'Ferro-Fibrous Prototype'],
  ['BALLISTIC_REINFORCED', 'Ballistic-Reinforced'],
  ['HEAT_DISSIPATING', 'Heat-Dissipating'],
  ['ANTI_PENETRATIVE_ABLATION', 'Anti-Penetrative Ablation'],
  ['PATCHWORK', 'Patchwork'],
] as const;

const exporter = new MTFExportService();

describe('MTF armor coverage of the loader contract', () => {
  it('classifies exactly every accepted loader identity', () => {
    const identities = schema.$defs.standardArmorType.enum;
    expect(Object.keys(ARMOR_EXPORT_FAMILIES).sort()).toEqual(
      [...identities].sort(),
    );
    for (const type of identities) {
      expect(
        UnitContract.safeParse({ ...jenner, armor: { ...jenner.armor, type } })
          .success,
      ).toBe(true);
    }
  });

  it('has exact vocabulary equality with the classified mech identities', () => {
    const mechIdentities = Object.entries(ARMOR_EXPORT_FAMILIES)
      .filter(([, family]) => family === 'MTF:mech')
      .map(([type]) => type);
    expect([...getMTFArmorIdentities()].sort()).toEqual(mechIdentities.sort());
  });

  it.each(addedArmorNames)('uses the pinned name for %s', (type, name) => {
    expect(formatArmorType(type)).toBe(name);
  });

  it.each([
    {
      unit: jenner,
      type: 'FERRO_FIBROUS_PROTO',
      name: 'Ferro-Fibrous Prototype',
    },
    { unit: atlas, type: 'BALLISTIC_REINFORCED', name: 'Ballistic-Reinforced' },
    { unit: catapult, type: 'HEAT_DISSIPATING', name: 'Heat-Dissipating' },
    {
      unit: cerberus,
      type: 'ANTI_PENETRATIVE_ABLATION',
      name: 'Anti-Penetrative Ablation',
    },
  ])('round trips real catalog $type ($unit.id)', ({ unit, type, name }) => {
    expect(unit.armor.type).toBe(type);
    expect(UnitContract.safeParse(unit).success).toBe(true);
    const exported = exporter.export(unit);
    expect(exported).toMatchObject({ success: true, errors: [] });
    expect(exported.content?.split('\n')).toContain(`armor:${name}`);
    const imported = new MTFParserService().parse(exported.content ?? '');
    expect(imported.success).toBe(true);
    expect(imported.unit?.armor).toEqual(unit.armor);
  });

  it('refuses real Patchwork until complete per-location context is supported', () => {
    expect(zeus.armor.typeByLocation.LEFT_ARM).toBe(2);
    const exported = exporter.export(zeus);
    expect(exported.success).toBe(false);
    expect(exported.content).toBeUndefined();
    expect(exported.errors.join('; ')).toContain(
      'Patchwork MTF export requires per-location armor points, types and tech bases',
    );
  });
});
