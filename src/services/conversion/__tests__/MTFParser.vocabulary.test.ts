import vocabulary from '@/types/formats/mtf-component-vocabulary.json';

import { mapRulesLevel } from '../MTFParser.mapping';
import { MTFParserService } from '../MTFParserService';

// Source strings from the 4,263 pinned mm-data 50f7efe BattleMechs. Identities
// match the converter output in the committed catalog (scripts/megameklab-
// conversion/enum_mapping_tables.py reads the same JSON).
const GYRO: Array<[string, string]> = [
  ['Standard Gyro', 'STANDARD'],
  ['XL Gyro', 'XL'],
  ['Compact Gyro', 'COMPACT'],
  ['Heavy Duty Gyro', 'HEAVY_DUTY'],
  ['None', 'NONE'],
  ['Superheavy Gyro', 'SUPERHEAVY'],
  // Mek.java:187 GYRO_SHORT_STRING, accepted by the pinned loader.
  ['Standard', 'STANDARD'],
  ['XL', 'XL'],
  ['Compact', 'COMPACT'],
  ['Heavy Duty', 'HEAVY_DUTY'],
  ['Superheavy', 'SUPERHEAVY'],
];
const COCKPIT: Array<[string, string]> = [
  ['Standard Cockpit', 'STANDARD'],
  ['Small Cockpit', 'SMALL'],
  ['Industrial Cockpit', 'INDUSTRIAL'],
  ['Primitive Cockpit', 'PRIMITIVE'],
  ['Torso-Mounted Cockpit', 'TORSO_MOUNTED'],
  ['Command Console', 'COMMAND_CONSOLE'],
  ['Interface Cockpit', 'INTERFACE'],
  ['QuadVee Cockpit', 'QUADVEE'],
  ['Superheavy Tripod Cockpit', 'SUPERHEAVY_TRIPOD'],
  ['Tripod Cockpit', 'TRIPOD'],
  ['Dual Cockpit', 'DUAL'],
  ['Small Command Console', 'SMALL_COMMAND_CONSOLE'],
  ['Superheavy Command Console', 'SUPERHEAVY_COMMAND_CONSOLE'],
  ['Superheavy Cockpit', 'SUPERHEAVY'],
  ['Primitive Industrial Cockpit', 'PRIMITIVE_INDUSTRIAL'],
  ['Virtual Reality Piloting Pod', 'VRRP'],
  ['Superheavy Industrial Cockpit', 'SUPERHEAVY_INDUSTRIAL'],
  ['Tripod Industrial Cockpit', 'TRIPOD_INDUSTRIAL'],
  ['Superheavy Tripod Industrial Cockpit', 'SUPERHEAVY_TRIPOD_INDUSTRIAL'],
  // Mek.java:224 COCKPIT_SHORT_STRING (the pinned source spells VRRP "VRPP").
  ['Torso Mounted', 'TORSO_MOUNTED'],
  ['Interface', 'INTERFACE'],
  ['VRPP', 'VRRP'],
  ['Quadvee', 'QUADVEE'],
  ['Tripod', 'TRIPOD'],
  ['Dual', 'DUAL'],
  ['Small Command', 'SMALL_COMMAND_CONSOLE'],
  ['Superheavy Command', 'SUPERHEAVY_COMMAND_CONSOLE'],
];
const HEAT_SINKS: Array<[string, string]> = [
  ['Single', 'SINGLE'],
  ['Double Heat Sinks', 'DOUBLE'],
  ['IS Double', 'DOUBLE'],
  ['Clan Double', 'DOUBLE_CLAN'],
  ['Laser', 'LASER'],
  ['Compact', 'COMPACT'],
];

// parseField takes the first matching line, so the base omits anything a case
// sets (rules level included); a missing rules level reads as '2'.
function parse(extra: string[], techbase = 'Inner Sphere') {
  const result = new MTFParserService().parse(
    [
      'chassis:Vocabulary',
      'model:Test',
      'Config:Biped',
      `techbase:${techbase}`,
      'era:3050',
      'mass:50',
      'engine:200 Fusion Engine',
      'structure:IS Standard',
      ...extra,
    ].join('\n'),
  );
  if (!result.unit) throw new Error(result.errors.join('; '));
  return result;
}

describe('MTF component vocabulary', () => {
  it.each(GYRO)('gyro %s', (source, identity) => {
    expect(parse([`gyro:${source}`]).unit?.gyro).toEqual({ type: identity });
  });

  it.each(COCKPIT)('cockpit %s', (source, identity) => {
    expect(parse([`cockpit:${source}`]).unit?.cockpit).toBe(identity);
  });

  it.each(HEAT_SINKS)('heat sinks 12 %s', (source, identity) => {
    expect(parse([`heat sinks:12 ${source}`]).unit?.heatSinks).toEqual({
      type: identity,
      count: 12,
    });
  });

  it.each([
    ['1', 'INTRODUCTORY'],
    ['2', 'STANDARD'],
    ['3', 'ADVANCED'],
    ['4', 'EXPERIMENTAL'],
    ['5', 'UNOFFICIAL'],
  ])('rules level %s', (level, identity) => {
    expect(mapRulesLevel(level)).toBe(identity);
    expect(parse([`rules level:${level}`]).unit?.rulesLevel).toBe(identity);
  });

  it('keeps the existing STANDARD fallback for unreadable rules levels', () => {
    expect(mapRulesLevel('')).toBe('STANDARD');
    expect(mapRulesLevel('99')).toBe('STANDARD');
  });

  it('treats absent and empty gyro and cockpit lines as Standard', () => {
    for (const extra of [[], ['gyro:', 'cockpit:']]) {
      const { unit } = parse(extra);
      expect(unit?.gyro).toEqual({ type: 'STANDARD' });
      expect(unit?.cockpit).toBe('STANDARD');
    }
  });

  it('accepts every entry the shared file declares', () => {
    for (const [source, identity] of Object.entries(vocabulary.gyro)) {
      expect(parse([`gyro:${source}`]).unit?.gyro.type).toBe(identity);
    }
    for (const [source, identity] of Object.entries(vocabulary.cockpit)) {
      expect(parse([`cockpit:${source}`]).unit?.cockpit).toBe(identity);
    }
    for (const [source, identity] of Object.entries(vocabulary.heatSink)) {
      expect(parse([`heat sinks:10 ${source}`]).unit?.heatSinks.type).toBe(
        identity,
      );
    }
  });

  // The pinned loader never refuses a file over these three strings: it
  // substitutes a default (MtfFile.java:252-269 gyro and cockpit,
  // :366-368 and :566-598 heat sinks). The importer does the same and says so.
  describe('strings the pinned loader defaults load with that default and a warning', () => {
    // 'Heavy-Duty Gyro' is a Python-only alias, not a pinned MegaMek name.
    it.each(['Quantum Gyro', 'Heavy-Duty Gyro', 'xl gyro'])(
      'gyro %s -> Standard',
      (name) => {
        const result = parse([`gyro:${name}`]);
        expect(result.unit?.gyro.type).toBe('STANDARD');
        expect(result.warnings).toContain(
          `Unsupported MTF gyro "${name}" loaded as Standard (MtfFile.java:252-259)`,
        );
      },
    );

    it.each(['standard cockpit', 'Mystery Cockpit', 'Tiny'])(
      'cockpit %s -> Standard',
      (source) => {
        const result = parse([`cockpit:${source}`]);
        expect(result.unit?.cockpit).toBe('STANDARD');
        expect(result.warnings).toContain(
          `Unsupported MTF cockpit "${source}" loaded as Standard (MtfFile.java:262-269)`,
        );
      },
    );

    it('heat sink with no recognised keyword -> Single, keeping the count', () => {
      const result = parse(['heat sinks:14 Dissipators']);
      expect(result.unit?.heatSinks).toEqual({ type: 'SINGLE', count: 14 });
      expect(result.warnings).toContain(
        'Unsupported MTF heat sink "Dissipators" loaded as Single (MtfFile.java:566-598)',
      );
    });

    it('recognised names and valid defaults add no warning', () => {
      for (const extra of [
        ['gyro:XL Gyro', 'cockpit:Small Cockpit', 'heat sinks:10 IS Double'],
        ['heat sinks:10 Single'],
        ['gyro:', 'cockpit:'],
        [],
      ]) {
        expect(parse(extra).warnings).toEqual([]);
      }
    });
  });

  // The raw source token is kept on the unit next to the derived value, and a
  // unit-level diagnostic is attached for every field the loader had to
  // default; both ride in mtfSource, which is persisted with the definition.
  describe('raw tokens and unit diagnostics', () => {
    it('keeps the raw tokens beside the derived values', () => {
      const { unit } = parse([
        'gyro:XL Gyro',
        'cockpit:Small Cockpit',
        'heat sinks:12 Clan Double',
      ]);
      expect(unit?.mtfSource).toMatchObject({
        gyro: 'XL Gyro',
        cockpit: 'Small Cockpit',
        heatSinks: '12 Clan Double',
      });
      expect(unit?.mtfSource).not.toHaveProperty('diagnostics');
    });

    it('omits a token whose line is absent', () => {
      const { unit } = parse([]);
      expect(unit?.mtfSource).not.toHaveProperty('gyro');
      expect(unit?.mtfSource).not.toHaveProperty('cockpit');
      expect(unit?.mtfSource).not.toHaveProperty('heatSinks');
    });

    it.each([
      [
        'gyro:Quantum Gyro',
        {
          field: 'gyro',
          raw: 'Quantum Gyro',
          applied: 'STANDARD',
          reason: 'java-default',
          javaRef: 'MtfFile.java:252-259',
        },
      ],
      [
        'cockpit:Mystery Cockpit',
        {
          field: 'cockpit',
          raw: 'Mystery Cockpit',
          applied: 'STANDARD',
          reason: 'java-default',
          javaRef: 'MtfFile.java:262-269; Mek.java:4935-4950',
        },
      ],
      [
        'heat sinks:14 Dissipators',
        {
          field: 'heatSinks',
          raw: '14 Dissipators',
          applied: 'SINGLE',
          reason: 'java-default',
          javaRef: 'MtfFile.java:566-598',
        },
      ],
    ])('%s attaches one diagnostic to the unit', (line, diagnostic) => {
      const { unit, warnings } = parse([line]);
      expect(unit?.mtfSource.diagnostics).toEqual([diagnostic]);
      // One warning string per diagnostic: the import result and the unit agree.
      expect(warnings).toHaveLength(1);
    });
  });

  // MtfFile.java:566-598: contains Laser, else Double (Clan or IS from the
  // text, otherwise the unit's own tech base), else Compact, else Single.
  describe('heat sink keywords follow the pinned loader', () => {
    it.each([
      ['Laser Heat Sink', 'Inner Sphere', 'LASER'],
      ['Double Heat Sinks', 'Inner Sphere', 'DOUBLE'],
      ['Clan Double Heat Sink', 'Inner Sphere', 'DOUBLE_CLAN'],
      ['IS Double Heat Sink', 'Clan', 'DOUBLE'],
      ['Double', 'Clan', 'DOUBLE_CLAN'],
      ['Double', 'Mixed (Clan Chassis)', 'DOUBLE_CLAN'],
      ['Double', 'Mixed (IS Chassis)', 'DOUBLE'],
      ['Double Laser', 'Inner Sphere', 'LASER'],
      ['Compact Heat Sink', 'Inner Sphere', 'COMPACT'],
    ])('%s on %s -> %s', (name, techbase, identity) => {
      const result = parse([`heat sinks:12 ${name}`], techbase);
      expect(result.unit?.heatSinks.type).toBe(identity);
      expect(result.warnings).toEqual([]);
    });
  });

  // MtfFile.java:262-269 + Mek.getCockpitTypeForString (Mek.java:4935-4949):
  // (1) an exact full or short name, in index order; (2) otherwise the first
  // index whose full or short name is a prefix; (3) otherwise Standard. This is
  // how the writer's " (Adv. FCS)" suffix reads back, quirks included (the
  // short "Superheavy" and "Primitive" win by index).
  describe('cockpit matching follows the pinned loader', () => {
    it.each([
      ['Industrial Cockpit (Adv. FCS)', 'INDUSTRIAL'],
      ['Primitive Industrial Cockpit (Adv. FCS)', 'PRIMITIVE'],
      ['Superheavy Industrial Cockpit (Adv. FCS)', 'SUPERHEAVY'],
      ['Superheavy Tripod Industrial Cockpit (Adv. FCS)', 'SUPERHEAVY'],
      // The quirk: the short "Superheavy" (index 8) prefix-matches before
      // "Superheavy Tripod" (index 9), so a suffixed superheavy tripod reads
      // as plain superheavy.
      ['Superheavy Tripod Cockpit (prototype)', 'SUPERHEAVY'],
      // "Tripod" (index 10) comes before "Tripod Industrial" (index 17).
      ['Tripod Industrial Cockpit (Adv. FCS)', 'TRIPOD'],
      ['Tripod Cockpit (prototype)', 'TRIPOD'],
      // The same quirk for the command consoles: the short "Small" (index 1)
      // and "Superheavy" (index 8) precede indexes 16 and 15.
      ['Small Command Console (prototype)', 'SMALL'],
      ['Superheavy Command Console (prototype)', 'SUPERHEAVY'],
      ['Small Cockpit (prototype)', 'SMALL'],
    ])('prefix: %s -> %s', (source, identity) => {
      const result = parse([`cockpit:${source}`]);
      expect(result.unit?.cockpit).toBe(identity);
      expect(result.warnings).toEqual([]);
    });

    // An exact name must win over an earlier index that is only a prefix of it:
    // "Small" (index 1) prefixes "Small Command Console" (index 16),
    // "Superheavy" (index 8) prefixes "Superheavy Tripod Cockpit" (index 9) and
    // "Superheavy Command Console" (index 15), and "Tripod" (index 10) prefixes
    // "Tripod Industrial Cockpit" (index 17).
    it.each([
      ['Small Command Console', 'SMALL_COMMAND_CONSOLE'],
      ['Superheavy Tripod Cockpit', 'SUPERHEAVY_TRIPOD'],
      ['Superheavy Command Console', 'SUPERHEAVY_COMMAND_CONSOLE'],
      ['Tripod Industrial Cockpit', 'TRIPOD_INDUSTRIAL'],
      ['Superheavy Tripod Industrial', 'SUPERHEAVY_TRIPOD_INDUSTRIAL'],
    ])('exact before prefix: %s -> %s', (source, identity) => {
      const result = parse([`cockpit:${source}`]);
      expect(result.unit?.cockpit).toBe(identity);
      expect(result.warnings).toEqual([]);
    });

    it('every Java cockpit name has a serialized identity', () => {
      for (const [full, short] of vocabulary.cockpitOrder) {
        expect(vocabulary.cockpit).toHaveProperty([full]);
        expect(vocabulary.cockpit).toHaveProperty([short]);
      }
    });
  });
});
