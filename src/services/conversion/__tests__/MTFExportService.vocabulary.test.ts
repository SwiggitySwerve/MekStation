import { createHash } from 'node:crypto';

import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { UnitContract } from '@/types/contracts';

import { MTFExportService } from '../MTFExportService';
import { MTFParserService } from '../MTFParserService';
import { createMinimalUnit } from './MTFExportService.test-helpers';
import fixtures from './MTFParser.pinned-sources.json';

// Expectations are independently stated, not imported from MTFVocabulary.
// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// Engine.java:317-346; MtfFile.java:387-466,867-905.
const engines = [
  ['FUSION', 'Fusion Engine', 'Fusion Engine'],
  ['XL', 'XL Engine', 'XL Fusion Engine'],
  ['CLAN_XL', 'XL (Clan) Engine', 'XL Fusion Engine (Clan)'],
  ['XXL', 'XXL Engine', 'XXL Fusion Engine'],
  ['LIGHT', 'Light Engine', 'Light Fusion Engine'],
  ['COMPACT', 'Compact Engine', 'Compact Fusion Engine'],
  ['ICE', 'ICE Engine', 'ICE Engine'],
  ['FUEL_CELL', 'Fuel Cell Engine', 'Fuel Cell Engine'],
  ['FISSION', 'Fission Engine', 'Fission Engine'],
  ['BATTERY', 'Battery Engine', 'Battery Engine'],
];
const armors = [
  ['STANDARD', 'Standard'],
  ['FERRO_FIBROUS', 'Ferro-Fibrous'],
  ['FERRO_FIBROUS_CLAN', 'Ferro-Fibrous(Clan)'],
  ['LIGHT_FERRO_FIBROUS', 'Light Ferro-Fibrous'],
  ['HEAVY_FERRO_FIBROUS', 'Heavy Ferro-Fibrous'],
  ['STEALTH', 'Stealth'],
  ['REACTIVE', 'Reactive'],
  ['REACTIVE_CLAN', 'Reactive(Clan)'],
  ['REFLECTIVE', 'Reflective'],
  ['REFLECTIVE_CLAN', 'Reflective(Clan)'],
  ['HARDENED', 'Hardened'],
  ['PRIMITIVE', 'Primitive'],
  ['INDUSTRIAL', 'Industrial'],
  ['HEAVY_INDUSTRIAL', 'Heavy Industrial'],
  ['COMMERCIAL', 'Commercial'],
  ['IMPACT_RESISTANT', 'Impact-Resistant'],
  ['FERRO_LAMELLOR', 'Ferro-Lamellor'],
];
const parser = new MTFParserService();
const exporter = new MTFExportService();

function parse(text: string) {
  const result = parser.parse(text);
  expect(result.success).toBe(true);
  if (!result.unit) throw new Error(result.errors.join('; '));
  return result.unit;
}

function roundtrip(unit: ReturnType<typeof parse>) {
  const result = exporter.export(unit);
  expect(result).toMatchObject({ success: true, errors: [] });
  if (!result.content) throw new Error(result.errors.join('; '));
  const after = parse(result.content);
  expect(after.engine).toEqual(unit.engine);
  expect(after.armor).toEqual(unit.armor);
  return after;
}

function expectRejected(
  unit: Parameters<MTFExportService['export']>[0],
  identity: string,
) {
  const result = exporter.export(unit);
  expect(result.success).toBe(false);
  expect(result.content).toBeUndefined();
  expect(result.errors.join('; ')).toContain(identity);
}

describe('MTF component vocabulary preservation', () => {
  it.each(engines)(
    'preserves engine %s through public services',
    (identity, name, exportedName) => {
      const unit = parse(
        `chassis:Engine\nmass:50\nengine:250 ${name}\narmor:Standard`,
      );
      expect(unit.engine).toEqual({ type: identity, rating: 250 });
      expect(UnitContract.safeParse(unit).success).toBe(true);
      expect(exporter.export(unit).content?.split('\n')).toContain(
        `engine:250 ${exportedName}`,
      );
      roundtrip(unit);
    },
  );

  it.each(armors)(
    'preserves armor %s through public services',
    (identity, name) => {
      const unit = parse(
        `chassis:Armor\nmass:50\nengine:250 Fusion Engine\narmor:${name}\nLA armor:13\nCT armor:22\nRTC armor:7`,
      );
      expect(unit.armor.type).toBe(identity);
      expect(unit.armor.allocation).toMatchObject({
        LEFT_ARM: 13,
        CENTER_TORSO: { front: 22, rear: 7 },
      });
      expect(UnitContract.safeParse(unit).success).toBe(true);
      expect(exporter.export(unit).content?.split('\n')).toContain(
        `armor:${identity === 'STANDARD' ? 'Standard(Inner Sphere)' : name}`,
      );
      roundtrip(unit);
    },
  );

  it.each([
    ['engine', 'STANDARD', 'FUSION'],
    ['engine', 'XL_IS', 'XL'],
    ['engine', 'XL_CLAN', 'CLAN_XL'],
    ['armor', 'FERRO_FIBROUS_IS', 'FERRO_FIBROUS'],
    ['armor', 'LIGHT_FERRO', 'LIGHT_FERRO_FIBROUS'],
    ['armor', 'HEAVY_FERRO', 'HEAVY_FERRO_FIBROUS'],
  ])('canonicalizes deliberate %s alias %s', (kind, alias, canonical) => {
    const base = createMinimalUnit();
    const unit = createMinimalUnit(
      kind === 'engine'
        ? { engine: { ...base.engine, type: alias } }
        : { armor: { ...base.armor, type: alias } },
    );
    const result = exporter.export(unit);
    expect(result.success).toBe(true);
    const after = parse(result.content || '');
    expect(kind === 'engine' ? after.engine.type : after.armor.type).toBe(
      canonical,
    );
    expect(after.engine.rating).toBe(unit.engine.rating);
    expect(after.armor.allocation).toEqual(unit.armor.allocation);
  });

  it.each([
    'UNKNOWN',
    'UNSUPPORTED_ENGINE:Mystery',
    'NONE',
    'MAGLEV',
    'STEAM',
    'SOLAR',
    'EXTERNAL',
    'toString',
    '__proto__',
    '',
  ])('rejects engine %s without content', (type) => {
    expectRejected(createMinimalUnit({ engine: { type, rating: 250 } }), type);
  });
  it.each([
    'UNKNOWN',
    'UNSUPPORTED_ARMOR:Patchwork',
    'PATCHWORK',
    'FERRO_FIBROUS_PROTOTYPE',
    'BALLISTIC_REINFORCED',
    'HEAT_DISSIPATING',
    'AEROSPACE',
    'toString',
    '__proto__',
    '',
  ])('rejects armor %s without content', (type) => {
    const unit = createMinimalUnit();
    expectRejected({ ...unit, armor: { ...unit.armor, type } }, type);
  });
  it.each([
    'Patchwork',
    'Ferro-Fibrous Prototype',
    'Ballistic-Reinforced',
    'Heat-Dissipating',
    'Anti-Penetrative Ablation',
  ])('keeps unsupported source %s explicit', (name) => {
    const unit = parse(`chassis:Unsupported\nmass:50\narmor:${name}`);
    expect(UnitContract.safeParse(unit).success).toBe(false);
    expectRejected(unit, unit.armor.type);
  });
  it.each(['Mixed (IS Chassis)', 'Mixed (Clan Chassis)'])(
    'rejects %s despite retained source and engine',
    (tech) => {
      const unit = parse(
        `chassis:Mixed\nmass:50\ntechbase:${tech}\nengine:250 XL (Clan) Engine`,
      );
      expect(unit.mtfSource.text).toContain(tech);
      expectRejected(unit, 'chassis-tech-context');
    },
  );

  it('reports independent context and component failures without content', () => {
    const unit = createMinimalUnit({
      techBase: 'MIXED',
      engine: { type: 'UNSUPPORTED_ENGINE:Mystery', rating: 250 },
      armor: {
        ...createMinimalUnit().armor,
        type: 'UNSUPPORTED_ARMOR:Patchwork',
      },
    });
    const result = exporter.export(unit);
    expect(result.success).toBe(false);
    expect(result.content).toBeUndefined();
    expect(result.errors).toHaveLength(3);
    for (const diagnostic of [
      'chassis-tech-context',
      'UNSUPPORTED_ENGINE:Mystery',
      'UNSUPPORTED_ARMOR:Patchwork',
    ]) {
      expect(result.errors.join('; ')).toContain(diagnostic);
    }
  });

  it.each(fixtures.rows)(
    'checks hashed original source $path at definition and export boundaries',
    async (source) => {
      const bytes = Buffer.from(source.base64, 'base64');
      expect(bytes.length).toBe(source.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        source.sha256,
      );
      const unit = parse(bytes.toString('utf8'));
      const name = source.fields.Armor;
      const expected = armors.find(
        ([, spelling]) =>
          spelling.toLowerCase() === name.toLowerCase() ||
          spelling.toLowerCase() ===
            name
              .replace(/\((?:Inner Sphere|Clan)\)$/, '')
              .trim()
              .toLowerCase(),
      );
      const supported = !!expected;
      if (expected) {
        let identity = expected[0];
        if (
          name.includes('(Clan)') &&
          ['FERRO_FIBROUS', 'REACTIVE', 'REFLECTIVE'].includes(identity)
        )
          identity += '_CLAN';
        expect(unit.armor.type).toBe(identity);
      }
      expect(UnitContract.safeParse(unit).success).toBe(
        supported && !source.fields.Config.includes('FrankenMek'),
      );
      const loaded = await loadUnitDefinition(
        { read: async () => unit },
        { source: 'custom', id: unit.id },
      );
      expect(loaded.success).toBe(
        supported && !source.fields.Config.includes('FrankenMek'),
      );
      expect(unit.engine.rating).toBe(
        Number(source.fields.Engine.match(/^\d+/)?.[0]),
      );
      if (!supported) expectRejected(unit, unit.armor.type);
      else if (unit.techBase === 'MIXED')
        expectRejected(unit, 'chassis-tech-context');
      else roundtrip(unit);
    },
  );
});
