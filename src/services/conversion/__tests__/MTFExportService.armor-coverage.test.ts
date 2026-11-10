import { UnitContract } from '@/types/contracts';

import schema from '../../../../public/data/equipment/_schema/unit-schema.json';
import jenner from '../../../../public/data/units/battlemechs/3-succession-wars/standard/Jenner JR7-K (Grace).json';
import zeus from '../../../../public/data/units/battlemechs/4-clan-invasion/standard/Zeus-X ZEU-X.json';
import { ARMOR_EXPORT_FAMILIES } from '../MTFArmorClassification';
import { MTFExportService } from '../MTFExportService';
import { MTFParserService } from '../MTFParserService';
import { formatArmorType, getMTFArmorIdentities } from '../MTFVocabulary';
import { createMinimalUnit } from './MTFExportService.test-helpers';

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

  it('round trips the real Jenner prototype armor and allocation', () => {
    expect(UnitContract.safeParse(jenner).success).toBe(true);
    const exported = exporter.export(jenner);
    expect(exported).toMatchObject({ success: true, errors: [] });
    expect(exported.content?.split('\n')).toContain(
      'armor:Ferro-Fibrous Prototype',
    );
    const imported = new MTFParserService().parse(exported.content ?? '');
    expect(imported.success).toBe(true);
    expect(imported.unit?.armor).toEqual(jenner.armor);
  });

  it.each(addedArmorNames.slice(0, -1))(
    'round trips scalar armor %s without changing its allocation',
    (type, name) => {
      const unit = createMinimalUnit({
        armor: { ...jenner.armor, type },
      });
      const exported = exporter.export(unit);
      expect(exported).toMatchObject({ success: true, errors: [] });
      expect(exported.content?.split('\n')).toContain(`armor:${name}`);
      const imported = new MTFParserService().parse(exported.content ?? '');
      expect(imported.unit?.armor).toEqual(unit.armor);
    },
  );

  it('refuses real Patchwork without the missing per-location point context', () => {
    expect(zeus.armor.typeByLocation.LEFT_ARM).toBe(2);
    expect(zeus.armor.allocation).toEqual({});
    const exported = exporter.export(zeus);
    expect(exported.success).toBe(false);
    expect(exported.content).toBeUndefined();
    expect(exported.errors.join('; ')).toContain(
      'Patchwork MTF export requires per-location armor points, types and tech bases',
    );
  });
});
