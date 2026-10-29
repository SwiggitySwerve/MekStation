import { createHash } from 'node:crypto';

import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { UnitContract } from '@/types/contracts';

import { MTFParserService } from '../MTFParserService';
import fixtures from './MTFParser.pinned-sources.json';

// Original mm-data bytes at 50f7efef0c9f775b0258f8283525ed4f906e1985.
// Semantics: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
// MtfFile.java:293-319,358-410,414-483; equipment/ArmorType.java:384-524,669-766,1017-1167.
const armorNames: Record<string, string> = {
  Standard: 'STANDARD',
  'Ferro-Fibrous': 'FERRO_FIBROUS',
  'Light Ferro-Fibrous': 'LIGHT_FERRO_FIBROUS',
  'Heavy Ferro-Fibrous': 'HEAVY_FERRO_FIBROUS',
  Stealth: 'STEALTH',
  Reflective: 'REFLECTIVE',
  Hardened: 'HARDENED',
  Reactive: 'REACTIVE',
  Industrial: 'INDUSTRIAL',
  'Heavy Industrial': 'HEAVY_INDUSTRIAL',
  Commercial: 'COMMERCIAL',
  Primitive: 'PRIMITIVE',
  'Ferro-Lamellor': 'FERRO_LAMELLOR',
  'Impact-Resistant': 'IMPACT_RESISTANT',
};

describe('pinned original-byte MTF construction boundary', () => {
  it.each(fixtures.rows)('$path', async (source) => {
    const bytes = Buffer.from(source.base64, 'base64');
    expect(bytes.length).toBe(source.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      source.sha256,
    );
    const text = bytes.toString('utf8');
    const parsed = new MTFParserService().parse(text);
    expect(parsed.success).toBe(true);
    if (!parsed.unit) throw new Error(parsed.errors.join('; '));
    const unit = parsed.unit;
    const baseArmor = source.fields.Armor.replace(/\(.*\)$/, '').trim();
    let expectedArmor = armorNames[baseArmor];
    if (source.fields.Armor.includes('(Clan)')) {
      if (['FERRO_FIBROUS', 'REACTIVE', 'REFLECTIVE'].includes(expectedArmor)) {
        expectedArmor += '_CLAN';
      }
    }
    const unsupported =
      !expectedArmor || source.fields.Config.includes('FrankenMek');
    expect(UnitContract.safeParse(unit).success).toBe(!unsupported);
    const loaded = await loadUnitDefinition(
      { read: async () => unit },
      { source: 'custom', id: unit.id },
    );
    expect(loaded.success).toBe(!unsupported);
    expect(unit).toHaveProperty('mtfSource', {
      text,
      configuration: source.fields.Config,
      engine: source.fields.Engine,
      armor: source.fields.Armor,
    });
    const field = (name: string) =>
      text.match(new RegExp(`^${name}:(.*)$`, 'mi'))?.[1].trim();
    expect(unit.mulId).toBe(Number(field('mul id')) || undefined);
    expect(unit.role).toBe(field('role') || undefined);
    expect(unit).toHaveProperty('source', field('source') || undefined);
    expect(unit.clanName).toBe(field('clanname'));
    if (field('base chassis heat sinks')) {
      expect(unit.baseChassisHeatSinks).toBe(
        Number(field('base chassis heat sinks')),
      );
    }
    if (expectedArmor) expect(unit.armor.type).toBe(expectedArmor);
    else {
      expect(unit.armor.type).toContain(source.fields.Armor);
      expect(parsed.warnings.join(' ')).toContain('Unsupported MTF armor');
    }
    if (source.fields.Config.includes('OmniMek')) {
      expect(unit.isOmni).toBe(true);
      expect(unit.configuration).toBe(
        source.fields.Config.replace(' OmniMek', ''),
      );
    }
    if (source.fields.Config.includes('FrankenMek')) {
      expect(unit.configuration).toBe(source.fields.Config);
      expect(parsed.warnings.join(' ')).toContain('FrankenMek');
    }
    if (
      source.fields.Engine.includes('XL (Clan)') &&
      !source.fields.Engine.includes('XXL')
    ) {
      expect(unit.engine.type).toBe('CLAN_XL');
    }
    if (loaded.success) {
      expect(loaded.definition.mtfSource).toEqual(
        Reflect.get(unit, 'mtfSource'),
      );
      expect(loaded.definition.isOmni).toBe(unit.isOmni);
    }
  });

  it.each(['Biped Mystery', 'Biped OmniMek Mystery', 'Biped FrankenMek'])(
    'retains unsupported configuration %s',
    (config) => {
      const result = new MTFParserService().parse(
        `chassis:Unsupported\nConfig:${config}\nmass:50`,
      );
      expect(result.unit?.configuration).toBe(config);
      expect(UnitContract.safeParse(result.unit).success).toBe(false);
    },
  );

  it('does not turn an unknown engine into fusion', () => {
    const result = new MTFParserService().parse(
      'chassis:Unsupported\nmass:50\nengine:250 Mystery Engine',
    );
    expect(result.unit?.engine.type).toContain('Mystery Engine');
    expect(UnitContract.safeParse(result.unit).success).toBe(false);
  });
});
